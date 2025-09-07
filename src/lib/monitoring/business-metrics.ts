/**
 * Métriques business et KPIs pour VidGenie
 * PHASE 8.1 - Dashboards et métriques business avancées
 */

import { PrismaClient } from '@prisma/client';
import { secureLog } from '../secure-logger';

// Types des métriques business
export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churnRate: number;
  retentionRate: number;
  usersByPlan: Record<string, number>;
  userGrowthTrend: Array<{ date: string; count: number }>;
}

export interface ContentMetrics {
  totalAssets: number;
  assetsGenerated: number;
  popularAssetTypes: Array<{ type: string; count: number }>;
  storageUsed: number;
  averageAssetSize: number;
  generationSuccessRate: number;
  contentTrend: Array<{ date: string; count: number }>;
}

export interface RevenueMetrics {
  monthlyRevenue: number;
  totalRevenue: number;
  averageRevenuePerUser: number;
  creditsSold: number;
  creditsUsed: number;
  conversionRate: number;
  churnValue: number;
  lifetimeValue: number;
  revenueTrend: Array<{ date: string; revenue: number }>;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  apiCallsCount: number;
  errorRate: number;
  uptime: number;
  activeConnections: number;
  queueLength: number;
  processingTime: number;
  systemLoad: number;
}

export interface BusinessKPIs {
  users: UserMetrics;
  content: ContentMetrics;
  revenue: RevenueMetrics;
  performance: PerformanceMetrics;
  timestamp: Date;
}

/**
 * Collecteur de métriques business
 */
export class BusinessMetricsCollector {
  private prisma: PrismaClient;
  private metricsCache: Map<string, { data: any; expires: number }> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Collecte toutes les métriques business
   */
  async collectAllMetrics(period = 30): Promise<BusinessKPIs> {
    const startTime = Date.now();

    try {
      const [users, content, revenue, performance] = await Promise.all([
        this.collectUserMetrics(period),
        this.collectContentMetrics(period),
        this.collectRevenueMetrics(period),
        this.collectPerformanceMetrics(),
      ]);

      const metrics: BusinessKPIs = {
        users,
        content,
        revenue,
        performance,
        timestamp: new Date(),
      };

      const collectTime = Date.now() - startTime;
      secureLog.performance('Business metrics collected', collectTime, {
        period,
        userCount: users.totalUsers,
        assetsCount: content.totalAssets,
      });

      return metrics;

    } catch (error) {
      secureLog.error('Failed to collect business metrics', { error, period });
      throw error;
    }
  }

  /**
   * Métriques utilisateurs
   */
  private async collectUserMetrics(days: number): Promise<UserMetrics> {
    const cacheKey = `user_metrics_${days}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const [
      totalUsers,
      activeUsers,
      newUsers,
      usersByPlan,
      userGrowthData
    ] = await Promise.all([
      this.prisma.user.count(),
      
      this.prisma.user.count({
        where: {
          updatedAt: { gte: dateFrom }
        }
      }),

      this.prisma.user.count({
        where: {
          createdAt: { gte: dateFrom }
        }
      }),

      this.prisma.user.groupBy({
        by: ['planId'],
        _count: { id: true },
      }),

      this.getUserGrowthTrend(days),
    ]);

    // Calculer les taux
    const previousPeriodFrom = new Date(dateFrom);
    previousPeriodFrom.setDate(previousPeriodFrom.getDate() - days);

    const previousActiveUsers = await this.prisma.user.count({
      where: {
        createdAt: { gte: previousPeriodFrom, lt: dateFrom }
      }
    });

    const churnRate = previousActiveUsers > 0 
      ? ((previousActiveUsers - activeUsers) / previousActiveUsers) * 100 
      : 0;

    const retentionRate = 100 - churnRate;

    const metrics: UserMetrics = {
      totalUsers,
      activeUsers,
      newUsers,
      churnRate: Math.max(0, churnRate),
      retentionRate: Math.max(0, retentionRate),
      usersByPlan: usersByPlan.reduce((acc, item) => {
        acc[item.planId || 'free'] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      userGrowthTrend: userGrowthData,
    };

    this.setCache(cacheKey, metrics, 300000); // 5 minutes
    return metrics;
  }

  /**
   * Métriques de contenu
   */
  private async collectContentMetrics(days: number): Promise<ContentMetrics> {
    const cacheKey = `content_metrics_${days}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const [
      totalAssets,
      assetsGenerated,
      assetTypes,
      storageStats,
      jobStats,
      contentTrend,
    ] = await Promise.all([
      this.prisma.asset.count(),

      this.prisma.asset.count({
        where: {
          createdAt: { gte: dateFrom }
        }
      }),

      this.prisma.asset.groupBy({
        by: ['mimeType'],
        _count: { id: true },
        where: {
          createdAt: { gte: dateFrom }
        },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      this.prisma.asset.aggregate({
        _sum: { fileSize: true },
        _avg: { fileSize: true },
        where: {
          createdAt: { gte: dateFrom }
        }
      }),

      this.getJobSuccessRate(days),
      this.getContentTrend(days),
    ]);

    const metrics: ContentMetrics = {
      totalAssets,
      assetsGenerated,
      popularAssetTypes: assetTypes.map(item => ({
        type: item.mimeType,
        count: item._count.id,
      })),
      storageUsed: storageStats._sum.fileSize || 0,
      averageAssetSize: Math.round(storageStats._avg.fileSize || 0),
      generationSuccessRate: jobStats.successRate,
      contentTrend,
    };

    this.setCache(cacheKey, metrics, 300000);
    return metrics;
  }

  /**
   * Métriques de revenus
   */
  private async collectRevenueMetrics(days: number): Promise<RevenueMetrics> {
    const cacheKey = `revenue_metrics_${days}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const [
      monthlyTransactions,
      totalTransactions,
      creditStats,
      userCount,
      revenueTrend,
    ] = await Promise.all([
      this.prisma.creditTransaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'purchase',
          createdAt: { gte: dateFrom }
        }
      }),

      this.prisma.creditTransaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'purchase'
        }
      }),

      this.getCreditStats(days),
      this.prisma.user.count(),
      this.getRevenueTrend(days),
    ]);

    const monthlyRevenue = (monthlyTransactions._sum.amount || 0) * 0.01; // En euros
    const totalRevenue = (totalTransactions._sum.amount || 0) * 0.01;

    const metrics: RevenueMetrics = {
      monthlyRevenue,
      totalRevenue,
      averageRevenuePerUser: userCount > 0 ? monthlyRevenue / userCount : 0,
      creditsSold: creditStats.sold,
      creditsUsed: creditStats.used,
      conversionRate: creditStats.conversionRate,
      churnValue: 0, // À calculer selon vos besoins
      lifetimeValue: userCount > 0 ? totalRevenue / userCount : 0,
      revenueTrend,
    };

    this.setCache(cacheKey, metrics, 300000);
    return metrics;
  }

  /**
   * Métriques de performance
   */
  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const cacheKey = 'performance_metrics';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Métriques temps réel ou quasi temps réel
    const [
      apiStats,
      jobStats,
      systemStats,
    ] = await Promise.all([
      this.getApiPerformanceStats(),
      this.getJobPerformanceStats(),
      this.getSystemStats(),
    ]);

    const metrics: PerformanceMetrics = {
      averageResponseTime: apiStats.avgResponseTime,
      apiCallsCount: apiStats.callsCount,
      errorRate: apiStats.errorRate,
      uptime: systemStats.uptime,
      activeConnections: systemStats.connections,
      queueLength: jobStats.queueLength,
      processingTime: jobStats.avgProcessingTime,
      systemLoad: systemStats.load,
    };

    this.setCache(cacheKey, metrics, 60000); // 1 minute
    return metrics;
  }

  /**
   * Tendance de croissance des utilisateurs
   */
  private async getUserGrowthTrend(days: number): Promise<Array<{ date: string; count: number }>> {
    const results = await this.prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "User"
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as Array<{ date: Date; count: bigint }>;

    return results.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: Number(row.count),
    }));
  }

  /**
   * Tendance de création de contenu
   */
  private async getContentTrend(days: number): Promise<Array<{ date: string; count: number }>> {
    const results = await this.prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "Asset"
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as Array<{ date: Date; count: bigint }>;

    return results.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: Number(row.count),
    }));
  }

  /**
   * Tendance des revenus
   */
  private async getRevenueTrend(days: number): Promise<Array<{ date: string; revenue: number }>> {
    const results = await this.prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(amount) as revenue
      FROM "CreditTransaction"
      WHERE type = 'purchase' 
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as Array<{ date: Date; revenue: bigint }>;

    return results.map(row => ({
      date: row.date.toISOString().split('T')[0],
      revenue: Number(row.revenue) * 0.01, // Conversion en euros
    }));
  }

  /**
   * Statistiques de succès des jobs
   */
  private async getJobSuccessRate(days: number): Promise<{ successRate: number }> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const [totalJobs, successfulJobs] = await Promise.all([
      this.prisma.job.count({
        where: {
          createdAt: { gte: dateFrom }
        }
      }),

      this.prisma.job.count({
        where: {
          status: 'completed',
          createdAt: { gte: dateFrom }
        }
      }),
    ]);

    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 100;

    return { successRate };
  }

  /**
   * Statistiques des crédits
   */
  private async getCreditStats(days: number): Promise<{
    sold: number;
    used: number;
    conversionRate: number;
  }> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const [purchases, usage, newUsers] = await Promise.all([
      this.prisma.creditTransaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'purchase',
          createdAt: { gte: dateFrom }
        }
      }),

      this.prisma.creditTransaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'usage',
          createdAt: { gte: dateFrom }
        }
      }),

      this.prisma.user.count({
        where: {
          createdAt: { gte: dateFrom }
        }
      }),
    ]);

    const purchasesCount = await this.prisma.creditTransaction.count({
      where: {
        type: 'purchase',
        createdAt: { gte: dateFrom }
      }
    });

    const conversionRate = newUsers > 0 ? (purchasesCount / newUsers) * 100 : 0;

    return {
      sold: purchases._sum.amount || 0,
      used: Math.abs(usage._sum.amount || 0),
      conversionRate,
    };
  }

  /**
   * Statistiques API de performance
   */
  private async getApiPerformanceStats(): Promise<{
    avgResponseTime: number;
    callsCount: number;
    errorRate: number;
  }> {
    // Ces métriques devraient venir de votre système de monitoring
    // Pour l'exemple, on simule
    return {
      avgResponseTime: 250, // ms
      callsCount: 1500,
      errorRate: 0.5, // %
    };
  }

  /**
   * Statistiques de performance des jobs
   */
  private async getJobPerformanceStats(): Promise<{
    queueLength: number;
    avgProcessingTime: number;
  }> {
    const [queueLength, avgProcessingTime] = await Promise.all([
      this.prisma.job.count({
        where: {
          status: 'pending'
        }
      }),

      this.prisma.job.aggregate({
        _avg: { processingTime: true },
        where: {
          status: 'completed',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
          }
        }
      }),
    ]);

    return {
      queueLength,
      avgProcessingTime: avgProcessingTime._avg.processingTime || 0,
    };
  }

  /**
   * Statistiques système
   */
  private async getSystemStats(): Promise<{
    uptime: number;
    connections: number;
    load: number;
  }> {
    // Ces métriques devraient venir de votre monitoring système
    return {
      uptime: process.uptime(),
      connections: 45, // Connexions actives simulées
      load: 0.3, // Load average simulé
    };
  }

  /**
   * Cache helper
   */
  private getFromCache(key: string): any {
    const cached = this.metricsCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.metricsCache.set(key, {
      data,
      expires: Date.now() + ttl,
    });
  }

  /**
   * Génère un rapport de santé business
   */
  async generateHealthReport(period = 30): Promise<{
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    insights: string[];
    recommendations: string[];
  }> {
    const metrics = await this.collectAllMetrics(period);
    
    let score = 100;
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Analyse de la croissance
    if (metrics.users.newUsers === 0) {
      score -= 20;
      insights.push('Aucun nouveau utilisateur sur la période');
      recommendations.push('Améliorer les stratégies d\'acquisition');
    }

    // Analyse du churn
    if (metrics.users.churnRate > 10) {
      score -= 15;
      insights.push(`Taux de churn élevé: ${metrics.users.churnRate.toFixed(1)}%`);
      recommendations.push('Analyser les causes de départ des utilisateurs');
    }

    // Analyse des performances
    if (metrics.performance.errorRate > 5) {
      score -= 25;
      insights.push(`Taux d'erreur élevé: ${metrics.performance.errorRate}%`);
      recommendations.push('Investiguer et corriger les erreurs système');
    }

    // Analyse des revenus
    if (metrics.revenue.conversionRate < 5) {
      score -= 10;
      insights.push(`Taux de conversion faible: ${metrics.revenue.conversionRate.toFixed(1)}%`);
      recommendations.push('Optimiser le parcours de conversion');
    }

    // Déterminer le statut
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) status = 'healthy';
    else if (score >= 60) status = 'warning';
    else status = 'critical';

    return { score, status, insights, recommendations };
  }
}

export default BusinessMetricsCollector;