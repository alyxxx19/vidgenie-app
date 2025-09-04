import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { db } from '@/server/api/db';
import { getWorkflowOrchestrator } from '@/lib/services/workflow-orchestrator';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const workflowId = params.id;
    
    // Vérifier que le job appartient à l'utilisateur
    const job = await db.generationJob.findFirst({
      where: {
        id: workflowId,
        userId: user.id,
      },
      include: {
        imageAsset: {
          select: {
            id: true,
            filename: true,
            publicUrl: true,
            thumbnailUrl: true,
            width: true,
            height: true,
          },
        },
        videoAsset: {
          select: {
            id: true,
            filename: true,
            publicUrl: true,
            thumbnailUrl: true,
            duration: true,
            width: true,
            height: true,
            frameRate: true,
            fileSize: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Récupérer le statut du workflow depuis l'orchestrateur
    const orchestrator = getWorkflowOrchestrator(db);
    const workflowSteps = orchestrator.getWorkflowStatus(workflowId);
    
    // Calculer le progrès global
    let overallProgress = 0;
    switch (job.status) {
      case 'QUEUED':
        overallProgress = 5;
        break;
      case 'GENERATING_IMAGE':
        overallProgress = 25;
        break;
      case 'IMAGE_READY':
        overallProgress = 50;
        break;
      case 'GENERATING_VIDEO':
        overallProgress = 75;
        break;
      case 'VIDEO_READY':
        overallProgress = 100;
        break;
      case 'FAILED':
        overallProgress = 0;
        break;
      default:
        overallProgress = 0;
    }

    // Calculer la durée estimée restante
    let estimatedTimeRemaining;
    if (job.status === 'GENERATING_VIDEO' && job.startedAt) {
      const elapsed = Date.now() - job.startedAt.getTime();
      estimatedTimeRemaining = Math.max(0, 120000 - elapsed); // 2 minutes max pour vidéo
    } else if (job.status === 'GENERATING_IMAGE' && job.startedAt) {
      const elapsed = Date.now() - job.startedAt.getTime();
      estimatedTimeRemaining = Math.max(0, 30000 - elapsed); // 30s max pour image
    }

    const response = {
      id: job.id,
      kind: job.kind,
      status: job.status,
      progress: overallProgress,
      steps: workflowSteps || [],
      inputPrompt: job.inputPrompt,
      imagePrompt: job.imagePrompt,
      videoPrompt: job.videoPrompt,
      imageAsset: job.imageAsset,
      videoAsset: job.videoAsset,
      provider: job.provider,
      costCents: job.costCents,
      processingTime: job.processingTime,
      estimatedTimeRemaining,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      providerData: job.providerData,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get workflow status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}