import { secureLog } from '@/lib/secure-logger';

export type VideoProvider = 'veo3' | 'fal-ai' | 'runway' | 'pika';
export type VideoResolution = '720p' | '1080p' | '4k';
export type VideoDuration = 5 | 8 | 15 | 30 | 60; // en secondes
export type MotionIntensity = 'low' | 'medium' | 'high';

export interface VideoGenOptions {
  provider?: VideoProvider;
  resolution?: VideoResolution;
  duration?: VideoDuration;
  motionIntensity?: MotionIntensity;
  userId?: string;
  projectId?: string;
  generateAudio?: boolean;
  frameRate?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface VideoJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // en secondes
  createdAt: string;
  completedAt?: string;
  error?: string;
  metadata: {
    originalImageUrl: string;
    userId?: string;
    projectId?: string;
    options: VideoGenOptions;
  };
}

export interface GeneratedVideo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  duration: number; // durée réelle en secondes
  resolution: VideoResolution;
  fileSize: number; // en bytes
  format: string; // 'mp4', 'webm', etc.
  provider: VideoProvider;
  generationTime: number; // temps de génération en ms
  metadata: {
    originalImageUrl: string;
    motionIntensity: MotionIntensity;
    hasAudio: boolean;
    frameRate: number;
    userId?: string;
    projectId?: string;
    timestamp: string;
  };
}

export interface VideoGenResult {
  success: boolean;
  job?: VideoJob;
  video?: GeneratedVideo; // Présent si génération synchrone
  totalCost: number; // En crédits
  error?: string;
  estimatedDuration?: number; // Temps estimé en secondes
}

export interface VideoUploadResult {
  s3Url: string;
  cdnUrl: string;
  thumbnailUrl: string;
  fileSize: number;
  contentType: string;
}

// Interface générique pour tous les providers
interface IVideoProvider {
  name: VideoProvider;
  generate(imageUrl: string, options: VideoGenOptions): Promise<VideoGenResult>;
  getJobStatus(jobId: string): Promise<VideoJob>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}

export class VideoGeneratorService {
  private provider: VideoProvider;
  private apiKey: string;

  constructor(apiKey: string, provider: VideoProvider = 'fal-ai') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  /**
   * Génère une vidéo à partir d'une image
   */
  async generateFromImage(
    imageUrl: string,
    options: VideoGenOptions = {}
  ): Promise<VideoGenResult> {
    try {
      // Validation des entrées
      const validation = this.validateInputs(imageUrl, options);
      if (!validation.valid) {
        throw new Error(`Invalid inputs: ${validation.errors.join(', ')}`);
      }

      // Sélectionner le provider approprié
      const providerInstance = this.getProviderInstance(options.provider || this.provider);

      // Lancer la génération
      const result = await providerInstance.generate(imageUrl, options);

      return result;

    } catch (error) {
      secureLog.error('Video generation failed:', error);
      
      return {
        success: false,
        totalCost: 0,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Récupère le statut d'un job de génération vidéo
   */
  async getJobStatus(jobId: string): Promise<VideoJob> {
    try {
      const providerInstance = this.getProviderInstance(this.provider);
      return await providerInstance.getJobStatus(jobId);
    } catch (error) {
      throw new Error(`Failed to get job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload une vidéo vers S3 avec génération de thumbnail
   */
  async uploadToS3(
    videoUrl: string,
    metadata: {
      userId?: string;
      projectId?: string;
      generationId: string;
    }
  ): Promise<VideoUploadResult> {
    try {
      // Télécharger la vidéo depuis l'URL temporaire
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status}`);
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
      
      // Générer un nom de fichier unique
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const videoFilename = `generated-videos/${metadata.userId || 'anonymous'}/${timestamp}_${metadata.generationId}.mp4`;
      const thumbnailFilename = `generated-thumbnails/${metadata.userId || 'anonymous'}/${timestamp}_${metadata.generationId}_thumb.jpg`;

      // TODO: Implémenter l'upload S3 réel et la génération de thumbnail
      // Pour l'instant, simuler l'upload
      const s3Url = `https://vidgenie-storage.s3.amazonaws.com/${videoFilename}`;
      const cdnUrl = `https://cdn.vidgenie.com/${videoFilename}`;
      const thumbnailUrl = `https://cdn.vidgenie.com/${thumbnailFilename}`;

      return {
        s3Url,
        cdnUrl,
        thumbnailUrl,
        fileSize: videoBuffer.byteLength,
        contentType
      };

    } catch (error) {
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calcule le coût en crédits selon la configuration
   */
  calculateCost(
    provider: VideoProvider,
    duration: VideoDuration,
    resolution: VideoResolution,
    hasAudio: boolean = false
  ): number {
    const baseCosts = {
      'fal-ai': {
        5: { '720p': 8, '1080p': 12, '4k': 25 },
        8: { '720p': 10, '1080p': 15, '4k': 30 },
        15: { '720p': 18, '1080p': 25, '4k': 50 },
        30: { '720p': 35, '1080p': 50, '4k': 100 },
        60: { '720p': 70, '1080p': 100, '4k': 200 }
      },
      'veo3': {
        5: { '720p': 12, '1080p': 18, '4k': 35 },
        8: { '720p': 15, '1080p': 22, '4k': 40 },
        15: { '720p': 25, '1080p': 35, '4k': 70 },
        30: { '720p': 50, '1080p': 70, '4k': 140 },
        60: { '720p': 100, '1080p': 140, '4k': 280 }
      },
      'runway': {
        5: { '720p': 10, '1080p': 15, '4k': 30 },
        8: { '720p': 12, '1080p': 18, '4k': 35 },
        15: { '720p': 22, '1080p': 30, '4k': 60 },
        30: { '720p': 45, '1080p': 60, '4k': 120 },
        60: { '720p': 90, '1080p': 120, '4k': 240 }
      },
      'pika': {
        5: { '720p': 6, '1080p': 10, '4k': 20 },
        8: { '720p': 8, '1080p': 12, '4k': 25 },
        15: { '720p': 15, '1080p': 20, '4k': 40 },
        30: { '720p': 30, '1080p': 40, '4k': 80 },
        60: { '720p': 60, '1080p': 80, '4k': 160 }
      }
    };

    const providerCosts = baseCosts[provider] || baseCosts['fal-ai'];
    const durationCosts = providerCosts[duration] || providerCosts[8];
    const baseCost = durationCosts[resolution] || durationCosts['1080p'];

    // Bonus pour l'audio
    const audioCost = hasAudio ? Math.ceil(baseCost * 0.2) : 0;

    return baseCost + audioCost;
  }

  /**
   * Obtient une instance du provider spécifié
   */
  private getProviderInstance(provider: VideoProvider): IVideoProvider {
    switch (provider) {
      case 'fal-ai':
        return new FalAiProvider(this.apiKey);
      case 'veo3':
        return new Veo3Provider(this.apiKey);
      case 'runway':
        return new RunwayProvider(this.apiKey);
      case 'pika':
        return new PikaProvider(this.apiKey);
      default:
        return new FalAiProvider(this.apiKey);
    }
  }

  /**
   * Valide les entrées
   */
  private validateInputs(
    imageUrl: string, 
    options: VideoGenOptions
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation de l'URL de l'image
    if (!imageUrl || !this.isValidUrl(imageUrl)) {
      errors.push('Invalid image URL');
    }

    // Validation de la durée
    if (options.duration && ![5, 8, 15, 30, 60].includes(options.duration)) {
      errors.push('Duration must be 5, 8, 15, 30, or 60 seconds');
    }

    // Validation de la résolution
    if (options.resolution && !['720p', '1080p', '4k'].includes(options.resolution)) {
      errors.push('Resolution must be 720p, 1080p, or 4k');
    }

    // Validation de l'intensité de mouvement
    if (options.motionIntensity && !['low', 'medium', 'high'].includes(options.motionIntensity)) {
      errors.push('Motion intensity must be low, medium, or high');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Vérifie si une URL est valide
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse les erreurs
   */
  private parseError(error: any): string {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error?.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown video generation error';
  }

  /**
   * Teste la connectivité avec le provider
   */
  async testConnection(): Promise<{ success: boolean; provider: VideoProvider; error?: string }> {
    try {
      const providerInstance = this.getProviderInstance(this.provider);
      const result = await providerInstance.testConnection();

      return {
        success: result.success,
        provider: this.provider,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        provider: this.provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Obtient les capacités du provider
   */
  getProviderCapabilities(): {
    provider: VideoProvider;
    supportedDurations: VideoDuration[];
    supportedResolutions: VideoResolution[];
    supportedMotionIntensities: MotionIntensity[];
    maxFileSize: number; // en MB
    supportedFormats: string[];
    hasAudioGeneration: boolean;
  } {
    const capabilities = {
      'fal-ai': {
        supportedDurations: [5, 8, 15] as VideoDuration[],
        supportedResolutions: ['720p', '1080p'] as VideoResolution[],
        supportedMotionIntensities: ['low', 'medium', 'high'] as MotionIntensity[],
        maxFileSize: 100,
        supportedFormats: ['mp4', 'webm'],
        hasAudioGeneration: false
      },
      'veo3': {
        supportedDurations: [8, 15, 30] as VideoDuration[],
        supportedResolutions: ['720p', '1080p', '4k'] as VideoResolution[],
        supportedMotionIntensities: ['low', 'medium', 'high'] as MotionIntensity[],
        maxFileSize: 200,
        supportedFormats: ['mp4'],
        hasAudioGeneration: true
      },
      'runway': {
        supportedDurations: [5, 8, 15, 30] as VideoDuration[],
        supportedResolutions: ['720p', '1080p', '4k'] as VideoResolution[],
        supportedMotionIntensities: ['low', 'medium', 'high'] as MotionIntensity[],
        maxFileSize: 150,
        supportedFormats: ['mp4', 'mov'],
        hasAudioGeneration: true
      },
      'pika': {
        supportedDurations: [5, 8, 15] as VideoDuration[],
        supportedResolutions: ['720p', '1080p'] as VideoResolution[],
        supportedMotionIntensities: ['medium', 'high'] as MotionIntensity[],
        maxFileSize: 80,
        supportedFormats: ['mp4'],
        hasAudioGeneration: false
      }
    };

    const providerCaps = capabilities[this.provider] || capabilities['fal-ai'];

    return {
      provider: this.provider,
      ...providerCaps
    };
  }
}

// Implémentations spécifiques des providers

class FalAiProvider implements IVideoProvider {
  name: VideoProvider = 'fal-ai';
  
  constructor(private apiKey: string) {}

  async generate(imageUrl: string, options: VideoGenOptions): Promise<VideoGenResult> {
    const startTime = Date.now();
    
    try {
      // TODO: Implémenter l'appel API réel vers Fal.ai
      // Pour l'instant, simulation
      const response = await this.simulateGeneration(imageUrl, options);
      
      const totalCost = new VideoGeneratorService(this.apiKey).calculateCost(
        'fal-ai',
        options.duration || 8,
        options.resolution || '1080p',
        options.generateAudio || false
      );

      return {
        success: true,
        job: response.job,
        totalCost,
        estimatedDuration: this.getEstimatedDuration(options.duration || 8)
      };

    } catch (error) {
      return {
        success: false,
        totalCost: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getJobStatus(jobId: string): Promise<VideoJob> {
    // TODO: Implémenter l'appel API réel
    // Simulation pour l'instant
    return {
      id: jobId,
      status: 'processing',
      progress: 50,
      estimatedTimeRemaining: 120,
      createdAt: new Date().toISOString(),
      metadata: {
        originalImageUrl: '',
        options: {}
      }
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Implémenter un test de connexion réel
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async simulateGeneration(imageUrl: string, options: VideoGenOptions): Promise<{ job: VideoJob }> {
    return {
      job: {
        id: `fal_${Date.now()}`,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
        metadata: {
          originalImageUrl: imageUrl,
          options
        }
      }
    };
  }

  private getEstimatedDuration(videoDuration: number): number {
    // Estimation basée sur la durée de la vidéo (environ 30 secondes par seconde de vidéo)
    return videoDuration * 30;
  }
}

// Classes similaires pour les autres providers
class Veo3Provider implements IVideoProvider {
  name: VideoProvider = 'veo3';
  constructor(private apiKey: string) {}
  
  async generate(imageUrl: string, options: VideoGenOptions): Promise<VideoGenResult> {
    // TODO: Implémenter VEO3
    throw new Error('VEO3 provider not yet implemented');
  }
  
  async getJobStatus(jobId: string): Promise<VideoJob> {
    throw new Error('VEO3 provider not yet implemented');
  }
  
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'VEO3 provider not yet implemented' };
  }
}

class RunwayProvider implements IVideoProvider {
  name: VideoProvider = 'runway';
  constructor(private apiKey: string) {}
  
  async generate(imageUrl: string, options: VideoGenOptions): Promise<VideoGenResult> {
    throw new Error('Runway provider not yet implemented');
  }
  
  async getJobStatus(jobId: string): Promise<VideoJob> {
    throw new Error('Runway provider not yet implemented');
  }
  
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Runway provider not yet implemented' };
  }
}

class PikaProvider implements IVideoProvider {
  name: VideoProvider = 'pika';
  constructor(private apiKey: string) {}
  
  async generate(imageUrl: string, options: VideoGenOptions): Promise<VideoGenResult> {
    throw new Error('Pika provider not yet implemented');
  }
  
  async getJobStatus(jobId: string): Promise<VideoJob> {
    throw new Error('Pika provider not yet implemented');
  }
  
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Pika provider not yet implemented' };
  }
}