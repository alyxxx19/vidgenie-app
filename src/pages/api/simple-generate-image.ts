import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/server/api/db';
import { simpleImageService } from '@/lib/services/simple-image-generation';
import { simpleStorage } from '@/lib/services/simple-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Créer le client Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Vérifier l'authentification via le token Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('[API] Simple image generation requested by user:', user.email);
    console.log('[API] Request body:', JSON.stringify(req.body, null, 2));

    const { prompt, style, quality, size, projectId } = req.body;

    // Validation des paramètres
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Prompt is required and must be at least 10 characters long' 
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ 
        error: 'Prompt must not exceed 2000 characters' 
      });
    }

    // Vérifier les crédits de l'utilisateur
    const userRecord = await db.user.findUnique({
      where: { id: user.id },
      select: { creditsBalance: true },
    });

    const IMAGE_COST = 5;
    if (!userRecord || userRecord.creditsBalance < IMAGE_COST) {
      return res.status(400).json({
        error: `Insufficient credits. You have ${userRecord?.creditsBalance || 0} credits but need ${IMAGE_COST}.`,
      });
    }

    console.log('[API] User has sufficient credits:', userRecord.creditsBalance);

    // Créer le job de génération
    const generationJob = await db.generationJob.create({
      data: {
        userId: user.id,
        projectId: projectId || undefined,
        kind: 'IMAGE',
        status: 'GENERATING_IMAGE',
        inputPrompt: prompt.trim(),
        imagePrompt: prompt.trim(),
        provider: 'openai',
        costCents: IMAGE_COST * 100,
        startedAt: new Date(),
      },
    });

    console.log('[API] Generation job created:', generationJob.id);

    try {
      // Générer l'image avec OpenAI
      const imageResult = await simpleImageService.generateImage({
        prompt: prompt.trim(),
        style: style || 'vivid',
        quality: quality || 'hd',
        size: size || '1024x1792',
      });

      if (!imageResult.success || !imageResult.imageUrl) {
        throw new Error(imageResult.error || 'Image generation failed');
      }

      console.log('[API] Image generated successfully');

      // Télécharger l'image
      const imageBuffer = await simpleImageService.downloadImageAsBuffer(imageResult.imageUrl);

      // Sauvegarder l'image
      const filename = simpleStorage.generateFilename(generationJob.id, 'png');
      const storageResult = await simpleStorage.uploadImage(imageBuffer, filename, 'image/png');

      if (!storageResult.success || !storageResult.publicUrl) {
        throw new Error(storageResult.error || 'Image storage failed');
      }

      console.log('[API] Image stored successfully:', storageResult.publicUrl);

      // Créer l'asset dans la base de données
      const imageAsset = await db.asset.create({
        data: {
          userId: user.id,
          projectId: projectId || undefined,
          filename: filename,
          originalName: `generated-image-${Date.now()}.png`,
          mimeType: 'image/png',
          fileSize: imageBuffer.length,
          width: imageResult.metadata?.width || 1024,
          height: imageResult.metadata?.height || 1792,
          publicUrl: storageResult.publicUrl,
          generatedBy: 'openai/dall-e-3',
          prompt: prompt.trim(),
          status: 'ready',
          aiConfig: {
            provider: 'openai',
            model: 'dall-e-3',
            style: style || 'vivid',
            quality: quality || 'hd',
            size: size || '1024x1792',
            revisedPrompt: imageResult.revisedPrompt,
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
          processingTime: Date.now() - generationJob.startedAt!.getTime(),
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
          description: `Image generation: ${prompt.slice(0, 50)}...`,
        },
      });

      console.log('[API] Generation completed successfully');

      // Retourner le résultat
      return res.status(200).json({
        success: true,
        jobId: generationJob.id,
        imageUrl: storageResult.publicUrl,
        assetId: imageAsset.id,
        revisedPrompt: imageResult.revisedPrompt,
        creditsUsed: IMAGE_COST,
        remainingCredits: userRecord.creditsBalance - IMAGE_COST,
      });

    } catch (generationError: any) {
      console.error('[API] Generation failed:', generationError);

      // Marquer le job comme échoué
      await db.generationJob.update({
        where: { id: generationJob.id },
        data: {
          status: 'FAILED',
          errorMessage: generationError.message || 'Generation failed',
          completedAt: new Date(),
        },
      });

      return res.status(500).json({
        error: generationError.message || 'Image generation failed',
        jobId: generationJob.id,
      });
    }

  } catch (error: any) {
    console.error('[API] Request failed:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}