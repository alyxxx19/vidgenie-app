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
          userId: ctx.session.user.id,
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
          userId: ctx.session.user.id,
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
          userId: ctx.session.user.id,
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
          userId: ctx.session.user.id,
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
      if (process.env.NODE_ENV === 'development') {
        const mockPosts = [
          {
            id: 'mock-post-1',
            userId: ctx.session.user.id,
            assetId: 'mock-asset-1',
            title: 'Morning Routine Viral Content',
            description: 'Découvrez cette routine matinale qui va changer votre vie !',
            hashtags: ['#routine', '#matinal', '#motivation', '#viral'],
            platforms: ['tiktok', 'instagram'],
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            publishedAt: null,
            status: 'scheduled',
            seoOptimized: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            asset: {
              id: 'mock-asset-1',
              filename: 'viral-morning-routine.mp4',
              publicUrl: '/mock-video-1.mp4',
              thumbnail: '/mock-thumb-1.jpg',
              duration: 30,
            },
          },
          {
            id: 'mock-post-2',
            userId: ctx.session.user.id,
            assetId: 'mock-asset-2',
            title: 'Tech Tips Published',
            description: 'Les meilleurs raccourcis pour gagner du temps avec la tech',
            hashtags: ['#tech', '#tips', '#productivity', '#shortcuts'],
            platforms: ['youtube', 'tiktok'],
            scheduledAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
            publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
            status: 'published',
            seoOptimized: true,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
            asset: {
              id: 'mock-asset-2',
              filename: 'tech-tips-shortcuts.mp4',
              publicUrl: '/mock-video-2.mp4',
              thumbnail: '/mock-thumb-2.jpg',
              duration: 45,
            },
          },
          {
            id: 'mock-post-3',
            userId: ctx.session.user.id,
            assetId: 'mock-asset-3',
            title: 'Draft Content',
            description: 'Contenu en cours de préparation',
            hashtags: ['#draft', '#content', '#creation'],
            platforms: ['instagram'],
            scheduledAt: null,
            publishedAt: null,
            status: 'draft',
            seoOptimized: false,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            asset: {
              id: 'mock-asset-3',
              filename: 'draft-content.mp4',
              publicUrl: '/mock-video-3.mp4',
              thumbnail: '/mock-thumb-3.jpg',
              duration: 25,
            },
          },
        ];

        // Filter by status if specified
        const filteredPosts = input.status 
          ? mockPosts.filter(post => post.status === input.status)
          : mockPosts;

        return {
          posts: filteredPosts.slice(0, input.limit),
          nextCursor: undefined,
        };
      }
      const posts = await ctx.db.post.findMany({
        where: {
          userId: ctx.session.user.id,
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
      if (process.env.NODE_ENV === 'development') {
        const mockCalendarPosts = [];
        const platforms = ['tiktok', 'youtube', 'instagram'];
        
        // Generate posts spread across the date range
        const daysDiff = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const numPosts = Math.min(daysDiff, 10); // Max 10 posts
        
        for (let i = 0; i < numPosts; i++) {
          const date = new Date(input.startDate);
          date.setDate(date.getDate() + Math.floor(i * daysDiff / numPosts));
          date.setHours(10 + (i % 12), Math.floor(Math.random() * 60));
          
          const platform = platforms[i % platforms.length];
          const status = Math.random() > 0.3 ? 'scheduled' : 'published';
          
          mockCalendarPosts.push({
            id: `mock-calendar-post-${i}`,
            userId: ctx.session.user.id,
            assetId: `mock-asset-${i}`,
            title: `Calendar Content ${i + 1}`,
            description: `Contenu programmé pour ${platform}`,
            hashtags: [`#${platform}`, '#scheduled', '#content'],
            platforms: [platform],
            scheduledAt: date,
            publishedAt: status === 'published' ? date : null,
            status,
            seoOptimized: true,
            createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
            updatedAt: new Date(),
            asset: {
              thumbnail: `/mock-thumb-${i}.jpg`,
              duration: 30 + (i * 10),
            },
          });
        }
        
        return mockCalendarPosts.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
      }
      const posts = await ctx.db.post.findMany({
        where: {
          userId: ctx.session.user.id,
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