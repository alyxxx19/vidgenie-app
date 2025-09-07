import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/server/api/db';
import { simpleStorage } from '@/lib/services/simple-storage';
import { secureLog } from '@/lib/secure-logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Cette API est uniquement pour le développement
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    secureLog.info('[MOCK-API] Mock image generation request');
    
    const { prompt, style, quality, size, projectId } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Prompt is required and must be at least 10 characters long' 
      });
    }

    secureLog.info('[MOCK-API] Generating mock image for:', prompt.slice(0, 50) + '...');

    // Utilisateur de développement
    const DEV_USER_ID = 'dev-user-123';
    
    // S'assurer que l'utilisateur de développement existe
    await db.user.upsert({
      where: { id: DEV_USER_ID },
      update: {},
      create: {
        id: DEV_USER_ID,
        email: 'dev@vidgenie.local',
        name: 'Development User',
        creditsBalance: 10000,
      },
    });

    // Créer le job de génération
    const generationJob = await db.generationJob.create({
      data: {
        userId: DEV_USER_ID,
        projectId: projectId || undefined,
        kind: 'IMAGE',
        status: 'GENERATING_IMAGE',
        inputPrompt: prompt.trim(),
        imagePrompt: prompt.trim(),
        provider: 'mock-openai',
        costCents: 500,
        startedAt: new Date(),
      },
    });

    secureLog.info('[MOCK-API] Job created:', generationJob.id);

    // Générer une image placeholder avec les dimensions demandées
    const sizeMap: Record<string, { width: number; height: number }> = {
      '1024x1024': { width: 1024, height: 1024 },
      '1792x1024': { width: 1792, height: 1024 },
      '1024x1792': { width: 1024, height: 1792 },
    };

    const dimensions = sizeMap[size || '1024x1792'] || sizeMap['1024x1792'];
    
    // Utiliser un service de placeholder gratuit
    const mockImageUrl = `https://picsum.photos/${dimensions.width}/${dimensions.height}?random=${Date.now()}`;
    
    secureLog.info('[MOCK-API] Mock image URL:', mockImageUrl);

    // Simuler un petit délai
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Télécharger l'image placeholder
    const imageResponse = await fetch(mockImageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch placeholder image');
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Sauvegarder l'image
    const filename = simpleStorage.generateFilename(generationJob.id, 'jpg');
    const storageResult = await simpleStorage.uploadImage(imageBuffer, filename, 'image/jpeg');

    if (!storageResult.success || !storageResult.publicUrl) {
      throw new Error('Image storage failed');
    }

    // Créer l'asset
    const imageAsset = await db.asset.create({
      data: {
        userId: DEV_USER_ID,
        projectId: projectId || undefined,
        filename: filename,
        originalName: `mock-image-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        fileSize: imageBuffer.length,
        width: dimensions.width,
        height: dimensions.height,
        s3Key: `mock/${filename}`,
        s3Bucket: 'local',
        s3Region: 'local',
        publicUrl: storageResult.publicUrl,
        generatedBy: 'mock/placeholder',
        prompt: prompt.trim(),
        status: 'ready',
        aiConfig: {
          provider: 'mock',
          style: style || 'vivid',
          quality: quality || 'hd',
          size: size || '1024x1792',
          revisedPrompt: `Mock generated image: ${prompt}`,
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
        processingTime: 2000,
      },
    });

    secureLog.info('[MOCK-API] Mock generation completed successfully');

    return res.status(200).json({
      success: true,
      jobId: generationJob.id,
      imageUrl: storageResult.publicUrl,
      assetId: imageAsset.id,
      revisedPrompt: `Mock generated: ${prompt}`,
      creditsUsed: 5,
      remainingCredits: 9995,
      note: '⚠️ This is a mock image. Configure OpenAI API key for real generation.'
    });

  } catch (error: any) {
    secureLog.error('[MOCK-API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Mock generation failed'
    });
  }
}