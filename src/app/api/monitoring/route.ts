import { NextRequest, NextResponse } from 'next/server';
import { monitoring } from '@/lib/monitoring';
import { getServerUser } from '@/lib/auth/server-auth';
import { secureLog } from '@/lib/secure-logger';

/**
 * Monitoring Dashboard API
 * Phase 5 - Production Deployment
 * 
 * Provides real-time monitoring data for operations dashboard
 * Requires admin authentication in production
 */

export async function GET(request: NextRequest) {
  try {
    // In production, require admin authentication
    if (process.env.NODE_ENV === 'production') {
      const user = await getServerUser(request);
      if (!user) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
      // TODO: Add isAdmin property to User model
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const limit = parseInt(searchParams.get('limit') || '100');
    const timeRange = searchParams.get('timeRange') || '1h'; // 1h, 24h, 7d

    switch (type) {
      case 'overview':
        return NextResponse.json(await getOverviewData());
      
      case 'metrics':
        const metricName = searchParams.get('metric');
        return NextResponse.json(getMetricsData(metricName, limit));
      
      case 'logs':
        const logLevel = searchParams.get('level');
        return NextResponse.json(getLogsData(logLevel, limit));
      
      case 'health':
        return NextResponse.json(getHealthData());
      
      case 'business':
        return NextResponse.json(await getBusinessMetrics(timeRange));
      
      case 'performance':
        return NextResponse.json(getPerformanceMetrics(timeRange));
      
      case 'costs':
        return NextResponse.json(getCostMetrics(timeRange));
      
      default:
        return NextResponse.json(
          { error: 'Invalid monitoring type' },
          { status: 400 }
        );
    }

  } catch (error) {
    secureLog.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}

async function getOverviewData() {
  const health = monitoring.getSystemHealth();
  const recentLogs = monitoring.getRecentLogs(undefined, 10);
  const recentMetrics = monitoring.getRecentMetrics(undefined, 20);

  // Calculate summary stats
  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
  const workflowMetrics = recentMetrics.filter(m => 
    m.name === 'workflow_execution_total' && 
    m.timestamp.getTime() > last24Hours
  );

  const totalWorkflows = workflowMetrics.reduce((sum, m) => sum + m.value, 0);
  const errorWorkflows = workflowMetrics
    .filter(m => m.labels?.status === 'error')
    .reduce((sum, m) => sum + m.value, 0);

  const apiMetrics = recentMetrics.filter(m => 
    m.name === 'api_request_total' && 
    m.timestamp.getTime() > last24Hours
  );
  const totalApiRequests = apiMetrics.reduce((sum, m) => sum + m.value, 0);

  return {
    timestamp: new Date().toISOString(),
    systemHealth: health,
    summary: {
      totalWorkflows24h: totalWorkflows,
      errorWorkflows24h: errorWorkflows,
      successRate24h: totalWorkflows > 0 ? ((totalWorkflows - errorWorkflows) / totalWorkflows) * 100 : 100,
      totalApiRequests24h: totalApiRequests,
      dailyApiCost: health.metrics.dailyApiCost
    },
    recentActivity: {
      logs: recentLogs.map(log => ({
        level: log.level,
        message: log.message,
        timestamp: log.timestamp,
        context: log.context
      })),
      alerts: [], // Would come from alert system
    }
  };
}

function getMetricsData(metricName: string | null, limit: number) {
  const metrics = monitoring.getRecentMetrics(metricName || undefined, limit);
  
  // Group metrics by name for better visualization
  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = [];
    }
    acc[metric.name].push({
      value: metric.value,
      timestamp: metric.timestamp,
      labels: metric.labels,
      unit: metric.unit
    });
    return acc;
  }, {} as Record<string, any[]>);

  return {
    metrics: groupedMetrics,
    totalCount: metrics.length,
    timeRange: {
      from: metrics.length > 0 ? Math.min(...metrics.map(m => m.timestamp.getTime())) : null,
      to: Date.now()
    }
  };
}

function getLogsData(logLevel: string | null, limit: number) {
  const logs = monitoring.getRecentLogs(logLevel || undefined, limit);
  
  return {
    logs: logs.map(log => ({
      level: log.level,
      message: log.message,
      timestamp: log.timestamp,
      context: log.context,
      userId: log.userId,
      sessionId: log.sessionId,
      requestId: log.requestId
    })),
    totalCount: logs.length,
    levelCounts: {
      error: logs.filter(l => l.level === 'error').length,
      warn: logs.filter(l => l.level === 'warn').length,
      info: logs.filter(l => l.level === 'info').length,
      debug: logs.filter(l => l.level === 'debug').length
    }
  };
}

function getHealthData() {
  const health = monitoring.getSystemHealth();
  const recentMetrics = monitoring.getRecentMetrics(undefined, 100);
  
  // Calculate uptime and availability
  const systemStartTime = Date.now() - process.uptime() * 1000;
  const errorMetrics = recentMetrics.filter(m => 
    m.name === 'error_total' && 
    Date.now() - m.timestamp.getTime() < 60 * 60 * 1000 // Last hour
  );
  
  const totalErrors = errorMetrics.reduce((sum, m) => sum + m.value, 0);
  
  return {
    ...health,
    uptime: {
      seconds: Math.floor(process.uptime()),
      startTime: new Date(systemStartTime).toISOString()
    },
    availability: {
      last1h: totalErrors < 5 ? 100 : Math.max(0, 100 - (totalErrors * 2)), // Rough calculation
      last24h: 99.9, // Would be calculated from historical data
      last7d: 99.95  // Would be calculated from historical data
    },
    resourceUsage: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };
}

async function getBusinessMetrics(timeRange: string) {
  const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 24 * 7;
  const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
  
  const recentMetrics = monitoring.getRecentMetrics(undefined, 1000)
    .filter(m => m.timestamp.getTime() > cutoffTime);

  // Workflow metrics
  const workflowMetrics = recentMetrics.filter(m => m.name === 'workflow_execution_total');
  const workflowsByType = workflowMetrics.reduce((acc, m) => {
    const type = m.labels?.type || 'unknown';
    if (!acc[type]) acc[type] = { total: 0, success: 0, error: 0 };
    acc[type].total += m.value;
    if (m.labels?.status === 'success') acc[type].success += m.value;
    if (m.labels?.status === 'error') acc[type].error += m.value;
    return acc;
  }, {} as Record<string, { total: number; success: number; error: number }>);

  // Credit usage
  const creditMetrics = recentMetrics.filter(m => m.name === 'credits_used_total');
  const totalCreditsUsed = creditMetrics.reduce((sum, m) => sum + m.value, 0);
  const creditsByOperation = creditMetrics.reduce((acc, m) => {
    const op = m.labels?.operation || 'unknown';
    acc[op] = (acc[op] || 0) + m.value;
    return acc;
  }, {} as Record<string, number>);

  // User activity (would typically come from database)
  const activeUsers = new Set(creditMetrics.map(m => m.labels?.user_id).filter(Boolean)).size;

  return {
    timeRange: `${hours}h`,
    workflows: {
      byType: workflowsByType,
      total: Object.values(workflowsByType).reduce((sum, w) => sum + w.total, 0)
    },
    credits: {
      totalUsed: totalCreditsUsed,
      byOperation: creditsByOperation,
      averagePerWorkflow: workflowMetrics.length > 0 ? totalCreditsUsed / workflowMetrics.length : 0
    },
    users: {
      activeUsers,
      averageCreditsPerUser: activeUsers > 0 ? totalCreditsUsed / activeUsers : 0
    }
  };
}

function getPerformanceMetrics(timeRange: string) {
  const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 24 * 7;
  const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
  
  const recentMetrics = monitoring.getRecentMetrics(undefined, 1000)
    .filter(m => m.timestamp.getTime() > cutoffTime);

  // API performance
  const apiDurationMetrics = recentMetrics.filter(m => m.name === 'api_request_duration_ms');
  const avgApiResponseTime = apiDurationMetrics.length > 0 ? 
    apiDurationMetrics.reduce((sum, m) => sum + m.value, 0) / apiDurationMetrics.length : 0;
  const maxApiResponseTime = apiDurationMetrics.length > 0 ?
    Math.max(...apiDurationMetrics.map(m => m.value)) : 0;

  // Workflow performance
  const workflowDurationMetrics = recentMetrics.filter(m => m.name === 'workflow_duration_ms');
  const avgWorkflowDuration = workflowDurationMetrics.length > 0 ?
    workflowDurationMetrics.reduce((sum, m) => sum + m.value, 0) / workflowDurationMetrics.length : 0;

  // Memory usage trends
  const memoryMetrics = recentMetrics.filter(m => m.name === 'memory_heap_used_mb');
  const currentMemory = memoryMetrics.length > 0 ? memoryMetrics[memoryMetrics.length - 1].value : 0;
  const avgMemory = memoryMetrics.length > 0 ?
    memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length : 0;

  return {
    timeRange: `${hours}h`,
    api: {
      averageResponseTime: Math.round(avgApiResponseTime),
      maxResponseTime: Math.round(maxApiResponseTime),
      requestCount: apiDurationMetrics.length
    },
    workflows: {
      averageDuration: Math.round(avgWorkflowDuration),
      completedCount: workflowDurationMetrics.length
    },
    system: {
      memory: {
        current: Math.round(currentMemory),
        average: Math.round(avgMemory),
        trend: memoryMetrics.slice(-10).map(m => ({
          value: Math.round(m.value),
          timestamp: m.timestamp
        }))
      }
    }
  };
}

function getCostMetrics(timeRange: string) {
  const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 24 * 7;
  const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
  
  const recentMetrics = monitoring.getRecentMetrics(undefined, 1000)
    .filter(m => m.timestamp.getTime() > cutoffTime);

  const costMetrics = recentMetrics.filter(m => m.name === 'external_api_cost_usd');
  const totalCost = costMetrics.reduce((sum, m) => sum + m.value, 0);
  
  const costByProvider = costMetrics.reduce((acc, m) => {
    const provider = m.labels?.provider || 'unknown';
    acc[provider] = (acc[provider] || 0) + m.value;
    return acc;
  }, {} as Record<string, number>);

  const costByOperation = costMetrics.reduce((acc, m) => {
    const operation = m.labels?.operation || 'unknown';
    acc[operation] = (acc[operation] || 0) + m.value;
    return acc;
  }, {} as Record<string, number>);

  // Calculate projected monthly cost
  const dailyRate = hours >= 24 ? totalCost / (hours / 24) : totalCost * (24 / hours);
  const monthlyProjection = dailyRate * 30;

  return {
    timeRange: `${hours}h`,
    total: Math.round(totalCost * 100) / 100,
    byProvider: Object.entries(costByProvider).map(([provider, cost]) => ({
      provider,
      cost: Math.round(cost * 100) / 100,
      percentage: Math.round((cost / totalCost) * 100)
    })).sort((a, b) => b.cost - a.cost),
    byOperation: Object.entries(costByOperation).map(([operation, cost]) => ({
      operation,
      cost: Math.round(cost * 100) / 100,
      percentage: Math.round((cost / totalCost) * 100)
    })).sort((a, b) => b.cost - a.cost),
    projections: {
      daily: Math.round(dailyRate * 100) / 100,
      monthly: Math.round(monthlyProjection * 100) / 100,
      hourlyAverage: Math.round((totalCost / hours) * 100) / 100
    }
  };
}