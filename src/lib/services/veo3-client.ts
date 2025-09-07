import { fal } from '@fal-ai/client';
import { secureLog } from '@/lib/secure-logger';

export interface Veo3Request {
  imageUrl: string;
  prompt: string;
  duration: '8s'; // fal.ai only supports 8s
  resolution: '720p' | '1080p';
  generateAudio: boolean;
  webhookUrl?: string;
}

export interface Veo3Response {
  requestId: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface Veo3JobStatus {
  requestId: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  videoUrl?: string;
  error?: string;
}

export class Veo3Client {
  constructor() {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      throw new Error('FAL_KEY environment variable is required');
    }
    
    fal.config({
      credentials: apiKey,
    });
  }

  async generateVideo(request: Veo3Request): Promise<Veo3Response> {
    try {
      const result = await fal.queue.submit('fal-ai/veo3/image-to-video', {
        input: {
          image_url: request.imageUrl,
          prompt: request.prompt,
          duration: request.duration,
          resolution: request.resolution,
          generate_audio: request.generateAudio,
        },
        webhookUrl: request.webhookUrl,
      });
      
      return {
        requestId: result.request_id,
        status: 'IN_QUEUE',
      };
    } catch (error) {
      secureLog.error('Fal.ai Veo3 generation error:', error);
      throw new Error(
        error instanceof Error 
          ? `Fal.ai Veo3 generation failed: ${error.message}`
          : 'Fal.ai Veo3 generation failed with unknown error'
      );
    }
  }

  async getJobStatus(requestId: string): Promise<Veo3JobStatus> {
    try {
      const status = await fal.queue.status('fal-ai/veo3/image-to-video', {
        requestId,
      });
      
      let videoUrl: string | undefined;
      if (status.status === 'COMPLETED') {
        const result = await fal.queue.result('fal-ai/veo3/image-to-video', {
          requestId,
        });
        videoUrl = result.data?.video?.url;
      }
      
      return {
        requestId,
        status: status.status,
        videoUrl,
        error: status.status === 'FAILED' ? 'Video generation failed' : undefined,
      };
    } catch (error) {
      secureLog.error('Fal.ai Veo3 status check error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to check Fal.ai Veo3 job status: ${error.message}`
          : 'Failed to check Fal.ai Veo3 job status'
      );
    }
  }

  async cancelJob(requestId: string): Promise<void> {
    // Note: fal.ai doesn't provide a cancel endpoint in their public API
    // This method is kept for compatibility but will throw an error
    throw new Error('Job cancellation is not supported by fal.ai API');
  }

  // Valider les paramètres de génération
  validateRequest(request: Veo3Request): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.imageUrl) {
      errors.push('Image URL is required');
    }

    if (!request.prompt || request.prompt.length < 10) {
      errors.push('Prompt must be at least 10 characters long');
    }

    if (request.prompt && request.prompt.length > 1000) {
      errors.push('Prompt must not exceed 1000 characters');
    }

    if (request.duration !== '8s') {
      errors.push('Duration must be 8s (only supported duration)');
    }

    if (!['720p', '1080p'].includes(request.resolution)) {
      errors.push('Resolution must be 720p or 1080p');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const veo3Client = new Veo3Client();