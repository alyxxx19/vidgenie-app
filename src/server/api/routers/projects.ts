import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const projectsRouter = createTRPCRouter({
  // Get all projects for the current user
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const projects = await ctx.db.project.findMany({
        where: {
          userId: ctx.userId,
        },
        include: {
          _count: {
            select: {
              jobs: true,
              assets: true,
              posts: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        isDefault: project.isDefault,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        contentCount: project._count.assets,
        publishedCount: project._count.posts,
        scheduledCount: 0, // Calculate from posts with scheduledAt
      }));
    }),

  // Get a single project by ID
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          jobs: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
          assets: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
          posts: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      return project;
    }),

  // Create a new project
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          description: input.description,
        },
      });

      return project;
    }),

  // Update a project
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const project = await ctx.db.project.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          description: input.description,
        },
      });

      return project;
    }),

  // Delete a project
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (existing.isDefault) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete default project',
        });
      }

      await ctx.db.project.delete({
        where: {
          id: input.id,
        },
      });

      return { success: true };
    }),

  // Get project statistics
  getStats: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        userId: ctx.userId,
        ...(input.projectId && { projectId: input.projectId }),
      };

      const [totalAssets, totalPosts, activeJobs] = await Promise.all([
        ctx.db.asset.count({ where }),
        ctx.db.post.count({ where }),
        ctx.db.job.count({ 
          where: {
            ...where,
            status: { in: ['pending', 'running'] },
          },
        }),
      ]);

      return {
        totalAssets,
        totalPosts,
        activeJobs,
      };
    }),
});