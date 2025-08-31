import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const promptsRouter = createTRPCRouter({
  // List user's saved prompts
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (process.env.NODE_ENV === 'development') {
        const mockPrompts = [
          {
            id: 'mock-prompt-1',
            userId: ctx.session.user.id,
            title: 'Routine Matinale Virale',
            content: 'Créer une vidéo sur une routine matinale motivante et productive qui va captiver l\'audience et devenir virale sur TikTok',
            category: 'Lifestyle',
            tags: ['routine', 'motivation', 'viral'],
            isPinned: true,
            usageCount: 15,
            isTemplate: false,
            isPublic: false,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
            lastUsedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          {
            id: 'mock-prompt-2',
            userId: ctx.session.user.id,
            title: 'Astuces Tech Productivity',
            content: 'Génère du contenu sur les meilleurs raccourcis et astuces technologiques pour gagner du temps au travail',
            category: 'Tech',
            tags: ['productivity', 'tech', 'tips'],
            isPinned: false,
            usageCount: 8,
            isTemplate: false,
            isPublic: false,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
            lastUsedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          },
          {
            id: 'mock-prompt-3',
            userId: ctx.session.user.id,
            title: 'Recette Rapide et Saine',
            content: 'Crée une vidéo de recette healthy qui peut être préparée en moins de 10 minutes',
            category: 'Cooking',
            tags: ['healthy', 'quick', 'recipe'],
            isPinned: false,
            usageCount: 12,
            isTemplate: false,
            isPublic: false,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
            lastUsedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        ];
        
        // Filter by category if specified
        const filteredPrompts = input.category 
          ? mockPrompts.filter(prompt => prompt.category === input.category)
          : mockPrompts;
        
        return filteredPrompts
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
            if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
            return b.createdAt.getTime() - a.createdAt.getTime();
          })
          .slice(0, input.limit);
      }
      return await ctx.db.prompt.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input.category && { category: input.category }),
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
      if (process.env.NODE_ENV === 'development') {
        return [
          {
            id: 'template-1',
            userId: 'system',
            title: 'Unboxing Product Review',
            content: 'Crée une vidéo d\'unboxing et de review détaillée d\'un produit tech récent, en mettant l\'accent sur les premières impressions et les caractéristiques clés',
            category: 'Reviews',
            tags: ['unboxing', 'review', 'tech'],
            isPinned: false,
            usageCount: 245,
            isTemplate: true,
            isPublic: true,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
            lastUsedAt: null,
          },
          {
            id: 'template-2',
            userId: 'system',
            title: 'Day in My Life',
            content: 'Documente une journée type en montrant les moments clés, les routines et les activités qui rendent ta journée unique et inspirante',
            category: 'Lifestyle',
            tags: ['lifestyle', 'daily', 'personal'],
            isPinned: false,
            usageCount: 189,
            isTemplate: true,
            isPublic: true,
            createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
            lastUsedAt: null,
          },
          {
            id: 'template-3',
            userId: 'system',
            title: 'Tutorial Step-by-Step',
            content: 'Enseigne une compétence ou technique spécifique avec des instructions claires et faciles à suivre, parfait pour l\'éducation et l\'engagement',
            category: 'Education',
            tags: ['tutorial', 'education', 'how-to'],
            isPinned: false,
            usageCount: 156,
            isTemplate: true,
            isPublic: true,
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
            lastUsedAt: null,
          },
        ];
      }
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
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.prompt.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
          usageCount: 0,
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
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify ownership
      const prompt = await ctx.db.prompt.findFirst({
        where: {
          id,
          userId: ctx.session.user.id,
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
        data: updateData,
      });
    }),

  // Delete prompt
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prompt = await ctx.db.prompt.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
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
          userId: ctx.session.user.id,
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
      if (process.env.NODE_ENV === 'development') {
        return [
          { name: 'Lifestyle', count: 5 },
          { name: 'Tech', count: 3 },
          { name: 'Cooking', count: 4 },
          { name: 'Fitness', count: 2 },
          { name: 'Education', count: 6 },
        ];
      }
      const categories = await ctx.db.prompt.groupBy({
        by: ['category'],
        where: {
          userId: ctx.session.user.id,
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
});