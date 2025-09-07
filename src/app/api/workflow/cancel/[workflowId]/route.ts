import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { db } from '@/server/api/db';
import { secureLog } from '@/lib/secure-logger';

export interface WorkflowCancelResponse {
  success: boolean;
  workflowId: string;
  message?: string;
  error?: string;
}

/**
 * POST /api/workflow/cancel/[workflowId]
 * Annule un workflow en cours d'exécution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
): Promise<NextResponse> {
  try {
    // Authentification
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const workflowId = (await params).workflowId;

    // Récupérer le workflow depuis la base de données
    const workflow = await db.workflowExecution.findFirst({
      where: {
        id: workflowId,
        userId: user.id // Sécurité : seul le propriétaire peut annuler
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { 
          success: false,
          workflowId,
          error: 'Workflow not found' 
        } as WorkflowCancelResponse,
        { status: 404 }
      );
    }

    // Vérifier si le workflow peut être annulé
    if (workflow.status === 'COMPLETED') {
      return NextResponse.json(
        { 
          success: false,
          workflowId,
          error: 'Cannot cancel completed workflow' 
        } as WorkflowCancelResponse,
        { status: 400 }
      );
    }

    if (workflow.status === 'FAILED' || workflow.status === 'CANCELLED') {
      return NextResponse.json(
        { 
          success: false,
          workflowId,
          error: `Workflow already ${workflow.status.toLowerCase()}` 
        } as WorkflowCancelResponse,
        { status: 400 }
      );
    }

    // Mettre à jour le statut du workflow
    await db.workflowExecution.update({
      where: { id: workflowId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        error: 'Cancelled by user'
      }
    });

    // Enregistrer l'événement d'annulation
    await db.usageEvent.create({
      data: {
        userId: user.id,
        event: 'workflow_cancelled',
        metadata: {
          workflowId,
          cancelledAt: new Date().toISOString(),
          reason: 'user_request'
        }
      }
    });

    // TODO: Envoyer un signal d'annulation au job Inngest
    // Cela pourrait être fait via un événement ou une base de données partagée
    // Pour l'instant, le job se terminera naturellement avec un statut CANCELLED

    secureLog.info(`Workflow ${workflowId} cancelled by user ${user.id}`);

    const response: WorkflowCancelResponse = {
      success: true,
      workflowId,
      message: 'Workflow successfully cancelled'
    };

    return NextResponse.json(response);

  } catch (error) {
    secureLog.error('Workflow cancel error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        workflowId: (await params).workflowId,
        error: errorMessage 
      } as WorkflowCancelResponse,
      { status: 500 }
    );
  }
}