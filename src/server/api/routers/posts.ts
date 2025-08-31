import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const postsRouter = createTRPCRouter({
  // Create a new post from asset
  create: protectedProcedure
    .input(z.object({
      assetId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      hashtags: z.array(z.string()).default([]),
      platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram'])),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify asset belongs to user
      const asset = await ctx.db.asset.findFirst({
        where: {
          id: input.assetId,
          userId: ctx.user.id,
          status: 'ready',
        },
      });

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found or not ready',
        });
      }

      const post = await ctx.db.post.create({
        data: {
          userId: ctx.user.id,
          assetId: input.assetId,
          title: input.title,
          description: input.description,
          hashtags: input.hashtags,
          platforms: input.platforms,
          scheduledAt: input.scheduledAt,
          status: input.scheduledAt ? 'scheduled' : 'draft',
        },
      });

      // Log event
      await ctx.db.usageEvent.create({
        data: {
          userId: ctx.user.id,
          event: input.scheduledAt ? 'post_scheduled' : 'post_created',
          metadata: { 
            postId: post.id,
            platforms: input.platforms,
            scheduledAt: input.scheduledAt,
          },
        },
      });

      return post;
    }),

  // Generate SEO suggestions
  generateSEO: protectedProcedure
    .input(z.object({ 
      assetId: z.string(),
      platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram'])),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.asset.findFirst({
        where: {
          id: input.assetId,
          userId: ctx.user.id,
        },
        select: {
          id: true,
          prompt: true,
          userId: true,
        },
      });

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found',
        });
      }

      // Mock SEO generation (replace with real AI call)
      const suggestions = {
        title: `Contenu viral inspiré de: ${asset.prompt?.slice(0, 50)}...`,
        description: `Découvrez cette création unique générée par IA. ${asset.prompt}`,
        hashtags: [
          '#viral',
          '#IA',
          '#contenu',
          '#créateur',
          ...input.platforms.map(p => `#${p}`),
        ],
      };

      return suggestions;
    }),

  // List user posts
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      status: z.enum(['draft', 'scheduled', 'publishing', 'published', 'failed']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db.post.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
        },
        include: {
          asset: {
            select: {
              id: true,
              filename: true,
              publicUrl: true,
              thumbnail: true,
              duration: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (posts.length > input.limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return {
        posts,
        nextCursor,
      };
    }),

  // Get calendar view of scheduled posts
  calendar: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db.post.findMany({
        where: {
          userId: ctx.user.id,
          scheduledAt: {
            gte: input.startDate,
            lte: input.endDate,
          },
          status: {
            in: ['scheduled', 'published'],
          },
        },
        include: {
          asset: {
            select: {
              thumbnail: true,
              duration: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      return posts;
    }),
});