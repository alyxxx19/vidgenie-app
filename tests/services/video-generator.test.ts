/**
 * Tests unitaires pour VideoGeneratorService
 * Phase 4 - Testing & Launch du PRD V2
 */

import { VideoGeneratorService } from '../../src/services/video-generator';

// Mock fetch for API calls and S3 upload
global.fetch = jest.fn();

describe('VideoGeneratorService', () => {
  let service: VideoGeneratorService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    service = new VideoGeneratorService('test-api-key', 'fal-ai');
  });

  describe('constructor', () => {
    it('should initialize with API key and provider', () => {
      const falService = new VideoGeneratorService('api-key', 'fal-ai');
      expect(falService).toBeInstanceOf(VideoGeneratorService);
      
      const veoService = new VideoGeneratorService('api-key', 'veo3');
      expect(veoService).toBeInstanceOf(VideoGeneratorService);
    });

    it('should default to fal-ai provider', () => {
      const defaultService = new VideoGeneratorService('api-key');
      expect(defaultService.getProviderCapabilities().provider).toBe('fal-ai');
    });
  });

  describe('generateFromImage', () => {
    const mockImageUrl = 'https://example.com/image.jpg';
    
    beforeEach(() => {
      // Mock successful response from provider
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          job: {
            id: 'fal_12345',
            status: 'queued',
            progress: 0,
            createdAt: new Date().toISOString(),
            metadata: {
              originalImageUrl: mockImageUrl,
              options: {}
            }
          }
        })
      } as any);
    });

    it('should generate video from image with default options', async () => {
      const result = await service.generateFromImage(mockImageUrl);
      
      expect(result.success).toBe(true);
      expect(result.job?.id).toBe('fal_12345');
      expect(result.job?.status).toBe('queued');
      expect(result.totalCost).toBe(10); // Default cost for 8s 1080p fal-ai
      expect(result.estimatedDuration).toBe(240); // 8 * 30 seconds estimation
    });

    it('should handle custom options', async () => {
      const options = {
        provider: 'fal-ai' as const,
        resolution: '720p' as const,
        duration: 15 as const,
        motionIntensity: 'high' as const,
        userId: 'user-123',
        projectId: 'project-456'
      };
      
      const result = await service.generateFromImage(mockImageUrl, options);
      
      expect(result.success).toBe(true);
      expect(result.totalCost).toBe(18); // 15s 720p fal-ai
      expect(result.job?.metadata.options).toEqual(options);
    });

    it('should handle validation errors', async () => {
      const result = await service.generateFromImage('invalid-url');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid inputs');
      expect(result.totalCost).toBe(0);
    });

    it('should handle provider errors', async () => {
      mockFetch.mockRejectedValue(new Error('Provider API error'));
      
      const result = await service.generateFromImage(mockImageUrl);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider API error');
      expect(result.totalCost).toBe(0);
    });

    it('should validate duration options', async () => {
      const result = await service.generateFromImage(mockImageUrl, {
        duration: 45 as any // Invalid duration
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Duration must be 5, 8, 15, 30, or 60 seconds');
    });

    it('should validate resolution options', async () => {
      const result = await service.generateFromImage(mockImageUrl, {
        resolution: '2k' as any // Invalid resolution
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Resolution must be 720p, 1080p, or 4k');
    });

    it('should validate motion intensity options', async () => {
      const result = await service.generateFromImage(mockImageUrl, {
        motionIntensity: 'extreme' as any // Invalid motion intensity
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Motion intensity must be low, medium, or high');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status from provider', async () => {
      const mockJobStatus = {
        id: 'fal_12345',
        status: 'processing' as const,
        progress: 65,
        estimatedTimeRemaining: 120,
        createdAt: '2024-01-01T00:00:00Z',
        metadata: {
          originalImageUrl: 'https://example.com/image.jpg',
          options: {}
        }
      };

      // Mock the provider's getJobStatus method
      const mockProvider = {
        getJobStatus: jest.fn().mockResolvedValue(mockJobStatus)
      };
      (service as any).getProviderInstance = jest.fn().mockReturnValue(mockProvider);
      
      const result = await service.getJobStatus('fal_12345');
      
      expect(result).toEqual(mockJobStatus);
      expect(mockProvider.getJobStatus).toHaveBeenCalledWith('fal_12345');
    });

    it('should handle provider errors', async () => {
      const mockProvider = {
        getJobStatus: jest.fn().mockRejectedValue(new Error('Job not found'))
      };
      (service as any).getProviderInstance = jest.fn().mockReturnValue(mockProvider);
      
      await expect(service.getJobStatus('invalid-id')).rejects.toThrow('Failed to get job status: Job not found');
    });
  });

  describe('uploadToS3', () => {
    const mockVideoUrl = 'https://example.com/video.mp4';
    const mockVideoBuffer = new ArrayBuffer(2048);
    
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockVideoBuffer),
        headers: {
          get: (header: string) => header === 'content-type' ? 'video/mp4' : null
        }
      } as any);
    });

    it('should upload video to S3 successfully', async () => {
      const metadata = {
        userId: 'user-123',
        projectId: 'project-456',
        generationId: 'gen-789'
      };
      
      const result = await service.uploadToS3(mockVideoUrl, metadata);
      
      expect(mockFetch).toHaveBeenCalledWith(mockVideoUrl);
      expect(result.s3Url).toContain('user-123');
      expect(result.s3Url).toContain('gen-789');
      expect(result.cdnUrl).toContain('cdn.vidgenie.com');
      expect(result.thumbnailUrl).toContain('_thumb.jpg');
      expect(result.fileSize).toBe(2048);
      expect(result.contentType).toBe('video/mp4');
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403
      } as any);
      
      await expect(
        service.uploadToS3(mockVideoUrl, { generationId: 'test' })
      ).rejects.toThrow('Failed to fetch video: 403');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));
      
      await expect(
        service.uploadToS3(mockVideoUrl, { generationId: 'test' })
      ).rejects.toThrow('S3 upload failed: Network timeout');
    });

    it('should generate unique filenames with timestamp', async () => {
      const metadata1 = { generationId: 'gen-1' };
      const metadata2 = { generationId: 'gen-2' };
      
      // Add small delay to ensure different timestamps
      const result1 = await service.uploadToS3(mockVideoUrl, metadata1);
      await new Promise(resolve => setTimeout(resolve, 1));
      const result2 = await service.uploadToS3(mockVideoUrl, metadata2);
      
      expect(result1.s3Url).not.toBe(result2.s3Url);
      expect(result1.s3Url).toContain('gen-1');
      expect(result2.s3Url).toContain('gen-2');
    });
  });

  describe('calculateCost', () => {
    describe('fal-ai costs', () => {
      it('should calculate costs for different durations and resolutions', () => {
        expect(service.calculateCost('fal-ai', 5, '720p')).toBe(8);
        expect(service.calculateCost('fal-ai', 8, '1080p')).toBe(15);
        expect(service.calculateCost('fal-ai', 15, '4k')).toBe(50);
        expect(service.calculateCost('fal-ai', 30, '720p')).toBe(35);
        expect(service.calculateCost('fal-ai', 60, '1080p')).toBe(100);
      });

      it('should add audio cost when enabled', () => {
        const baseCost = service.calculateCost('fal-ai', 8, '1080p', false);
        const withAudio = service.calculateCost('fal-ai', 8, '1080p', true);
        
        expect(withAudio).toBeGreaterThan(baseCost);
        expect(withAudio).toBe(baseCost + Math.ceil(baseCost * 0.2));
      });
    });

    describe('veo3 costs', () => {
      it('should calculate higher costs for VEO3', () => {
        expect(service.calculateCost('veo3', 8, '1080p')).toBe(22);
        expect(service.calculateCost('veo3', 15, '4k')).toBe(70);
        expect(service.calculateCost('veo3', 30, '720p')).toBe(50);
      });
    });

    describe('runway costs', () => {
      it('should calculate runway-specific costs', () => {
        expect(service.calculateCost('runway', 5, '720p')).toBe(10);
        expect(service.calculateCost('runway', 8, '1080p')).toBe(18);
        expect(service.calculateCost('runway', 15, '4k')).toBe(60);
      });
    });

    describe('pika costs', () => {
      it('should calculate pika-specific costs (lowest)', () => {
        expect(service.calculateCost('pika', 5, '720p')).toBe(6);
        expect(service.calculateCost('pika', 8, '1080p')).toBe(12);
        expect(service.calculateCost('pika', 15, '4k')).toBe(40);
      });
    });

    it('should handle invalid provider with fallback', () => {
      const cost = service.calculateCost('invalid' as any, 8, '1080p');
      const falCost = service.calculateCost('fal-ai', 8, '1080p');
      expect(cost).toBe(falCost);
    });

    it('should handle invalid duration with fallback', () => {
      const cost = service.calculateCost('fal-ai', 45 as any, '1080p');
      const defaultCost = service.calculateCost('fal-ai', 8, '1080p');
      expect(cost).toBe(defaultCost);
    });

    it('should handle invalid resolution with fallback', () => {
      const cost = service.calculateCost('fal-ai', 8, '2k' as any);
      const defaultCost = service.calculateCost('fal-ai', 8, '1080p');
      expect(cost).toBe(defaultCost);
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const mockProvider = {
        testConnection: jest.fn().mockResolvedValue({ success: true })
      };
      (service as any).getProviderInstance = jest.fn().mockReturnValue(mockProvider);
      
      const result = await service.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('fal-ai');
      expect(result.error).toBeUndefined();
    });

    it('should handle connection errors', async () => {
      const mockProvider = {
        testConnection: jest.fn().mockResolvedValue({ success: false, error: 'Invalid API key' })
      };
      (service as any).getProviderInstance = jest.fn().mockReturnValue(mockProvider);
      
      const result = await service.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.provider).toBe('fal-ai');
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle provider exceptions', async () => {
      const mockProvider = {
        testConnection: jest.fn().mockRejectedValue(new Error('Network error'))
      };
      (service as any).getProviderInstance = jest.fn().mockReturnValue(mockProvider);
      
      const result = await service.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getProviderCapabilities', () => {
    it('should return fal-ai capabilities', () => {
      const service = new VideoGeneratorService('key', 'fal-ai');
      const caps = service.getProviderCapabilities();
      
      expect(caps.provider).toBe('fal-ai');
      expect(caps.supportedDurations).toEqual([5, 8, 15]);
      expect(caps.supportedResolutions).toEqual(['720p', '1080p']);
      expect(caps.supportedMotionIntensities).toEqual(['low', 'medium', 'high']);
      expect(caps.maxFileSize).toBe(100);
      expect(caps.supportedFormats).toEqual(['mp4', 'webm']);
      expect(caps.hasAudioGeneration).toBe(false);
    });

    it('should return veo3 capabilities', () => {
      const service = new VideoGeneratorService('key', 'veo3');
      const caps = service.getProviderCapabilities();
      
      expect(caps.provider).toBe('veo3');
      expect(caps.supportedDurations).toEqual([8, 15, 30]);
      expect(caps.supportedResolutions).toEqual(['720p', '1080p', '4k']);
      expect(caps.hasAudioGeneration).toBe(true);
      expect(caps.maxFileSize).toBe(200);
    });

    it('should return runway capabilities', () => {
      const service = new VideoGeneratorService('key', 'runway');
      const caps = service.getProviderCapabilities();
      
      expect(caps.provider).toBe('runway');
      expect(caps.supportedDurations).toEqual([5, 8, 15, 30]);
      expect(caps.supportedResolutions).toEqual(['720p', '1080p', '4k']);
      expect(caps.supportedFormats).toEqual(['mp4', 'mov']);
      expect(caps.hasAudioGeneration).toBe(true);
    });

    it('should return pika capabilities', () => {
      const service = new VideoGeneratorService('key', 'pika');
      const caps = service.getProviderCapabilities();
      
      expect(caps.provider).toBe('pika');
      expect(caps.supportedDurations).toEqual([5, 8, 15]);
      expect(caps.supportedResolutions).toEqual(['720p', '1080p']);
      expect(caps.supportedMotionIntensities).toEqual(['medium', 'high']);
      expect(caps.hasAudioGeneration).toBe(false);
      expect(caps.maxFileSize).toBe(80);
    });
  });

  describe('private methods', () => {
    describe('validateInputs', () => {
      it('should validate correct inputs', () => {
        const validation = (service as any).validateInputs(
          'https://example.com/image.jpg',
          { duration: 8, resolution: '1080p', motionIntensity: 'medium' }
        );
        
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should catch invalid URL', () => {
        const validation = (service as any).validateInputs('invalid-url', {});
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Invalid image URL');
      });

      it('should catch invalid duration', () => {
        const validation = (service as any).validateInputs(
          'https://example.com/image.jpg',
          { duration: 45 }
        );
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Duration must be 5, 8, 15, 30, or 60 seconds');
      });

      it('should catch invalid resolution', () => {
        const validation = (service as any).validateInputs(
          'https://example.com/image.jpg',
          { resolution: '2k' }
        );
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Resolution must be 720p, 1080p, or 4k');
      });

      it('should catch invalid motion intensity', () => {
        const validation = (service as any).validateInputs(
          'https://example.com/image.jpg',
          { motionIntensity: 'extreme' }
        );
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Motion intensity must be low, medium, or high');
      });
    });

    describe('isValidUrl', () => {
      it('should validate correct URLs', () => {
        const isValid = (service as any).isValidUrl('https://example.com/image.jpg');
        expect(isValid).toBe(true);
      });

      it('should reject invalid URLs', () => {
        const isValid = (service as any).isValidUrl('not-a-url');
        expect(isValid).toBe(false);
      });

      it('should handle URL constructor errors', () => {
        const isValid = (service as any).isValidUrl('');
        expect(isValid).toBe(false);
      });
    });

    describe('parseError', () => {
      it('should extract API error message', () => {
        const apiError = {
          response: {
            data: {
              message: 'Insufficient credits'
            }
          }
        };
        
        const message = (service as any).parseError(apiError);
        expect(message).toBe('Insufficient credits');
      });

      it('should extract simple error message', () => {
        const error = new Error('Simple error');
        const message = (service as any).parseError(error);
        expect(message).toBe('Simple error');
      });

      it('should handle string errors', () => {
        const message = (service as any).parseError('String error');
        expect(message).toBe('String error');
      });

      it('should handle unknown errors', () => {
        const message = (service as any).parseError({ unknown: 'error' });
        expect(message).toBe('Unknown video generation error');
      });
    });
  });

  describe('provider implementations', () => {
    describe('FalAiProvider', () => {
      it('should simulate generation correctly', async () => {
        const result = await service.generateFromImage('https://example.com/image.jpg');
        
        expect(result.success).toBe(true);
        expect(result.job?.id).toMatch(/^fal_/);
        expect(result.job?.status).toBe('queued');
        expect(result.estimatedDuration).toBe(240); // 8 * 30
      });

      it('should handle job status requests', async () => {
        const mockProvider = {
          getJobStatus: jest.fn().mockResolvedValue({
            id: 'fal_12345',
            status: 'processing',
            progress: 50,
            estimatedTimeRemaining: 120,
            createdAt: new Date().toISOString(),
            metadata: { originalImageUrl: '', options: {} }
          })
        };
        (service as any).getProviderInstance = jest.fn().mockReturnValue(mockProvider);
        
        const status = await service.getJobStatus('fal_12345');
        
        expect(status.id).toBe('fal_12345');
        expect(status.status).toBe('processing');
        expect(status.progress).toBe(50);
      });
    });

    describe('Other providers', () => {
      it('should throw not implemented for VEO3', async () => {
        const veoService = new VideoGeneratorService('key', 'veo3');
        
        const result = await veoService.generateFromImage('https://example.com/image.jpg');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('VEO3 provider not yet implemented');
      });

      it('should throw not implemented for Runway', async () => {
        const runwayService = new VideoGeneratorService('key', 'runway');
        
        const result = await runwayService.generateFromImage('https://example.com/image.jpg');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Runway provider not yet implemented');
      });

      it('should throw not implemented for Pika', async () => {
        const pikaService = new VideoGeneratorService('key', 'pika');
        
        const result = await pikaService.generateFromImage('https://example.com/image.jpg');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Pika provider not yet implemented');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent video generation requests', async () => {
      const promises = [
        service.generateFromImage('https://example.com/image1.jpg'),
        service.generateFromImage('https://example.com/image2.jpg'),
        service.generateFromImage('https://example.com/image3.jpg')
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.job?.id).toMatch(/^fal_/);
      });
    });

    it('should preserve metadata through generation process', async () => {
      const options = {
        userId: 'user-123',
        projectId: 'project-456',
        generateAudio: true
      };
      
      const result = await service.generateFromImage(
        'https://example.com/image.jpg',
        options
      );
      
      expect(result.job?.metadata.options.userId).toBe('user-123');
      expect(result.job?.metadata.options.projectId).toBe('project-456');
      expect(result.job?.metadata.options.generateAudio).toBe(true);
    });

    it('should handle very long image URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.jpg';
      
      const result = await service.generateFromImage(longUrl);
      
      // Should still validate and work if URL is valid
      expect(result.success).toBe(true);
    });
  });
});