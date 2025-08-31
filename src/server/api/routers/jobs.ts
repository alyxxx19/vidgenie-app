import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

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
      const { session, db } = ctx;
      
      // Check user credits
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { creditsBalance: true },
      });

      const GENERATION_COST = 10;
      if (!user || user.creditsBalance < GENERATION_COST) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient credits. You have ${user?.creditsBalance || 0} credits but need ${GENERATION_COST}.`,
        });
      }

      // Deduct credits and log transaction
      await db.creditLedger.create({
        data: {
          userId: session.user.id,
          amount: -GENERATION_COST,
          type: 'generation',
          description: `Content generation: ${input.prompt.slice(0, 50)}...`,
        },
      });

      await db.user.update({
        where: { id: session.user.id },
        data: { creditsBalance: { decrement: GENERATION_COST } },
      });

      // Create job
      const job = await db.job.create({
        data: {
          userId: session.user.id,
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
          userId: session.user.id,
          jobId: job.id,
          event: 'generation_started',
          metadata: { prompt: input.prompt, duration: input.duration },
        },
      });

      // TODO: Trigger Inngest job here
      // await inngest.send({
      //   name: 'generation/start',
      //   data: { jobId: job.id }
      // });

      return { jobId: job.id };
    }),

  // Get job status
  getStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (process.env.NODE_ENV === 'development') {
        return {
          id: input.jobId,
          status: 'completed',
          progress: 100,
          estimatedTimeRemaining: 0,
          resultAsset: {
            id: `mock-asset-${input.jobId}`,
            filename: 'mock-generated-content.mp4',
            publicUrl: '/mock-video.mp4',
            thumbnail: '/mock-thumb.jpg',
          },
          resultPost: null,
          errorMessage: null,
        };
      }
      const job = await ctx.db.job.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.session.user.id,
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
      // Return mock data in development
      if (process.env.NODE_ENV === 'development') {
        return {
          jobs: [
            {
              id: 'mock-job-1',
              type: 'generation',
              status: 'completed',
              prompt: 'Routine matinale productive et motivante',
              createdAt: new Date(),
              config: { duration: 30, platforms: ['tiktok'] },
              resultAsset: {
                id: 'mock-asset-1',
                filename: 'viral-morning-routine.mp4',
                publicUrl: '/mock-video.mp4',
                thumbnail: '/mock-thumb.jpg',
              },
              resultPost: null,
            },
          ],
          nextCursor: undefined,
        };
      }

      const jobs = await ctx.db.job.findMany({
        where: {
          userId: ctx.session.user.id,
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