import OpenAI from 'openai';

export class PromptEnhancerService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async enhanceImagePrompt(
    userPrompt: string, 
    options: {
      temperature?: number;
      style?: string;
      mood?: string;
      negativePrompt?: string;
      artStyle?: string;
      composition?: string;
    } = {}
  ): Promise<{
    success: boolean;
    enhancedPrompt?: string;
    originalPrompt: string;
    error?: string;
  }> {
    try {
      console.log('[PROMPT-ENHANCER] Enhancing prompt with GPT...');
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Modèle le plus avancé disponible
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(options)
          },
          {
            role: 'user',
            content: this.buildUserPrompt(userPrompt, options)
          }
        ],
        max_tokens: 200,
        temperature: options.temperature || 0.7,
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

  private buildSystemPrompt(options: any): string {
    let systemPrompt = `You are an expert at crafting detailed, visually rich prompts for DALL-E 3 image generation.
            
Your task is to enhance user prompts by:
1. Adding specific visual details (lighting, composition, colors, textures)
2. Specifying camera angles and artistic style when appropriate
3. Including environmental context and atmosphere
4. Maintaining the user's original intent while making it more descriptive
5. Keeping the enhanced prompt under 400 characters`;

    if (options.style) {
      systemPrompt += `\n6. Focus on ${options.style} style elements`;
    }

    if (options.mood) {
      systemPrompt += `\n7. Emphasize ${options.mood} mood and atmosphere`;
    }

    if (options.artStyle) {
      systemPrompt += `\n8. Apply ${options.artStyle} artistic style`;
    }

    if (options.composition) {
      systemPrompt += `\n9. Use ${options.composition} composition techniques`;
    }

    if (options.negativePrompt) {
      systemPrompt += `\n10. Avoid these elements: ${options.negativePrompt}`;
    }

    systemPrompt += `\n\nImportant: Return ONLY the enhanced prompt, no explanations or additional text.`;
    
    return systemPrompt;
  }

  private buildUserPrompt(userPrompt: string, options: any): string {
    let prompt = userPrompt;
    
    const modifiers = [];
    if (options.style) modifiers.push(`Style: ${options.style}`);
    if (options.mood) modifiers.push(`Mood: ${options.mood}`);
    if (options.artStyle) modifiers.push(`Art Style: ${options.artStyle}`);
    if (options.composition) modifiers.push(`Composition: ${options.composition}`);
    
    if (modifiers.length > 0) {
      prompt += `\n\nAdditional requirements: ${modifiers.join(', ')}`;
    }
    
    return prompt;
  }

  async generateVariations(userPrompt: string, count: number = 3): Promise<{
    success: boolean;
    variations?: string[];
    error?: string;
  }> {
    try {
      console.log('[PROMPT-ENHANCER] Generating prompt variations...');
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Generate ${count} different variations of the user's prompt for DALL-E 3 image generation. Each variation should:
1. Maintain the core concept but add different visual details
2. Use varied descriptive language and artistic styles
3. Be unique and creative while staying true to the original intent
4. Be under 300 characters each

Return only the variations, one per line, no numbering or explanations.`
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 400,
        temperature: 0.8,
      });

      const variations = response.choices[0]?.message?.content?.trim().split('\n').filter(v => v.trim());
      
      if (!variations || variations.length === 0) {
        throw new Error('No variations generated');
      }

      return {
        success: true,
        variations: variations.slice(0, count),
      };

    } catch (error: any) {
      console.error('[PROMPT-ENHANCER] Variations error:', error);
      
      return {
        success: false,
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
        model: 'gpt-4o',
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

// Only instantiate on server side
export const promptEnhancer = typeof window === 'undefined' 
  ? new PromptEnhancerService() 
  : null;

// Utility functions moved to separate client-safe file
// Import from @/lib/utils/prompt-utils instead