import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const publishingRouter = createTRPCRouter({
  // Publish to single platform
  publishToPlatform: protectedProcedure
    .input(z.object({
      assetId: z.string(),
      platform: z.enum(['tiktok', 'youtube', 'instagram']),
      description: z.string().max(5000),
      hashtags: z.array(z.string()).max(50),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify asset ownership
      const asset = await ctx.db.asset.findFirst({
        where: {
          id: input.assetId,
          userId: ctx.user.id,
        },
      });

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found or access denied',
        });
      }

      // Create a publishing job
      const publishingJob = await ctx.db.job.create({
        data: {
          userId: ctx.user.id,
          projectId: asset.projectId,
          type: 'publishing',
          status: 'pending',
          config: {
            assetId: input.assetId,
            platform: input.platform,
            description: input.description,
            hashtags: input.hashtags,
            scheduledAt: input.scheduledAt,
          },
          estimatedTime: 30, // 30 seconds for mock publishing
        },
      });

      // Create the post record
      const post = await ctx.db.post.create({
        data: {
          userId: ctx.user.id,
          projectId: asset.projectId,
          assetId: asset.id,
          jobId: publishingJob.id,
          title: `Content for ${input.platform}`,
          description: input.description,
          hashtags: input.hashtags,
          platforms: [input.platform],
          scheduledAt: input.scheduledAt,
          status: input.scheduledAt ? 'scheduled' : 'publishing',
          seoOptimized: true,
        },
      });

      // Update the job with the result
      await ctx.db.job.update({
        where: { id: publishingJob.id },
        data: { resultPostId: post.id },
      });

      // If immediate publishing, simulate the process
      if (!input.scheduledAt) {
        // In a real app, trigger publishing worker
        // await inngest.send({ name: 'publishing/start', data: { jobId: publishingJob.id } });
        
        // Mock immediate success
        setTimeout(async () => {
          await ctx.db.post.update({
            where: { id: post.id },
            data: {
              status: 'published',
              publishedAt: new Date(),
              platformData: {
                [input.platform]: {
                  id: `mock_${input.platform}_${Date.now()}`,
                  url: `https://${input.platform}.com/mock_post`,
                  publishedAt: new Date().toISOString(),
                },
              },
            },
          });

          await ctx.db.job.update({
            where: { id: publishingJob.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              actualTime: 15,
            },
          });
        }, 2000);
      }

      return {
        success: true,
        postId: post.id,
        jobId: publishingJob.id,
        scheduled: !!input.scheduledAt,
      };
    }),

  // Publish to multiple platforms
  publishToMultiplePlatforms: protectedProcedure
    .input(z.object({
      assetId: z.string(),
      platforms: z.array(z.object({
        platform: z.enum(['tiktok', 'youtube', 'instagram']),
        description: z.string().max(5000),
        hashtags: z.array(z.string()).max(50),
      })),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify asset ownership
      const asset = await ctx.db.asset.findFirst({
        where: {
          id: input.assetId,
          userId: ctx.user.id,
        },
      });

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found or access denied',
        });
      }

      const results = [];

      // Create publishing jobs for each platform
      for (const platformData of input.platforms) {
        const publishingJob = await ctx.db.job.create({
          data: {
            userId: ctx.user.id,
            projectId: asset.projectId,
            type: 'publishing',
            status: 'pending',
            config: {
              assetId: input.assetId,
              platform: platformData.platform,
              description: platformData.description,
              hashtags: platformData.hashtags,
              scheduledAt: input.scheduledAt,
            },
            estimatedTime: 30,
          },
        });

        const post = await ctx.db.post.create({
          data: {
            userId: ctx.user.id,
            projectId: asset.projectId,
            assetId: asset.id,
            jobId: publishingJob.id,
            title: `Content for ${platformData.platform}`,
            description: platformData.description,
            hashtags: platformData.hashtags,
            platforms: [platformData.platform],
            scheduledAt: input.scheduledAt,
            status: input.scheduledAt ? 'scheduled' : 'publishing',
            seoOptimized: true,
          },
        });

        await ctx.db.job.update({
          where: { id: publishingJob.id },
          data: { resultPostId: post.id },
        });

        results.push({
          platform: platformData.platform,
          postId: post.id,
          jobId: publishingJob.id,
        });

        // Mock publishing if immediate
        if (!input.scheduledAt) {
          setTimeout(async () => {
            await ctx.db.post.update({
              where: { id: post.id },
              data: {
                status: 'published',
                publishedAt: new Date(),
                platformData: {
                  [platformData.platform]: {
                    id: `mock_${platformData.platform}_${Date.now()}`,
                    url: `https://${platformData.platform}.com/mock_post`,
                    publishedAt: new Date().toISOString(),
                  },
                },
              },
            });

            await ctx.db.job.update({
              where: { id: publishingJob.id },
              data: {
                status: 'completed',
                completedAt: new Date(),
                actualTime: Math.floor(Math.random() * 20 + 10),
              },
            });
          }, Math.random() * 5000 + 2000); // Random delay 2-7 seconds
        }
      }

      return {
        success: true,
        results,
        scheduled: !!input.scheduledAt,
      };
    }),

  // Get scheduled posts
  getScheduled: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      platform: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        userId: ctx.user.id,
        status: 'scheduled',
      };

      if (input.startDate || input.endDate) {
        whereClause.scheduledAt = {};
        if (input.startDate) whereClause.scheduledAt.gte = input.startDate;
        if (input.endDate) whereClause.scheduledAt.lte = input.endDate;
      }

      if (input.platform) {
        whereClause.platforms = { has: input.platform };
      }

      return await ctx.db.post.findMany({
        where: whereClause,
        include: {
          asset: {
            select: {
              id: true,
              filename: true,
              duration: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });
    }),

  // Cancel scheduled post
  cancelScheduled: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findFirst({
        where: {
          id: input.postId,
          userId: ctx.user.id,
          status: 'scheduled',
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scheduled post not found',
        });
      }

      // Cancel the job and delete the post
      if (post.jobId) {
        await ctx.db.job.update({
          where: { id: post.jobId },
          data: { status: 'cancelled' },
        });
      }

      await ctx.db.post.delete({
        where: { id: input.postId },
      });

      return { success: true };
    }),
});