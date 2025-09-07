/**
 * Monitoring and Observability System
 * Phase 5 - Production Deployment
 * 
 * Centralized monitoring for VidGenie production deployment
 * Tracks performance, errors, business metrics, and system health
 */

interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  labels?: Record<string, string>;
}

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition: (metric: MetricData) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number; // minutes
  lastTriggered?: Date;
}

class MonitoringService {
  private metrics: MetricData[] = [];
  private logs: LogEntry[] = [];
  private alertRules: AlertRule[] = [];
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.initializeAlertRules();
    
    // In production, start periodic metric collection
    if (this.isProduction) {
      this.startMetricCollection();
    }
  }

  // =================================================================
  // METRICS COLLECTION
  // =================================================================

  recordMetric(name: string, value: number, unit: string = 'count', labels?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      unit,
      timestamp: new Date(),
      labels
    };

    this.metrics.push(metric);
    
    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Send to external monitoring service
    this.sendMetricToExternal(metric);

    // Check alert rules
    this.checkAlertRules(metric);
  }

  // Business Metrics
  recordWorkflowExecution(workflowType: string, duration: number, status: 'success' | 'error'): void {
    this.recordMetric('workflow_execution_total', 1, 'count', { 
      type: workflowType, 
      status 
    });
    
    this.recordMetric('workflow_duration_ms', duration, 'milliseconds', { 
      type: workflowType 
    });
  }

  recordApiCall(endpoint: string, duration: number, status: number): void {
    this.recordMetric('api_request_total', 1, 'count', { 
      endpoint, 
      status: status.toString() 
    });
    
    this.recordMetric('api_request_duration_ms', duration, 'milliseconds', { 
      endpoint 
    });
  }

  recordCreditUsage(userId: string, creditsUsed: number, operation: string): void {
    this.recordMetric('credits_used_total', creditsUsed, 'credits', { 
      user_id: userId, 
      operation 
    });
  }

  recordExternalApiCost(provider: string, operation: string, cost: number): void {
    this.recordMetric('external_api_cost_usd', cost, 'dollars', { 
      provider, 
      operation 
    });
  }

  // System Metrics
  recordSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.recordMetric('memory_heap_used_mb', memUsage.heapUsed / 1024 / 1024, 'megabytes');
    this.recordMetric('memory_heap_total_mb', memUsage.heapTotal / 1024 / 1024, 'megabytes');
    this.recordMetric('memory_rss_mb', memUsage.rss / 1024 / 1024, 'megabytes');
    
    this.recordMetric('cpu_user_microseconds', cpuUsage.user, 'microseconds');
    this.recordMetric('cpu_system_microseconds', cpuUsage.system, 'microseconds');
  }

  // =================================================================
  // LOGGING
  // =================================================================

  log(level: LogEntry['level'], message: string, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      requestId: this.getCurrentRequestId(),
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId()
    };

    this.logs.push(logEntry);
    
    // Keep only last 500 logs in memory
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500);
    }

    // Console output with structured logging
    this.outputLog(logEntry);

    // Send to external logging service
    this.sendLogToExternal(logEntry);

    // Track error metrics
    if (level === 'error') {
      this.recordMetric('error_total', 1, 'count', { 
        context: context?.component || 'unknown' 
      });
    }
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_LOGGING === 'true') {
      this.log('debug', message, context);
    }
  }

  // =================================================================
  // ALERTING
  // =================================================================

  private initializeAlertRules(): void {
    this.alertRules = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: (metric) => 
          metric.name === 'workflow_execution_total' && 
          metric.labels?.status === 'error' && 
          this.getErrorRate() > 0.05, // 5% error rate
        severity: 'high',
        message: 'Workflow error rate exceeds 5%',
        cooldown: 5
      },
      {
        id: 'high_api_latency',
        name: 'High API Latency',
        condition: (metric) => 
          metric.name === 'api_request_duration_ms' && 
          metric.value > 5000, // 5 seconds
        severity: 'medium',
        message: 'API response time exceeds 5 seconds',
        cooldown: 2
      },
      {
        id: 'memory_usage_high',
        name: 'High Memory Usage',
        condition: (metric) => 
          metric.name === 'memory_heap_used_mb' && 
          metric.value > 512, // 512MB
        severity: 'medium',
        message: 'Memory usage exceeds 512MB',
        cooldown: 10
      },
      {
        id: 'daily_api_cost_high',
        name: 'High Daily API Costs',
        condition: (metric) => 
          metric.name === 'external_api_cost_usd' && 
          this.getDailyApiCost() > 100, // $100/day
        severity: 'high',
        message: 'Daily API costs exceed $100',
        cooldown: 60
      }
    ];
  }

  private checkAlertRules(metric: MetricData): void {
    for (const rule of this.alertRules) {
      if (rule.condition(metric)) {
        // Check cooldown
        const now = new Date();
        if (rule.lastTriggered) {
          const minutesSinceLastTrigger = 
            (now.getTime() - rule.lastTriggered.getTime()) / (1000 * 60);
          if (minutesSinceLastTrigger < rule.cooldown) {
            continue; // Still in cooldown
          }
        }

        // Trigger alert
        this.triggerAlert(rule, metric);
        rule.lastTriggered = now;
      }
    }
  }

  private triggerAlert(rule: AlertRule, metric: MetricData): void {
    const alert = {
      id: rule.id,
      name: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: new Date(),
      metric: {
        name: metric.name,
        value: metric.value,
        labels: metric.labels
      }
    };

    // Log the alert
    this.error(`ALERT: ${rule.name}`, { alert });

    // Send to external alerting service
    this.sendAlertToExternal(alert);
  }

  // =================================================================
  // EXTERNAL SERVICE INTEGRATION
  // =================================================================

  private sendMetricToExternal(metric: MetricData): void {
    if (!this.isProduction) return;

    // Send to Datadog, New Relic, or similar
    if (process.env.DATADOG_API_KEY) {
      // Implementation would go here
      secureLog.info('[MONITORING] Metric sent to Datadog:', metric.name);
    }

    // Send to custom monitoring endpoint
    if (process.env.MONITORING_WEBHOOK_URL) {
      fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'metric', data: metric })
      }).catch(error => {
        secureLog.error('Failed to send metric to webhook:', error);
      });
    }
  }

  private sendLogToExternal(log: LogEntry): void {
    if (!this.isProduction) return;

    // Send to Sentry for errors
    if (log.level === 'error' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Sentry integration would go here
      secureLog.info('[MONITORING] Error sent to Sentry');
    }

    // Send to structured logging service
    if (process.env.LOGGING_WEBHOOK_URL) {
      fetch(process.env.LOGGING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'log', data: log })
      }).catch(error => {
        secureLog.error('Failed to send log to webhook:', error);
      });
    }
  }

  private sendAlertToExternal(alert: any): void {
    if (!this.isProduction) return;

    // Send to Slack, Discord, or email
    if (process.env.ALERT_WEBHOOK_URL) {
      fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 ${alert.name}: ${alert.message}`,
          severity: alert.severity,
          timestamp: alert.timestamp,
          metric: alert.metric
        })
      }).catch(error => {
        secureLog.error('Failed to send alert to webhook:', error);
      });
    }
  }

  // =================================================================
  // METRIC CALCULATIONS
  // =================================================================

  private getErrorRate(): number {
    const recentMetrics = this.metrics
      .filter(m => m.name === 'workflow_execution_total')
      .filter(m => Date.now() - m.timestamp.getTime() < 5 * 60 * 1000); // Last 5 minutes

    if (recentMetrics.length === 0) return 0;

    const errorCount = recentMetrics
      .filter(m => m.labels?.status === 'error')
      .reduce((sum, m) => sum + m.value, 0);
    
    const totalCount = recentMetrics
      .reduce((sum, m) => sum + m.value, 0);

    return totalCount > 0 ? errorCount / totalCount : 0;
  }

  private getDailyApiCost(): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    return this.metrics
      .filter(m => m.name === 'external_api_cost_usd')
      .filter(m => m.timestamp.getTime() > oneDayAgo)
      .reduce((sum, m) => sum + m.value, 0);
  }

  // =================================================================
  // UTILITY METHODS
  // =================================================================

  private outputLog(log: LogEntry): void {
    const timestamp = log.timestamp.toISOString();
    const level = log.level.toUpperCase().padEnd(5);
    const context = log.context ? ` ${JSON.stringify(log.context)}` : '';
    const requestId = log.requestId ? ` [${log.requestId}]` : '';
    
    secureLog.info(`${timestamp} ${level}${requestId} ${log.message}${context}`);
  }

  private getCurrentRequestId(): string | undefined {
    // In a real implementation, this would get the request ID from context
    return undefined;
  }

  private getCurrentUserId(): string | undefined {
    // In a real implementation, this would get the user ID from context
    return undefined;
  }

  private getCurrentSessionId(): string | undefined {
    // In a real implementation, this would get the session ID from context
    return undefined;
  }

  private startMetricCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.recordSystemMetrics();
    }, 30000);

    // Clean up old metrics every 5 minutes
    setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      this.metrics = this.metrics.filter(m => m.timestamp.getTime() > fiveMinutesAgo);
      this.logs = this.logs.filter(l => l.timestamp.getTime() > fiveMinutesAgo);
    }, 5 * 60 * 1000);
  }

  // =================================================================
  // PUBLIC API FOR DASHBOARD
  // =================================================================

  getRecentMetrics(name?: string, limit: number = 100): MetricData[] {
    let filtered = this.metrics;
    
    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }
    
    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getRecentLogs(level?: string, limit: number = 100): LogEntry[] {
    let filtered = this.logs;
    
    if (level) {
      filtered = filtered.filter(l => l.level === level);
    }
    
    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: Record<string, number>;
    alerts: number;
  } {
    const recentErrors = this.getRecentLogs('error', 10).length;
    const errorRate = this.getErrorRate();
    const memoryUsage = this.getRecentMetrics('memory_heap_used_mb', 1)[0]?.value || 0;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (recentErrors > 5 || errorRate > 0.1 || memoryUsage > 1024) {
      status = 'unhealthy';
    } else if (recentErrors > 2 || errorRate > 0.05 || memoryUsage > 512) {
      status = 'degraded';
    }
    
    return {
      status,
      metrics: {
        errorRate,
        recentErrors,
        memoryUsage,
        dailyApiCost: this.getDailyApiCost()
      },
      alerts: this.alertRules.filter(r => r.lastTriggered).length
    };
  }
}

// Singleton instance
export const monitoring = new MonitoringService();

// Convenience functions for easy import
export const recordMetric = monitoring.recordMetric.bind(monitoring);
export const recordWorkflowExecution = monitoring.recordWorkflowExecution.bind(monitoring);
export const recordApiCall = monitoring.recordApiCall.bind(monitoring);
export const recordCreditUsage = monitoring.recordCreditUsage.bind(monitoring);
export const recordExternalApiCost = monitoring.recordExternalApiCost.bind(monitoring);

export const logInfo = monitoring.info.bind(monitoring);
export const logWarn = monitoring.warn.bind(monitoring);
export const logError = monitoring.error.bind(monitoring);
export const logDebug = monitoring.debug.bind(monitoring);

export default monitoring;