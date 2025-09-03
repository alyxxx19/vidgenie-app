import { NextApiRequest, NextApiResponse } from 'next';
import { promptEnhancer } from '@/lib/services/prompt-enhancer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Cette API est uniquement pour tester l'amélioration de prompts
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[TEST-ENHANCEMENT] Testing prompt enhancement...');
    
    const { 
      prompt, 
      enhanceEnabled = true,
      temperature = 0.7,
      mood,
      artStyle,
      composition,
      negativePrompt
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Prompt is required and must be at least 10 characters long' 
      });
    }

    console.log('[TEST-ENHANCEMENT] Original prompt:', prompt.slice(0, 50) + '...');

    let finalPrompt = prompt.trim();
    let enhancementResult: any = { success: false, originalPrompt: prompt.trim() };

    if (enhanceEnabled && promptEnhancer) {
      console.log('[TEST-ENHANCEMENT] Enhancing with GPT...');
      enhancementResult = await promptEnhancer.enhanceImagePrompt(prompt.trim(), {
        temperature,
        mood,
        artStyle,
        composition,
        negativePrompt
      });
      
      finalPrompt = enhancementResult.enhancedPrompt || prompt.trim();
      
      if (enhancementResult.success) {
        console.log('[TEST-ENHANCEMENT] Enhancement successful');
      } else {
        console.log('[TEST-ENHANCEMENT] Enhancement failed:', enhancementResult.error);
      }
    } else {
      console.log('[TEST-ENHANCEMENT] Enhancement disabled or not available');
    }

    // Simuler le résultat DALL-E 3 (sans vraiment générer)
    const mockImageUrl = `https://picsum.photos/1024/1792?random=${Date.now()}`;

    return res.status(200).json({
      success: true,
      testMode: true,
      originalPrompt: prompt.trim(),
      enhancedPrompt: enhanceEnabled ? finalPrompt : undefined,
      finalPrompt: finalPrompt,
      mockImageUrl: mockImageUrl,
      enhanceEnabled,
      enhancementWorked: enhancementResult.success,
      settings: {
        temperature,
        mood,
        artStyle,
        composition,
        negativePrompt: negativePrompt || undefined
      },
      note: !enhanceEnabled 
        ? '🔧 GPT enhancement disabled - using original prompt' 
        : enhancementResult.success 
          ? '✨ Prompt enhanced with GPT-4 before generation (TEST MODE)' 
          : '⚠️ Using original prompt (GPT enhancement failed)',
      message: 'This is a test API that shows prompt enhancement without database or real image generation.'
    });

  } catch (error: any) {
    console.error('[TEST-ENHANCEMENT] Error:', error);
    return res.status(500).json({
      error: error.message || 'Prompt enhancement test failed',
      details: error.stack || 'No stack trace available',
    });
  }
}