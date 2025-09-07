/**
 * API pour le système d'alertes
 * PHASE 8.2 - Gestion des alertes et règles
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/server/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import SmartAlertSystem from '@/lib/monitoring/alert-system';
import { secureLog } from '@/lib/secure-logger';

const prisma = new PrismaClient();
const alertSystem = new SmartAlertSystem(prisma);

// Validation des données
const alertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  metricPath: z.string().min(1),
  operator: z.enum(['>', '<', '>=', '<=', '==', '!=']),
  threshold: z.number(),
  severity: z.enum(['info', 'warning', 'critical']),
  enabled: z.boolean().default(true),
  cooldownMinutes: z.number().min(1).max(1440).default(60),
  channels: z.array(z.object({
    type: z.enum(['email', 'slack', 'webhook', 'sms']),
    target: z.string().min(1),
    enabled: z.boolean().default(true),
  })).min(1),
  conditions: z.array(z.object({
    metricPath: z.string(),
    operator: z.enum(['>', '<', '>=', '<=', '==', '!=']),
    value: z.number(),
    logicalOperator: z.enum(['AND', 'OR']).optional(),
  })).optional(),
});

const alertActionSchema = z.object({
  action: z.enum(['acknowledge', 'resolve']),
  alertId: z.string().uuid(),
});

/**
 * GET /api/alerts
 * Récupère les règles d'alerte ou déclenche la vérification
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // TODO: Vérifier les permissions admin
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'check':
        // Déclencher la vérification des alertes
        const alerts = await alertSystem.checkAlerts();
        const insights = await alertSystem.generatePredictiveInsights();
        
        return NextResponse.json({
          success: true,
          alerts,
          insights,
          summary: {
            activeAlerts: alerts.length,
            criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
            warningAlerts: alerts.filter(a => a.severity === 'warning').length,
            predictions: insights.length,
          }
        });

      case 'rules':
        // Récupérer toutes les règles
        const rules = alertSystem.getAllRules();
        return NextResponse.json({
          success: true,
          rules,
          count: rules.length,
        });

      case 'insights':
        // Récupérer les insights prédictifs
        const predictiveInsights = await alertSystem.generatePredictiveInsights();
        return NextResponse.json({
          success: true,
          insights: predictiveInsights,
          count: predictiveInsights.length,
        });

      default:
        // Par défaut, retourner un résumé
        const currentAlerts = await alertSystem.checkAlerts();
        const allRules = alertSystem.getAllRules();
        
        return NextResponse.json({
          success: true,
          summary: {
            totalRules: allRules.length,
            enabledRules: allRules.filter(r => r.enabled).length,
            activeAlerts: currentAlerts.length,
            lastCheck: new Date().toISOString(),
          },
          recentAlerts: currentAlerts.slice(0, 5), // 5 dernières alertes
        });
    }

  } catch (error) {
    secureLog.error('Alerts API error', { error });
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts
 * Crée une nouvelle règle d'alerte ou effectue une action
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Vérifier si c'est une action sur une alerte existante
    if (body.action) {
      const validation = alertActionSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Données invalides', details: validation.error.issues },
          { status: 400 }
        );
      }

      const { action, alertId } = validation.data;
      const userId = session.user.id;

      let success = false;
      switch (action) {
        case 'acknowledge':
          success = await alertSystem.acknowledgeAlert(alertId, userId);
          break;
        case 'resolve':
          success = await alertSystem.resolveAlert(alertId, userId);
          break;
      }

      return NextResponse.json({
        success,
        message: success ? `Alerte ${action === 'acknowledge' ? 'acquittée' : 'résolue'}` : 'Action échouée',
      });
    }

    // Sinon, créer une nouvelle règle d'alerte
    const validation = alertRuleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.issues },
        { status: 400 }
      );
    }

    const ruleData = validation.data;
    const userId = session.user.id;

    // Valider le chemin de métrique
    const validMetricPaths = [
      'users.totalUsers', 'users.activeUsers', 'users.newUsers', 'users.churnRate', 'users.retentionRate',
      'content.totalAssets', 'content.assetsGenerated', 'content.generationSuccessRate', 'content.storageUsed',
      'revenue.monthlyRevenue', 'revenue.averageRevenuePerUser', 'revenue.conversionRate', 'revenue.creditsSold',
      'performance.averageResponseTime', 'performance.errorRate', 'performance.apiCallsCount', 'performance.uptime'
    ];

    if (!validMetricPaths.includes(ruleData.metricPath)) {
      return NextResponse.json(
        { error: 'Chemin de métrique invalide', validPaths: validMetricPaths },
        { status: 400 }
      );
    }

    const ruleId = await alertSystem.addRule({
      ...ruleData,
      createdBy: userId,
    });

    secureLog.security('Alert rule created via API', {
      ruleId,
      userId,
      name: ruleData.name,
      metricPath: ruleData.metricPath,
    });

    return NextResponse.json({
      success: true,
      ruleId,
      message: 'Règle d\'alerte créée avec succès',
    });

  } catch (error) {
    secureLog.error('Failed to create alert rule', { error });
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/alerts/[id]
 * Met à jour une règle d'alerte
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const ruleId = url.pathname.split('/').pop();
    
    if (!ruleId) {
      return NextResponse.json(
        { error: 'ID de règle manquant' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = alertRuleSchema.partial().safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.issues },
        { status: 400 }
      );
    }

    const success = await alertSystem.updateRule(ruleId, validation.data);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Règle d\'alerte non trouvée' },
        { status: 404 }
      );
    }

    secureLog.security('Alert rule updated via API', {
      ruleId,
      userId: session.user.id,
      updates: Object.keys(validation.data),
    });

    return NextResponse.json({
      success: true,
      message: 'Règle d\'alerte mise à jour',
    });

  } catch (error) {
    secureLog.error('Failed to update alert rule', { error });
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts/[id]
 * Supprime une règle d'alerte
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const ruleId = url.pathname.split('/').pop();
    
    if (!ruleId) {
      return NextResponse.json(
        { error: 'ID de règle manquant' },
        { status: 400 }
      );
    }

    const success = await alertSystem.deleteRule(ruleId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Règle d\'alerte non trouvée' },
        { status: 404 }
      );
    }

    secureLog.security('Alert rule deleted via API', {
      ruleId,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Règle d\'alerte supprimée',
    });

  } catch (error) {
    secureLog.error('Failed to delete alert rule', { error });
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}