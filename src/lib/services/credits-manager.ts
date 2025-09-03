import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export interface CreditCosts {
  IMAGE_GENERATION: number;
  VIDEO_GENERATION: number;
  GPT_ENHANCEMENT: number;
  IMAGE_TO_VIDEO: number;
  PROMPT_ANALYSIS: number;
}

export const CREDIT_COSTS: CreditCosts = {
  IMAGE_GENERATION: 5,      // DALL-E 3 ou gpt-image-1
  VIDEO_GENERATION: 15,     // Fal.ai Veo3
  GPT_ENHANCEMENT: 1,       // GPT-4o prompt enhancement
  IMAGE_TO_VIDEO: 20,       // Workflow complet
  PROMPT_ANALYSIS: 0.5,     // Analyse de prompt
};

export interface CreditCheckResult {
  hasEnough: boolean;
  currentBalance: number;
  required: number;
  shortage?: number;
  message?: string;
}

export interface CreditDeductionResult {
  success: boolean;
  newBalance: number;
  deducted: number;
  transactionId: string;
  timestamp: Date;
}

export class CreditsManager {
  private db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
  }

  /**
   * Vérifie si l'utilisateur a suffisamment de crédits
   */
  async checkCredits(
    userId: string, 
    operation: keyof CreditCosts,
    additionalCost: number = 0
  ): Promise<CreditCheckResult> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { 
        creditsBalance: true,
        planId: true,
        stripeSubscriptionId: true
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const required = CREDIT_COSTS[operation] + additionalCost;
    const hasEnough = user.creditsBalance >= required;

    return {
      hasEnough,
      currentBalance: user.creditsBalance,
      required,
      shortage: hasEnough ? undefined : required - user.creditsBalance,
      message: hasEnough 
        ? `Sufficient credits (${user.creditsBalance} available, ${required} required)`
        : `Insufficient credits. You have ${user.creditsBalance} but need ${required}. Purchase more credits to continue.`
    };
  }

  /**
   * Déduit les crédits de manière atomique avec transaction
   */
  async deductCredits(
    userId: string,
    operation: keyof CreditCosts,
    description: string,
    metadata?: {
      jobId?: string;
      projectId?: string;
      prompt?: string;
      additionalCost?: number;
    }
  ): Promise<CreditDeductionResult> {
    const cost = CREDIT_COSTS[operation] + (metadata?.additionalCost || 0);

    // Transaction atomique pour éviter les race conditions
    const result = await this.db.$transaction(async (tx) => {
      // Vérifier le solde actuel avec lock
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { creditsBalance: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      if (user.creditsBalance < cost) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient credits. You have ${user.creditsBalance} but need ${cost}`,
        });
      }

      // Créer l'entrée dans le ledger
      const ledgerEntry = await tx.creditLedger.create({
        data: {
          userId,
          amount: -cost,
          type: 'generation',
          description: description.slice(0, 255),
          jobId: metadata?.jobId,
        },
      });

      // Mettre à jour le solde
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { 
          creditsBalance: { 
            decrement: cost 
          } 
        },
        select: { creditsBalance: true },
      });

      // Créer un événement d'usage
      await tx.usageEvent.create({
        data: {
          userId,
          jobId: metadata?.jobId,
          event: `credits.deducted.${operation.toLowerCase()}`,
          metadata: {
            operation,
            cost,
            newBalance: updatedUser.creditsBalance,
            description,
            prompt: metadata?.prompt?.slice(0, 100),
            projectId: metadata?.projectId,
          },
        },
      });

      return {
        ledgerEntry,
        newBalance: updatedUser.creditsBalance,
      };
    });

    return {
      success: true,
      newBalance: result.newBalance,
      deducted: cost,
      transactionId: result.ledgerEntry.id,
      timestamp: result.ledgerEntry.createdAt,
    };
  }

  /**
   * Ajoute des crédits (achat, bonus, remboursement)
   */
  async addCredits(
    userId: string,
    amount: number,
    type: 'purchase' | 'bonus' | 'refund' | 'subscription',
    description: string,
    metadata?: {
      stripePaymentId?: string;
      planName?: string;
    }
  ): Promise<CreditDeductionResult> {
    const result = await this.db.$transaction(async (tx) => {
      const ledgerEntry = await tx.creditLedger.create({
        data: {
          userId,
          amount: amount, // Positif pour un crédit
          type,
          description,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { 
          creditsBalance: { 
            increment: amount 
          } 
        },
        select: { creditsBalance: true },
      });

      await tx.usageEvent.create({
        data: {
          userId,
          event: `credits.added.${type}`,
          metadata: {
            amount,
            newBalance: updatedUser.creditsBalance,
            description,
            ...metadata,
          },
        },
      });

      return {
        ledgerEntry,
        newBalance: updatedUser.creditsBalance,
      };
    });

    return {
      success: true,
      newBalance: result.newBalance,
      deducted: -amount, // Négatif car c'est un ajout
      transactionId: result.ledgerEntry.id,
      timestamp: result.ledgerEntry.createdAt,
    };
  }

  /**
   * Rembourse des crédits en cas d'échec
   */
  async refundCredits(
    userId: string,
    amount: number,
    reason: string,
    originalJobId?: string
  ): Promise<CreditDeductionResult> {
    return this.addCredits(
      userId,
      amount,
      'refund',
      `Refund: ${reason}`,
      { stripePaymentId: originalJobId }
    );
  }

  /**
   * Obtient le solde actuel avec historique récent
   */
  async getBalance(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        creditsBalance: true,
        planId: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Obtenir les transactions récentes
    const recentTransactions = await this.db.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
    });

    // Calculer l'usage du mois en cours
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyUsage = await this.db.creditLedger.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
        amount: { lt: 0 },
      },
      _sum: { amount: true },
    });

    return {
      balance: user.creditsBalance,
      planId: user.planId,
      hasActiveSubscription: !!user.stripeSubscriptionId,
      subscriptionEndsAt: user.stripeCurrentPeriodEnd,
      monthlyUsage: Math.abs(monthlyUsage._sum.amount || 0),
      recentTransactions,
    };
  }

  /**
   * Estime le coût d'une opération
   */
  estimateCost(operations: Partial<Record<keyof CreditCosts, number>>): number {
    let totalCost = 0;
    for (const [operation, count] of Object.entries(operations)) {
      if (count && CREDIT_COSTS[operation as keyof CreditCosts]) {
        totalCost += CREDIT_COSTS[operation as keyof CreditCosts] * count;
      }
    }
    return totalCost;
  }

  /**
   * Vérifie et réinitialise les crédits mensuels selon le plan
   */
  async resetMonthlyCredits(userId: string, planCredits: number): Promise<void> {
    await this.db.$transaction(async (tx) => {
      // Réinitialiser le solde
      await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: planCredits },
      });

      // Ajouter une entrée dans le ledger
      await tx.creditLedger.create({
        data: {
          userId,
          amount: planCredits,
          type: 'subscription',
          description: 'Monthly credit reset',
        },
      });

      // Créer un événement
      await tx.usageEvent.create({
        data: {
          userId,
          event: 'credits.monthly_reset',
          metadata: {
            newBalance: planCredits,
          },
        },
      });
    });
  }

  /**
   * Obtient des statistiques d'usage détaillées
   */
  async getUsageStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await this.db.creditLedger.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    const stats = {
      totalSpent: 0,
      totalAdded: 0,
      imageGenerations: 0,
      videoGenerations: 0,
      gptEnhancements: 0,
      dailyUsage: {} as Record<string, number>,
    };

    for (const transaction of transactions) {
      const date = transaction.createdAt.toISOString().split('T')[0];
      
      if (transaction.amount < 0) {
        stats.totalSpent += Math.abs(transaction.amount);
        stats.dailyUsage[date] = (stats.dailyUsage[date] || 0) + Math.abs(transaction.amount);
        
        // Compter les types d'opérations
        if (transaction.description.includes('Image')) {
          stats.imageGenerations++;
        } else if (transaction.description.includes('Video')) {
          stats.videoGenerations++;
        } else if (transaction.description.includes('GPT') || transaction.description.includes('enhancement')) {
          stats.gptEnhancements++;
        }
      } else {
        stats.totalAdded += transaction.amount;
      }
    }

    return stats;
  }
}

// Export singleton instance
let creditsManagerInstance: CreditsManager | null = null;

export function getCreditsManager(db: PrismaClient): CreditsManager {
  if (!creditsManagerInstance) {
    creditsManagerInstance = new CreditsManager(db);
  }
  return creditsManagerInstance;
}