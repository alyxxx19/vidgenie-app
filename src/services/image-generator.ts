import OpenAI from 'openai';

export type ImageProvider = 'gpt-image-1' | 'dalle3' | 'dalle2';
export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
export type ImageQuality = 'standard' | 'hd';
export type ImageStyle = 'vivid' | 'natural';

export interface ImageGenOptions {
  provider?: ImageProvider;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  userId?: string;
  projectId?: string;
  n?: number; // Nombre d'images (DALL-E 2 uniquement)
}

export interface GeneratedImage {
  id: string;
  url: string;
  revisedPrompt?: string;
  b64_json?: string;
  size: ImageSize;
  quality: ImageQuality;
  style?: ImageStyle;
  provider: ImageProvider;
  generationTime: number;
  metadata: {
    originalPrompt: string;
    tokensUsed?: number;
    userId?: string;
    projectId?: string;
    timestamp: string;
  };
}

export interface ImageGenResult {
  success: boolean;
  images: GeneratedImage[];
  totalCost: number; // En crédits
  error?: string;
  rateLimitInfo?: {
    requestsRemaining: number;
    resetTime: string;
  };
}

export interface ImageUploadResult {
  s3Url: string;
  cdnUrl: string;
  fileSize: number;
  contentType: string;
}

export class ImageGeneratorService {
  private openai: OpenAI;
  private provider: ImageProvider;

  constructor(apiKey: string, provider: ImageProvider = 'gpt-image-1') {
    this.openai = new OpenAI({ apiKey });
    this.provider = provider;
  }

  /**
   * Génère une ou plusieurs images à partir d'un prompt
   */
  async generate(
    prompt: string,
    options: ImageGenOptions = {}
  ): Promise<ImageGenResult> {
    const startTime = Date.now();
    
    const {
      provider = this.provider,
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid',
      userId,
      projectId,
      n = 1
    } = options;

    try {
      // Validation du prompt
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Prompt cannot be empty');
      }

      if (prompt.length > 4000) {
        throw new Error('Prompt too long (max 4000 characters)');
      }

      // Préparer les options selon le provider
      const dalleOptions = this.prepareDalleOptions(provider, {
        prompt: prompt.trim(),
        size,
        quality,
        style,
        n: provider === 'dalle2' ? n : 1 // DALL-E 3 ne supporte qu'une image
      });

      // Générer l'image
      const response = await this.openai.images.generate(dalleOptions);

      // Traiter la réponse
      const images: GeneratedImage[] = response.data.map((imageData, index) => ({
        id: `img_${Date.now()}_${index}`,
        url: imageData.url || '',
        revisedPrompt: imageData.revised_prompt,
        b64_json: imageData.b64_json,
        size,
        quality,
        style: provider === 'dalle3' ? style : undefined,
        provider,
        generationTime: Date.now() - startTime,
        metadata: {
          originalPrompt: prompt,
          userId,
          projectId,
          timestamp: new Date().toISOString()
        }
      }));

      // Calculer le coût
      const totalCost = this.calculateCost(provider, size, quality, n);

      return {
        success: true,
        images,
        totalCost,
        rateLimitInfo: this.extractRateLimitInfo(response)
      };

    } catch (error) {
      console.error('Image generation failed:', error);
      
      return {
        success: false,
        images: [],
        totalCost: 0,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Upload une image vers S3 et retourne les URLs
   */
  async uploadToS3(
    imageUrl: string,
    metadata: {
      userId?: string;
      projectId?: string;
      generationId: string;
    }
  ): Promise<ImageUploadResult> {
    try {
      // Télécharger l'image depuis l'URL temporaire
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/png';
      
      // Générer un nom de fichier unique
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `generated-images/${metadata.userId || 'anonymous'}/${timestamp}_${metadata.generationId}.png`;

      // TODO: Implémenter l'upload S3 réel
      // Pour l'instant, simuler l'upload
      const s3Url = `https://vidgenie-storage.s3.amazonaws.com/${filename}`;
      const cdnUrl = `https://cdn.vidgenie.com/${filename}`;

      return {
        s3Url,
        cdnUrl,
        fileSize: imageBuffer.byteLength,
        contentType
      };

    } catch (error) {
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prépare les options pour l'API DALL-E
   */
  private prepareDalleOptions(provider: ImageProvider, options: any): any {
    const baseOptions = {
      prompt: options.prompt,
      response_format: 'url' as const
    };

    if (provider === 'gpt-image-1') {
      return {
        ...baseOptions,
        model: 'gpt-image-1',
        size: options.size,
        n: 1
      };
    } else if (provider === 'dalle3') {
      return {
        ...baseOptions,
        model: 'dall-e-3',
        size: options.size,
        quality: options.quality,
        style: options.style,
        n: 1 // DALL-E 3 ne supporte qu'une image
      };
    } else {
      return {
        ...baseOptions,
        model: 'dall-e-2',
        size: options.size === '1792x1024' || options.size === '1024x1792' ? '1024x1024' : options.size,
        n: options.n || 1
      };
    }
  }

  /**
   * Calcule le coût en crédits selon la configuration
   */
  private calculateCost(
    provider: ImageProvider,
    size: ImageSize,
    quality: ImageQuality,
    count: number = 1
  ): number {
    const costs = {
      'gpt-image-1': {
        'standard': {
          '1024x1024': 2,
          '1792x1024': 3,
          '1024x1792': 3
        },
        'hd': {
          '1024x1024': 3,
          '1792x1024': 5,
          '1024x1792': 5
        }
      },
      dalle3: {
        'standard': {
          '1024x1024': 2,
          '1792x1024': 3,
          '1024x1792': 3
        },
        'hd': {
          '1024x1024': 3,
          '1792x1024': 5,
          '1024x1792': 5
        }
      },
      dalle2: {
        'standard': {
          '1024x1024': 1,
          '1792x1024': 1, // Ramené à 1024x1024
          '1024x1792': 1  // Ramené à 1024x1024
        }
      }
    };

    const providerCosts = costs[provider];
    if (!providerCosts) return 2; // Fallback

    const qualityCosts = providerCosts[quality as keyof typeof providerCosts] || providerCosts['standard'];
    const sizeCost = qualityCosts[size as keyof typeof qualityCosts] || 2;

    return sizeCost * count;
  }

  /**
   * Parse les erreurs de l'API
   */
  private parseError(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    
    if (error?.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown image generation error';
  }

  /**
   * Extrait les informations de rate limiting
   */
  private extractRateLimitInfo(response: any): { requestsRemaining: number; resetTime: string } | undefined {
    // TODO: Extraire les headers de rate limiting si disponibles
    return undefined;
  }

  /**
   * Teste la connectivité avec l'API
   */
  async testConnection(): Promise<{ success: boolean; provider: ImageProvider; error?: string }> {
    try {
      // Test simple avec un prompt minimal
      const result = await this.generate('A simple test image', {
        size: '1024x1024',
        quality: 'standard',
        style: 'natural'
      });

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
   * Obtient des informations sur les capacités du provider
   */
  getProviderCapabilities(): {
    provider: ImageProvider;
    supportedSizes: ImageSize[];
    supportedQualities: ImageQuality[];
    supportedStyles: ImageStyle[];
    maxImages: number;
    maxPromptLength: number;
  } {
    if (this.provider === 'dalle3') {
      return {
        provider: 'dalle3',
        supportedSizes: ['1024x1024', '1792x1024', '1024x1792'],
        supportedQualities: ['standard', 'hd'],
        supportedStyles: ['vivid', 'natural'],
        maxImages: 1,
        maxPromptLength: 4000
      };
    } else {
      return {
        provider: 'dalle2',
        supportedSizes: ['1024x1024'],
        supportedQualities: ['standard'],
        supportedStyles: ['natural'],
        maxImages: 10,
        maxPromptLength: 1000
      };
    }
  }

  /**
   * Valide les options avant génération
   */
  validateOptions(options: ImageGenOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const capabilities = this.getProviderCapabilities();

    if (options.size && !capabilities.supportedSizes.includes(options.size)) {
      errors.push(`Size ${options.size} not supported by ${this.provider}`);
    }

    if (options.quality && !capabilities.supportedQualities.includes(options.quality)) {
      errors.push(`Quality ${options.quality} not supported by ${this.provider}`);
    }

    if (options.style && !capabilities.supportedStyles.includes(options.style)) {
      errors.push(`Style ${options.style} not supported by ${this.provider}`);
    }

    if (options.n && options.n > capabilities.maxImages) {
      errors.push(`Cannot generate ${options.n} images, max is ${capabilities.maxImages} for ${this.provider}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}