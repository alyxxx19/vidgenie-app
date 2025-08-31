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
      return await ctx.db.prompt.findMany({
        where: {
          userId: ctx.user.id,
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
          userId: ctx.user.id,
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
});