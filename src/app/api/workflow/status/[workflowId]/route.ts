import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { db } from '@/server/api/db';

export interface WorkflowStatusResponse {
  success: boolean;
  workflowId: string;
  status: 'INITIALIZING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number; // 0-100
  currentStep?: string;
  steps: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    startTime?: string;
    endTime?: string;
    error?: string;
    cost?: number;
  }>;
  result?: {
    enhancedPrompt?: string;
    imageUrl?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  };
  estimatedTimeRemaining?: number; // en secondes
  totalCost?: number;
  error?: string;
}

/**
 * GET /api/workflow/status/[workflowId]
 * Récupère le statut en temps réel d'un workflow
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
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

    const workflowId = params.workflowId;

    // Récupérer le workflow depuis la base de données
    const workflow = await db.workflowExecution.findFirst({
      where: {
        id: workflowId,
        userId: user.id // Sécurité : seul le propriétaire peut voir le statut
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Construire les étapes selon le type de workflow
    const config = workflow.config as any;
    const steps = buildWorkflowSteps(config.workflowType);

    // Calculer le progress global
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const totalSteps = steps.length;
    const globalProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    // Déterminer l'étape courante
    const currentStep = steps.find(s => s.status === 'running')?.name || 
                       (workflow.status === 'RUNNING' ? 'Processing...' : undefined);

    // Estimer le temps restant
    let estimatedTimeRemaining: number | undefined;
    if (workflow.status === 'RUNNING') {
      const elapsedTime = Math.floor((Date.now() - new Date(workflow.startedAt).getTime()) / 1000);
      const totalEstimated = workflow.estimatedDuration || 240; // 4 min par défaut
      estimatedTimeRemaining = Math.max(0, totalEstimated - elapsedTime);
    }

    // Construire le résultat si disponible
    let result: WorkflowStatusResponse['result'] | undefined;
    if (workflow.status === 'COMPLETED' && workflow.result) {
      const workflowResult = workflow.result as any;
      result = {
        enhancedPrompt: workflowResult.enhancedPrompt,
        imageUrl: workflowResult.imageUrl,
        videoUrl: workflowResult.videoUrl,
        thumbnailUrl: workflowResult.thumbnailUrl
      };
    }

    const response: WorkflowStatusResponse = {
      success: true,
      workflowId,
      status: workflow.status as any,
      progress: globalProgress,
      currentStep,
      steps,
      result,
      estimatedTimeRemaining,
      totalCost: workflow.actualCost || workflow.estimatedCost,
      error: workflow.error || undefined
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Workflow status error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}

/**
 * Construit la liste des étapes selon le type de workflow
 */
function buildWorkflowSteps(workflowType: string): Array<{
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  error?: string;
  cost?: number;
}> {
  const steps = [];

  if (workflowType === 'complete' || workflowType === 'image-only') {
    steps.push(
      {
        id: 'enhance_prompt',
        name: 'Prompt Enhancement',
        status: 'pending' as const,
        progress: 0,
        cost: 1
      },
      {
        id: 'generate_image',
        name: 'Image Generation',
        status: 'pending' as const,
        progress: 0,
        cost: 5 // Coût moyen
      }
    );
  }

  if (workflowType === 'complete' || workflowType === 'video-from-image') {
    steps.push({
      id: 'generate_video',
      name: 'Video Generation',
      status: 'pending' as const,
      progress: 0,
      cost: 15 // Coût moyen
    });
  }

  // TODO: Dans une vraie implémentation, ces statuts viendraient de la base de données
  // ou d'un store en temps réel (Redis, WebSocket, etc.)
  
  return steps;
}