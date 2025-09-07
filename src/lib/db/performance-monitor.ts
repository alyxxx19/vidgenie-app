/**
 * Monitoring des performances de base de données
 * PHASE 4 - Optimisation base de données et backend
 */

import { PrismaClient } from '@prisma/client';
import { secureLog } from '@/lib/secure-logger';

interface QueryMetrics {
  query: string;
  executionTime: number;
  recordsAffected?: number;
  timestamp: Date;
  userId?: string;
  success: boolean;
  error?: string;
}

// Store des métriques en mémoire (en production utiliser une base de données dédiée)
const metricsStore: QueryMetrics[] = [];
const MAX_METRICS_STORED = 1000;

// Seuils d'alerte
const SLOW_QUERY_THRESHOLD = 1000; // 1 seconde
const VERY_SLOW_QUERY_THRESHOLD = 5000; // 5 secondes

/**
 * Middleware Prisma pour monitorer les performances
 */
export function createPerformanceMiddleware() {
  return async (params: any, next: any) => {
    const startTime = Date.now();
    const queryStart = process.hrtime();
    
    try {
      const result = await next(params);
      const executionTime = Date.now() - startTime;
      const [seconds, nanoseconds] = process.hrtime(queryStart);
      const preciseTime = seconds * 1000 + nanoseconds / 1000000;
      
      // Log des métriques
      const metrics: QueryMetrics = {
        query: `${params.model}.${params.action}`,
        executionTime: preciseTime,
        recordsAffected: Array.isArray(result) ? result.length : (result ? 1 : 0),
        timestamp: new Date(),
        success: true,
      };
      
      // Stocker les métriques
      addMetrics(metrics);
      
      // Alertes pour requêtes lentes
      if (executionTime > VERY_SLOW_QUERY_THRESHOLD) {
        secureLog.warn('Very slow query detected:', {
          query: metrics.query,
          executionTime: `${executionTime}ms`,
          args: params.args
        });
      } else if (executionTime > SLOW_QUERY_THRESHOLD) {
        secureLog.info('Slow query detected:', {
          query: metrics.query,
          executionTime: `${executionTime}ms`
        });
      }
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      const metrics: QueryMetrics = {
        query: `${params.model}.${params.action}`,
        executionTime,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      
      addMetrics(metrics);
      
      secureLog.error('Database query failed:', {
        query: metrics.query,
        executionTime: `${executionTime}ms`,
        error: metrics.error
      });
      
      throw error;
    }
  };
}

/**
 * Ajoute des métriques au store
 */
function addMetrics(metrics: QueryMetrics) {
  metricsStore.push(metrics);
  
  // Limite la taille du store
  if (metricsStore.length > MAX_METRICS_STORED) {
    metricsStore.shift();
  }
}

/**
 * Récupère les statistiques de performance
 */
export function getPerformanceStats(periodHours = 1) {
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000);
  const recentMetrics = metricsStore.filter(m => m.timestamp >= since);
  
  if (recentMetrics.length === 0) {
    return null;
  }
  
  // Calculs de base
  const totalQueries = recentMetrics.length;
  const successfulQueries = recentMetrics.filter(m => m.success).length;
  const failedQueries = totalQueries - successfulQueries;
  
  const executionTimes = recentMetrics.map(m => m.executionTime);
  const avgExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
  const maxExecutionTime = Math.max(...executionTimes);
  const minExecutionTime = Math.min(...executionTimes);
  
  // Percentiles
  const sortedTimes = executionTimes.sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  
  // Requêtes les plus fréquentes
  const queryFrequency: Record<string, number> = {};
  recentMetrics.forEach(m => {
    queryFrequency[m.query] = (queryFrequency[m.query] || 0) + 1;
  });
  
  const topQueries = Object.entries(queryFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));
  
  // Requêtes les plus lentes
  const slowQueries = recentMetrics
    .filter(m => m.success)
    .sort((a, b) => b.executionTime - a.executionTime)
    .slice(0, 10)
    .map(m => ({
      query: m.query,
      executionTime: Math.round(m.executionTime),
      timestamp: m.timestamp,
    }));
  
  // Erreurs récentes
  const recentErrors = recentMetrics
    .filter(m => !m.success)
    .slice(-10)
    .map(m => ({
      query: m.query,
      error: m.error,
      timestamp: m.timestamp,
    }));
  
  return {
    period: {
      hours: periodHours,
      since: since.toISOString(),
      until: new Date().toISOString(),
    },
    overview: {
      totalQueries,
      successfulQueries,
      failedQueries,
      successRate: Math.round((successfulQueries / totalQueries) * 100),
    },
    performance: {
      avgExecutionTime: Math.round(avgExecutionTime),
      maxExecutionTime: Math.round(maxExecutionTime),
      minExecutionTime: Math.round(minExecutionTime),
      percentiles: {
        p50: Math.round(p50),
        p90: Math.round(p90),
        p95: Math.round(p95),
        p99: Math.round(p99),
      },
    },
    topQueries,
    slowQueries,
    recentErrors,
    alerts: {
      slowQueries: recentMetrics.filter(m => m.executionTime > SLOW_QUERY_THRESHOLD).length,
      verySlowQueries: recentMetrics.filter(m => m.executionTime > VERY_SLOW_QUERY_THRESHOLD).length,
      failedQueries,
    }
  };
}

/**
 * Génère un rapport de performance détaillé
 */
export function generatePerformanceReport() {
  const stats1h = getPerformanceStats(1);
  const stats24h = getPerformanceStats(24);
  
  if (!stats1h && !stats24h) {
    return { message: 'No performance data available' };
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      status: 'healthy', // healthy | degraded | critical
      totalMetrics: metricsStore.length,
    },
    hourly: stats1h,
    daily: stats24h,
    recommendations: [] as string[],
  };
  
  // Analyse et recommandations
  if (stats1h) {
    if (stats1h.overview.successRate < 95) {
      report.summary.status = 'critical';
      report.recommendations.push('High error rate detected - investigate failing queries');
    } else if (stats1h.overview.successRate < 99) {
      report.summary.status = 'degraded';
      report.recommendations.push('Error rate above normal - monitor closely');
    }
    
    if (stats1h.performance.p95 > 1000) {
      report.summary.status = 'degraded';
      report.recommendations.push('95th percentile response time above 1s - optimize slow queries');
    }
    
    if (stats1h.alerts.verySlowQueries > 0) {
      report.summary.status = 'degraded';
      report.recommendations.push(`${stats1h.alerts.verySlowQueries} very slow queries detected - check database indexes`);
    }
  }
  
  return report;
}

/**
 * Monitore la santé de la base de données
 */
export async function checkDatabaseHealth(prisma: PrismaClient) {
  try {
    const startTime = Date.now();
    
    // Test de connectivité basique
    await prisma.$queryRaw`SELECT 1`;
    const connectivityTime = Date.now() - startTime;
    
    // Test de requête simple
    const queryStart = Date.now();
    const userCount = await prisma.user.count();
    const simpleQueryTime = Date.now() - queryStart;
    
    // Vérifications additionnelles si PostgreSQL
    const dbStats = await prisma.$queryRaw`
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        version() as version
    ` as any[];
    
    return {
      status: 'healthy',
      connectivity: {
        time: connectivityTime,
        status: connectivityTime < 100 ? 'excellent' : connectivityTime < 500 ? 'good' : 'slow'
      },
      simpleQuery: {
        time: simpleQueryTime,
        result: userCount,
        status: simpleQueryTime < 50 ? 'excellent' : simpleQueryTime < 200 ? 'good' : 'slow'
      },
      database: dbStats[0] || {},
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    secureLog.error('Database health check failed:', error);
    
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Nettoie les anciennes métriques
 */
export function cleanupOldMetrics(hoursToKeep = 24) {
  const cutoff = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000);
  const initialLength = metricsStore.length;
  
  // Supprime les métriques anciennes
  for (let i = metricsStore.length - 1; i >= 0; i--) {
    if (metricsStore[i].timestamp < cutoff) {
      metricsStore.splice(i, 1);
    }
  }
  
  const removed = initialLength - metricsStore.length;
  if (removed > 0) {
    secureLog.info('Performance metrics cleanup:', { removed, remaining: metricsStore.length });
  }
  
  return removed;
}

// Cleanup automatique toutes les heures
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupOldMetrics(24); // Garde 24h de métriques
  }, 60 * 60 * 1000); // Toutes les heures
}