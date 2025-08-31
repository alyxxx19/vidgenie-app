import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const assetsRouter = createTRPCRouter({
  // List user assets
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      status: z.enum(['processing', 'ready', 'failed']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const assets = await ctx.db.asset.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          posts: {
            select: {
              id: true,
              platforms: true,
              status: true,
            },
          },
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (assets.length > input.limit) {
        const nextItem = assets.pop();
        nextCursor = nextItem!.id;
      }

      return {
        assets,
        nextCursor,
      };
    }),

  // Get single asset details
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const asset = await ctx.db.asset.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
        include: {
          posts: true,
        },
      });

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found',
        });
      }

      return asset;
    }),

  // Alias for getById
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const asset = await ctx.db.asset.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
        include: {
          posts: true,
        },
      });

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found',
        });
      }

      return asset;
    }),

  // Update SEO metadata for specific platform
  updateSEO: protectedProcedure
    .input(z.object({
      id: z.string(),
      platform: z.enum(['tiktok', 'youtube', 'instagram']),
      description: z.string().max(2200),
      hashtags: z.array(z.string()).max(30),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify asset ownership
      const asset = await ctx.db.asset.findFirst({
        where: { 
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found or access denied',
        });
      }

      // Update SEO metadata
      const currentAiConfig = asset.aiConfig as any || {};
      const updatedAiConfig = {
        ...currentAiConfig,
        seoData: {
          ...currentAiConfig.seoData,
          descriptions: {
            ...currentAiConfig.seoData?.descriptions,
            [input.platform]: input.description,
          },
          hashtags: {
            ...currentAiConfig.seoData?.hashtags,
            [input.platform]: input.hashtags,
          },
        },
      };

      return await ctx.db.asset.update({
        where: { id: input.id },
        data: { aiConfig: updatedAiConfig },
      });
    }),

  // Get signed URL for asset download
  getSignedUrl: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const asset = await ctx.db.asset.findFirst({
        where: { 
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found or access denied',
        });
      }

      // In a real app, generate signed URL from S3
      // const signedUrl = await generateSignedUrl(asset.s3Key);
      // return { url: signedUrl };

      // For development, return the public URL
      return { url: asset.publicUrl };
    }),

  // Delete asset
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.asset.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found',
        });
      }

      // TODO: Delete from S3
      // await deleteFromS3(asset.s3Key);

      await ctx.db.asset.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});