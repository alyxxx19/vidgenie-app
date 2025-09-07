import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/api/db';
import { getCreditsManager } from '@/lib/services/credits-manager';
import { PRICING_CONFIG } from '@/lib/stripe/config';
import { secureLog } from '@/lib/secure-logger';

export async function POST(request: NextRequest) {
  try {
    // Vérifier la clé d'autorisation pour les tâches cron
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN || 'dev-cron-token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    secureLog.info('[MONTHLY-RESET] Starting monthly credits reset...');
    
    // Obtenir tous les utilisateurs avec des abonnements actifs
    const activeUsers = await db.user.findMany({
      where: {
        stripeSubscriptionId: { not: null },
        stripeCurrentPeriodEnd: { gte: new Date() },
      },
      select: {
        id: true,
        email: true,
        planId: true,
        creditsBalance: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    secureLog.info(`[MONTHLY-RESET] Found ${activeUsers.length} active subscribers`);

    const creditsManager = getCreditsManager(db);
    let resetCount = 0;
    let errorCount = 0;

    for (const user of activeUsers) {
      try {
        // Obtenir les crédits du plan
        const planCredits = getPlanCredits(user.planId);
        
        if (planCredits > 0) {
          // Réinitialiser les crédits selon le plan
          await creditsManager.resetMonthlyCredits(user.id, planCredits);
          
          secureLog.info(`[MONTHLY-RESET] Reset credits for ${user.email}: ${planCredits} credits (${user.planId} plan)`);
          resetCount++;
        }
      } catch (userError) {
        secureLog.error(`[MONTHLY-RESET] Failed to reset credits for user ${user.email}:`, userError);
        errorCount++;
      }
    }

    // Nettoyer les anciens webhooks traités (plus de 30 jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deletedWebhooks = await db.stripeWebhook.deleteMany({
      where: {
        processed: true,
        processedAt: { lt: thirtyDaysAgo },
      },
    });

    secureLog.info(`[MONTHLY-RESET] Cleanup: Deleted ${deletedWebhooks.count} old webhooks`);

    const result = {
      success: true,
      processedUsers: activeUsers.length,
      successfulResets: resetCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
      cleanupDeleted: deletedWebhooks.count,
    };

    secureLog.info('[MONTHLY-RESET] Monthly reset completed:', result);

    return NextResponse.json(result);

  } catch (error: any) {
    secureLog.error('[MONTHLY-RESET] Failed:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Fonction utilitaire pour obtenir les crédits d'un plan
function getPlanCredits(planId: string): number {
  switch (planId.toLowerCase()) {
    case 'free':
      return PRICING_CONFIG.FREE.credits;
    case 'starter':
      return PRICING_CONFIG.STARTER.credits;
    case 'pro':
      return PRICING_CONFIG.PRO.credits;
    case 'enterprise':
      return PRICING_CONFIG.ENTERPRISE.credits;
    default:
      secureLog.warn(`[MONTHLY-RESET] Unknown plan ID: ${planId}, defaulting to 0 credits`);
      return 0;
  }
}

// GET endpoint pour vérifier le statut
export async function GET() {
  try {
    // Statistiques générales
    const totalUsers = await db.user.count();
    const activeSubscribers = await db.user.count({
      where: {
        stripeSubscriptionId: { not: null },
        stripeCurrentPeriodEnd: { gte: new Date() },
      },
    });

    const totalCreditsInSystem = await db.user.aggregate({
      _sum: { creditsBalance: true },
    });

    // Dernière réinitialisation
    const lastReset = await db.usageEvent.findFirst({
      where: { event: 'credits.monthly_reset' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeSubscribers,
        totalCreditsInSystem: totalCreditsInSystem._sum.creditsBalance || 0,
        lastResetAt: lastReset?.createdAt || null,
      },
      nextResetDue: getNextResetDate(),
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}

function getNextResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}