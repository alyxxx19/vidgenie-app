import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test avec l'API Chat (moins chère)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Write a simple haiku about AI. Just respond with the haiku, nothing else.'
        }
      ],
      max_tokens: 50,
    });

    const haiku = response.choices[0]?.message?.content;

    return res.status(200).json({
      success: true,
      haiku,
      message: 'Chat API works!',
      credits_used: 'minimal'
    });

  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
      type: 'chat_test_failed'
    });
  }
}