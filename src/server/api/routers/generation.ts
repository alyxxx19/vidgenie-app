import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { imageGenerationService } from '@/lib/services/image-generation';
import { veo3Client } from '@/lib/services/veo3-client';
import { uploadToS3 } from '@/lib/s3';
import { inngest } from '@/lib/inngest';
import { moderatePrompt } from '@/lib/content-moderation';
import crypto from 'crypto';

const imageGenerationSchema = z.object({
  prompt: z.string().min(10).max(2000),
  style: z.enum(['natural', 'vivid']).default('vivid'),
  quality: z.enum(['standard', 'hd']).default('hd'),
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1792'),
  projectId: z.string().optional(),
});

const videoGenerationSchema = z.object({
  imageAssetId: z.string(),
  prompt: z.string().min(10).max(1000),
  duration: z.enum(['8s']).default('8s'),
  resolution: z.enum(['720p', '1080p']).default('1080p'),
  generateAudio: z.boolean().default(true),
  projectId: z.string().optional(),
});


export const generationRouter = createTRPCRouter({
  // Générer une image avec DALL-E 3
  generateImage: protectedProcedure
    .input(imageGenerationSchema)
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      // Modération du contenu
      const moderationResult = await moderatePrompt(input.prompt);
      if (!moderationResult.allowed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Content not allowed: ${moderationResult.reason}`,
        });
      }

      // Vérifier les crédits
      const userRecord = await db.user.findUnique({
        where: { id: user.id },
        select: { creditsBalance: true },
      });

      const IMAGE_COST = 5;
      if (!userRecord || userRecord.creditsBalance < IMAGE_COST) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient credits. You have ${userRecord?.creditsBalance || 0} credits but need ${IMAGE_COST}.`,
        });
      }

      // Créer le job de génération
      const generationJob = await db.generationJob.create({
        data: {
          userId: user.id,
          projectId: input.projectId,
          kind: 'IMAGE',
          status: 'QUEUED',
          inputPrompt: input.prompt,
          imagePrompt: input.prompt,
          provider: 'openai',
          costCents: IMAGE_COST * 100,
        },
      });

      // Déduire les crédits
      await db.user.update({
        where: { id: user.id },
        data: { creditsBalance: { decrement: IMAGE_COST } },
      });

      await db.creditLedger.create({
        data: {
          userId: user.id,
          amount: -IMAGE_COST,
          type: 'generation',
          description: `Image generation: ${input.prompt.slice(0, 50)}...`,
        },
      });

      // Déclencher le worker Inngest pour l'image
      try {
        await inngest.send({
          name: 'generation/generate-image',
          data: { 
            jobId: generationJob.id,
            prompt: input.prompt,
            config: {
              style: input.style,
              quality: input.quality,
              size: input.size,
            }
          }
        });
      } catch (error) {
        console.warn('Inngest not available, running in development mode:', error);
        
        // Mode développement : génération immédiate
        if (process.env.NODE_ENV === 'development') {
          setTimeout(async () => {
            try {
              await db.generationJob.update({
                where: { id: generationJob.id },
                data: { 
                  status: 'GENERATING_IMAGE',
                  startedAt: new Date(),
                },
              });

              const imageResponse = await imageGenerationService.generateImage({
                prompt: input.prompt,
                style: input.style,
                quality: input.quality,
                size: input.size,
              });

              // Télécharger et uploader l'image vers S3
              const imageBuffer = await imageGenerationService.downloadAndGetSize(imageResponse.imageUrl);
              const s3Key = `images/${generationJob.id}.png`;
              const s3Result = await uploadToS3(imageBuffer, s3Key, 'image/png');

              // Créer l'asset
              const imageAsset = await db.asset.create({
                data: {
                  userId: user.id,
                  projectId: input.projectId,
                  filename: `${generationJob.id}.png`,
                  originalName: `generated-image-${Date.now()}.png`,
                  mimeType: 'image/png',
                  fileSize: imageBuffer.length,
                  width: imageResponse.metadata.width,
                  height: imageResponse.metadata.height,
                  s3Key,
                  s3Bucket: process.env.S3_BUCKET_NAME || 'vidgenie-media-dev',
                  s3Region: process.env.S3_REGION || 'eu-west-3',
                  publicUrl: s3Result.publicUrl,
                  generatedBy: 'openai/dall-e-3',
                  prompt: input.prompt,
                  status: 'ready',
                  aiConfig: {
                    provider: 'openai',
                    model: 'dall-e-3',
                    revisedPrompt: imageResponse.revisedPrompt,
                  },
                },
              });

              // Marquer le job comme terminé
              await db.generationJob.update({
                where: { id: generationJob.id },
                data: {
                  status: 'IMAGE_READY',
                  imageAssetId: imageAsset.id,
                  completedAt: new Date(),
                },
              });
            } catch (error) {
              await db.generationJob.update({
                where: { id: generationJob.id },
                data: {
                  status: 'FAILED',
                  errorMessage: error instanceof Error ? error.message : 'Unknown error',
                  completedAt: new Date(),
                },
              });
            }
          }, 1000);
        }
      }

      return { jobId: generationJob.id };
    }),

  // Générer une vidéo à partir d'une image avec Google Veo 3
  generateVideoFromImage: protectedProcedure
    .input(videoGenerationSchema)
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      // Modération du contenu
      const moderationResult = await moderatePrompt(input.prompt);
      if (!moderationResult.allowed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Content not allowed: ${moderationResult.reason}`,
        });
      }

      // Vérifier les crédits
      const userRecord = await db.user.findUnique({
        where: { id: user.id },
        select: { creditsBalance: true },
      });

      const VIDEO_COST = 15;
      if (!userRecord || userRecord.creditsBalance < VIDEO_COST) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient credits. You have ${userRecord?.creditsBalance || 0} credits but need ${VIDEO_COST}.`,
        });
      }

      // Vérifier que l'image existe et appartient à l'utilisateur
      const imageAsset = await db.asset.findFirst({
        where: {
          id: input.imageAssetId,
          userId: user.id,
          mimeType: { startsWith: 'image/' },
        },
      });

      if (!imageAsset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Image asset not found',
        });
      }

      // Créer le job de génération vidéo
      const generationJob = await db.generationJob.create({
        data: {
          userId: user.id,
          projectId: input.projectId,
          kind: 'IMAGE_TO_VIDEO',
          status: 'QUEUED',
          inputPrompt: input.prompt,
          videoPrompt: input.prompt,
          imageAssetId: input.imageAssetId,
          provider: 'fal-ai-veo3',
          costCents: VIDEO_COST * 100,
          providerData: {
            duration: input.duration,
            resolution: input.resolution,
            generateAudio: input.generateAudio,
          },
        },
      });

      // Déduire les crédits
      await db.user.update({
        where: { id: user.id },
        data: { creditsBalance: { decrement: VIDEO_COST } },
      });

      await db.creditLedger.create({
        data: {
          userId: user.id,
          amount: -VIDEO_COST,
          type: 'generation',
          description: `Video generation: ${input.prompt.slice(0, 50)}...`,
        },
      });

      // Déclencher le worker Inngest pour la vidéo
      try {
        await inngest.send({
          name: 'generation/generate-video',
          data: { 
            jobId: generationJob.id,
            imageAssetId: input.imageAssetId,
            prompt: input.prompt,
            config: {
              duration: input.duration,
              resolution: input.resolution,
              generateAudio: input.generateAudio,
            }
          }
        });
      } catch (error) {
        console.warn('Inngest not available, running in development mode:', error);
        
        // Mode développement : simulation
        if (process.env.NODE_ENV === 'development') {
          setTimeout(async () => {
            try {
              await db.generationJob.update({
                where: { id: generationJob.id },
                data: { 
                  status: 'GENERATING_VIDEO',
                  startedAt: new Date(),
                },
              });

              // Simulation de 30 secondes de génération
              setTimeout(async () => {
                const videoAsset = await db.asset.create({
                  data: {
                    userId: user.id,
                    projectId: input.projectId,
                    filename: `${generationJob.id}.mp4`,
                    originalName: `generated-video-${Date.now()}.mp4`,
                    mimeType: 'video/mp4',
                    fileSize: 1024 * 1024 * 50, // 50MB
                    duration: 8, // fal.ai only supports 8s
                    width: input.resolution === '1080p' ? 1920 : 1280,
                    height: input.resolution === '1080p' ? 1080 : 720,
                    s3Key: `videos/${generationJob.id}.mp4`,
                    s3Bucket: process.env.S3_BUCKET_NAME || 'vidgenie-media-dev',
                    s3Region: process.env.S3_REGION || 'eu-west-3',
                    publicUrl: '/api/placeholder/1080/1920?text=Generated+Video',
                    thumbnailUrl: '/api/placeholder/1080/1920?text=Video+Thumbnail',
                    generatedBy: 'fal-ai/google-veo-3',
                    prompt: input.prompt,
                    status: 'ready',
                    frameRate: 30,
                    aiConfig: {
                      provider: 'fal-ai-veo3',
                      baseImage: imageAsset.publicUrl,
                      duration: input.duration,
                      resolution: input.resolution,
                      generateAudio: input.generateAudio,
                    },
                  },
                });

                await db.generationJob.update({
                  where: { id: generationJob.id },
                  data: {
                    status: 'VIDEO_READY',
                    videoAssetId: videoAsset.id,
                    completedAt: new Date(),
                    processingTime: 30000,
                  },
                });
              }, 30000);
            } catch (error) {
              await db.generationJob.update({
                where: { id: generationJob.id },
                data: {
                  status: 'FAILED',
                  errorMessage: error instanceof Error ? error.message : 'Unknown error',
                  completedAt: new Date(),
                },
              });
            }
          }, 1000);
        }
      }

      return { jobId: generationJob.id };
    }),

  // Obtenir le statut d'un job de génération
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.generationJob.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.user.id,
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Generation job not found',
        });
      }

      // Calculer le progrès basé sur le statut
      let progress = 0;
      switch (job.status) {
        case 'QUEUED':
          progress = 5;
          break;
        case 'GENERATING_IMAGE':
          progress = 25;
          break;
        case 'IMAGE_READY':
          progress = 50;
          break;
        case 'GENERATING_VIDEO':
          progress = 75;
          break;
        case 'VIDEO_READY':
          progress = 100;
          break;
        case 'FAILED':
          progress = 0;
          break;
        default:
          progress = 0;
      }

      return {
        id: job.id,
        kind: job.kind,
        status: job.status,
        progress,
        inputPrompt: job.inputPrompt,
        imagePrompt: job.imagePrompt,
        videoPrompt: job.videoPrompt,
        imageAsset: job.imageAsset,
        videoAsset: job.videoAsset,
        provider: job.provider,
        costCents: job.costCents,
        processingTime: job.processingTime,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      };
    }),

  // Lister tous les jobs de génération de l'utilisateur
  listJobs: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      status: z.enum(['QUEUED', 'GENERATING_IMAGE', 'IMAGE_READY', 'GENERATING_VIDEO', 'VIDEO_READY', 'FAILED']).optional(),
      kind: z.enum(['IMAGE', 'VIDEO', 'IMAGE_TO_VIDEO']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const jobs = await ctx.db.generationJob.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
          ...(input.kind && { kind: input.kind }),
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
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (jobs.length > input.limit) {
        const nextItem = jobs.pop();
        nextCursor = nextItem!.id;
      }

      return {
        jobs,
        nextCursor,
      };
    }),

  // Webhook pour recevoir les notifications de Google Veo 3
  handleVeo3Webhook: protectedProcedure
    .input(z.object({
      payload: z.record(z.any()),
      signature: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Vérifier la signature HMAC (sécurité)
      const webhookSecret = process.env.FAL_WEBHOOK_SECRET;
      if (webhookSecret) {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(input.payload))
          .digest('hex');
        
        if (`sha256=${expectedSignature}` !== input.signature) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid webhook signature',
          });
        }
      }

      // Extraire les données du webhook
      const { job_id: providerJobId, status, video_url, thumbnail_url, error_message } = input.payload;

      // Trouver le job correspondant
      const generationJob = await db.generationJob.findFirst({
        where: { providerJobId },
        include: { videoAsset: true },
      });

      if (!generationJob) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Generation job not found',
        });
      }

      // Enregistrer le webhook
      await db.webhook.create({
        data: {
          provider: 'fal-ai-veo3',
          jobId: generationJob.id,
          payload: input.payload,
          signature: input.signature,
          verified: true,
          verifiedAt: new Date(),
        },
      });

      // Traiter selon le statut
      if (status === 'completed' && video_url) {
        // Télécharger et uploader la vidéo vers S3
        const videoResponse = await fetch(video_url);
        if (!videoResponse.ok) {
          throw new Error('Failed to download video from Veo3');
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const s3Key = `videos/${generationJob.id}.mp4`;
        const s3Result = await uploadToS3(videoBuffer, s3Key, 'video/mp4');

        // Créer l'asset vidéo
        const videoAsset = await db.asset.create({
          data: {
            userId: generationJob.userId,
            projectId: generationJob.projectId,
            filename: `${generationJob.id}.mp4`,
            originalName: `generated-video-${Date.now()}.mp4`,
            mimeType: 'video/mp4',
            fileSize: videoBuffer.length,
            duration: 8, // fal.ai only supports 8s
            width: 1920, // Default 16:9 aspect ratio for fal.ai
            height: 1080,
            s3Key,
            s3Bucket: process.env.S3_BUCKET_NAME || 'vidgenie-media-dev',
            s3Region: process.env.S3_REGION || 'eu-west-3',
            publicUrl: s3Result.publicUrl,
            thumbnailUrl: thumbnail_url,
            generatedBy: 'fal-ai/google-veo-3',
            prompt: generationJob.videoPrompt,
            status: 'ready',
            frameRate: 30,
            aiConfig: {
              provider: 'fal-ai-veo3',
              baseImage: generationJob.imageAsset?.publicUrl,
              duration: (generationJob.providerData as any)?.videoConfig?.duration || '8s',
              resolution: (generationJob.providerData as any)?.videoConfig?.resolution || '1080p',
              generateAudio: (generationJob.providerData as any)?.videoConfig?.generateAudio || true,
            },
          },
        });

        // Marquer le job comme terminé
        await db.generationJob.update({
          where: { id: generationJob.id },
          data: {
            status: 'VIDEO_READY',
            videoAssetId: videoAsset.id,
            completedAt: new Date(),
            processingTime: generationJob.startedAt 
              ? Date.now() - generationJob.startedAt.getTime()
              : undefined,
          },
        });
      } else if (status === 'failed') {
        // Marquer le job comme échoué
        await db.generationJob.update({
          where: { id: generationJob.id },
          data: {
            status: 'FAILED',
            errorMessage: error_message || 'Video generation failed',
            completedAt: new Date(),
          },
        });

        // Rembourser les crédits en cas d'échec
        await db.user.update({
          where: { id: generationJob.userId },
          data: { creditsBalance: { increment: Math.floor(generationJob.costCents / 100) } },
        });

        await db.creditLedger.create({
          data: {
            userId: generationJob.userId,
            amount: Math.floor(generationJob.costCents / 100),
            type: 'refund',
            description: 'Video generation failed - refund',
          },
        });
      }

      return { success: true };
    }),

  // Workflow complet : image + vidéo
  generateImageToVideo: protectedProcedure
    .input(z.object({
      imagePrompt: z.string().min(10).max(2000),
      videoPrompt: z.string().min(10).max(1000),
      imageStyle: z.enum(['natural', 'vivid']).default('vivid'),
      imageQuality: z.enum(['standard', 'hd']).default('hd'),
      imageSize: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1792'),
      videoDuration: z.enum(['8s']).default('8s'),
      videoResolution: z.enum(['720p', '1080p']).default('1080p'),
      generateAudio: z.boolean().default(true),
      projectId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      // Modération des prompts
      const imageModerationResult = await moderatePrompt(input.imagePrompt);
      if (!imageModerationResult.allowed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Image prompt not allowed: ${imageModerationResult.reason}`,
        });
      }

      const videoModerationResult = await moderatePrompt(input.videoPrompt);
      if (!videoModerationResult.allowed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Video prompt not allowed: ${videoModerationResult.reason}`,
        });
      }

      // Vérifier les crédits pour le workflow complet
      const userRecord = await db.user.findUnique({
        where: { id: user.id },
        select: { creditsBalance: true },
      });

      const TOTAL_COST = 20; // 5 pour l'image + 15 pour la vidéo
      if (!userRecord || userRecord.creditsBalance < TOTAL_COST) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient credits. You have ${userRecord?.creditsBalance || 0} credits but need ${TOTAL_COST}.`,
        });
      }

      // Créer le job de génération complet
      const generationJob = await db.generationJob.create({
        data: {
          userId: user.id,
          projectId: input.projectId,
          kind: 'IMAGE_TO_VIDEO',
          status: 'QUEUED',
          inputPrompt: `Image: ${input.imagePrompt} | Video: ${input.videoPrompt}`,
          imagePrompt: input.imagePrompt,
          videoPrompt: input.videoPrompt,
          provider: 'openai+fal-ai-veo3',
          costCents: TOTAL_COST * 100,
          providerData: {
            imageConfig: {
              style: input.imageStyle,
              quality: input.imageQuality,
              size: input.imageSize,
            },
            videoConfig: {
              duration: input.videoDuration,
              resolution: input.videoResolution,
              generateAudio: input.generateAudio,
            },
          },
        },
      });

      // Déduire les crédits
      await db.user.update({
        where: { id: user.id },
        data: { creditsBalance: { decrement: TOTAL_COST } },
      });

      await db.creditLedger.create({
        data: {
          userId: user.id,
          amount: -TOTAL_COST,
          type: 'generation',
          description: `Image-to-video generation: ${input.imagePrompt.slice(0, 30)}...`,
        },
      });

      // Déclencher le workflow Inngest complet
      try {
        await inngest.send({
          name: 'generation/image-to-video-workflow',
          data: { 
            jobId: generationJob.id,
            imagePrompt: input.imagePrompt,
            videoPrompt: input.videoPrompt,
            imageConfig: {
              style: input.imageStyle,
              quality: input.imageQuality,
              size: input.imageSize,
            },
            videoConfig: {
              duration: input.videoDuration,
              resolution: input.videoResolution,
              generateAudio: input.generateAudio,
            }
          }
        });
      } catch (error) {
        console.warn('Inngest not available, running in development mode:', error);
        // Le mode développement sera géré par les workers Inngest
      }

      return { jobId: generationJob.id };
    }),

  // Annuler un job de génération
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.generationJob.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.user.id,
        },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Generation job not found',
        });
      }

      if (['VIDEO_READY', 'FAILED'].includes(job.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot cancel a completed or failed job',
        });
      }

      // Annuler chez le provider si nécessaire
      if (job.providerJobId && job.provider === 'fal-ai-veo3') {
        try {
          await veo3Client.cancelJob(job.providerJobId);
        } catch (error) {
          console.warn('Failed to cancel provider job:', error);
        }
      }

      // Mettre à jour le job
      await ctx.db.generationJob.update({
        where: { id: input.jobId },
        data: {
          status: 'FAILED',
          errorMessage: 'Cancelled by user',
          completedAt: new Date(),
        },
      });

      // Rembourser les crédits
      const refundAmount = Math.floor(job.costCents / 100);
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { creditsBalance: { increment: refundAmount } },
      });

      await ctx.db.creditLedger.create({
        data: {
          userId: ctx.user.id,
          amount: refundAmount,
          type: 'refund',
          description: 'Job cancelled - refund',
        },
      });

      return { success: true };
    }),

  // Relancer un job échoué
  retryJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.generationJob.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.user.id,
          status: 'FAILED',
        },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Failed job not found',
        });
      }

      if (job.retryCount >= 3) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Maximum retry attempts reached',
        });
      }

      // Réinitialiser le job
      await ctx.db.generationJob.update({
        where: { id: input.jobId },
        data: {
          status: 'QUEUED',
          errorMessage: null,
          errorCode: null,
          retryCount: { increment: 1 },
          startedAt: null,
          completedAt: null,
        },
      });

      // Redéclencher le workflow approprié
      const eventName = job.kind === 'IMAGE' 
        ? 'generation/generate-image'
        : job.kind === 'IMAGE_TO_VIDEO' && job.imageAssetId
        ? 'generation/generate-video'
        : 'generation/image-to-video-workflow';

      try {
        await inngest.send({
          name: eventName,
          data: { jobId: job.id }
        });
      } catch (error) {
        console.warn('Inngest not available for retry:', error);
      }

      return { success: true };
    }),
});