import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { db } from '@/server/api/db';
import { getWorkflowOrchestrator } from '@/lib/services/workflow-orchestrator';
import { secureLog } from '@/lib/secure-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentification
    const user = await getServerUser(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: workflowId } = await params;
    
    // Vérifier que le job appartient à l'utilisateur
    const job = await db.generationJob.findFirst({
      where: {
        id: workflowId,
        userId: user.id,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Vérifier que le job peut être annulé
    if (['VIDEO_READY', 'FAILED'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel a completed or failed workflow' },
        { status: 400 }
      );
    }

    // Annuler le workflow via l'orchestrateur
    const orchestrator = getWorkflowOrchestrator(db);
    const cancelled = await orchestrator.cancelWorkflow(workflowId);

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Failed to cancel workflow' },
        { status: 500 }
      );
    }

    // Mettre à jour le job en BDD
    await db.generationJob.update({
      where: { id: workflowId },
      data: {
        status: 'FAILED',
        errorMessage: 'Cancelled by user',
        completedAt: new Date(),
      },
    });

    // Rembourser les crédits
    const refundAmount = Math.floor(job.costCents / 100);
    await db.user.update({
      where: { id: user.id },
      data: { creditsBalance: { increment: refundAmount } },
    });

    await db.creditLedger.create({
      data: {
        userId: user.id,
        amount: refundAmount,
        type: 'refund',
        description: 'Workflow cancelled - automatic refund',
      },
    });

    return NextResponse.json({
      success: true,
      refundAmount,
      message: 'Workflow cancelled successfully',
    });

  } catch (error) {
    secureLog.error('Cancel workflow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}