/**
 * Système d'alertes intelligentes et prédictives
 * PHASE 8.2 - Alertes basées sur les métriques business
 */

import { PrismaClient } from '@prisma/client';
import BusinessMetricsCollector, { BusinessKPIs } from './business-metrics';
import { secureLog } from '../secure-logger';

// Types d'alertes
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metricPath: string; // Ex: "users.churnRate", "performance.errorRate"
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  channels: AlertChannel[];
  conditions?: AlertCondition[];
  createdBy: string;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface AlertCondition {
  metricPath: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  logicalOperator?: 'AND' | 'OR';
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  target: string; // email, webhook URL, phone, etc.
  enabled: boolean;
}

export interface AlertInstance {
  id: string;
  ruleId: string;
  severity: AlertRule['severity'];
  title: string;
  message: string;
  metricValue: number;
  threshold: number;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface PredictiveInsight {
  type: 'trend' | 'anomaly' | 'forecast';
  metricPath: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  confidence: number; // 0-1
  predictedValue?: number;
  timeframe: string; // "24h", "7d", etc.
  recommendations: string[];
  data: Record<string, any>;
}

/**
 * Système d'alertes intelligent avec apprentissage
 */
export class SmartAlertSystem {
  private prisma: PrismaClient;
  private metricsCollector: BusinessMetricsCollector;
  private rules: Map<string, AlertRule> = new Map();
  private lastTriggerTimes: Map<string, number> = new Map();
  private historicalData: Array<{ timestamp: Date; metrics: BusinessKPIs }> = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.metricsCollector = new BusinessMetricsCollector(prisma);
    this.loadAlertRules();
  }

  /**
   * Charge les règles d'alerte depuis la base de données
   */
  private async loadAlertRules(): Promise<void> {
    // TODO: Charger depuis la base de données
    // Pour l'instant, on utilise des règles par défaut
    this.addDefaultRules();
  }

  /**
   * Ajoute les règles d'alerte par défaut
   */
  private addDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-churn-rate',
        name: 'Taux de churn élevé',
        description: 'Alerte quand le taux de churn dépasse 15%',
        metricPath: 'users.churnRate',
        operator: '>',
        threshold: 15,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 60,
        channels: [
          { type: 'email', target: 'admin@vidgenie.com', enabled: true },
          { type: 'slack', target: '#alerts-business', enabled: true }
        ],
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'critical-churn-rate',
        name: 'Taux de churn critique',
        description: 'Alerte critique quand le taux de churn dépasse 25%',
        metricPath: 'users.churnRate',
        operator: '>',
        threshold: 25,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 30,
        channels: [
          { type: 'email', target: 'admin@vidgenie.com', enabled: true },
          { type: 'slack', target: '#alerts-critical', enabled: true }
        ],
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'high-error-rate',
        name: 'Taux d\'erreur élevé',
        description: 'Alerte quand le taux d\'erreur dépasse 5%',
        metricPath: 'performance.errorRate',
        operator: '>',
        threshold: 5,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 15,
        channels: [
          { type: 'email', target: 'tech@vidgenie.com', enabled: true },
          { type: 'slack', target: '#alerts-tech', enabled: true }
        ],
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'critical-error-rate',
        name: 'Taux d\'erreur critique',
        description: 'Alerte critique quand le taux d\'erreur dépasse 10%',
        metricPath: 'performance.errorRate',
        operator: '>',
        threshold: 10,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
        channels: [
          { type: 'email', target: 'tech@vidgenie.com', enabled: true },
          { type: 'slack', target: '#alerts-critical', enabled: true }
        ],
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'low-conversion-rate',
        name: 'Taux de conversion faible',
        description: 'Alerte quand le taux de conversion chute sous 3%',
        metricPath: 'revenue.conversionRate',
        operator: '<',
        threshold: 3,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 120,
        channels: [
          { type: 'email', target: 'marketing@vidgenie.com', enabled: true }
        ],
        createdBy: 'system',
        createdAt: new Date(),
      },
      {
        id: 'no-new-users',
        name: 'Absence de nouveaux utilisateurs',
        description: 'Alerte quand aucun nouvel utilisateur pendant 24h',
        metricPath: 'users.newUsers',
        operator: '==',
        threshold: 0,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 480, // 8h
        channels: [
          { type: 'email', target: 'marketing@vidgenie.com', enabled: true }
        ],
        conditions: [
          {
            metricPath: 'users.totalUsers',
            operator: '>',
            value: 10 // Seulement si on a déjà des utilisateurs
          }
        ],
        createdBy: 'system',
        createdAt: new Date(),
      },
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    secureLog.info('Default alert rules loaded', { count: defaultRules.length });
  }

  /**
   * Vérifie les alertes sur les métriques actuelles
   */
  async checkAlerts(): Promise<AlertInstance[]> {
    try {
      const metrics = await this.metricsCollector.collectAllMetrics();
      const triggeredAlerts: AlertInstance[] = [];

      // Sauvegarder les métriques pour l'historique
      this.historicalData.push({
        timestamp: new Date(),
        metrics
      });

      // Garder seulement les 1000 derniers points
      if (this.historicalData.length > 1000) {
        this.historicalData = this.historicalData.slice(-1000);
      }

      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue;

        // Vérifier le cooldown
        const lastTrigger = this.lastTriggerTimes.get(rule.id) || 0;
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - lastTrigger < cooldownMs) {
          continue;
        }

        // Évaluer la règle
        const alert = await this.evaluateRule(rule, metrics);
        if (alert) {
          triggeredAlerts.push(alert);
          this.lastTriggerTimes.set(rule.id, Date.now());

          // Envoyer les notifications
          await this.sendAlert(alert, rule);

          secureLog.security('Alert triggered', {
            ruleId: rule.id,
            severity: alert.severity,
            metricValue: alert.metricValue,
            threshold: alert.threshold,
          });
        }
      }

      return triggeredAlerts;

    } catch (error) {
      secureLog.error('Failed to check alerts', { error });
      return [];
    }
  }

  /**
   * Évalue une règle d'alerte
   */
  private async evaluateRule(rule: AlertRule, metrics: BusinessKPIs): Promise<AlertInstance | null> {
    const metricValue = this.getMetricValue(rule.metricPath, metrics);
    if (metricValue === null) return null;

    // Vérifier les conditions additionnelles
    if (rule.conditions) {
      for (const condition of rule.conditions) {
        const conditionValue = this.getMetricValue(condition.metricPath, metrics);
        if (conditionValue === null) return null;

        if (!this.evaluateCondition(conditionValue, condition.operator, condition.value)) {
          return null; // Condition non remplie
        }
      }
    }

    // Évaluer la condition principale
    if (!this.evaluateCondition(metricValue, rule.operator, rule.threshold)) {
      return null;
    }

    // Créer l'alerte
    const alertId = crypto.randomUUID();
    const alert: AlertInstance = {
      id: alertId,
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, metricValue),
      metricValue,
      threshold: rule.threshold,
      timestamp: new Date(),
      status: 'active',
      metadata: {
        metricPath: rule.metricPath,
        operator: rule.operator,
      },
    };

    // Sauvegarder l'alerte
    // TODO: Persister en base de données

    return alert;
  }

  /**
   * Récupère une valeur de métrique par son chemin
   */
  private getMetricValue(path: string, metrics: BusinessKPIs): number | null {
    try {
      const parts = path.split('.');
      let value: any = metrics;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return null;
        }
      }

      return typeof value === 'number' ? value : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Évalue une condition
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  /**
   * Génère le message d'alerte
   */
  private generateAlertMessage(rule: AlertRule, value: number): string {
    const operatorText = {
      '>': 'supérieur à',
      '<': 'inférieur à',
      '>=': 'supérieur ou égal à',
      '<=': 'inférieur ou égal à',
      '==': 'égal à',
      '!=': 'différent de'
    };

    return `${rule.description}\n\nValeur actuelle: ${value.toFixed(2)}\nSeuil: ${operatorText[rule.operator]} ${rule.threshold}`;
  }

  /**
   * Envoie les notifications d'alerte
   */
  private async sendAlert(alert: AlertInstance, rule: AlertRule): Promise<void> {
    for (const channel of rule.channels) {
      if (!channel.enabled) continue;

      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailAlert(alert, channel.target);
            break;
          case 'slack':
            await this.sendSlackAlert(alert, channel.target);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, channel.target);
            break;
          default:
            secureLog.warn('Unknown alert channel type', { type: channel.type });
        }
      } catch (error) {
        secureLog.error('Failed to send alert notification', {
          alertId: alert.id,
          channelType: channel.type,
          target: channel.target,
          error,
        });
      }
    }
  }

  /**
   * Envoie une alerte par email
   */
  private async sendEmailAlert(alert: AlertInstance, email: string): Promise<void> {
    // TODO: Intégrer avec votre service d'email
    secureLog.info('Email alert sent', {
      alertId: alert.id,
      email,
      severity: alert.severity,
    });
  }

  /**
   * Envoie une alerte vers Slack
   */
  private async sendSlackAlert(alert: AlertInstance, channel: string): Promise<void> {
    // TODO: Intégrer avec Slack Webhooks
    const color = alert.severity === 'critical' ? 'danger' : 
                  alert.severity === 'warning' ? 'warning' : 'good';

    secureLog.info('Slack alert sent', {
      alertId: alert.id,
      channel,
      severity: alert.severity,
      color,
    });
  }

  /**
   * Envoie une alerte via webhook
   */
  private async sendWebhookAlert(alert: AlertInstance, webhookUrl: string): Promise<void> {
    // TODO: Envoyer vers webhook externe
    secureLog.info('Webhook alert sent', {
      alertId: alert.id,
      webhookUrl,
      severity: alert.severity,
    });
  }

  /**
   * Analyse prédictive des tendances
   */
  async generatePredictiveInsights(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    if (this.historicalData.length < 10) {
      return insights; // Pas assez de données
    }

    // Analyser les tendances des métriques clés
    const keyMetrics = [
      'users.churnRate',
      'users.newUsers', 
      'revenue.conversionRate',
      'performance.errorRate',
      'content.generationSuccessRate'
    ];

    for (const metricPath of keyMetrics) {
      const values = this.historicalData.map(point => 
        this.getMetricValue(metricPath, point.metrics)
      ).filter(v => v !== null) as number[];

      if (values.length >= 7) {
        const trendInsight = this.analyzeTrend(metricPath, values);
        if (trendInsight) insights.push(trendInsight);

        const anomalyInsight = this.detectAnomaly(metricPath, values);
        if (anomalyInsight) insights.push(anomalyInsight);
      }
    }

    // Prédictions spécifiques
    const churnPrediction = await this.predictChurnRisk();
    if (churnPrediction) insights.push(churnPrediction);

    const revenuePrediction = await this.predictRevenueImpact();
    if (revenuePrediction) insights.push(revenuePrediction);

    return insights;
  }

  /**
   * Analyse la tendance d'une métrique
   */
  private analyzeTrend(metricPath: string, values: number[]): PredictiveInsight | null {
    if (values.length < 7) return null;

    const recent = values.slice(-7); // 7 derniers points
    const previous = values.slice(-14, -7); // 7 points précédents

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    const isIncreasing = change > 5;
    const isDecreasing = change < -5;

    if (!isIncreasing && !isDecreasing) return null;

    // Déterminer la sévérité selon la métrique
    let severity: 'info' | 'warning' | 'critical' = 'info';
    if (metricPath.includes('churnRate') || metricPath.includes('errorRate')) {
      severity = isIncreasing ? (Math.abs(change) > 20 ? 'critical' : 'warning') : 'info';
    } else if (metricPath.includes('conversionRate') || metricPath.includes('newUsers')) {
      severity = isDecreasing ? (Math.abs(change) > 20 ? 'critical' : 'warning') : 'info';
    }

    const recommendations: string[] = [];
    if (metricPath.includes('churnRate') && isIncreasing) {
      recommendations.push('Analyser les causes de départ des utilisateurs');
      recommendations.push('Mettre en place un programme de fidélisation');
      recommendations.push('Améliorer l\'expérience utilisateur');
    } else if (metricPath.includes('conversionRate') && isDecreasing) {
      recommendations.push('Optimiser le parcours de conversion');
      recommendations.push('Réviser les prix et offres');
      recommendations.push('Améliorer les messages marketing');
    }

    return {
      type: 'trend',
      metricPath,
      severity,
      description: `Tendance ${isIncreasing ? 'croissante' : 'décroissante'} détectée sur ${metricPath}: ${change.toFixed(1)}% sur 7 dernières mesures`,
      confidence: Math.min(Math.abs(change) / 50, 1),
      timeframe: '7d',
      recommendations,
      data: {
        change,
        recentAvg,
        previousAvg,
        trend: isIncreasing ? 'up' : 'down',
      },
    };
  }

  /**
   * Détecte les anomalies dans une série de valeurs
   */
  private detectAnomaly(metricPath: string, values: number[]): PredictiveInsight | null {
    if (values.length < 10) return null;

    const lastValue = values[values.length - 1];
    const historical = values.slice(0, -1);
    
    const mean = historical.reduce((a, b) => a + b, 0) / historical.length;
    const variance = historical.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / historical.length;
    const stdDev = Math.sqrt(variance);

    // Détection d'anomalie par z-score
    const zScore = Math.abs((lastValue - mean) / stdDev);
    const isAnomaly = zScore > 2.5; // Plus de 2.5 écarts-types

    if (!isAnomaly) return null;

    const severity: 'info' | 'warning' | 'critical' = zScore > 4 ? 'critical' : 'warning';

    return {
      type: 'anomaly',
      metricPath,
      severity,
      description: `Valeur anormale détectée sur ${metricPath}: ${lastValue.toFixed(2)} (z-score: ${zScore.toFixed(2)})`,
      confidence: Math.min(zScore / 5, 1),
      timeframe: '1d',
      recommendations: [
        'Investiguer les causes de cette variation anormale',
        'Vérifier les données et processus associés',
        'Surveiller étroitement cette métrique',
      ],
      data: {
        value: lastValue,
        mean,
        stdDev,
        zScore,
      },
    };
  }

  /**
   * Prédit le risque de churn
   */
  private async predictChurnRisk(): Promise<PredictiveInsight | null> {
    // Logique de prédiction basée sur plusieurs indicateurs
    const recentMetrics = this.historicalData.slice(-3).map(d => d.metrics);
    if (recentMetrics.length < 3) return null;

    const avgChurnRate = recentMetrics.reduce((acc, m) => acc + m.users.churnRate, 0) / recentMetrics.length;
    const avgNewUsers = recentMetrics.reduce((acc, m) => acc + m.users.newUsers, 0) / recentMetrics.length;
    const avgErrorRate = recentMetrics.reduce((acc, m) => acc + m.performance.errorRate, 0) / recentMetrics.length;

    // Score de risque (0-100)
    let riskScore = 0;
    riskScore += Math.min(avgChurnRate * 2, 40); // Max 40 points
    riskScore += Math.max(0, (5 - avgNewUsers) * 5); // Manque de nouveaux utilisateurs
    riskScore += Math.min(avgErrorRate * 3, 30); // Max 30 points

    if (riskScore < 30) return null; // Risque faible, pas d'alerte

    const severity: 'warning' | 'critical' = riskScore > 60 ? 'critical' : 'warning';

    return {
      type: 'forecast',
      metricPath: 'users.churnPrediction',
      severity,
      description: `Risque de churn élevé détecté (score: ${riskScore.toFixed(0)}/100)`,
      confidence: Math.min(riskScore / 100, 0.9),
      predictedValue: riskScore,
      timeframe: '30d',
      recommendations: [
        'Lancer une campagne de rétention urgente',
        'Identifier et contacter les utilisateurs à risque',
        'Améliorer la stabilité de la plateforme',
        'Proposer des incitations à la fidélité',
      ],
      data: {
        riskScore,
        factors: {
          churnRate: avgChurnRate,
          newUsers: avgNewUsers,
          errorRate: avgErrorRate,
        },
      },
    };
  }

  /**
   * Prédit l'impact sur les revenus
   */
  private async predictRevenueImpact(): Promise<PredictiveInsight | null> {
    const recentMetrics = this.historicalData.slice(-7).map(d => d.metrics);
    if (recentMetrics.length < 7) return null;

    const revenues = recentMetrics.map(m => m.revenue.monthlyRevenue);
    const conversionRates = recentMetrics.map(m => m.revenue.conversionRate);
    
    // Régression linéaire simple pour prédiction
    const trendRevenue = this.calculateLinearTrend(revenues);
    const trendConversion = this.calculateLinearTrend(conversionRates);

    const currentRevenue = revenues[revenues.length - 1];
    const predictedRevenue = currentRevenue + (trendRevenue * 30); // Prédiction 30 jours

    const impactPercent = ((predictedRevenue - currentRevenue) / currentRevenue) * 100;

    if (Math.abs(impactPercent) < 10) return null; // Impact faible

    const severity: 'info' | 'warning' | 'critical' = 
      Math.abs(impactPercent) > 25 ? 'critical' : 
      Math.abs(impactPercent) > 15 ? 'warning' : 'info';

    return {
      type: 'forecast',
      metricPath: 'revenue.monthlyRevenue',
      severity,
      description: `Impact sur les revenus prévu: ${impactPercent > 0 ? '+' : ''}${impactPercent.toFixed(1)}% sur 30 jours`,
      confidence: 0.7,
      predictedValue: predictedRevenue,
      timeframe: '30d',
      recommendations: impactPercent < 0 ? [
        'Analyser la baisse de conversion',
        'Revoir la stratégie pricing',
        'Améliorer l\'onboarding utilisateur',
        'Lancer des promotions ciblées',
      ] : [
        'Capitaliser sur la croissance',
        'Augmenter les investissements marketing',
        'Préparer l\'infrastructure pour la croissance',
      ],
      data: {
        currentRevenue,
        predictedRevenue,
        impactPercent,
        trend: trendRevenue,
      },
    };
  }

  /**
   * Calcule la tendance linéaire d'une série de valeurs
   */
  private calculateLinearTrend(values: number[]): number {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((acc, val, idx) => acc + (val * idx), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  /**
   * Ajoute une nouvelle règle d'alerte
   */
  async addRule(rule: Omit<AlertRule, 'id' | 'createdAt'>): Promise<string> {
    const ruleId = crypto.randomUUID();
    const fullRule: AlertRule = {
      id: ruleId,
      createdAt: new Date(),
      ...rule,
    };

    this.rules.set(ruleId, fullRule);
    
    // TODO: Sauvegarder en base de données

    secureLog.security('Alert rule created', {
      ruleId,
      name: rule.name,
      metricPath: rule.metricPath,
      severity: rule.severity,
    });

    return ruleId;
  }

  /**
   * Met à jour une règle d'alerte
   */
  async updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<boolean> {
    const existingRule = this.rules.get(ruleId);
    if (!existingRule) return false;

    const updatedRule = { ...existingRule, ...updates };
    this.rules.set(ruleId, updatedRule);

    // TODO: Sauvegarder en base de données

    secureLog.security('Alert rule updated', { ruleId, updates });
    return true;
  }

  /**
   * Supprime une règle d'alerte
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const deleted = this.rules.delete(ruleId);
    
    if (deleted) {
      // TODO: Supprimer de la base de données
      secureLog.security('Alert rule deleted', { ruleId });
    }

    return deleted;
  }

  /**
   * Récupère toutes les règles d'alerte
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Acquitte une alerte
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    // TODO: Marquer l'alerte comme acquittée en base de données
    secureLog.security('Alert acknowledged', { alertId, userId });
    return true;
  }

  /**
   * Résout une alerte
   */
  async resolveAlert(alertId: string, userId: string): Promise<boolean> {
    // TODO: Marquer l'alerte comme résolue en base de données
    secureLog.security('Alert resolved', { alertId, userId });
    return true;
  }
}

export default SmartAlertSystem;