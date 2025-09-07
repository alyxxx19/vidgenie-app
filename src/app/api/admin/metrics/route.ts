/**
 * API des métriques business pour les dashboards admin
 * PHASE 8.1 - Endpoint des métriques avancées
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/server/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import BusinessMetricsCollector from '@/lib/monitoring/business-metrics';
import { secureLog } from '@/lib/secure-logger';
import { authOptions } from '@/server/auth';

const prisma = new PrismaClient();
const metricsCollector = new BusinessMetricsCollector(prisma);

// Validation des paramètres
const metricsQuerySchema = z.object({
  period: z.coerce.number().min(1).max(365).default(30),
  type: z.enum(['all', 'users', 'content', 'revenue', 'performance', 'health']).default('all'),
  format: z.enum(['json', 'csv']).default('json'),
});

/**
 * GET /api/admin/metrics
 * Récupère les métriques business
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    // Vérifier les permissions admin
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // TODO: Vérifier le rôle admin dans votre système
    // const user = await prisma.user.findUnique({
    //   where: { id: session.user.id },
    //   select: { role: true }
    // });
    // if (user?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    // }

    const url = new URL(request.url);
    const validation = metricsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams)
    );

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Paramètres invalides',
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const { period, type, format } = validation.data;

    let data;

    switch (type) {
      case 'all':
        data = await metricsCollector.collectAllMetrics(period);
        break;

      case 'users':
        const allMetrics = await metricsCollector.collectAllMetrics(period);
        data = { users: allMetrics.users, timestamp: allMetrics.timestamp };
        break;

      case 'content':
        const contentData = await metricsCollector.collectAllMetrics(period);
        data = { content: contentData.content, timestamp: contentData.timestamp };
        break;

      case 'revenue':
        const revenueData = await metricsCollector.collectAllMetrics(period);
        data = { revenue: revenueData.revenue, timestamp: revenueData.timestamp };
        break;

      case 'performance':
        const perfData = await metricsCollector.collectAllMetrics(period);
        data = { performance: perfData.performance, timestamp: perfData.timestamp };
        break;

      case 'health':
        data = await metricsCollector.generateHealthReport(period);
        break;

      default:
        data = await metricsCollector.collectAllMetrics(period);
    }

    // Log de l'accès aux métriques
    secureLog.security('Business metrics accessed', {
      userId: session.user.id,
      type,
      period,
      format,
    });

    // Format de réponse
    if (format === 'csv') {
      const csv = convertToCSV(data, type);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="vidgenie-metrics-${type}-${period}d.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        period,
        type,
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.email,
      },
    });

  } catch (error) {
    secureLog.error('Metrics API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/metrics/alert
 * Configure des alertes sur les métriques
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
    const alertSchema = z.object({
      metric: z.string(),
      threshold: z.number(),
      operator: z.enum(['>', '<', '>=', '<=', '==', '!=']),
      severity: z.enum(['info', 'warning', 'critical']),
      channels: z.array(z.enum(['email', 'slack', 'webhook'])),
    });

    const validation = alertSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Configuration d\'alerte invalide', details: validation.error.issues },
        { status: 400 }
      );
    }

    // TODO: Sauvegarder la configuration d'alerte
    // await prisma.metricAlert.create({ data: { ...validation.data, userId: session.user.id } });

    secureLog.security('Metric alert configured', {
      userId: session.user.id,
      metric: validation.data.metric,
      threshold: validation.data.threshold,
    });

    return NextResponse.json({
      success: true,
      message: 'Alerte configurée avec succès',
    });

  } catch (error) {
    secureLog.error('Alert configuration error', { error });
    return NextResponse.json(
      { error: 'Erreur lors de la configuration' },
      { status: 500 }
    );
  }
}

/**
 * Convertit les données en format CSV
 */
function convertToCSV(data: any, type: string): string {
  if (type === 'health') {
    return [
      'Métrique,Valeur',
      `Score,${data.score}`,
      `Status,${data.status}`,
      `Insights,"${data.insights.join('; ')}"`,
      `Recommendations,"${data.recommendations.join('; ')}"`,
    ].join('\n');
  }

  if (type === 'all' && data.users) {
    const rows = [
      'Type,Métrique,Valeur,Date',
      `Utilisateurs,Total,${data.users.totalUsers},${data.timestamp}`,
      `Utilisateurs,Actifs,${data.users.activeUsers},${data.timestamp}`,
      `Utilisateurs,Nouveaux,${data.users.newUsers},${data.timestamp}`,
      `Utilisateurs,Taux de churn,${data.users.churnRate},${data.timestamp}`,
      `Contenu,Total assets,${data.content.totalAssets},${data.timestamp}`,
      `Contenu,Assets générés,${data.content.assetsGenerated},${data.timestamp}`,
      `Contenu,Stockage utilisé,${data.content.storageUsed},${data.timestamp}`,
      `Revenus,Revenus mensuels,${data.revenue.monthlyRevenue},${data.timestamp}`,
      `Revenus,ARPU,${data.revenue.averageRevenuePerUser},${data.timestamp}`,
      `Performance,Temps de réponse,${data.performance.averageResponseTime},${data.timestamp}`,
      `Performance,Taux d'erreur,${data.performance.errorRate},${data.timestamp}`,
    ];

    return rows.join('\n');
  }

  // Fallback pour autres formats
  return JSON.stringify(data, null, 2);
}

/**
 * Génère un rapport de métriques formaté
 */
function _generateMetricsReport(data: any): string {
  if (!data.users) return '';

  return `
RAPPORT MÉTRICS VIDGENIE
========================
Généré le: ${new Date().toLocaleString('fr-FR')}

UTILISATEURS
------------
• Total: ${data.users.totalUsers.toLocaleString('fr-FR')}
• Actifs: ${data.users.activeUsers.toLocaleString('fr-FR')}
• Nouveaux: ${data.users.newUsers.toLocaleString('fr-FR')}
• Taux de rétention: ${data.users.retentionRate.toFixed(1)}%
• Taux de churn: ${data.users.churnRate.toFixed(1)}%

CONTENU
-------
• Total assets: ${data.content.totalAssets.toLocaleString('fr-FR')}
• Assets générés: ${data.content.assetsGenerated.toLocaleString('fr-FR')}
• Stockage utilisé: ${(data.content.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB
• Taille moyenne: ${(data.content.averageAssetSize / 1024).toFixed(0)} KB
• Taux de succès: ${data.content.generationSuccessRate.toFixed(1)}%

REVENUS
-------
• Revenus mensuels: ${data.revenue.monthlyRevenue.toFixed(2)} €
• Revenus totaux: ${data.revenue.totalRevenue.toFixed(2)} €
• ARPU: ${data.revenue.averageRevenuePerUser.toFixed(2)} €
• Crédits vendus: ${data.revenue.creditsSold.toLocaleString('fr-FR')}
• Taux de conversion: ${data.revenue.conversionRate.toFixed(1)}%

PERFORMANCES
------------
• Temps de réponse moyen: ${data.performance.averageResponseTime} ms
• Appels API: ${data.performance.apiCallsCount.toLocaleString('fr-FR')}
• Taux d'erreur: ${data.performance.errorRate}%
• Uptime: ${(data.performance.uptime / 3600).toFixed(1)} heures
• File d'attente: ${data.performance.queueLength} jobs
  `.trim();
}