import { NextApiRequest, NextApiResponse } from 'next';
import { promptEnhancer } from '@/lib/services/prompt-enhancer';
import OpenAI from 'openai';
import { getCreditsManager, CREDIT_COSTS } from '@/lib/services/credits-manager';
import { db } from '@/server/api/db';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Cette API fonctionne en développement et production avec gestion des crédits
  if (process.env.NODE_ENV !== 'development' && !req.headers.authorization) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[REAL-IMAGE-API] Starting real image generation with enhancement...');
    
    const { 
      prompt, 
      style = 'vivid',
      quality = 'hd', 
      size = '1024x1792',
      enhanceEnabled = true,
      temperature = 0.7,
      mood,
      artStyle,
      composition,
      negativePrompt,
      skipCreditsCheck = false // Pour le mode dev uniquement
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Prompt is required and must be at least 10 characters long' 
      });
    }

    console.log('[REAL-IMAGE-API] 📝 Original prompt:', prompt.slice(0, 50) + '...');

    // ÉTAPE 0: Vérifier et déduire les crédits (sauf en mode dev avec skip)
    let userId: string | null = null;
    let creditsDeducted = false;
    let transactionId: string | null = null;
    
    if (!skipCreditsCheck && process.env.NODE_ENV === 'production') {
      try {
        // Authentifier l'utilisateur via Supabase
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Missing or invalid authorization' });
        }

        const token = authHeader.split(' ')[1];
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
          return res.status(401).json({ error: 'Invalid authentication token' });
        }

        userId = user.id;
        console.log('[REAL-IMAGE-API] 👤 User authenticated:', user.email);

        // Calculer le coût total
        const creditsManager = getCreditsManager(db);
        const imageCost = CREDIT_COSTS.IMAGE_GENERATION;
        const enhancementCost = enhanceEnabled ? CREDIT_COSTS.GPT_ENHANCEMENT : 0;
        const totalCost = imageCost + enhancementCost;

        // Vérifier les crédits
        const creditCheck = await creditsManager.checkCredits(userId, 'IMAGE_GENERATION', enhancementCost);
        if (!creditCheck.hasEnough) {
          return res.status(402).json({ 
            error: creditCheck.message,
            creditsNeeded: creditCheck.required,
            creditsAvailable: creditCheck.currentBalance,
            shortage: creditCheck.shortage
          });
        }

        // Déduire les crédits
        const deductionResult = await creditsManager.deductCredits(
          userId,
          'IMAGE_GENERATION',
          `Image generation${enhanceEnabled ? ' with GPT enhancement' : ''}: ${prompt.slice(0, 50)}...`,
          {
            prompt: prompt.trim(),
            additionalCost: enhancementCost
          }
        );

        creditsDeducted = true;
        transactionId = deductionResult.transactionId;
        console.log(`[REAL-IMAGE-API] 💳 Credits deducted: ${totalCost} (new balance: ${deductionResult.newBalance})`);

      } catch (creditError: any) {
        console.error('[REAL-IMAGE-API] Credit management error:', creditError);
        return res.status(500).json({
          error: creditError.message || 'Credit management failed',
          details: process.env.NODE_ENV === 'development' ? creditError.stack : undefined,
        });
      }
    } else {
      console.log('[REAL-IMAGE-API] 🔧 Skipping credits check (dev mode)');
    }

    // ÉTAPE 1: Améliorer le prompt avec GPT-4 si activé
    let finalPrompt = prompt.trim();
    let enhancementResult: any = { success: false, originalPrompt: prompt.trim() };

    if (enhanceEnabled && promptEnhancer) {
      console.log('[REAL-IMAGE-API] 🧠 Step 1: Enhancing prompt with GPT-4...');
      enhancementResult = await promptEnhancer.enhanceImagePrompt(prompt.trim(), {
        temperature,
        mood,
        artStyle,
        composition,
        negativePrompt
      });
      
      finalPrompt = enhancementResult.enhancedPrompt || prompt.trim();
      
      if (enhancementResult.success) {
        console.log('[REAL-IMAGE-API] ✅ Prompt enhanced successfully!');
        console.log('[REAL-IMAGE-API] 🎨 Enhanced prompt:', finalPrompt.slice(0, 100) + '...');
      } else {
        console.log('[REAL-IMAGE-API] ⚠️ Enhancement failed, using original prompt');
      }
    } else {
      console.log('[REAL-IMAGE-API] 🔧 GPT enhancement disabled');
    }

    // ÉTAPE 2: Générer l'image avec le modèle configuré
    const useGptImage = process.env.USE_GPT_IMAGE === 'true' || req.body.useGptImage === true;
    const imageModel = useGptImage ? 'gpt-image-1' : 'dall-e-3';
    
    console.log(`[REAL-IMAGE-API] 🎨 Step 2: Generating image with ${imageModel}...`);
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let imageResponse;
    
    try {
      if (useGptImage) {
        // Configuration pour gpt-image-1
        let gptImageSize: '1024x1024' | '1024x1536' | '1536x1024' | 'auto' = '1024x1024';
        if (size === '1024x1792') {
          gptImageSize = '1024x1536'; // Portrait proche
        } else if (size === '1792x1024') {
          gptImageSize = '1536x1024'; // Landscape proche
        } else if (size === '1024x1024') {
          gptImageSize = '1024x1024'; // Square exact
        }
        
        imageResponse = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: finalPrompt,
          size: gptImageSize,
          n: 1,
        });
        console.log('[REAL-IMAGE-API] ✅ Generated with gpt-image-1');
      } else {
        // Configuration pour DALL-E 3 (fallback)
        imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: finalPrompt,
          size: size as '1024x1024' | '1792x1024' | '1024x1792',
          quality: quality as 'standard' | 'hd',
          style: style as 'natural' | 'vivid',
          n: 1,
        });
        console.log('[REAL-IMAGE-API] ✅ Generated with DALL-E 3');
      }
    } catch (error: any) {
      // Si gpt-image-1 échoue (non vérifié), basculer sur DALL-E 3
      if (useGptImage && error.message?.includes('verified')) {
        console.log('[REAL-IMAGE-API] ⚠️ gpt-image-1 requires verification, falling back to DALL-E 3');
        imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: finalPrompt,
          size: size as '1024x1024' | '1792x1024' | '1024x1792',
          quality: quality as 'standard' | 'hd',
          style: style as 'natural' | 'vivid',
          n: 1,
        });
        console.log('[REAL-IMAGE-API] ✅ Generated with DALL-E 3 (fallback)');
      } else {
        throw error;
      }
    }

    const imageUrl = imageResponse.data[0]?.url;
    const revisedPrompt = imageResponse.data[0]?.revised_prompt;

    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI');
    }

    console.log('[REAL-IMAGE-API] ✅ Image generated successfully!');
    console.log('[REAL-IMAGE-API] 🖼️ Image URL:', imageUrl);
    console.log('[REAL-IMAGE-API] 📝 DALL-E revised prompt:', revisedPrompt?.slice(0, 100) + '...');

    // Calculer le coût réel utilisé
    const actualCreditsUsed = CREDIT_COSTS.IMAGE_GENERATION + (enhanceEnabled && enhancementResult.success ? CREDIT_COSTS.GPT_ENHANCEMENT : 0);
    
    // Obtenir le solde actuel si l'utilisateur est authentifié
    let currentBalance = 1000; // Par défaut pour le mode dev
    if (userId && !skipCreditsCheck) {
      try {
        const creditsManager = getCreditsManager(db);
        const balanceInfo = await creditsManager.getBalance(userId);
        currentBalance = balanceInfo.balance;
      } catch (err) {
        console.warn('[REAL-IMAGE-API] Could not fetch balance:', err);
      }
    }

    const workflowSteps = [
      enhanceEnabled && enhancementResult.success 
        ? '1. 🧠 GPT-4 enhanced your prompt ✅' 
        : enhanceEnabled 
          ? '1. ⚠️ GPT enhancement failed, used original'
          : '1. 🔧 GPT enhancement disabled',
      '2. 🎨 DALL-E 3 generated the image ✅'
    ];

    return res.status(200).json({
      success: true,
      imageUrl: imageUrl,
      originalPrompt: prompt.trim(),
      enhancedPrompt: enhanceEnabled && enhancementResult.success ? finalPrompt : undefined,
      revisedPrompt: revisedPrompt,
      creditsUsed: actualCreditsUsed,
      remainingCredits: currentBalance,
      enhanceEnabled,
      enhancementWorked: enhancementResult.success,
      settings: {
        temperature,
        mood,
        artStyle,
        composition,
        negativePrompt: negativePrompt || undefined,
        style,
        quality,
        size
      },
      note: !enhanceEnabled 
        ? '🔧 GPT enhancement disabled - generated with original prompt via DALL-E 3' 
        : enhancementResult.success 
          ? '✨ Prompt enhanced with GPT-4, then generated with DALL-E 3' 
          : '⚠️ GPT enhancement failed, generated with original prompt via DALL-E 3',
      workflow: workflowSteps
    });

  } catch (error: any) {
    console.error('[REAL-IMAGE-API] ❌ Generation failed:', error);
    
    // Rembourser les crédits si ils ont été déduits
    if (creditsDeducted && userId && !skipCreditsCheck) {
      try {
        const creditsManager = getCreditsManager(db);
        const totalCost = CREDIT_COSTS.IMAGE_GENERATION + (enhanceEnabled ? CREDIT_COSTS.GPT_ENHANCEMENT : 0);
        
        await creditsManager.refundCredits(
          userId,
          totalCost,
          'Image generation failed',
          transactionId || undefined
        );
        console.log('[REAL-IMAGE-API] 💰 Credits refunded due to error');
      } catch (refundError) {
        console.error('[REAL-IMAGE-API] Failed to refund credits:', refundError);
      }
    }
    
    // Gestion spécifique des erreurs OpenAI
    let errorMessage = error.message || 'Image generation failed';
    
    if (error.message?.includes('billing')) {
      errorMessage = 'OpenAI billing limit reached. Please add credits to your account.';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment.';
    } else if (error.message?.includes('content policy')) {
      errorMessage = 'Content policy violation. Please modify your prompt.';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'OpenAI API key configuration error.';
    }
    
    return res.status(500).json({
      error: errorMessage,
      originalPrompt: req.body.prompt,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      creditsRefunded: creditsDeducted,
    });
  }
}