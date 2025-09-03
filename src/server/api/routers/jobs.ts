import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { inngest } from '@/lib/inngest';

export const jobsRouter = createTRPCRouter({
  // Submit a new generation job
  submitGeneration: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(1000),
      duration: z.number().min(8).max(60).default(30),
      style: z.string().optional(),
      platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram'])).default(['tiktok']),
      projectId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;
      
      // Check user credits
      const userRecord = await db.user.findUnique({
        where: { id: user.id },
        select: { creditsBalance: true },
      });

      const GENERATION_COST = 10;
      if (!userRecord || userRecord.creditsBalance < GENERATION_COST) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient credits. You have ${userRecord?.creditsBalance || 0} credits but need ${GENERATION_COST}.`,
        });
      }

      // Deduct credits and log transaction
      await db.creditLedger.create({
        data: {
          userId: user.id,
          amount: -GENERATION_COST,
          type: 'generation',
          description: `Content generation: ${input.prompt.slice(0, 50)}...`,
        },
      });

      await db.user.update({
        where: { id: user.id },
        data: { creditsBalance: { decrement: GENERATION_COST } },
      });

      // Create job
      const job = await db.job.create({
        data: {
          userId: user.id,
          projectId: input.projectId,
          type: 'generation',
          prompt: input.prompt,
          config: {
            duration: input.duration,
            style: input.style,
            platforms: input.platforms,
          },
          estimatedTime: input.duration * 10, // rough estimate
        },
      });

      // Log usage event
      await db.usageEvent.create({
        data: {
          userId: user.id,
          jobId: job.id,
          event: 'generation_started',
          metadata: { prompt: input.prompt, duration: input.duration },
        },
      });

      // Trigger Inngest job (with fallback for development)
      try {
        await inngest.send({
          name: 'generation/start',
          data: { jobId: job.id }
        });
      } catch (error) {
        console.warn('Inngest not available, running in development mode:', error);
        // For development, simulate immediate completion with mock data
        if (process.env.NODE_ENV === 'development') {
          setTimeout(async () => {
            const devAsset = await db.asset.create({
              data: {
                userId: user.id,
                projectId: input.projectId,
                jobId: job.id,
                filename: `dev-generated-${Date.now()}.mp4`,
                mimeType: 'video/mp4',
                fileSize: 1024 * 1024 * 25, // 25MB
                duration: input.duration,
                width: 720,
                height: 1280,
                s3Key: `dev/assets/${job.id}.mp4`,
                s3Bucket: 'dev-bucket',
                s3Region: 'eu-west-3',
                publicUrl: '/api/placeholder/720/1280?text=Generated+Video',
                thumbnailUrl: '/api/placeholder/720/1280?text=Thumbnail',
                generatedBy: 'Development Mock',
                prompt: input.prompt,
                status: 'ready',
                aiConfig: {
                  provider: 'dev-mock',
                  qualityScore: 8,
                  generationCost: 10,
                },
              },
            });
            
            await db.job.update({
              where: { id: job.id },
              data: {
                status: 'completed',
                progress: 100,
                completedAt: new Date(),
                resultAssetId: devAsset.id,
              },
            });
          }, 3000); // 3 second delay for testing
        }
      }

      return { jobId: job.id };
    }),

  // Get job status
  getStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.job.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.user.id,
        },
        include: {
          resultAsset: true,
          resultPost: true,
        },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      return {
        id: job.id,
        status: job.status,
        progress: job.status === 'completed' ? 100 : 
                 job.status === 'running' ? 50 : 0,
        estimatedTimeRemaining: job.estimatedTime,
        resultAsset: job.resultAsset,
        resultPost: job.resultPost,
        errorMessage: job.errorMessage,
      };
    }),

  // List user jobs
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const jobs = await ctx.db.job.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
        },
        include: {
          resultAsset: {
            select: {
              id: true,
              filename: true,
              publicUrl: true,
              thumbnail: true,
            },
          },
          resultPost: {
            select: {
              id: true,
              title: true,
              platforms: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (jobs.length > input.limit) {
        const nextItem = jobs.pop();
        nextCursor = nextItem!.id;
      }

      return {
        jobs,
        nextCursor,
      };
    }),
});