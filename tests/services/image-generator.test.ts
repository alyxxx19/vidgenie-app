/**
 * Tests unitaires pour ImageGeneratorService
 * Phase 4 - Testing & Launch du PRD V2
 */

import { ImageGeneratorService } from '../../src/services/image-generator';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

// Mock fetch for S3 upload
global.fetch = jest.fn();

describe('ImageGeneratorService', () => {
  let service: ImageGeneratorService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockCreate: jest.Mock;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock OpenAI instance
    mockCreate = jest.fn();
    mockOpenAI = {
      images: {
        generate: mockCreate
      }
    } as any;
    
    MockedOpenAI.mockImplementation(() => mockOpenAI);
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    
    service = new ImageGeneratorService('test-api-key');
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key'
      });
    });
  });

  describe('generate', () => {
    const mockImageResponse = {
      data: [{
        url: 'https://example.com/generated-image.jpg',
        revised_prompt: 'A beautiful sunset landscape with enhanced details'
      }]
    };

    beforeEach(() => {
      mockCreate.mockResolvedValue(mockImageResponse);
    });

    it('should generate an image successfully with default options', async () => {
      const prompt = "A sunset landscape";
      
      const result = await service.generate(prompt);
      
      expect(result.success).toBe(true);
      expect(result.imageUrl).toBe('https://example.com/generated-image.jpg');
      expect(result.revisedPrompt).toBe('A beautiful sunset landscape with enhanced details');
      expect(result.originalPrompt).toBe(prompt);
      expect(result.totalCost).toBe(8); // Default cost for hd quality
      expect(result.metadata.model).toBe('dall-e-3');
      expect(result.metadata.size).toBe('1024x1024');
      expect(result.metadata.quality).toBe('hd');
    });

    it('should handle custom generation options', async () => {
      const options = {
        size: '1792x1024' as const,
        quality: 'standard' as const,
        style: 'natural' as const,
        userId: 'user-123',
        projectId: 'project-456'
      };
      
      const result = await service.generate("Test prompt", options);
      
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: "Test prompt",
        n: 1,
        size: '1792x1024',
        quality: 'standard',
        style: 'natural'
      });

      expect(result.totalCost).toBe(6); // Standard quality cost
      expect(result.metadata.size).toBe('1792x1024');
      expect(result.metadata.quality).toBe('standard');
      expect(result.metadata.style).toBe('natural');
    });

    it('should handle DALL-E 2 model', async () => {
      const options = {
        model: 'dall-e-2' as const,
        size: '512x512' as const,
        n: 2
      };
      
      await service.generate("Test prompt", options);
      
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'dall-e-2',
        prompt: "Test prompt",
        n: 2,
        size: '512x512'
      });
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('OpenAI API error');
      mockCreate.mockRejectedValue(apiError);
      
      const result = await service.generate("Test prompt");
      
      expect(result.success).toBe(false);
      expect(result.totalCost).toBe(0);
      expect(result.error).toBe('OpenAI API error');
    });

    it('should handle empty response', async () => {
      mockCreate.mockResolvedValue({ data: [] });
      
      const result = await service.generate("Test prompt");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No image generated');
    });

    it('should handle missing image URL', async () => {
      mockCreate.mockResolvedValue({
        data: [{ revised_prompt: 'Enhanced prompt' }]
      });
      
      const result = await service.generate("Test prompt");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No image URL in response');
    });

    it('should validate input prompt', async () => {
      const result = await service.generate("");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Prompt cannot be empty');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should validate prompt length', async () => {
      const longPrompt = 'A '.repeat(500) + 'test';
      
      const result = await service.generate(longPrompt);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Prompt too long');
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('uploadToS3', () => {
    const mockImageUrl = 'https://example.com/image.jpg';
    const mockImageBuffer = new ArrayBuffer(1024);
    
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockImageBuffer),
        headers: {
          get: (header: string) => header === 'content-type' ? 'image/jpeg' : null
        }
      } as any);
    });

    it('should upload image to S3 successfully', async () => {
      const metadata = {
        userId: 'user-123',
        projectId: 'project-456',
        generationId: 'gen-789'
      };
      
      const result = await service.uploadToS3(mockImageUrl, metadata);
      
      expect(mockFetch).toHaveBeenCalledWith(mockImageUrl);
      expect(result.s3Url).toContain('user-123');
      expect(result.s3Url).toContain('gen-789');
      expect(result.cdnUrl).toContain('cdn.vidgenie.com');
      expect(result.fileSize).toBe(1024);
      expect(result.contentType).toBe('image/jpeg');
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      } as any);
      
      await expect(
        service.uploadToS3(mockImageUrl, { generationId: 'test' })
      ).rejects.toThrow('Failed to fetch image: 404');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(
        service.uploadToS3(mockImageUrl, { generationId: 'test' })
      ).rejects.toThrow('S3 upload failed: Network error');
    });

    it('should generate unique filenames', async () => {
      const metadata1 = { generationId: 'gen-1' };
      const metadata2 = { generationId: 'gen-2' };
      
      const result1 = await service.uploadToS3(mockImageUrl, metadata1);
      const result2 = await service.uploadToS3(mockImageUrl, metadata2);
      
      expect(result1.s3Url).not.toBe(result2.s3Url);
      expect(result1.s3Url).toContain('gen-1');
      expect(result2.s3Url).toContain('gen-2');
    });
  });

  describe('calculateCost', () => {
    describe('DALL-E 3 costs', () => {
      it('should calculate standard quality costs', () => {
        expect(service.calculateCost('dall-e-3', '1024x1024', 'standard')).toBe(5);
        expect(service.calculateCost('dall-e-3', '1024x1792', 'standard')).toBe(6);
        expect(service.calculateCost('dall-e-3', '1792x1024', 'standard')).toBe(6);
      });

      it('should calculate HD quality costs', () => {
        expect(service.calculateCost('dall-e-3', '1024x1024', 'hd')).toBe(8);
        expect(service.calculateCost('dall-e-3', '1024x1792', 'hd')).toBe(10);
        expect(service.calculateCost('dall-e-3', '1792x1024', 'hd')).toBe(10);
      });
    });

    describe('DALL-E 2 costs', () => {
      it('should calculate different size costs', () => {
        expect(service.calculateCost('dall-e-2', '1024x1024', 'standard')).toBe(3);
        expect(service.calculateCost('dall-e-2', '512x512', 'standard')).toBe(2);
        expect(service.calculateCost('dall-e-2', '256x256', 'standard')).toBe(1);
      });
    });

    it('should handle multiple images', () => {
      expect(service.calculateCost('dall-e-2', '512x512', 'standard', 3)).toBe(6); // 2 * 3
      expect(service.calculateCost('dall-e-3', '1024x1024', 'hd', 2)).toBe(16); // 8 * 2
    });

    it('should handle invalid inputs with defaults', () => {
      expect(service.calculateCost('invalid' as any, '1024x1024', 'hd')).toBe(8); // Defaults to dall-e-3
      expect(service.calculateCost('dall-e-3', 'invalid' as any, 'hd')).toBe(8); // Defaults to 1024x1024
      expect(service.calculateCost('dall-e-3', '1024x1024', 'invalid' as any)).toBe(8); // Defaults to hd
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const mockModelsResponse = {
        data: [{
          id: 'dall-e-3',
          object: 'model'
        }]
      };

      mockOpenAI.models = {
        list: jest.fn().mockResolvedValue(mockModelsResponse)
      } as any;

      const result = await service.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.model).toBe('dall-e-3');
      expect(result.error).toBeUndefined();
    });

    it('should handle connection errors', async () => {
      const apiError = new Error('Authentication failed');
      mockOpenAI.models = {
        list: jest.fn().mockRejectedValue(apiError)
      } as any;

      const result = await service.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  describe('getModelCapabilities', () => {
    it('should return DALL-E 3 capabilities', () => {
      const capabilities = service.getModelCapabilities('dall-e-3');
      
      expect(capabilities.model).toBe('dall-e-3');
      expect(capabilities.supportedSizes).toContain('1024x1024');
      expect(capabilities.supportedSizes).toContain('1024x1792');
      expect(capabilities.supportedSizes).toContain('1792x1024');
      expect(capabilities.supportedQualities).toContain('standard');
      expect(capabilities.supportedQualities).toContain('hd');
      expect(capabilities.supportedStyles).toContain('vivid');
      expect(capabilities.supportedStyles).toContain('natural');
      expect(capabilities.maxPromptLength).toBe(4000);
      expect(capabilities.maxImages).toBe(1);
    });

    it('should return DALL-E 2 capabilities', () => {
      const capabilities = service.getModelCapabilities('dall-e-2');
      
      expect(capabilities.model).toBe('dall-e-2');
      expect(capabilities.supportedSizes).toContain('256x256');
      expect(capabilities.supportedSizes).toContain('512x512');
      expect(capabilities.supportedSizes).toContain('1024x1024');
      expect(capabilities.supportedQualities).toContain('standard');
      expect(capabilities.supportedStyles).toHaveLength(0); // No styles for DALL-E 2
      expect(capabilities.maxImages).toBe(10);
    });
  });

  describe('private methods', () => {
    describe('validateInputs', () => {
      it('should validate valid inputs', () => {
        const validation = (service as any).validateInputs(
          "Valid prompt", 
          { size: '1024x1024', quality: 'hd' }
        );
        
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should catch empty prompt', () => {
        const validation = (service as any).validateInputs("", {});
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Prompt cannot be empty');
      });

      it('should catch long prompt', () => {
        const longPrompt = 'A '.repeat(2000) + 'test';
        const validation = (service as any).validateInputs(longPrompt, {});
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Prompt too long (max 4000 characters)');
      });

      it('should catch invalid size for DALL-E 3', () => {
        const validation = (service as any).validateInputs(
          "Valid prompt", 
          { model: 'dall-e-3', size: '256x256' }
        );
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Size 256x256 not supported for dall-e-3');
      });

      it('should catch invalid quality for DALL-E 2', () => {
        const validation = (service as any).validateInputs(
          "Valid prompt", 
          { model: 'dall-e-2', quality: 'hd' }
        );
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Quality hd not supported for dall-e-2');
      });

      it('should catch too many images for DALL-E 3', () => {
        const validation = (service as any).validateInputs(
          "Valid prompt", 
          { model: 'dall-e-3', n: 2 }
        );
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('dall-e-3 can only generate 1 image at a time');
      });
    });

    describe('parseError', () => {
      it('should extract OpenAI API error message', () => {
        const openaiError = {
          response: {
            data: {
              error: {
                message: 'Insufficient quota'
              }
            }
          }
        };
        
        const message = (service as any).parseError(openaiError);
        expect(message).toBe('Insufficient quota');
      });

      it('should handle generic errors', () => {
        const genericError = new Error('Generic error');
        const message = (service as any).parseError(genericError);
        expect(message).toBe('Generic error');
      });

      it('should handle unknown error types', () => {
        const message = (service as any).parseError({ unknown: 'error' });
        expect(message).toBe('Unknown image generation error');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent generation requests', async () => {
      const promises = [
        service.generate("Prompt 1"),
        service.generate("Prompt 2"),
        service.generate("Prompt 3")
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(mockCreate).toHaveBeenCalledTimes(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle special characters in prompts', async () => {
      const specialPrompt = "A prompt with émojis 🎨 and symbols: @#$%^&*()";
      
      await service.generate(specialPrompt);
      
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: specialPrompt
        })
      );
    });

    it('should preserve metadata through the generation process', async () => {
      const options = {
        userId: 'user-123',
        projectId: 'project-456'
      };
      
      const result = await service.generate("Test prompt", options);
      
      expect(result.metadata.userId).toBe('user-123');
      expect(result.metadata.projectId).toBe('project-456');
      expect(result.metadata.timestamp).toBeDefined();
    });
  });
});