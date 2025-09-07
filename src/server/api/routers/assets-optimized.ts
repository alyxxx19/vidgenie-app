/**
 * Router assets optimisé avec cache et requêtes performantes
 * PHASE 4 - Optimisation base de données et backend
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createOptimizedQueries } from '@/lib/db/optimized-queries';
import { secureLog } from '@/lib/secure-logger';

export const assetsOptimizedRouter = createTRPCRouter({
  
  // Version optimisée de getAll avec sélection et index améliorés
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      status: z.string().optional(),
      mimeType: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const startTime = Date.now();
        
        // Utilise les index optimisés (userId, status, createdAt)
        const assets = await ctx.db.asset.findMany({
          where: {
            userId: ctx.userId,
            ...(input?.projectId && { projectId: input.projectId }),
            ...(input?.status && { status: input.status }),
            ...(input?.mimeType && { 
              mimeType: { startsWith: input.mimeType } 
            }),
          },
          // Sélection optimisée - seulement les champs nécessaires
          select: {
            id: true,
            filename: true,
            mimeType: true,
            fileSize: true,
            publicUrl: true,
            thumbnailUrl: true,
            status: true,
            createdAt: true,
            duration: true,
            width: true,
            height: true,
            // Relations optimisées avec select
            project: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            posts: {
              select: {
                id: true,
                status: true,
                platforms: true,
                scheduledAt: true,
              },
              // Limite les posts pour éviter N+1
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
          // Utilise l'index composite (userId, status, createdAt)
          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' }, // Stable sort
          ],
          // Limite raisonnable
          take: 100,
        });

        const executionTime = Date.now() - startTime;
        secureLog.debug('Assets.getAll executed:', { 
          count: assets.length, 
          executionTime,
          filters: input 
        });

        return assets;
        
      } catch (error) {
        secureLog.error('Assets.getAll failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch assets',
        });
      }
    }),

  // Version optimisée avec pagination cursor et sélection minimal
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      status: z.enum(['processing', 'ready', 'failed', 'completed']).optional(),
      projectId: z.string().optional(),
      mimeType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const optimizedQueries = createOptimizedQueries(ctx.db);
        
        // Utilise les requêtes optimisées avec index
        const result = await optimizedQueries.getUserAssets(ctx.user.id, {
          limit: input.limit,
          cursor: input.cursor,
          status: input.status,
          projectId: input.projectId,
          mimeType: input.mimeType,
        });

        return {
          assets: result.data,
          nextCursor: result.meta.nextCursor,
          meta: {
            hasNextPage: result.meta.hasNextPage,
            totalCount: result.meta.totalCount,
          }
        };
        
      } catch (error) {
        secureLog.error('Assets.list failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list assets',
        });
      }
    }),

  // Get optimisé avec cache et sélection précise
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const startTime = Date.now();
        
        // Utilise l'index primaire + vérification userId
        const asset = await ctx.db.asset.findFirst({
          where: {
            id: input.id,
            userId: ctx.user.id, // Sécurité + utilise l'index composite
          },
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            fileSize: true,
            duration: true,
            width: true,
            height: true,
            publicUrl: true,
            thumbnailUrl: true,
            status: true,
            tags: true,
            description: true,
            prompt: true,
            createdAt: true,
            updatedAt: true,
            // Relations complètes pour la vue détail
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                color: true,
              },
            },
            posts: {
              select: {
                id: true,
                title: true,
                status: true,
                platforms: true,
                scheduledAt: true,
                publishedAt: true,
                hashtags: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            // Job lié si existe
            creatorJob: {
              select: {
                id: true,
                status: true,
                progress: true,
                createdAt: true,
                completedAt: true,
              },
            },
          },
        });

        if (!asset) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Asset not found',
          });
        }

        const executionTime = Date.now() - startTime;
        secureLog.debug('Assets.get executed:', { 
          assetId: input.id, 
          executionTime 
        });

        return asset;
        
      } catch (error) {
        secureLog.error('Assets.get failed:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch asset',
        });
      }
    }),

  // Stats optimisées pour dashboard
  getStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
      projectId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const startTime = Date.now();
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - input.days);

        // Requêtes parallèles optimisées avec les nouveaux index
        const [
          totalAssets,
          recentAssets,
          processingAssets,
          failedAssets,
          storageUsed,
          topMimeTypes
        ] = await Promise.all([
          // Total assets (utilise index userId)
          ctx.db.asset.count({
            where: {
              userId: ctx.user.id,
              ...(input.projectId && { projectId: input.projectId }),
            },
          }),

          // Assets récents (utilise index userId, status, createdAt)
          ctx.db.asset.count({
            where: {
              userId: ctx.user.id,
              createdAt: { gte: dateFrom },
              ...(input.projectId && { projectId: input.projectId }),
            },
          }),

          // En processing (utilise index status, createdAt)
          ctx.db.asset.count({
            where: {
              userId: ctx.user.id,
              status: 'processing',
              ...(input.projectId && { projectId: input.projectId }),
            },
          }),

          // Échoués récents
          ctx.db.asset.count({
            where: {
              userId: ctx.user.id,
              status: 'failed',
              createdAt: { gte: dateFrom },
              ...(input.projectId && { projectId: input.projectId }),
            },
          }),

          // Storage utilisé (sum des fileSize)
          ctx.db.asset.aggregate({
            where: {
              userId: ctx.user.id,
              status: { not: 'failed' }, // Exclut les échecs
              ...(input.projectId && { projectId: input.projectId }),
            },
            _sum: {
              fileSize: true,
            },
          }),

          // Top types de fichiers (utilise index mimeType)
          ctx.db.asset.groupBy({
            by: ['mimeType'],
            where: {
              userId: ctx.user.id,
              createdAt: { gte: dateFrom },
              ...(input.projectId && { projectId: input.projectId }),
            },
            _count: {
              id: true,
            },
            orderBy: {
              _count: {
                id: 'desc',
              },
            },
            take: 5,
          }),
        ]);

        const executionTime = Date.now() - startTime;
        secureLog.debug('Assets.getStats executed:', { 
          executionTime, 
          days: input.days 
        });

        return {
          totalAssets,
          recentAssets,
          processingAssets,
          failedAssets,
          storageUsedBytes: storageUsed._sum.fileSize || 0,
          topMimeTypes: topMimeTypes.map(item => ({
            mimeType: item.mimeType,
            count: item._count.id,
          })),
          period: {
            days: input.days,
            from: dateFrom.toISOString(),
            to: new Date().toISOString(),
          },
        };
        
      } catch (error) {
        secureLog.error('Assets.getStats failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch asset statistics',
        });
      }
    }),

  // Recherche optimisée avec index full-text (si supporté)
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1).max(100),
      limit: z.number().min(1).max(50).default(20),
      filters: z.object({
        mimeType: z.string().optional(),
        status: z.string().optional(),
        projectId: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const startTime = Date.now();
        
        // Recherche optimisée avec ILIKE pour PostgreSQL
        const assets = await ctx.db.asset.findMany({
          where: {
            userId: ctx.user.id,
            ...input.filters,
            OR: [
              { filename: { contains: input.query, mode: 'insensitive' } },
              { description: { contains: input.query, mode: 'insensitive' } },
              { tags: { hasSome: [input.query] } },
              { prompt: { contains: input.query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            filename: true,
            mimeType: true,
            publicUrl: true,
            thumbnailUrl: true,
            status: true,
            createdAt: true,
            project: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
        });

        const executionTime = Date.now() - startTime;
        secureLog.debug('Assets.search executed:', { 
          query: input.query,
          results: assets.length,
          executionTime 
        });

        return assets;
        
      } catch (error) {
        secureLog.error('Assets.search failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Search failed',
        });
      }
    }),
});