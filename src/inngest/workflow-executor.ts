import { inngest } from '@/lib/inngest';
import { db } from '@/server/api/db';
import { PromptEnhancerService } from '@/services/prompt-enhancer';
import { ImageGeneratorService } from '@/services/image-generator';
import { VideoGeneratorService } from '@/services/video-generator';
import { EncryptionService } from '@/services/encryption';

export interface WorkflowExecuteEvent {
  workflowId: string;
  userId: string;
  projectId?: string;
  config: {
    initialPrompt: string;
    workflowType: 'complete' | 'image-only' | 'video-from-image';
    customImageUrl?: string; // For video-from-image workflow
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
  userApiKeys: {
    openaiKey: string;
    imageGenKey: string;
    vo3Key: string;
  };
}

interface WorkflowStepUpdate {
  workflowId: string;
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  input?: any;
  output?: any;
  error?: string;
  cost?: number;
}

/**
 * Job Inngest principal pour l'exécution des workflows complets
 * Conforme au PRD V2 Section 8
 */
export const executeWorkflow = inngest.createFunction(
  {
    id: 'execute-workflow-v2',
    name: 'Execute Complete Content Creation Workflow V2',
    concurrency: { limit: 5, key: 'event.data.userId' },
    retries: 2,
  },
  { event: 'workflow.execute' },
  async ({ event, step }) => {
    const { workflowId, userId, projectId, config, userApiKeys } = event.data as WorkflowExecuteEvent;
    
    console.log(`Starting workflow ${workflowId} for user ${userId}`);

    // Décrypter les clés API
    const encryption = new EncryptionService();
    const decryptedKeys = await step.run('decrypt-api-keys', async () => {
      try {
        return {
          openaiKey: userApiKeys.openaiKey ? encryption.decrypt(userApiKeys.openaiKey) : null,
          imageGenKey: userApiKeys.imageGenKey ? encryption.decrypt(userApiKeys.imageGenKey) : null,
          vo3Key: userApiKeys.vo3Key ? encryption.decrypt(userApiKeys.vo3Key) : null,
        };
      } catch (error) {
        throw new Error(`Failed to decrypt API keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Initialiser les services avec les clés décryptées
    const promptEnhancer = decryptedKeys.openaiKey ? new PromptEnhancerService(decryptedKeys.openaiKey) : null;
    const imageGenerator = decryptedKeys.imageGenKey ? new ImageGeneratorService(decryptedKeys.imageGenKey, 'dalle3') : null;
    const videoGenerator = decryptedKeys.vo3Key ? new VideoGeneratorService(decryptedKeys.vo3Key, 'fal-ai') : null;

    let enhancedPrompt: string | undefined;
    let generatedImage: any | undefined;
    let generatedVideo: any | undefined;

    try {
      // === ÉTAPE 1: Amélioration du prompt (pour complete et image-only) ===
      if (config.workflowType === 'complete' || config.workflowType === 'image-only') {
        enhancedPrompt = await step.run('enhance-prompt', async () => {
          if (!promptEnhancer) {
            throw new Error('OpenAI API key required for prompt enhancement');
          }

          await updateWorkflowStep({
            workflowId,
            stepId: 'enhance_prompt',
            status: 'running',
            progress: 0,
            startTime: new Date(),
            cost: 1
          });

          try {
            const result = await promptEnhancer.enhance(config.initialPrompt, {
              context: 'image',
              model: 'gpt-4-turbo-preview',
              temperature: 0.7
            });

            await updateWorkflowStep({
              workflowId,
              stepId: 'enhance_prompt',
              status: 'completed',
              progress: 100,
              endTime: new Date(),
              output: result,
              cost: 1
            });

            // Déduire les crédits pour l'amélioration
            await deductUserCredits(userId, 1, {
              workflowId,
              step: 'prompt_enhancement',
              tokensUsed: result.tokensUsed
            });

            return result.enhanced;
          } catch (error) {
            await updateWorkflowStep({
              workflowId,
              stepId: 'enhance_prompt',
              status: 'failed',
              progress: 0,
              endTime: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
          }
        });
      }

      // === ÉTAPE 2: Génération d'image (pour complete et image-only) ===
      if (config.workflowType === 'complete' || config.workflowType === 'image-only') {
        generatedImage = await step.run('generate-image', async () => {
          if (!imageGenerator) {
            throw new Error('Image generation API key required');
          }

          await updateWorkflowStep({
            workflowId,
            stepId: 'generate_image',
            status: 'running',
            progress: 0,
            startTime: new Date()
          });

          try {
            const result = await imageGenerator.generate(enhancedPrompt!, {
              ...config.imageConfig,
              userId,
              projectId
            });

            if (!result.success || result.images.length === 0) {
              throw new Error(result.error || 'Image generation failed');
            }

            const image = result.images[0];
            
            // Upload vers S3
            const uploadResult = await imageGenerator.uploadToS3(image.url, {
              generationId: image.id,
              userId,
              projectId
            });

            const imageCost = calculateImageCost(config.imageConfig);
            
            await updateWorkflowStep({
              workflowId,
              stepId: 'generate_image',
              status: 'completed',
              progress: 100,
              endTime: new Date(),
              output: {
                imageUrl: uploadResult.cdnUrl,
                s3Url: uploadResult.s3Url,
                metadata: image.metadata
              },
              cost: imageCost
            });

            // Déduire les crédits pour l'image
            await deductUserCredits(userId, imageCost, {
              workflowId,
              step: 'image_generation',
              size: config.imageConfig.size,
              quality: config.imageConfig.quality
            });

            return {
              cdnUrl: uploadResult.cdnUrl,
              s3Url: uploadResult.s3Url,
              metadata: image.metadata
            };
          } catch (error) {
            await updateWorkflowStep({
              workflowId,
              stepId: 'generate_image',
              status: 'failed',
              progress: 0,
              endTime: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
          }
        });
      }

      // === ÉTAPE 3: Génération vidéo (pour complete et video-from-image) ===
      if (config.workflowType === 'complete' || config.workflowType === 'video-from-image') {
        generatedVideo = await step.run('generate-video', async () => {
          if (!videoGenerator) {
            throw new Error('Video generation API key required');
          }

          const sourceImageUrl = config.workflowType === 'video-from-image' 
            ? config.customImageUrl!
            : generatedImage!.cdnUrl;

          await updateWorkflowStep({
            workflowId,
            stepId: 'generate_video',
            status: 'running',
            progress: 0,
            startTime: new Date()
          });

          try {
            const result = await videoGenerator.generateFromImage(sourceImageUrl, {
              ...config.videoConfig,
              userId,
              projectId
            });

            if (!result.success) {
              throw new Error(result.error || 'Video generation failed');
            }

            // Si c'est un job asynchrone, attendre la completion avec polling
            if (result.job) {
              let jobStatus = result.job;
              let attempts = 0;
              const maxAttempts = 60; // 10 minutes max (60 * 10s)

              while (attempts < maxAttempts && (jobStatus.status === 'queued' || jobStatus.status === 'processing')) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10s
                
                jobStatus = await videoGenerator.getJobStatus(result.job.id);
                
                // Mettre à jour le progress
                const progressValue = Math.min(10 + (attempts * 1.5), 90);
                await updateWorkflowStep({
                  workflowId,
                  stepId: 'generate_video',
                  status: 'running',
                  progress: progressValue,
                  startTime: new Date()
                });
                
                if (jobStatus.status === 'failed') {
                  throw new Error(jobStatus.error || 'Video generation job failed');
                }
                
                attempts++;
              }

              if (jobStatus.status !== 'completed') {
                throw new Error('Video generation timeout');
              }

              // TODO: Récupérer l'URL de la vidéo depuis le job complété
              // Pour l'instant, simuler
              const videoUrl = 'https://example.com/generated-video.mp4';
              
              const uploadResult = await videoGenerator.uploadToS3(videoUrl, {
                generationId: result.job.id,
                userId,
                projectId
              });

              const videoCost = calculateVideoCost(config.videoConfig);

              await updateWorkflowStep({
                workflowId,
                stepId: 'generate_video',
                status: 'completed',
                progress: 100,
                endTime: new Date(),
                output: {
                  videoUrl: uploadResult.cdnUrl,
                  thumbnailUrl: uploadResult.thumbnailUrl,
                  s3Url: uploadResult.s3Url,
                  metadata: {
                    duration: config.videoConfig.duration,
                    resolution: config.videoConfig.resolution,
                    hasAudio: config.videoConfig.generateAudio || false
                  }
                },
                cost: videoCost
              });

              // Déduire les crédits pour la vidéo
              await deductUserCredits(userId, videoCost, {
                workflowId,
                step: 'video_generation',
                duration: config.videoConfig.duration,
                resolution: config.videoConfig.resolution,
                hasAudio: config.videoConfig.generateAudio
              });

              return {
                cdnUrl: uploadResult.cdnUrl,
                thumbnailUrl: uploadResult.thumbnailUrl,
                s3Url: uploadResult.s3Url,
                metadata: {
                  duration: config.videoConfig.duration,
                  resolution: config.videoConfig.resolution,
                  hasAudio: config.videoConfig.generateAudio || false
                }
              };
            }

            throw new Error('Synchronous video generation not supported');
          } catch (error) {
            await updateWorkflowStep({
              workflowId,
              stepId: 'generate_video',
              status: 'failed',
              progress: 0,
              endTime: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
          }
        });
      }

      // === ÉTAPE 4: Sauvegarde du contenu final ===
      const savedContent = await step.run('save-content', async () => {
        return await db.content.create({
          data: {
            userId,
            type: config.workflowType === 'image-only' ? 'image' : 'video',
            title: `Generated Content - ${new Date().toLocaleDateString()}`,
            originalPrompt: config.initialPrompt,
            enhancedPrompt: enhancedPrompt || null,
            imageUrl: generatedImage?.cdnUrl || config.customImageUrl || null,
            videoUrl: generatedVideo?.cdnUrl || null,
            thumbnailUrl: generatedVideo?.thumbnailUrl || generatedImage?.cdnUrl || null,
            status: 'COMPLETED',
            metadata: {
              workflowId,
              workflowType: config.workflowType,
              imageConfig: config.imageConfig,
              videoConfig: config.videoConfig,
              generatedAt: new Date().toISOString(),
              imageMetadata: generatedImage?.metadata,
              videoMetadata: generatedVideo?.metadata
            }
          }
        });
      });

      // === FINALISATION ===
      await step.run('finalize-workflow', async () => {
        // Calculer le coût total
        const totalCost = 
          (config.workflowType === 'complete' || config.workflowType === 'image-only' ? 1 + calculateImageCost(config.imageConfig) : 0) +
          (config.workflowType === 'complete' || config.workflowType === 'video-from-image' ? calculateVideoCost(config.videoConfig) : 0);

        // Enregistrer l'événement de completion
        await db.usageEvent.create({
          data: {
            userId,
            event: 'workflow_completed',
            metadata: {
              workflowId,
              workflowType: config.workflowType,
              contentId: savedContent.id,
              totalCost,
              duration: Date.now() - new Date(event.ts).getTime(),
              steps: {
                promptEnhanced: !!enhancedPrompt,
                imageGenerated: !!generatedImage,
                videoGenerated: !!generatedVideo
              }
            }
          }
        });

        console.log(`Workflow ${workflowId} completed successfully for user ${userId}`);
      });

      return {
        success: true,
        workflowId,
        contentId: savedContent.id,
        result: {
          enhancedPrompt,
          imageUrl: generatedImage?.cdnUrl || config.customImageUrl,
          videoUrl: generatedVideo?.cdnUrl,
          thumbnailUrl: generatedVideo?.thumbnailUrl || generatedImage?.cdnUrl,
        },
        totalDuration: Date.now() - new Date(event.ts).getTime()
      };

    } catch (error) {
      console.error(`Workflow ${workflowId} failed:`, error);
      
      // Enregistrer l'erreur
      await db.usageEvent.create({
        data: {
          userId,
          event: 'workflow_failed',
          metadata: {
            workflowId,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - new Date(event.ts).getTime()
          }
        }
      });

      throw error;
    }
  }
);

/**
 * Met à jour le statut d'une étape de workflow
 */
async function updateWorkflowStep(update: WorkflowStepUpdate): Promise<void> {
  // TODO: Implémenter la mise à jour en temps réel via WebSocket/SSE
  // Pour l'instant, logger
  console.log(`Workflow ${update.workflowId} - Step ${update.stepId}: ${update.status} (${update.progress}%)`);
  
  if (update.error) {
    console.error(`Workflow ${update.workflowId} - Step ${update.stepId} error:`, update.error);
  }
}

/**
 * Déduit les crédits de l'utilisateur
 */
async function deductUserCredits(
  userId: string, 
  amount: number, 
  metadata: Record<string, any>
): Promise<void> {
  try {
    // Transaction atomique pour déduire les crédits
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true }
      });

      if (!user || user.credits < amount) {
        throw new Error('Insufficient credits');
      }

      // Déduction des crédits
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: { decrement: amount },
          creditsUsed: { increment: amount }
        }
      });

      // Enregistrer la transaction
      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'DEBIT',
          amount,
          reason: `workflow_${metadata.step}`,
          metadata
        }
      });
    });

    console.log(`Deducted ${amount} credits from user ${userId} for ${metadata.step}`);
  } catch (error) {
    console.error(`Failed to deduct credits for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Calcule le coût de génération d'image
 */
function calculateImageCost(config: { quality: string; size: string }): number {
  const costs = {
    'standard': { '1024x1024': 2, '1792x1024': 3, '1024x1792': 3 },
    'hd': { '1024x1024': 3, '1792x1024': 5, '1024x1792': 5 }
  };

  return (costs as any)[config.quality]?.[config.size] || 2;
}

/**
 * Calcule le coût de génération vidéo
 */
function calculateVideoCost(config: { 
  duration: number; 
  resolution: string; 
  generateAudio?: boolean 
}): number {
  const baseCosts = {
    5: { '720p': 8, '1080p': 12, '4k': 25 },
    8: { '720p': 10, '1080p': 15, '4k': 30 },
    15: { '720p': 18, '1080p': 25, '4k': 50 },
    30: { '720p': 35, '1080p': 50, '4k': 100 },
    60: { '720p': 70, '1080p': 100, '4k': 200 }
  };

  const durationCosts = (baseCosts as any)[config.duration] || baseCosts[8];
  const baseCost = durationCosts[config.resolution] || durationCosts['1080p'];

  // Bonus pour l'audio
  const audioCost = config.generateAudio ? Math.ceil(baseCost * 0.2) : 0;

  return baseCost + audioCost;
}