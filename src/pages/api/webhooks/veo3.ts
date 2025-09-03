import { NextApiRequest, NextApiResponse } from 'next';
import { db as prisma } from '@/server/api/db';
import { uploadToS3 } from '@/lib/s3';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier la signature HMAC
    const signature = req.headers['x-fal-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    const webhookSecret = process.env.FAL_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      
      if (`sha256=${expectedSignature}` !== signature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Extraire les données du webhook
    const { 
      job_id: providerJobId, 
      status, 
      video_url, 
      thumbnail_url, 
      error_message,
      progress_percentage,
      metadata 
    } = req.body;

    // Trouver le job correspondant
    const generationJob = await prisma.generationJob.findFirst({
      where: { providerJobId },
      include: { 
        user: true,
        project: true,
      },
    });

    if (!generationJob) {
      console.warn(`Webhook received for unknown job: ${providerJobId}`);
      return res.status(404).json({ error: 'Job not found' });
    }

    // Enregistrer le webhook
    await prisma.webhook.create({
      data: {
        provider: 'fal-ai-veo3',
        jobId: generationJob.id,
        payload: req.body,
        headers: req.headers as any,
        signature,
        verified: true,
        verifiedAt: new Date(),
      },
    });

    // Traiter selon le statut
    switch (status) {
      case 'processing':
        // Mise à jour du progrès
        await prisma.generationJob.update({
          where: { id: generationJob.id },
          data: {
            status: 'GENERATING_VIDEO',
            providerData: {
              ...generationJob.providerData as any,
              progress: progress_percentage,
              lastUpdate: new Date().toISOString(),
            },
          },
        });
        break;

      case 'completed':
        if (!video_url) {
          throw new Error('No video URL provided in completed webhook');
        }

        // Télécharger et uploader la vidéo vers S3
        const videoResponse = await fetch(video_url);
        if (!videoResponse.ok) {
          throw new Error('Failed to download video from Veo3');
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const s3Key = `videos/${generationJob.id}.mp4`;
        const s3Result = await uploadToS3(videoBuffer, s3Key, 'video/mp4');

        // Télécharger la miniature si disponible
        let thumbnailS3Result;
        if (thumbnail_url) {
          const thumbnailResponse = await fetch(thumbnail_url);
          if (thumbnailResponse.ok) {
            const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
            const thumbnailS3Key = `thumbnails/${generationJob.id}.jpg`;
            thumbnailS3Result = await uploadToS3(thumbnailBuffer, thumbnailS3Key, 'image/jpeg');
          }
        }

        // Créer l'asset vidéo
        const videoAsset = await prisma.asset.create({
          data: {
            userId: generationJob.userId,
            projectId: generationJob.projectId,
            filename: `${generationJob.id}.mp4`,
            originalName: `generated-video-${Date.now()}.mp4`,
            mimeType: 'video/mp4',
            fileSize: videoBuffer.length,
            duration: metadata?.duration_seconds || (generationJob.providerData as any)?.duration || 10,
            width: metadata?.width || 1080,
            height: metadata?.height || 1920,
            s3Key,
            s3Bucket: process.env.S3_BUCKET_NAME || 'vidgenie-media-dev',
            s3Region: process.env.S3_REGION || 'eu-west-3',
            publicUrl: s3Result.publicUrl,
            thumbnailUrl: thumbnailS3Result?.publicUrl,
            thumbnailS3Key: thumbnailS3Result ? `thumbnails/${generationJob.id}.jpg` : undefined,
            frameRate: metadata?.frame_rate || 30,
            generatedBy: 'fal-ai/google-veo-3',
            prompt: generationJob.videoPrompt,
            status: 'ready',
            aiConfig: {
              provider: 'fal-ai-veo3',
              veo3JobId: providerJobId,
              baseImage: generationJob.imageAsset?.publicUrl,
              metadata,
              ...generationJob.providerData as any,
            },
          },
        });

        // Marquer le job comme terminé
        await prisma.generationJob.update({
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

        // Créer un événement d'usage
        await prisma.usageEvent.create({
          data: {
            userId: generationJob.userId,
            event: 'video_generation_completed',
            provider: 'fal-ai-veo3',
            metadata: {
              jobId: generationJob.id,
              videoAssetId: videoAsset.id,
              duration: metadata?.duration_seconds,
              quality: metadata?.quality_score,
            },
            costEur: generationJob.costCents / 100,
            duration: generationJob.processingTime,
          },
        });
        break;

      case 'failed':
        // Marquer le job comme échoué
        await prisma.generationJob.update({
          where: { id: generationJob.id },
          data: {
            status: 'FAILED',
            errorMessage: error_message || 'Video generation failed',
            errorCode: 'VEO3_GENERATION_FAILED',
            completedAt: new Date(),
          },
        });

        // Rembourser les crédits
        const refundAmount = Math.floor(generationJob.costCents / 100);
        await prisma.user.update({
          where: { id: generationJob.userId },
          data: { creditsBalance: { increment: refundAmount } },
        });

        await prisma.creditLedger.create({
          data: {
            userId: generationJob.userId,
            amount: refundAmount,
            type: 'refund',
            description: 'Video generation failed - automatic refund',
          },
        });

        // Créer un événement d'usage pour l'échec
        await prisma.usageEvent.create({
          data: {
            userId: generationJob.userId,
            event: 'video_generation_failed',
            provider: 'fal-ai-veo3',
            metadata: {
              jobId: generationJob.id,
              error: error_message,
              refundAmount,
            },
          },
        });
        break;

      default:
        console.warn(`Unknown webhook status: ${status}`);
        break;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Veo3 webhook error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};