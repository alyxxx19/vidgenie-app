import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface ImageGenerationRequest {
  prompt: string;
  style?: 'natural' | 'vivid';
  quality?: 'standard' | 'hd';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  n?: number;
}

export interface ImageGenerationResponse {
  imageUrl: string;
  revisedPrompt: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export class ImageGenerationService {
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: request.prompt,
        style: request.style || 'vivid',
        quality: request.quality || 'hd',
        size: request.size || '1024x1792', // Portrait par défaut pour vidéo
        n: 1,
        response_format: 'url',
      });

      const image = response.data[0];
      if (!image?.url) {
        throw new Error('No image URL returned from OpenAI');
      }

      // Parse dimensions from size parameter
      const [width, height] = (request.size || '1024x1792').split('x').map(Number);

      return {
        imageUrl: image.url,
        revisedPrompt: image.revised_prompt || request.prompt,
        metadata: {
          width,
          height,
          format: 'png',
          size: 0, // Will be set after download
        },
      };
    } catch (error) {
      console.error('Image generation error:', error);
      throw new Error(
        error instanceof Error 
          ? `Image generation failed: ${error.message}`
          : 'Image generation failed with unknown error'
      );
    }
  }

  async downloadAndGetSize(imageUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Image download error:', error);
      throw new Error('Failed to download generated image');
    }
  }

  optimizePromptForVideo(imagePrompt: string): string {
    // Optimize image prompt specifically for video generation
    const videoOptimizations = [
      'cinematic composition',
      'dynamic lighting',
      'depth of field',
      'motion-ready framing',
    ];
    
    return `${imagePrompt}, ${videoOptimizations.join(', ')}, professional video production quality`;
  }
}

export const imageGenerationService = new ImageGenerationService();