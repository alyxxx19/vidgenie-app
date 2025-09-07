/**
 * Requêtes optimisées avec pagination et index
 * PHASE 4.3 - Optimisation base de données
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Types pour la pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalPages?: number;
    totalCount?: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
  };
}

/**
 * Classe utilitaire pour les requêtes optimisées
 */
export class OptimizedQueries {
  constructor(private prisma: PrismaClient) {}

  /**
   * Récupère les assets d'un utilisateur avec pagination optimisée
   */
  async getUserAssets(
    userId: string,
    options: PaginationOptions & {
      status?: string;
      projectId?: string;
      mimeType?: string;
    } = {}
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, cursor, status, projectId, mimeType } = options;
    const skip = cursor ? undefined : (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {
      userId,
      ...(status && { status }),
      ...(projectId && { projectId }),
      ...(mimeType && { mimeType: { startsWith: mimeType } }),
    };

    // Requête optimisée utilisant les nouveaux index
    const [assets, totalCount] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit + 1, // +1 pour détecter hasNextPage
        cursor: cursor ? { id: cursor } : undefined,
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
          // Relations optimisées
          project: {
            select: { id: true, name: true }
          }
        }
      }),
      // Count seulement si nécessaire (première page)
      page === 1 || !cursor ? this.prisma.asset.count({ where }) : undefined
    ]);

    const hasNextPage = assets.length > limit;
    const data = hasNextPage ? assets.slice(0, -1) : assets;
    const nextCursor = hasNextPage ? data[data.length - 1]?.id : undefined;

    return {
      data,
      meta: {
        page,
        limit,
        totalCount,
        totalPages: totalCount ? Math.ceil(totalCount / limit) : undefined,
        hasNextPage,
        hasPreviousPage: page > 1,
        nextCursor,
      }
    };
  }

  /**
   * Récupère les jobs actifs d'un utilisateur (optimisé pour dashboard)
   */
  async getUserActiveJobs(userId: string, limit = 10) {
    return this.prisma.job.findMany({
      where: {
        userId,
        status: { in: ['pending', 'running', 'queued'] }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        createdAt: true,
        estimatedTimeRemaining: true,
        project: {
          select: { id: true, name: true }
        }
      }
    });
  }

  /**
   * Récupère l'historique de crédits avec pagination
   */
  async getUserCreditHistory(
    userId: string,
    options: PaginationOptions & { type?: string } = {}
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 50, type } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.CreditTransactionWhereInput = {
      userId,
      ...(type && { type }),
    };

    const [transactions, totalCount] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          reason: true,
          createdAt: true,
          metadata: true,
        }
      }),
      this.prisma.creditTransaction.count({ where })
    ]);

    return {
      data: transactions,
      meta: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1,
      }
    };
  }

  /**
   * Récupère les contenus avec pagination optimisée
   */
  async getUserContents(
    userId: string,
    options: PaginationOptions & {
      status?: string;
      type?: string;
    } = {}
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, status, type } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.ContentWhereInput = {
      userId,
      ...(status && { status }),
      ...(type && { type }),
    };

    const [contents, totalCount] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          imageUrl: true,
          videoUrl: true,
          thumbnailUrl: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      this.prisma.content.count({ where })
    ]);

    return {
      data: contents,
      meta: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1,
      }
    };
  }

  /**
   * Analytics optimisées pour dashboard
   */
  async getDashboardAnalytics(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Requêtes parallèles optimisées avec index
    const [
      totalAssets,
      recentAssets,
      creditBalance,
      recentTransactions,
      activeJobs,
      completedJobs
    ] = await Promise.all([
      // Total assets (utilise index userId)
      this.prisma.asset.count({
        where: { userId, status: 'completed' }
      }),
      
      // Assets récents (utilise index userId, status, createdAt)
      this.prisma.asset.count({
        where: {
          userId,
          status: 'completed',
          createdAt: { gte: startDate }
        }
      }),
      
      // Solde crédits (depuis User directement)
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { creditsBalance: true, creditsUsed: true }
      }),
      
      // Transactions récentes (utilise index userId, createdAt)
      this.prisma.creditTransaction.count({
        where: {
          userId,
          createdAt: { gte: startDate }
        }
      }),
      
      // Jobs actifs (utilise index userId, status, createdAt)
      this.prisma.job.count({
        where: {
          userId,
          status: { in: ['pending', 'running', 'queued'] }
        }
      }),
      
      // Jobs complétés ce mois (utilise index userId, status, createdAt)
      this.prisma.job.count({
        where: {
          userId,
          status: 'completed',
          completedAt: { gte: startDate }
        }
      })
    ]);

    return {
      totalAssets,
      recentAssets,
      creditBalance: creditBalance?.creditsBalance || 0,
      creditsUsed: creditBalance?.creditsUsed || 0,
      recentTransactions,
      activeJobs,
      completedJobs,
      successRate: completedJobs > 0 ? Math.round((completedJobs / (completedJobs + 1)) * 100) : 0
    };
  }

  /**
   * Requête optimisée pour le feed principal
   */
  async getMainFeed(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, cursor } = options;
    const skip = cursor ? undefined : (page - 1) * limit;

    // Combine assets et contenus dans un feed unifié
    const [assets, contents] = await Promise.all([
      this.prisma.asset.findMany({
        where: { 
          userId,
          status: 'completed'
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 2),
        select: {
          id: true,
          filename: true,
          publicUrl: true,
          thumbnailUrl: true,
          createdAt: true,
          mimeType: true,
          project: { select: { name: true } }
        }
      }),
      
      this.prisma.content.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 2),
        select: {
          id: true,
          title: true,
          type: true,
          imageUrl: true,
          videoUrl: true,
          thumbnailUrl: true,
          createdAt: true,
        }
      })
    ]);

    // Mélange et tri par date
    const feed = [
      ...assets.map(asset => ({ ...asset, feedType: 'asset' as const })),
      ...contents.map(content => ({ ...content, feedType: 'content' as const }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);

    return {
      data: feed,
      meta: {
        page,
        limit,
        hasNextPage: feed.length === limit,
        hasPreviousPage: page > 1,
      }
    };
  }
}

// Helper pour créer une instance
export const createOptimizedQueries = (prisma: PrismaClient) => {
  return new OptimizedQueries(prisma);
};