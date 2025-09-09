import { inngest } from '@/lib/inngest';
import { db as prisma } from '@/server/api/db';
import { imageGenerationService } from '@/lib/services/image-generation';
import { veo3Client } from '@/lib/services/veo3-client';
import { uploadToS3 } from '@/lib/s3';

// Worker pour générer une image avec DALL-E 3
export const generateImageWorker = inngest.createFunction(
  { id: 'generate-image' },
  { event: 'generation/generate-image' },
  async ({ event, step }) => {
    const { jobId, prompt, config } = event.data;

    // Étape 1: Mettre à jour le statut
    await step.run('update-status-generating', async () => {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { 
          status: 'GENERATING_IMAGE',
          startedAt: new Date(),
        },
      });
    });

    // Étape 2: Générer l'image
    const imageResult = await step.run('generate-image', async () => {
      try {
        return await imageGenerationService.generateImage({
          prompt,
          style: config.style || 'vivid',
          quality: config.quality || 'hd',
          size: config.size || '1024x1792',
        });
      } catch (error) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Image generation failed',
            completedAt: new Date(),
          },
        });
        throw error;
      }
    });

    // Étape 3: Télécharger et uploader vers S3
    const s3Result = await step.run('upload-to-s3', async () => {
      const imageBuffer = await imageGenerationService.downloadAndGetSize(imageResult.imageUrl);
      const s3Key = `images/${jobId}.png`;
      return {
        bufferSize: Buffer.isBuffer(imageBuffer) ? imageBuffer.length : 0,
        s3Result: await uploadToS3(s3Key, imageBuffer, 'image/png'),
        s3Key,
      };
    });

    // Étape 4: Créer l'asset et finaliser le job
    await step.run('create-asset-and-complete', async () => {
      const job = await prisma.generationJob.findUnique({
        where: { id: jobId },
        select: { userId: true, projectId: true, startedAt: true },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      const imageAsset = await prisma.asset.create({
        data: {
          userId: job.userId,
          projectId: job.projectId,
          filename: `${jobId}.png`,
          originalName: `generated-image-${Date.now()}.png`,
          mimeType: 'image/png',
          fileSize: s3Result.bufferSize,
          width: imageResult.metadata.width,
          height: imageResult.metadata.height,
          s3Key: s3Result.s3Key,
          s3Bucket: process.env.S3_BUCKET_NAME || 'vidgenie-media-dev',
          s3Region: process.env.S3_REGION || 'eu-west-3',
          publicUrl: s3Result.s3Result,
          generatedBy: 'openai/dall-e-3',
          prompt,
          status: 'ready',
          aiConfig: {
            provider: 'openai',
            model: 'dall-e-3',
            revisedPrompt: imageResult.revisedPrompt,
            style: config.style,
            quality: config.quality,
          },
        },
      });

      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'IMAGE_READY',
          imageAssetId: imageAsset.id,
          completedAt: new Date(),
          processingTime: job.startedAt 
            ? Date.now() - new Date(job.startedAt).getTime()
            : undefined,
        },
      });

      return { imageAssetId: imageAsset.id };
    });

    return { success: true, imageUrl: s3Result.s3Result };
  }
);

// Worker pour générer une vidéo avec Google Veo 3
export const generateVideoWorker = inngest.createFunction(
  { id: 'generate-video' },
  { event: 'generation/generate-video' },
  async ({ event, step }) => {
    const { jobId, imageAssetId, prompt, config } = event.data;

    // Étape 1: Récupérer l'image source et mettre à jour le statut
    const { imageAsset, job } = await step.run('prepare-video-generation', async () => {
      const job = await prisma.generationJob.findUnique({
        where: { id: jobId },
        include: { imageAsset: true },
      });

      if (!job || !job.imageAsset) {
        throw new Error('Job or image asset not found');
      }

      await prisma.generationJob.update({
        where: { id: jobId },
        data: { 
          status: 'GENERATING_VIDEO',
          startedAt: new Date(),
        },
      });

      return { imageAsset: job.imageAsset, job };
    });

    // Étape 2: Déclencher la génération Veo 3
    const veo3Response = await step.run('start-veo3-generation', async () => {
      try {
        const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/veo3`;
        
        return await veo3Client.generateVideo({
          imageUrl: imageAsset.publicUrl!,
          prompt,
          duration: '8s',
          resolution: config.resolution || '720p',
          generateAudio: config.generateAudio || false,
          webhookUrl,
        });
      } catch (error) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Video generation failed',
            completedAt: new Date(),
          },
        });
        throw error;
      }
    });

    // Étape 3: Enregistrer l'ID du job provider
    await step.run('save-provider-job-id', async () => {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          providerJobId: veo3Response.requestId,
          providerData: {
            ...config,
          },
        },
      });
    });

    // Étape 4: Polling du statut (avec webhook comme fallback)
    const finalStatus = await step.run('poll-veo3-status', async () => {
      const maxAttempts = 60; // 30 minutes max (30s * 60)
      let attempts = 0;

      while (attempts < maxAttempts) {
        const status = await veo3Client.getJobStatus(veo3Response.requestId);
        
        if (status.status === 'COMPLETED' && status.videoUrl) {
          return status;
        } else if (status.status === 'FAILED') {
          throw new Error(status.error || 'Video generation failed');
        }

        // Attendre 30 secondes avant le prochain check
        await new Promise(resolve => setTimeout(resolve, 30000));
        attempts++;
      }

      throw new Error('Video generation timed out');
    });

    // Étape 5: Télécharger et uploader la vidéo
    const videoAsset = await step.run('download-and-upload-video', async () => {
      if (!finalStatus.videoUrl) {
        throw new Error('No video URL in completed status');
      }

      // Télécharger la vidéo
      const videoResponse = await fetch(finalStatus.videoUrl);
      if (!videoResponse.ok) {
        throw new Error('Failed to download video from Veo3');
      }

      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const s3Key = `videos/${jobId}.mp4`;
      const s3Result = await uploadToS3(s3Key, videoBuffer, 'video/mp4');

      // Créer l'asset vidéo
      return await prisma.asset.create({
        data: {
          userId: job.userId,
          projectId: job.projectId,
          filename: `${jobId}.mp4`,
          originalName: `generated-video-${Date.now()}.mp4`,
          mimeType: 'video/mp4',
          fileSize: videoBuffer.length,
          duration: config.duration || 10,
          width: 1080,
          height: 1920,
          s3Key,
          s3Bucket: process.env.S3_BUCKET_NAME || 'vidgenie-media-dev',
          s3Region: process.env.S3_REGION || 'eu-west-3',
          publicUrl: s3Result,
          thumbnailUrl: null,
          generatedBy: 'google/veo-3',
          prompt,
          status: 'ready',
          frameRate: 30,
          aiConfig: {
            provider: 'veo3',
            baseImage: imageAsset.publicUrl,
            duration: config.duration,
            style: config.style,
            cameraMovement: config.cameraMovement,
            veo3JobId: veo3Response.requestId,
          },
        },
      });
    });

    // Étape 6: Finaliser le job
    await step.run('complete-job', async () => {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'VIDEO_READY',
          videoAssetId: videoAsset.id,
          completedAt: new Date(),
          processingTime: job.startedAt 
            ? Date.now() - new Date(job.startedAt).getTime()
            : undefined,
        },
      });
    });

    return { success: true, videoAssetId: videoAsset.id };
  }
);

// Worker pour le workflow complet image-to-video
export const imageToVideoWorkflowWorker = inngest.createFunction(
  { id: 'image-to-video-workflow' },
  { event: 'generation/image-to-video-workflow' },
  async ({ event, step }) => {
    const { jobId, imagePrompt, videoPrompt, imageConfig, videoConfig } = event.data;

    // Étape 1: Générer l'image
    const imageAssetId = await step.run('generate-image-step', async () => {
      // Déclencher le worker d'image
      const imageResult = await inngest.send({
        name: 'generation/generate-image',
        data: {
          jobId,
          prompt: imagePrompt,
          config: imageConfig,
        }
      });

      // Attendre que l'image soit prête
      let imageReady = false;
      let attempts = 0;
      const maxAttempts = 20; // 10 minutes max

      while (!imageReady && attempts < maxAttempts) {
        const job = await prisma.generationJob.findUnique({
          where: { id: jobId },
          select: { status: true, imageAssetId: true },
        });

        if (job?.status === 'IMAGE_READY' && job.imageAssetId) {
          imageReady = true;
          return job.imageAssetId;
        } else if (job?.status === 'FAILED') {
          throw new Error('Image generation failed');
        }

        await new Promise(resolve => setTimeout(resolve, 30000)); // 30s
        attempts++;
      }

      throw new Error('Image generation timed out');
    });

    // Étape 2: Générer la vidéo
    await step.run('generate-video-step', async () => {
      // Déclencher le worker de vidéo
      await inngest.send({
        name: 'generation/generate-video',
        data: {
          jobId,
          imageAssetId,
          prompt: videoPrompt,
          config: videoConfig,
        }
      });
    });

    return { success: true };
  }
);

// Worker pour nettoyer les jobs anciens et échoués
export const cleanupWorker = inngest.createFunction(
  { id: 'cleanup-jobs' },
  { event: 'generation/cleanup' },
  async ({ step }) => {
    // Nettoyer les jobs échoués de plus de 7 jours
    await step.run('cleanup-failed-jobs', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      await prisma.generationJob.deleteMany({
        where: {
          status: 'FAILED',
          createdAt: { lte: sevenDaysAgo },
        },
      });
    });

    // Nettoyer les webhooks de plus de 30 jours
    await step.run('cleanup-old-webhooks', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      await prisma.webhook.deleteMany({
        where: {
          receivedAt: { lte: thirtyDaysAgo },
        },
      });
    });

    return { success: true };
  }
);

// Worker pour surveiller les jobs en cours
export const monitorJobsWorker = inngest.createFunction(
  { id: 'monitor-jobs' },
  { event: 'generation/monitor' },
  async ({ step }) => {
    // Vérifier les jobs bloqués depuis plus de 1 heure
    await step.run('check-stuck-jobs', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const stuckJobs = await prisma.generationJob.findMany({
        where: {
          status: { in: ['GENERATING_IMAGE', 'GENERATING_VIDEO'] },
          startedAt: { lte: oneHourAgo },
        },
      });

      for (const job of stuckJobs) {
        // Marquer comme échoué avec timeout
        await prisma.generationJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: 'Job timed out after 1 hour',
            errorCode: 'TIMEOUT',
            completedAt: new Date(),
          },
        });

        // Rembourser les crédits
        const refundAmount = Math.floor(job.costCents / 100);
        await prisma.user.update({
          where: { id: job.userId },
          data: { creditsBalance: { increment: refundAmount } },
        });

        await prisma.creditLedger.create({
          data: {
            userId: job.userId,
            amount: refundAmount,
            type: 'refund',
            description: 'Job timeout - automatic refund',
          },
        });
      }

      return { stuckJobs: stuckJobs.length };
    });

    return { success: true };
  }
);

// Programmation des tâches de maintenance
export const scheduleCleanup = inngest.createFunction(
  { id: 'schedule-cleanup' },
  { cron: '0 2 * * *' }, // Tous les jours à 2h du matin
  async () => {
    await inngest.send({ name: 'generation/cleanup', data: {} });
    return { success: true };
  }
);

export const scheduleMonitoring = inngest.createFunction(
  { id: 'schedule-monitoring' },
  { cron: '*/15 * * * *' }, // Toutes les 15 minutes
  async () => {
    await inngest.send({ name: 'generation/monitor', data: {} });
    return { success: true };
  }
);