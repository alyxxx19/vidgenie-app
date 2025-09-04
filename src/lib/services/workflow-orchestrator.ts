import { EventEmitter } from 'events';
import { imageGenerationService } from './image-generation';
import { veo3Client } from './veo3-client';
import { moderatePrompt } from '@/lib/content-moderation';
import { uploadToS3 } from '@/lib/s3';
import { PrismaClient } from '@prisma/client';

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface WorkflowParams {
  jobId: string;
  userId: string;
  imagePrompt: string;
  videoPrompt: string;
  imageConfig: {
    style: 'natural' | 'vivid';
    quality: 'standard' | 'hd';
    size: '1024x1024' | '1792x1024' | '1024x1792';
  };
  videoConfig: {
    duration: '8s';
    resolution: '720p' | '1080p';
    generateAudio: boolean;
  };
  projectId?: string;
}

export interface WorkflowResult {
  success: boolean;
  workflowId: string;
  imageAsset?: any;
  videoAsset?: any;
  error?: string;
  totalDuration?: number;
  steps: WorkflowStep[];
}

export class WorkflowOrchestrator extends EventEmitter {
  private db: PrismaClient;
  private activeWorkflows: Map<string, WorkflowStep[]> = new Map();
  
  constructor(db: PrismaClient) {
    super();
    this.db = db;
  }

  async executeWorkflow(params: WorkflowParams): Promise<WorkflowResult> {
    const startTime = Date.now();
    const steps: WorkflowStep[] = [
      {
        id: 'validation',
        name: 'Validation & Security Check',
        status: 'pending',
        progress: 0
      },
      {
        id: 'image_generation',
        name: 'Generate Image with DALL-E 3',
        status: 'pending',
        progress: 0
      },
      {
        id: 'image_upload',
        name: 'Upload Image to Storage',
        status: 'pending',
        progress: 0
      },
      {
        id: 'video_generation',
        name: 'Convert Image to Video with VEO 3',
        status: 'pending',
        progress: 0
      },
      {
        id: 'video_upload',
        name: 'Upload Video to Storage',
        status: 'pending',
        progress: 0
      },
      {
        id: 'finalization',
        name: 'Finalize Assets',
        status: 'pending',
        progress: 0
      }
    ];

    this.activeWorkflows.set(params.jobId, steps);
    
    try {
      // Étape 1: Validation & Modération
      await this.updateStepStatus(params.jobId, 'validation', 'processing', 10);
      
      const imageModerationResult = await moderatePrompt(params.imagePrompt);
      if (!imageModerationResult.allowed) {
        throw new Error(`Image prompt not allowed: ${imageModerationResult.reason}`);
      }
      
      const videoModerationResult = await moderatePrompt(params.videoPrompt);
      if (!videoModerationResult.allowed) {
        throw new Error(`Video prompt not allowed: ${videoModerationResult.reason}`);
      }
      
      await this.updateStepStatus(params.jobId, 'validation', 'completed', 100);

      // Étape 2: Génération d'image
      await this.updateStepStatus(params.jobId, 'image_generation', 'processing', 20);
      
      // Optimiser le prompt image pour la vidéo
      const optimizedImagePrompt = imageGenerationService.optimizePromptForVideo(params.imagePrompt);
      
      const imageResponse = await imageGenerationService.generateImage({
        prompt: optimizedImagePrompt,
        style: params.imageConfig.style,
        quality: params.imageConfig.quality,
        size: params.imageConfig.size,
      });
      
      await this.updateStepStatus(params.jobId, 'image_generation', 'completed', 100, imageResponse);

      // Étape 3: Upload de l'image
      await this.updateStepStatus(params.jobId, 'image_upload', 'processing', 30);
      
      const imageBuffer = await imageGenerationService.downloadAndGetSize(imageResponse.imageUrl);
      const imageS3Key = `images/${params.jobId}.png`;
      const imageS3Result = await uploadToS3(imageBuffer, imageS3Key, 'image/png');
      
      // Créer l'asset image en BDD
      const imageAsset = await this.db.asset.create({
        data: {
          userId: params.userId,
          projectId: params.projectId,
          filename: `${params.jobId}.png`,
          originalName: `generated-image-${Date.now()}.png`,
          mimeType: 'image/png',
          fileSize: imageBuffer.length,
          width: imageResponse.metadata.width,
          height: imageResponse.metadata.height,
          s3Key: imageS3Key,
          s3Bucket: process.env.S3_BUCKET_NAME || 'vidgenie-media-dev',
          s3Region: process.env.S3_REGION || 'eu-west-3',
          publicUrl: imageS3Result.publicUrl,
          generatedBy: 'openai/dall-e-3',
          prompt: params.imagePrompt,
          status: 'ready',
          aiConfig: {
            provider: 'openai',
            model: 'dall-e-3',
            revisedPrompt: imageResponse.revisedPrompt,
          },
        },
      });

      await this.updateStepStatus(params.jobId, 'image_upload', 'completed', 100, imageAsset);

      // Mettre à jour le job avec l'asset image
      await this.db.generationJob.update({
        where: { id: params.jobId },
        data: { 
          status: 'IMAGE_READY',
          imageAssetId: imageAsset.id 
        },
      });

      // Étape 4: Génération vidéo
      await this.updateStepStatus(params.jobId, 'video_generation', 'processing', 50);
      
      // Valider la requête VEO3
      const veo3Request = {
        imageUrl: imageAsset.publicUrl,
        prompt: params.videoPrompt,
        duration: params.videoConfig.duration,
        resolution: params.videoConfig.resolution,
        generateAudio: params.videoConfig.generateAudio,
      };
      
      const validation = veo3Client.validateRequest(veo3Request);
      if (!validation.valid) {
        throw new Error(`VEO3 validation failed: ${validation.errors.join(', ')}`);
      }

      // Démarrer la génération vidéo
      const videoGenerationResponse = await veo3Client.generateVideo(veo3Request);
      
      // Mettre à jour le job avec l'ID provider
      await this.db.generationJob.update({
        where: { id: params.jobId },
        data: { 
          status: 'GENERATING_VIDEO',
          providerJobId: videoGenerationResponse.requestId,
          startedAt: new Date(),
        },
      });

      // Attendre la completion de la vidéo (polling)
      let videoResult;
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max (30 * 10s)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Attendre 10s
        
        videoResult = await veo3Client.getJobStatus(videoGenerationResponse.requestId);
        
        // Mettre à jour le progrès
        const progressValue = Math.min(50 + (attempts * 2), 90);
        await this.updateStepStatus(params.jobId, 'video_generation', 'processing', progressValue);
        
        if (videoResult.status === 'COMPLETED') {
          break;
        } else if (videoResult.status === 'FAILED') {
          throw new Error(videoResult.error || 'Video generation failed');
        }
        
        attempts++;
      }
      
      if (!videoResult || videoResult.status !== 'COMPLETED' || !videoResult.videoUrl) {
        throw new Error('Video generation timeout or failed');
      }
      
      await this.updateStepStatus(params.jobId, 'video_generation', 'completed', 100, videoResult);

      // Étape 5: Upload de la vidéo
      await this.updateStepStatus(params.jobId, 'video_upload', 'processing', 85);
      
      // Télécharger la vidéo depuis VEO3
      const videoResponse = await fetch(videoResult.videoUrl);
      if (!videoResponse.ok) {
        throw new Error('Failed to download video from VEO3');
      }
      
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const videoS3Key = `videos/${params.jobId}.mp4`;
      const videoS3Result = await uploadToS3(videoBuffer, videoS3Key, 'video/mp4');
      
      // Créer l'asset vidéo en BDD
      const videoAsset = await this.db.asset.create({
        data: {
          userId: params.userId,
          projectId: params.projectId,
          filename: `${params.jobId}.mp4`,
          originalName: `generated-video-${Date.now()}.mp4`,
          mimeType: 'video/mp4',
          fileSize: videoBuffer.length,
          duration: 8, // fal.ai only supports 8s
          width: params.videoConfig.resolution === '1080p' ? 1920 : 1280,
          height: params.videoConfig.resolution === '1080p' ? 1080 : 720,
          s3Key: videoS3Key,
          s3Bucket: process.env.S3_BUCKET_NAME || 'vidgenie-media-dev',
          s3Region: process.env.S3_REGION || 'eu-west-3',
          publicUrl: videoS3Result.publicUrl,
          generatedBy: 'fal-ai/google-veo-3',
          prompt: params.videoPrompt,
          status: 'ready',
          frameRate: 30,
          aiConfig: {
            provider: 'fal-ai-veo3',
            baseImage: imageAsset.publicUrl,
            duration: params.videoConfig.duration,
            resolution: params.videoConfig.resolution,
            generateAudio: params.videoConfig.generateAudio,
          },
        },
      });

      await this.updateStepStatus(params.jobId, 'video_upload', 'completed', 100, videoAsset);

      // Étape 6: Finalisation
      await this.updateStepStatus(params.jobId, 'finalization', 'processing', 95);
      
      // Mettre à jour le job final
      await this.db.generationJob.update({
        where: { id: params.jobId },
        data: {
          status: 'VIDEO_READY',
          videoAssetId: videoAsset.id,
          completedAt: new Date(),
          processingTime: Date.now() - startTime,
        },
      });

      await this.updateStepStatus(params.jobId, 'finalization', 'completed', 100);

      const finalSteps = this.activeWorkflows.get(params.jobId) || steps;
      this.activeWorkflows.delete(params.jobId);

      return {
        success: true,
        workflowId: params.jobId,
        imageAsset,
        videoAsset,
        totalDuration: Date.now() - startTime,
        steps: finalSteps,
      };

    } catch (error) {
      console.error('Workflow error:', error);
      
      // Marquer toutes les étapes restantes comme échouées
      const currentSteps = this.activeWorkflows.get(params.jobId) || steps;
      const errorMessage = error instanceof Error ? error.message : 'Unknown workflow error';
      
      for (const step of currentSteps) {
        if (step.status === 'processing') {
          await this.updateStepStatus(params.jobId, step.id, 'failed', step.progress, null, errorMessage);
        }
      }

      // Mettre à jour le job en BDD
      await this.db.generationJob.update({
        where: { id: params.jobId },
        data: {
          status: 'FAILED',
          errorMessage,
          completedAt: new Date(),
        },
      });

      const finalSteps = this.activeWorkflows.get(params.jobId) || steps;
      this.activeWorkflows.delete(params.jobId);

      return {
        success: false,
        workflowId: params.jobId,
        error: errorMessage,
        totalDuration: Date.now() - startTime,
        steps: finalSteps,
      };
    }
  }

  private async updateStepStatus(
    workflowId: string, 
    stepId: string, 
    status: WorkflowStep['status'], 
    progress: number,
    result?: any,
    error?: string
  ) {
    const steps = this.activeWorkflows.get(workflowId);
    if (!steps) return;

    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = status;
    step.progress = progress;
    step.result = result;
    step.error = error;
    
    if (status === 'processing' && !step.startedAt) {
      step.startedAt = new Date();
    }
    
    if (status === 'completed' || status === 'failed') {
      step.completedAt = new Date();
    }

    // Émettre l'événement pour les listeners (WebSocket, SSE, etc.)
    this.emit('workflow:update', {
      workflowId,
      stepId,
      step: { ...step },
      allSteps: [...steps],
      timestamp: new Date(),
    });

    // Logs pour le debug
    console.log(`Workflow ${workflowId} - Step ${stepId}: ${status} (${progress}%)`);
    if (error) {
      console.error(`Workflow ${workflowId} - Step ${stepId} error:`, error);
    }
  }

  getWorkflowStatus(workflowId: string): WorkflowStep[] | undefined {
    return this.activeWorkflows.get(workflowId);
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
    const steps = this.activeWorkflows.get(workflowId);
    if (!steps) return false;

    // Tenter d'annuler chez les providers
    try {
      const job = await this.db.generationJob.findUnique({
        where: { id: workflowId }
      });

      if (job?.providerJobId && job.provider?.includes('fal-ai-veo3')) {
        try {
          await veo3Client.cancelJob(job.providerJobId);
        } catch (error) {
          console.warn('Failed to cancel VEO3 job:', error);
        }
      }
    } catch (error) {
      console.warn('Error during workflow cancellation:', error);
    }

    // Marquer toutes les étapes comme annulées
    for (const step of steps) {
      if (step.status === 'pending' || step.status === 'processing') {
        await this.updateStepStatus(workflowId, step.id, 'failed', step.progress, null, 'Cancelled by user');
      }
    }

    // Nettoyer
    this.activeWorkflows.delete(workflowId);
    
    return true;
  }

  // Méthodes de monitoring
  getActiveWorkflowCount(): number {
    return this.activeWorkflows.size;
  }

  getActiveWorkflowIds(): string[] {
    return Array.from(this.activeWorkflows.keys());
  }

  // Health check des APIs
  async testAPIs(): Promise<{dalle: boolean, veo3: boolean, details: any}> {
    const results = {
      dalle: false,
      veo3: false,
      details: {} as any
    };

    try {
      // Test DALL-E 3
      const dalleTest = await imageGenerationService.generateImage({
        prompt: "test image generation",
        style: 'natural',
        quality: 'standard',
        size: '1024x1024',
      });
      results.dalle = !!dalleTest.imageUrl;
      results.details.dalle = { success: true, url: dalleTest.imageUrl };
    } catch (error) {
      results.details.dalle = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    try {
      // Test VEO3 avec validation seulement
      const testRequest = {
        imageUrl: 'https://example.com/test.jpg',
        prompt: 'test video generation prompt that is long enough to pass validation',
        duration: '8s' as const,
        resolution: '1080p' as const,
        generateAudio: false,
      };
      
      const validation = veo3Client.validateRequest(testRequest);
      results.veo3 = validation.valid;
      results.details.veo3 = validation.valid 
        ? { success: true, message: 'VEO3 validation passed' }
        : { success: false, errors: validation.errors };
    } catch (error) {
      results.details.veo3 = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    return results;
  }
}

// Instance singleton pour l'application
let orchestratorInstance: WorkflowOrchestrator | null = null;

export function getWorkflowOrchestrator(db: PrismaClient): WorkflowOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new WorkflowOrchestrator(db);
  }
  return orchestratorInstance;
}