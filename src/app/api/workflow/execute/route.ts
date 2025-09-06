import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { inngest } from '@/lib/inngest';
import { db } from '@/server/api/db';
import { EncryptionService } from '@/services/encryption';

export interface WorkflowExecuteRequest {
  config: {
    initialPrompt: string;
    workflowType: 'complete' | 'image-only' | 'video-from-image';
    customImageUrl?: string;
    imageConfig: {
      style: 'vivid' | 'natural';
      quality: 'standard' | 'hd';
      size: '1024x1024' | '1792x1024' | '1024x1792';
    };
    videoConfig: {
      duration: 5 | 8 | 15 | 30 | 60;
      resolution: '720p' | '1080p' | '4k';
      generateAudio?: boolean;
      motionIntensity?: 'low' | 'medium' | 'high';
    };
  };
  projectId?: string;
}

export interface WorkflowExecuteResponse {
  success: boolean;
  workflowId: string;
  estimatedDuration: number; // en secondes
  estimatedCost: number; // en crédits
  error?: string;
}

/**
 * POST /api/workflow/execute
 * Lance l'exécution d'un workflow complet
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
    const body: WorkflowExecuteRequest = await request.json();
    const { config, projectId } = body;

    // Validation basique
    if (!config.initialPrompt || config.initialPrompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Initial prompt is required' },
        { status: 400 }
      );
    }

    if (config.workflowType === 'video-from-image' && !config.customImageUrl) {
      return NextResponse.json(
        { error: 'Custom image URL required for video-from-image workflow' },
        { status: 400 }
      );
    }

    // Calculer le coût estimé
    const estimatedCost = calculateWorkflowCost(config);

    // Vérifier les crédits
    if (user.credits < estimatedCost) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          required: estimatedCost,
          available: user.credits
        },
        { status: 402 }
      );
    }

    // Récupérer et vérifier les clés API utilisateur
    const userApiKeys = await getUserApiKeys(user.id);
    if (!userApiKeys) {
      return NextResponse.json(
        { error: 'API keys not configured. Please configure your API keys in settings.' },
        { status: 400 }
      );
    }

    // Valider les clés selon le workflow
    const validationResult = validateApiKeysForWorkflow(config.workflowType, userApiKeys);
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          error: 'Missing required API keys',
          details: validationResult.missing
        },
        { status: 400 }
      );
    }

    // Générer l'ID du workflow
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Estimer la durée
    const estimatedDuration = estimateWorkflowDuration(config);

    // Créer l'entrée de workflow dans la base
    await db.workflowExecution.create({
      data: {
        id: workflowId,
        userId: user.id,
        projectId,
        config: config as any,
        status: 'INITIALIZING',
        estimatedCost,
        estimatedDuration,
        startedAt: new Date()
      }
    });

    // Déclencher le job Inngest
    await inngest.send({
      name: 'workflow.execute',
      data: {
        workflowId,
        userId: user.id,
        projectId,
        config,
        userApiKeys: {
          openaiKey: userApiKeys.openaiKey,
          imageGenKey: userApiKeys.imageGenKey || userApiKeys.openaiKey, // Fallback to OpenAI for DALL-E
          vo3Key: userApiKeys.vo3Key
        }
      }
    });

    // Réponse de succès
    const response: WorkflowExecuteResponse = {
      success: true,
      workflowId,
      estimatedDuration,
      estimatedCost
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Workflow execute error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      } as WorkflowExecuteResponse,
      { status: 500 }
    );
  }
}

/**
 * Calcule le coût total du workflow
 */
function calculateWorkflowCost(config: WorkflowExecuteRequest['config']): number {
  let totalCost = 0;

  // Coût amélioration prompt
  if (config.workflowType === 'complete' || config.workflowType === 'image-only') {
    totalCost += 1; // 1 crédit pour l'amélioration
  }

  // Coût génération image
  if (config.workflowType === 'complete' || config.workflowType === 'image-only') {
    totalCost += calculateImageCost(config.imageConfig);
  }

  // Coût génération vidéo
  if (config.workflowType === 'complete' || config.workflowType === 'video-from-image') {
    totalCost += calculateVideoCost(config.videoConfig);
  }

  return totalCost;
}

/**
 * Calcule le coût de génération d'image
 */
function calculateImageCost(imageConfig: WorkflowExecuteRequest['config']['imageConfig']): number {
  const costs = {
    'standard': { '1024x1024': 2, '1792x1024': 3, '1024x1792': 3 },
    'hd': { '1024x1024': 3, '1792x1024': 5, '1024x1792': 5 }
  };

  return (costs as any)[imageConfig.quality]?.[imageConfig.size] || 2;
}

/**
 * Calcule le coût de génération vidéo
 */
function calculateVideoCost(videoConfig: WorkflowExecuteRequest['config']['videoConfig']): number {
  const baseCosts = {
    5: { '720p': 8, '1080p': 12, '4k': 25 },
    8: { '720p': 10, '1080p': 15, '4k': 30 },
    15: { '720p': 18, '1080p': 25, '4k': 50 },
    30: { '720p': 35, '1080p': 50, '4k': 100 },
    60: { '720p': 70, '1080p': 100, '4k': 200 }
  };

  const durationCosts = (baseCosts as any)[videoConfig.duration] || baseCosts[8];
  const baseCost = durationCosts[videoConfig.resolution] || durationCosts['1080p'];

  // Bonus pour l'audio
  const audioCost = videoConfig.generateAudio ? Math.ceil(baseCost * 0.2) : 0;

  return baseCost + audioCost;
}

/**
 * Estime la durée totale du workflow
 */
function estimateWorkflowDuration(config: WorkflowExecuteRequest['config']): number {
  let totalDuration = 0;

  if (config.workflowType === 'complete' || config.workflowType === 'image-only') {
    totalDuration += 15; // Prompt enhancement
    totalDuration += 45; // Image generation
  }

  if (config.workflowType === 'complete' || config.workflowType === 'video-from-image') {
    // Durée vidéo basée sur la longueur demandée
    totalDuration += Math.max(120, config.videoConfig.duration * 20); // Min 2min, ~20s par seconde de vidéo
  }

  return totalDuration;
}

/**
 * Récupère les clés API de l'utilisateur
 */
async function getUserApiKeys(userId: string): Promise<{
  openaiKey?: string;
  imageGenKey?: string;
  vo3Key?: string;
} | null> {
  try {
    const userApiKeys = await db.userApiKeys.findUnique({
      where: { userId }
    });

    if (!userApiKeys) {
      return null;
    }

    return {
      openaiKey: userApiKeys.openaiKey || undefined,
      imageGenKey: userApiKeys.imageGenKey || undefined,
      vo3Key: userApiKeys.vo3Key || undefined
    };
  } catch (error) {
    console.error('Error fetching user API keys:', error);
    return null;
  }
}

/**
 * Valide que les clés API requises sont disponibles
 */
function validateApiKeysForWorkflow(
  workflowType: string,
  userApiKeys: { openaiKey?: string; imageGenKey?: string; vo3Key?: string }
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Clés requises selon le type de workflow
  if (workflowType === 'complete' || workflowType === 'image-only') {
    if (!userApiKeys.openaiKey) {
      missing.push('OpenAI API key (required for prompt enhancement)');
    }
    if (!userApiKeys.imageGenKey && !userApiKeys.openaiKey) {
      missing.push('Image generation API key (DALL-E or OpenAI)');
    }
  }

  if (workflowType === 'complete' || workflowType === 'video-from-image') {
    if (!userApiKeys.vo3Key) {
      missing.push('Video generation API key (VO3/VEO3)');
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}