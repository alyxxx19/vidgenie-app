import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { db } from '@/server/api/db';
import { secureLog } from '@/lib/secure-logger';

export interface CreditDeductRequest {
  amount: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface CreditDeductResponse {
  success: boolean;
  remainingCredits: number;
  transactionId?: string;
  error?: string;
}

/**
 * POST /api/credits/deduct
 * Déduit des crédits de manière atomique avec historique
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentification
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parser le body
    const body: CreditDeductRequest = await request.json();
    const { amount, reason, metadata } = body;

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Amount must be positive' 
        } as CreditDeductResponse,
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Reason is required' 
        } as CreditDeductResponse,
        { status: 400 }
      );
    }

    // Transaction atomique pour la déduction
    const result = await db.$transaction(async (tx) => {
      // Récupérer les crédits actuels avec verrouillage
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { credits: true, creditsUsed: true }
      });

      if (!currentUser) {
        throw new Error('User not found');
      }

      if (currentUser.credits < amount) {
        throw new Error(`Insufficient credits. Available: ${currentUser.credits}, Required: ${amount}`);
      }

      // Déduire les crédits
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          credits: { decrement: amount },
          creditsUsed: { increment: amount }
        },
        select: { credits: true }
      });

      // Créer la transaction de crédit
      const transaction = await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'DEBIT',
          amount,
          reason,
          metadata: metadata || {}
        }
      });

      return {
        remainingCredits: updatedUser.credits,
        transactionId: transaction.id
      };
    });

    // Log pour monitoring
    secureLog.info(`Credits deducted: ${amount} from user ${user.id} for ${reason}`);

    // Enregistrer l'événement d'usage
    await db.usageEvent.create({
      data: {
        userId: user.id,
        event: 'credits_deducted',
        metadata: {
          amount,
          reason,
          remainingCredits: result.remainingCredits,
          transactionId: result.transactionId,
          ...metadata
        }
      }
    });

    const response: CreditDeductResponse = {
      success: true,
      remainingCredits: result.remainingCredits,
      transactionId: result.transactionId
    };

    return NextResponse.json(response);

  } catch (error) {
    secureLog.error('Credit deduction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Si c'est une erreur de crédits insuffisants, retourner un statut 402
    const statusCode = errorMessage.includes('Insufficient credits') ? 402 : 500;
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      } as CreditDeductResponse,
      { status: statusCode }
    );
  }
}

/**
 * GET /api/credits/deduct
 * Retourne les informations sur les déductions récentes (pour debug)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentification
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Récupérer les dernières transactions
    const transactions = await db.creditTransaction.findMany({
      where: {
        userId: user.id,
        type: 'DEBIT'
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        reason: t.reason,
        createdAt: t.createdAt,
        metadata: t.metadata
      }))
    });

  } catch (error) {
    secureLog.error('Get credit transactions error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}