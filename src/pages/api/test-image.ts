import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[TEST-API] Starting test...');

    // Test 1: Vérifier les variables d'environnement
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    console.log('[TEST-API] OpenAI API key is configured');

    // Test 2: Créer le client OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('[TEST-API] OpenAI client created');

    // Test 3: Faire un appel simple à OpenAI
    const { prompt } = req.body;
    const testPrompt = prompt || "a simple red circle on white background";
    
    console.log('[TEST-API] Testing with prompt:', testPrompt);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: testPrompt,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural',
      n: 1,
      response_format: 'url',
    });

    console.log('[TEST-API] OpenAI response received');

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
    console.error('[TEST-API] Error:', error);
    
    return res.status(500).json({
      error: error.message || 'Test failed',
      details: error.response?.data || error.stack || 'No additional details'
    });
  }
}