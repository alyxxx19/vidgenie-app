import OpenAI from 'openai';
import { moderatePrompt } from '@/lib/content-moderation';
import { secureLog } from '@/lib/secure-logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface SimpleImageRequest {
  prompt: string;
  style?: 'natural' | 'vivid';
  quality?: 'standard' | 'hd';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}

export interface SimpleImageResponse {
  success: boolean;
  imageUrl?: string;
  revisedPrompt?: string;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    size: string;
  };
}

export class SimpleImageGenerationService {
  async generateImage(request: SimpleImageRequest): Promise<SimpleImageResponse> {
    try {
      secureLog.info('[IMAGE_GEN] Starting generation with prompt:', request.prompt.slice(0, 100));

      // Vérification de l'API Key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }

      // Modération du contenu
      const moderationResult = await moderatePrompt(request.prompt);
      if (!moderationResult.allowed) {
        return {
          success: false,
          error: `Content not allowed: ${moderationResult.reason}`,
        };
      }

      secureLog.info('[IMAGE_GEN] Content moderation passed');

      // Génération de l'image
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: request.prompt,
        style: request.style || 'vivid',
        quality: request.quality || 'hd',
        size: request.size || '1024x1792',
        n: 1,
        response_format: 'url',
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No data returned from OpenAI');
      }
      
      const image = response.data[0];
      if (!image?.url) {
        throw new Error('No image URL returned from OpenAI');
      }

      secureLog.info('[IMAGE_GEN] Image generated successfully:', image.url);

      // Parse dimensions from size parameter
      const [width, height] = (request.size || '1024x1792').split('x').map(Number);

      return {
        success: true,
        imageUrl: image.url,
        revisedPrompt: image.revised_prompt || request.prompt,
        metadata: {
          width,
          height,
          size: request.size || '1024x1792',
        },
      };
    } catch (error: any) {
      secureLog.error('[IMAGE_GEN] Generation failed:', error);
      
      let errorMessage = 'Image generation failed';
      if (error?.message) {
        errorMessage = error.message;
      }
      
      // Gestion d'erreurs spécifiques OpenAI
      if (error?.status === 400) {
        errorMessage = 'Invalid request parameters';
      } else if (error?.status === 401) {
        errorMessage = 'Invalid API key';
      } else if (error?.status === 429) {
        errorMessage = 'Rate limit exceeded, please try again later';
      } else if (error?.status === 500) {
        errorMessage = 'OpenAI service temporarily unavailable';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async downloadImageAsBuffer(imageUrl: string): Promise<Buffer> {
    try {
      secureLog.info('[IMAGE_GEN] Downloading image from:', imageUrl);
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      secureLog.info(`[IMAGE_GEN] Image downloaded, size: ${buffer.length} bytes`);
      
      return buffer;
    } catch (error) {
      secureLog.error('[IMAGE_GEN] Download failed:', error);
      throw new Error('Failed to download generated image');
    }
  }
}

export const simpleImageService = new SimpleImageGenerationService();