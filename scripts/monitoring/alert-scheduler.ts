/**
 * Planificateur d'alertes - Cron job pour vérifier les alertes
 * PHASE 8.2 - Automation des alertes
 */

import { PrismaClient } from '@prisma/client';
import SmartAlertSystem from '../../src/lib/monitoring/alert-system';
import { secureLog } from '../../src/lib/secure-logger';

// Configuration
const ALERT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const INSIGHT_GENERATION_INTERVAL = 60 * 60 * 1000; // 1 heure
const HEALTH_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

class AlertScheduler {
  private prisma: PrismaClient;
  private alertSystem: SmartAlertSystem;
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  constructor() {
    this.prisma = new PrismaClient();
    this.alertSystem = new SmartAlertSystem(this.prisma);
  }

  /**
   * Démarre le planificateur
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      secureLog.warn('Alert scheduler already running');
      return;
    }

    this.isRunning = true;
    secureLog.info('Starting alert scheduler', {
      alertCheckInterval: ALERT_CHECK_INTERVAL,
      insightInterval: INSIGHT_GENERATION_INTERVAL,
      healthCheckInterval: HEALTH_CHECK_INTERVAL,
    });

    // Vérification immédiate
    await this.checkAlerts();
    await this.generateInsights();
    await this.performHealthCheck();

    // Planifier les vérifications périodiques
    this.intervals.push(
      setInterval(() => this.checkAlerts(), ALERT_CHECK_INTERVAL)
    );

    this.intervals.push(
      setInterval(() => this.generateInsights(), INSIGHT_GENERATION_INTERVAL)
    );

    this.intervals.push(
      setInterval(() => this.performHealthCheck(), HEALTH_CHECK_INTERVAL)
    );

    // Gestionnaire de signaux pour arrêt propre
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    secureLog.info('Alert scheduler started successfully');
  }

  /**
   * Arrête le planificateur
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    secureLog.info('Stopping alert scheduler...');
    this.isRunning = false;

    // Nettoyer les intervalles
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    // Fermer la connexion Prisma
    await this.prisma.$disconnect();

    secureLog.info('Alert scheduler stopped');
    process.exit(0);
  }

  /**
   * Vérifie les alertes
   */
  private async checkAlerts(): Promise<void> {
    try {
      const startTime = Date.now();
      const triggeredAlerts = await this.alertSystem.checkAlerts();
      const duration = Date.now() - startTime;

      secureLog.info('Alert check completed', {
        triggeredAlerts: triggeredAlerts.length,
        criticalAlerts: triggeredAlerts.filter(a => a.severity === 'critical').length,
        warningAlerts: triggeredAlerts.filter(a => a.severity === 'warning').length,
        duration,
      });

      // Log des alertes critiques
      const criticalAlerts = triggeredAlerts.filter(a => a.severity === 'critical');
      if (criticalAlerts.length > 0) {
        secureLog.security('Critical alerts triggered', {
          count: criticalAlerts.length,
          alerts: criticalAlerts.map(a => ({
            id: a.id,
            title: a.title,
            metricValue: a.metricValue,
            threshold: a.threshold,
          })),
        });
      }

    } catch (error) {
      secureLog.error('Alert check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Génère les insights prédictifs
   */
  private async generateInsights(): Promise<void> {
    try {
      const startTime = Date.now();
      const insights = await this.alertSystem.generatePredictiveInsights();
      const duration = Date.now() - startTime;

      secureLog.info('Insight generation completed', {
        totalInsights: insights.length,
        trendInsights: insights.filter(i => i.type === 'trend').length,
        anomalyInsights: insights.filter(i => i.type === 'anomaly').length,
        forecastInsights: insights.filter(i => i.type === 'forecast').length,
        criticalInsights: insights.filter(i => i.severity === 'critical').length,
        duration,
      });

      // Log des insights critiques
      const criticalInsights = insights.filter(i => i.severity === 'critical');
      if (criticalInsights.length > 0) {
        secureLog.warn('Critical predictive insights detected', {
          count: criticalInsights.length,
          insights: criticalInsights.map(i => ({
            type: i.type,
            metricPath: i.metricPath,
            description: i.description,
            confidence: i.confidence,
          })),
        });
      }

    } catch (error) {
      secureLog.error('Insight generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Effectue un contrôle de santé du système d'alertes
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const rules = this.alertSystem.getAllRules();
      const enabledRules = rules.filter(r => r.enabled);
      
      // Vérifier la configuration des règles
      let issuesFound = 0;
      const issues: string[] = [];

      // Vérifier les règles sans canaux
      const rulesWithoutChannels = enabledRules.filter(r => r.channels.length === 0);
      if (rulesWithoutChannels.length > 0) {
        issuesFound += rulesWithoutChannels.length;
        issues.push(`${rulesWithoutChannels.length} règles sans canaux de notification`);
      }

      // Vérifier les canaux invalides
      const rulesWithInvalidChannels = enabledRules.filter(r => 
        r.channels.some(c => !c.target.trim() || !c.enabled)
      );
      if (rulesWithInvalidChannels.length > 0) {
        issuesFound += rulesWithInvalidChannels.length;
        issues.push(`${rulesWithInvalidChannels.length} règles avec canaux invalides`);
      }

      // Vérifier les métriques orphelines
      const validMetricPaths = [
        'users.totalUsers', 'users.activeUsers', 'users.newUsers', 'users.churnRate',
        'content.totalAssets', 'content.assetsGenerated', 'content.generationSuccessRate',
        'revenue.monthlyRevenue', 'revenue.conversionRate', 'revenue.averageRevenuePerUser',
        'performance.errorRate', 'performance.averageResponseTime', 'performance.uptime'
      ];
      
      const rulesWithInvalidMetrics = enabledRules.filter(r => 
        !validMetricPaths.includes(r.metricPath)
      );
      if (rulesWithInvalidMetrics.length > 0) {
        issuesFound += rulesWithInvalidMetrics.length;
        issues.push(`${rulesWithInvalidMetrics.length} règles avec métriques invalides`);
      }

      // Vérifier l'état de la base de données
      try {
        await this.prisma.$queryRaw`SELECT 1`;
      } catch (dbError) {
        issuesFound++;
        issues.push('Connexion base de données échouée');
      }

      const healthStatus = {
        healthy: issuesFound === 0,
        totalRules: rules.length,
        enabledRules: enabledRules.length,
        issuesFound,
        issues,
        lastCheck: new Date().toISOString(),
      };

      if (issuesFound > 0) {
        secureLog.warn('Alert system health issues detected', healthStatus);
      } else {
        secureLog.info('Alert system health check passed', {
          totalRules: rules.length,
          enabledRules: enabledRules.length,
        });
      }

      // Auto-correction des problèmes mineurs
      await this.autoCorrectIssues(rulesWithoutChannels, rulesWithInvalidChannels);

    } catch (error) {
      secureLog.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Auto-correction de certains problèmes
   */
  private async autoCorrectIssues(
    rulesWithoutChannels: any[],
    rulesWithInvalidChannels: any[]
  ): Promise<void> {
    try {
      let corrected = 0;

      // Désactiver les règles sans canaux valides
      for (const rule of rulesWithoutChannels) {
        await this.alertSystem.updateRule(rule.id, { enabled: false });
        corrected++;
        secureLog.warn('Auto-disabled rule without channels', { ruleId: rule.id, ruleName: rule.name });
      }

      // Désactiver les canaux invalides
      for (const rule of rulesWithInvalidChannels) {
        const validChannels = rule.channels.filter((c: any) => c.target.trim() && c.enabled);
        if (validChannels.length === 0) {
          await this.alertSystem.updateRule(rule.id, { enabled: false });
          corrected++;
          secureLog.warn('Auto-disabled rule with all invalid channels', { ruleId: rule.id });
        } else {
          await this.alertSystem.updateRule(rule.id, { channels: validChannels });
          corrected++;
          secureLog.info('Auto-corrected rule channels', { ruleId: rule.id, validChannels: validChannels.length });
        }
      }

      if (corrected > 0) {
        secureLog.info('Auto-correction completed', { issuesCorrected: corrected });
      }

    } catch (error) {
      secureLog.error('Auto-correction failed', { error });
    }
  }

  /**
   * Statistiques du planificateur
   */
  async getStats(): Promise<{
    uptime: number;
    isRunning: boolean;
    totalRules: number;
    enabledRules: number;
    lastAlertCheck?: string;
    lastInsightGeneration?: string;
  }> {
    const rules = this.alertSystem.getAllRules();
    
    return {
      uptime: process.uptime(),
      isRunning: this.isRunning,
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      // TODO: Ajouter timestamps des dernières opérations
    };
  }

  /**
   * Rapport de status du système
   */
  async generateStatusReport(): Promise<void> {
    try {
      const stats = await this.getStats();
      const rules = this.alertSystem.getAllRules();
      
      // Grouper par sévérité
      const rulesBySeverity = {
        critical: rules.filter(r => r.severity === 'critical').length,
        warning: rules.filter(r => r.severity === 'warning').length,
        info: rules.filter(r => r.severity === 'info').length,
      };

      // Grouper par métrique
      const rulesByMetric: Record<string, number> = {};
      rules.forEach(rule => {
        const category = rule.metricPath.split('.')[0];
        rulesByMetric[category] = (rulesByMetric[category] || 0) + 1;
      });

      const report = {
        timestamp: new Date().toISOString(),
        system: {
          status: this.isRunning ? 'running' : 'stopped',
          uptime: Math.floor(stats.uptime),
          version: process.env.npm_package_version || 'unknown',
        },
        rules: {
          total: stats.totalRules,
          enabled: stats.enabledRules,
          disabled: stats.totalRules - stats.enabledRules,
          bySeverity: rulesBySeverity,
          byCategory: rulesByMetric,
        },
      };

      secureLog.info('Alert system status report', report);

    } catch (error) {
      secureLog.error('Failed to generate status report', { error });
    }
  }
}

// Point d'entrée du script
async function main() {
  const scheduler = new AlertScheduler();
  
  // Gestion des arguments de ligne de commande
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      await scheduler.start();
      break;
      
    case 'check':
      console.log('Running one-time alert check...');
      await scheduler.start();
      // Le scheduler se stoppera après les vérifications
      setTimeout(() => scheduler.stop(), 10000);
      break;
      
    case 'status':
      const stats = await scheduler.getStats();
      console.log('Alert System Status:', JSON.stringify(stats, null, 2));
      process.exit(0);
      break;
      
    case 'report':
      await scheduler.generateStatusReport();
      process.exit(0);
      break;
      
    default:
      console.log('Usage: node alert-scheduler.ts <command>');
      console.log('Commands:');
      console.log('  start  - Start the alert scheduler daemon');
      console.log('  check  - Run one-time alert check');
      console.log('  status - Show system status');
      console.log('  report - Generate status report');
      process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { AlertScheduler };
export default AlertScheduler;