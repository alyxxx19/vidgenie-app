import OpenAI from 'openai';

export class PromptEnhancerService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async enhanceImagePrompt(userPrompt: string): Promise<{
    success: boolean;
    enhancedPrompt?: string;
    originalPrompt: string;
    error?: string;
  }> {
    try {
      console.log('[PROMPT-ENHANCER] Enhancing prompt with GPT...');
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Modèle rapide et économique
        messages: [
          {
            role: 'system',
            content: `You are an expert at crafting detailed, visually rich prompts for DALL-E 3 image generation.
            
Your task is to enhance user prompts by:
1. Adding specific visual details (lighting, composition, colors, textures)
2. Specifying camera angles and artistic style when appropriate
3. Including environmental context and atmosphere
4. Maintaining the user's original intent while making it more descriptive
5. Keeping the enhanced prompt under 400 characters

Important: Return ONLY the enhanced prompt, no explanations or additional text.`
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      const enhancedPrompt = response.choices[0]?.message?.content?.trim();
      
      if (!enhancedPrompt) {
        throw new Error('No response from GPT');
      }

      console.log('[PROMPT-ENHANCER] Original:', userPrompt);
      console.log('[PROMPT-ENHANCER] Enhanced:', enhancedPrompt);

      return {
        success: true,
        originalPrompt: userPrompt,
        enhancedPrompt: enhancedPrompt,
      };

    } catch (error: any) {
      console.error('[PROMPT-ENHANCER] Error:', error);
      
      // En cas d'erreur, retourner le prompt original
      return {
        success: false,
        originalPrompt: userPrompt,
        enhancedPrompt: userPrompt, // Utiliser le prompt original comme fallback
        error: error.message,
      };
    }
  }

  async enhanceVideoPrompt(imageDescription: string, userVideoPrompt?: string): Promise<{
    success: boolean;
    enhancedPrompt?: string;
    originalPrompt: string;
    error?: string;
  }> {
    try {
      console.log('[PROMPT-ENHANCER] Enhancing video prompt with GPT...');
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at crafting animation prompts for video generation from static images.

Your task is to describe natural, subtle movements that bring the image to life:
1. Focus on realistic, small movements (breathing, blinking, slight head turns)
2. Describe environmental motion (wind, light changes, fabric movement)
3. Keep movements subtle and natural, avoiding dramatic changes
4. Maintain consistency with the original image
5. Keep the prompt under 300 characters

Important: Return ONLY the enhanced animation prompt, no explanations.`
          },
          {
            role: 'user',
            content: userVideoPrompt || `Animate this image naturally: ${imageDescription}`
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const enhancedPrompt = response.choices[0]?.message?.content?.trim();
      
      if (!enhancedPrompt) {
        throw new Error('No response from GPT');
      }

      return {
        success: true,
        originalPrompt: userVideoPrompt || imageDescription,
        enhancedPrompt: enhancedPrompt,
      };

    } catch (error: any) {
      console.error('[PROMPT-ENHANCER] Video error:', error);
      
      return {
        success: false,
        originalPrompt: userVideoPrompt || imageDescription,
        enhancedPrompt: userVideoPrompt || imageDescription,
        error: error.message,
      };
    }
  }
}

export const promptEnhancer = new PromptEnhancerService();