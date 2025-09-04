import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { db } from '@/server/api/db';
import { getWorkflowOrchestrator } from '@/lib/services/workflow-orchestrator';
import { z } from 'zod';

const startWorkflowSchema = z.object({
  imagePrompt: z.string().min(10).max(2000),
  videoPrompt: z.string().min(10).max(1000),
  imageConfig: z.object({
    style: z.enum(['natural', 'vivid']).default('vivid'),
    quality: z.enum(['standard', 'hd']).default('hd'),
    size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1792'),
  }).optional(),
  videoConfig: z.object({
    duration: z.enum(['8s']).default('8s'),
    resolution: z.enum(['720p', '1080p']).default('1080p'),
    generateAudio: z.boolean().default(true),
  }).optional(),
  projectId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authentification
    const user = await getServerUser(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validation des paramètres
    const body = await request.json();
    const validatedData = startWorkflowSchema.parse(body);

    // Vérifier les crédits de l'utilisateur
    const userProfile = await db.user.findUnique({
      where: { id: user.id },
      select: { creditsBalance: true },
    });

    const TOTAL_COST = 20; // 5 pour l'image + 15 pour la vidéo
    if (!userProfile || userProfile.creditsBalance < TOTAL_COST) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits', 
          required: TOTAL_COST,
          available: userProfile?.creditsBalance || 0 
        },
        { status: 400 }
      );
    }

    // Créer le job de génération en BDD
    const generationJob = await db.generationJob.create({
      data: {
        userId: user.id,
        projectId: validatedData.projectId,
        kind: 'IMAGE_TO_VIDEO',
        status: 'QUEUED',
        inputPrompt: `Image: ${validatedData.imagePrompt} | Video: ${validatedData.videoPrompt}`,
        imagePrompt: validatedData.imagePrompt,
        videoPrompt: validatedData.videoPrompt,
        provider: 'openai+fal-ai-veo3',
        costCents: TOTAL_COST * 100,
        providerData: {
          imageConfig: validatedData.imageConfig || {
            style: 'vivid',
            quality: 'hd',
            size: '1024x1792',
          },
          videoConfig: validatedData.videoConfig || {
            duration: '8s',
            resolution: '1080p',
            generateAudio: true,
          },
        },
      },
    });

    // Déduire les crédits immédiatement
    await db.user.update({
      where: { id: user.id },
      data: { creditsBalance: { decrement: TOTAL_COST } },
    });

    await db.creditLedger.create({
      data: {
        userId: user.id,
        amount: -TOTAL_COST,
        type: 'generation',
        description: `Image-to-video workflow: ${validatedData.imagePrompt.slice(0, 30)}...`,
      },
    });

    // Préparer les paramètres du workflow
    const workflowParams = {
      jobId: generationJob.id,
      userId: user.id,
      imagePrompt: validatedData.imagePrompt,
      videoPrompt: validatedData.videoPrompt,
      imageConfig: validatedData.imageConfig || {
        style: 'vivid' as const,
        quality: 'hd' as const,
        size: '1024x1792' as const,
      },
      videoConfig: validatedData.videoConfig || {
        duration: '8s' as const,
        resolution: '1080p' as const,
        generateAudio: true,
      },
      projectId: validatedData.projectId,
    };

    // Démarrer le workflow de façon asynchrone
    const orchestrator = getWorkflowOrchestrator(db);
    
    // Exécuter le workflow en arrière-plan
    orchestrator.executeWorkflow(workflowParams).catch(async (error) => {
      console.error('Workflow execution failed:', error);
      
      // En cas d'erreur critique, rembourser les crédits
      await db.user.update({
        where: { id: user.id },
        data: { creditsBalance: { increment: TOTAL_COST } },
      });

      await db.creditLedger.create({
        data: {
          userId: user.id,
          amount: TOTAL_COST,
          type: 'refund',
          description: 'Workflow failed - automatic refund',
        },
      });
    });

    return NextResponse.json({
      success: true,
      workflowId: generationJob.id,
      jobId: generationJob.id,
      estimatedDuration: 180000, // 3 minutes
      streamUrl: `/api/workflow/${generationJob.id}/stream`,
    });

  } catch (error) {
    console.error('Start workflow error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}