import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/server/api/db';
import { simpleImageService } from '@/lib/services/simple-image-generation';
import { simpleStorage } from '@/lib/services/simple-storage';
import { promptEnhancer } from '@/lib/services/prompt-enhancer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Cette API est uniquement pour le développement
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[DEV-API] Development image generation request');
    console.log('[DEV-API] Request body:', JSON.stringify(req.body, null, 2));

    const { prompt, style, quality, size, projectId } = req.body;

    // Validation des paramètres
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      console.log('[DEV-API] Invalid prompt:', prompt);
      return res.status(400).json({ 
        error: 'Prompt is required and must be at least 10 characters long' 
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ 
        error: 'Prompt must not exceed 2000 characters' 
      });
    }

    console.log('[DEV-API] Prompt validated:', prompt.slice(0, 50) + '...');

    // En mode développement, utiliser un utilisateur de test
    const DEV_USER_ID = 'dev-user-123';
    
    // S'assurer que l'utilisateur de développement existe
    try {
      await db.user.upsert({
        where: { id: DEV_USER_ID },
        update: {}, // Ne rien faire s'il existe déjà
        create: {
          id: DEV_USER_ID,
          email: 'dev@vidgenie.local',
          name: 'Development User',
          creditsBalance: 10000, // Beaucoup de crédits pour les tests
        },
      });
      console.log('[DEV-API] Development user ensured');
    } catch (userError) {
      console.error('[DEV-API] Error creating dev user:', userError);
    }
    
    // Créer le job de génération
    let generationJob;
    try {
      generationJob = await db.generationJob.create({
        data: {
          userId: DEV_USER_ID,
          projectId: projectId || undefined,
          kind: 'IMAGE',
          status: 'GENERATING_IMAGE',
          inputPrompt: prompt.trim(),
          imagePrompt: prompt.trim(),
          provider: 'openai',
          costCents: 500, // 5 crédits * 100
          startedAt: new Date(),
        },
      });
      console.log('[DEV-API] Generation job created:', generationJob.id);
    } catch (dbError) {
      console.error('[DEV-API] Database error creating job:', dbError);
      return res.status(500).json({ 
        error: 'Database error. Make sure your database is connected and migrations are run.' 
      });
    }

    try {
      // Améliorer le prompt avec GPT
      console.log('[DEV-API] Enhancing prompt with GPT...');
      const enhancedPromptResult = await promptEnhancer.enhanceImagePrompt(prompt.trim());
      const finalPrompt = enhancedPromptResult.enhancedPrompt || prompt.trim();
      
      if (enhancedPromptResult.success) {
        console.log('[DEV-API] Prompt enhanced successfully');
      } else {
        console.log('[DEV-API] Using original prompt (enhancement failed)');
      }

      // Générer l'image avec OpenAI
      console.log('[DEV-API] Starting image generation with enhanced prompt...');
      const imageResult = await simpleImageService.generateImage({
        prompt: finalPrompt,
        style: style || 'vivid',
        quality: quality || 'hd',
        size: size || '1024x1792',
      });

      if (!imageResult.success || !imageResult.imageUrl) {
        throw new Error(imageResult.error || 'Image generation failed');
      }

      console.log('[DEV-API] Image generated successfully');

      // Télécharger l'image
      console.log('[DEV-API] Downloading image...');
      const imageBuffer = await simpleImageService.downloadImageAsBuffer(imageResult.imageUrl);

      // Sauvegarder l'image
      console.log('[DEV-API] Storing image...');
      const filename = simpleStorage.generateFilename(generationJob.id, 'png');
      const storageResult = await simpleStorage.uploadImage(imageBuffer, filename, 'image/png');

      if (!storageResult.success || !storageResult.publicUrl) {
        throw new Error(storageResult.error || 'Image storage failed');
      }

      console.log('[DEV-API] Image stored successfully:', storageResult.publicUrl);

      // Créer l'asset dans la base de données
      const imageAsset = await db.asset.create({
        data: {
          userId: DEV_USER_ID,
          projectId: projectId || undefined,
          filename: filename,
          originalName: `generated-image-${Date.now()}.png`,
          mimeType: 'image/png',
          fileSize: imageBuffer.length,
          width: imageResult.metadata?.width || 1024,
          height: imageResult.metadata?.height || 1792,
          s3Key: `dev/${filename}`, // Clé S3 locale pour le développement
          s3Bucket: 'local-dev',     // Bucket local pour le développement
          s3Region: 'local',          // Région locale pour le développement
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
            originalPrompt: prompt.trim(),
            enhancedPrompt: finalPrompt,
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

      console.log('[DEV-API] Generation completed successfully');

      // Retourner le résultat
      return res.status(200).json({
        success: true,
        jobId: generationJob.id,
        imageUrl: storageResult.publicUrl,
        assetId: imageAsset.id,
        originalPrompt: prompt.trim(),
        enhancedPrompt: finalPrompt,
        revisedPrompt: imageResult.revisedPrompt,
        creditsUsed: 5,
        remainingCredits: 1000, // Crédits illimités en dev
        note: enhancedPromptResult.success 
          ? '✨ Prompt enhanced with GPT-4 before generation' 
          : '⚠️ Using original prompt (GPT enhancement failed)'
      });

    } catch (generationError: any) {
      console.error('[DEV-API] Generation failed:', generationError);

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
        details: generationError.stack || 'No stack trace available',
      });
    }

  } catch (error: any) {
    console.error('[DEV-API] Request failed:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: error.stack || 'No stack trace available',
    });
  }
}