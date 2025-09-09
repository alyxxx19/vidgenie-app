import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { secureLog } from '@/lib/secure-logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    secureLog.info('[TEST-API] Starting test...');

    // Test 1: Vérifier les variables d'environnement
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    secureLog.info('[TEST-API] OpenAI API key is configured');

    // Test 2: Créer le client OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    secureLog.info('[TEST-API] OpenAI client created');

    // Test 3: Faire un appel simple à OpenAI
    const { prompt } = req.body;
    const testPrompt = prompt || "a simple red circle on white background";
    
    secureLog.info('[TEST-API] Testing with prompt:', testPrompt);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: testPrompt,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural',
      n: 1,
      response_format: 'url',
    });

    secureLog.info('[TEST-API] OpenAI response received');

    if (!response.data || response.data.length === 0) {
      return res.status(500).json({ error: 'No data returned from OpenAI' });
    }

    const image = response.data[0];
    if (!image?.url) {
      return res.status(500).json({ error: 'No image URL in response' });
    }

    return res.status(200).json({
      success: true,
      imageUrl: image.url,
      revisedPrompt: image.revised_prompt,
      message: 'Test successful'
    });

  } catch (error: any) {
    secureLog.error('[TEST-API] Error:', error);
    
    return res.status(500).json({
      error: error.message || 'Test failed',
      details: error.response?.data || error.stack || 'No additional details'
    });
  }
}