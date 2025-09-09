import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { VIDEO_TEMPLATES, getTemplatesByCategory, getTemplateById, searchTemplates } from '@/lib/video-templates';

// Video prompt settings schema
const VideoPromptSettingsSchema = z.object({
  mainDescription: z.string(),
  motion: z.object({
    cameraMovement: z.string(),
    objectMotion: z.array(z.string()),
    transitionType: z.string(),
  }),
  mood: z.array(z.string()),
  duration: z.number(),
  variables: z.record(z.string(), z.string()),
  template: z.string().optional(),
});

export const promptsRouter = createTRPCRouter({
  // List user's saved prompts
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      category: z.string().optional(),
      type: z.enum(['image', 'video', 'image-to-video']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.prompt.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.category && { category: input.category }),
          ...(input.type && { type: input.type }),
        },
        orderBy: [
          { isPinned: 'desc' },
          { usageCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: input.limit,
      });
    }),

  // Get public template prompts
  getTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.prompt.findMany({
        where: {
          isTemplate: true,
          isPublic: true,
        },
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 50,
      });
    }),

  // Create new prompt
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(100),
      content: z.string().min(1).max(1000),
      category: z.string().optional(),
      tags: z.array(z.string()).max(10).default([]),
      isPinned: z.boolean().default(false),
      type: z.enum(['image', 'video', 'image-to-video']).default('image'),
      videoSettings: VideoPromptSettingsSchema.optional(),
      templateKey: z.string().optional(),
      variables: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { videoSettings, variables, ...promptData } = input;
      
      return await ctx.db.prompt.create({
        data: {
          ...promptData,
          userId: ctx.user.id,
          usageCount: 0,
          videoSettings: videoSettings ? JSON.stringify(videoSettings) : undefined,
          variables: variables ? JSON.stringify(variables) : undefined,
        },
      });
    }),

  // Update existing prompt
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(100).optional(),
      content: z.string().min(1).max(1000).optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).max(10).optional(),
      isPinned: z.boolean().optional(),
      type: z.enum(['image', 'video', 'image-to-video']).optional(),
      videoSettings: VideoPromptSettingsSchema.optional(),
      templateKey: z.string().optional(),
      variables: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, videoSettings, variables, ...updateData } = input;

      // Verify ownership
      const prompt = await ctx.db.prompt.findFirst({
        where: {
          id,
          userId: ctx.user.id,
        },
      });

      if (!prompt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prompt not found',
        });
      }

      return await ctx.db.prompt.update({
        where: { id },
        data: {
          ...updateData,
          ...(videoSettings && { videoSettings: JSON.stringify(videoSettings) }),
          ...(variables && { variables: JSON.stringify(variables) }),
        },
      });
    }),

  // Delete prompt
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prompt = await ctx.db.prompt.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!prompt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prompt not found',
        });
      }

      await ctx.db.prompt.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Increment usage count when prompt is used
  incrementUsage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prompt = await ctx.db.prompt.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!prompt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prompt not found',
        });
      }

      return await ctx.db.prompt.update({
        where: { id: input.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }),

  // Get categories for organizing prompts
  getCategories: protectedProcedure
    .query(async ({ ctx }) => {
      const categories = await ctx.db.prompt.groupBy({
        by: ['category'],
        where: {
          userId: ctx.user.id,
          category: { not: null },
        },
        _count: {
          category: true,
        },
      });

      return categories.map(c => ({
        name: c.category!,
        count: c._count.category,
      }));
    }),

  // Get video templates from static library
  getVideoTemplates: protectedProcedure
    .input(z.object({
      category: z.enum(['marketing', 'creative', 'educational', 'entertainment']).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(({ input }) => {
      let templates = VIDEO_TEMPLATES;

      // Filter by category
      if (input.category) {
        templates = getTemplatesByCategory(input.category);
      }

      // Filter by search query
      if (input.search) {
        templates = searchTemplates(input.search);
      }

      return templates.slice(0, input.limit);
    }),

  // Get single video template by ID
  getVideoTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const template = getTemplateById(input.id);
      
      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Video template not found',
        });
      }

      return template;
    }),

  // Save video template as user prompt
  saveVideoTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      title: z.string().min(1).max(100),
      variables: z.record(z.string(), z.string()).optional(),
      customizations: VideoPromptSettingsSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const template = getTemplateById(input.templateId);
      
      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Video template not found',
        });
      }

      // Build prompt with variables
      let content = template.template;
      if (input.variables) {
        Object.entries(input.variables).forEach(([key, value]) => {
          if (value.trim()) {
            content = content.replace(`{{${key}}}`, value);
          }
        });
      }

      // Use custom settings or template defaults
      const videoSettings = input.customizations || {
        mainDescription: content,
        motion: template.motion,
        mood: template.mood,
        duration: template.motion.duration,
        variables: input.variables || {},
        template: template.id
      };

      return await ctx.db.prompt.create({
        data: {
          title: input.title,
          content,
          category: template.category,
          tags: template.tags,
          type: 'video',
          templateKey: template.id,
          videoSettings: JSON.stringify(videoSettings),
          variables: input.variables ? JSON.stringify(input.variables) : undefined,
          userId: ctx.user.id,
          usageCount: 0,
        },
      });
    }),

  // Get enhanced prompt (GPT improvement simulation)
  enhancePrompt: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(1000),
      type: z.enum(['image', 'video', 'image-to-video']).default('video'),
      settings: VideoPromptSettingsSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      // This would normally call an AI service like OpenAI
      // For now, we'll simulate enhancement by adding technical details
      
      const enhancementMap = {
        video: [
          'professional cinematography',
          '8-second duration optimized for attention',
          'smooth camera movements',
          'natural lighting transitions',
          'high-quality motion blur',
        ],
        image: [
          'professional photography',
          'optimal composition',
          'studio lighting',
          'high resolution detail',
        ],
        'image-to-video': [
          'seamless image-to-video transition',
          'natural motion continuation',
          'preserved image quality',
          'fluid animation',
        ]
      };

      const enhancements = enhancementMap[input.type] || enhancementMap.video;
      const selectedEnhancements = enhancements.slice(0, 2).join(', ');
      
      const enhancedPrompt = `${input.prompt.trim()}, ${selectedEnhancements}`;
      
      return {
        originalPrompt: input.prompt,
        enhancedPrompt,
        enhancements: enhancements.slice(0, 2),
        settings: input.settings,
        creditsUsed: 1, // GPT enhancement cost
      };
    }),
});