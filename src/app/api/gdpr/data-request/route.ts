/**
 * API pour les demandes de données RGPD
 * PHASE 7.3 - Droits des utilisateurs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/server/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import DataProtectionManager from '@/lib/gdpr/data-protection';
import { secureLog } from '@/lib/secure-logger';

const prisma = new PrismaClient();
const dataProtection = new DataProtectionManager(prisma);

// Validation des requêtes
const dataRequestSchema = z.object({
  type: z.enum(['access', 'rectification', 'deletion', 'portability', 'restriction']),
  description: z.string().min(10).max(1000),
  requestData: z.record(z.string(), z.any()).optional(),
});

/**
 * POST /api/gdpr/data-request
 * Crée une nouvelle demande de données personnelles
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
    const validation = dataRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const { type, description, requestData } = validation.data;
    const userId = session.user.id;
    const userEmail = session.user.email!;

    // Vérifier les limites de fréquence (1 demande par type par mois)
    const recentRequest = await checkRecentRequests(userId, type);
    if (recentRequest) {
      return NextResponse.json(
        { 
          error: 'Limite de fréquence atteinte',
          message: 'Une demande de ce type a déjà été effectuée ce mois-ci',
          nextAllowedDate: recentRequest.nextAllowedDate,
        },
        { status: 429 }
      );
    }

    // Traiter la demande
    const processedRequestId = await dataProtection.processDataRequest(
      userId,
      type,
      description,
      userEmail,
      requestData
    );
    const requestId = `req_${Date.now()}_${userId}`;

    // Enregistrer dans la base de données
    //     // TODO: Add dataRequest model to schema
    //     // await prisma.dataRequest.create({
    //       data: {
    //         id: requestId = `req_${Date.now()}_${userId}`,
    //         userId,
    //         type,
    //         status: 'pending',
    //         description,
    //         requesterEmail: userEmail,
    //         requestData: requestData ? JSON.stringify(requestData) : null,
    //         createdAt: new Date(),
    //       },
    //     });

    secureLog.security('GDPR data request created', {
      requestId,
      userId,
      type,
      userEmail,
    });

    return NextResponse.json({
      success: true,
      requestId,
      message: getSuccessMessage(type),
      estimatedProcessingTime: getEstimatedTime(type),
    });

  } catch (error) {
    secureLog.error('GDPR data request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gdpr/data-request
 * Récupère les demandes de l'utilisateur
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    //     const requests = await prisma.dataRequest.findMany({
    //       where: { userId },
    //       select: {
    //         id: true,
    //         type: true,
    //         status: true,
    //         description: true,
    //         createdAt: true,
    //         completedAt: true,
    //         response: true,
    //       },
    //       orderBy: { createdAt: 'desc' },
    //       take: 20,
    //     });

    return NextResponse.json({
      success: true,
      requests: [], // TODO: Implement when dataRequest model is added
      message: 'Data request history not yet implemented',
    });

  } catch (error) {
    secureLog.error('Failed to fetch GDPR requests', { error });
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * Vérifie les demandes récentes pour éviter le spam
 */
async function checkRecentRequests(
  userId: string,
  type: string
): Promise<{ nextAllowedDate: string } | null> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // TODO: Implement dataRequest model
  return null;
  // const recentRequest = await prisma.dataRequest.findFirst({
  //   where: {
  //     userId,
  //     type,
  //     createdAt: {
  //       gte: oneMonthAgo,
  //     },
  //   },
  //   orderBy: { createdAt: 'desc' },
  // });

  // if (recentRequest) {
  //   const nextAllowed = new Date(recentRequest.createdAt);
  //   nextAllowed.setMonth(nextAllowed.getMonth() + 1);
  //   
  //   if (nextAllowed > new Date()) {
  //     return {
  //       nextAllowedDate: nextAllowed.toISOString(),
  //     };
  //   }
  // }

  return null;
}

/**
 * Messages de succès selon le type de demande
 */
function getSuccessMessage(type: string): string {
  switch (type) {
    case 'access':
      return 'Votre demande d\'accès aux données a été enregistrée. Vous recevrez vos données par email sécurisé.';
    case 'rectification':
      return 'Votre demande de rectification a été enregistrée. Nous examinerons vos modifications.';
    case 'deletion':
      return 'Votre demande de suppression a été enregistrée. Nous vérifierons les obligations légales.';
    case 'portability':
      return 'Votre demande de portabilité a été enregistrée. Vous recevrez vos données dans un format structuré.';
    case 'restriction':
      return 'Votre demande de limitation a été enregistrée. Le traitement de vos données sera restreint.';
    default:
      return 'Votre demande a été enregistrée et sera traitée dans les meilleurs délais.';
  }
}

/**
 * Temps estimé de traitement
 */
function getEstimatedTime(type: string): string {
  switch (type) {
    case 'access':
    case 'portability':
      return '7-14 jours';
    case 'rectification':
      return '2-7 jours';
    case 'deletion':
      return '14-30 jours';
    case 'restriction':
      return '3-7 jours';
    default:
      return '30 jours maximum';
  }
}

/**
 * Traduction des statuts
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'pending': return 'En attente';
    case 'processing': return 'En cours de traitement';
    case 'completed': return 'Terminée';
    case 'rejected': return 'Refusée';
    default: return status;
  }
}

/**
 * Traduction des types de demandes
 */
function getTypeText(type: string): string {
  switch (type) {
    case 'access': return 'Accès aux données';
    case 'rectification': return 'Rectification';
    case 'deletion': return 'Suppression';
    case 'portability': return 'Portabilité';
    case 'restriction': return 'Limitation';
    default: return type;
  }
}