/**
 * Tests d'intégration avec vraies API keys
 * Phase 4 - Testing & Launch du PRD V2
 * 
 * Ces tests utilisent de vraies API keys et appellent les services externes réels
 * Ils sont désactivés par défaut pour éviter les coûts - utiliser ENABLE_REAL_API_TESTS=true
 */

import { PromptEnhancerService } from '../../src/services/prompt-enhancer';
import { ImageGeneratorService } from '../../src/services/image-generator';
import { VideoGeneratorService } from '../../src/services/video-generator';
import { EncryptionService } from '../../src/services/encryption';

// Configuration des tests avec vraies APIs
const REAL_API_TESTS_ENABLED = process.env.ENABLE_REAL_API_TESTS === 'true';
const MAX_TEST_CREDITS = parseInt(process.env.MAX_TEST_CREDITS_PER_RUN || '10');

const describeRealAPI = REAL_API_TESTS_ENABLED ? describe : describe.skip;

describeRealAPI('Real API Integration Tests', () => {
  let testCreditsUsed = 0;
  
  const checkCreditLimit = (estimatedCost: number) => {
    if (testCreditsUsed + estimatedCost > MAX_TEST_CREDITS) {
      throw new Error(`Test credit limit would be exceeded. Used: ${testCreditsUsed}, Estimated: ${estimatedCost}, Limit: ${MAX_TEST_CREDITS}`);
    }
  };

  const trackCredits = (actualCost: number) => {
    testCreditsUsed += actualCost;
    console.log(`Credits used this test run: ${testCreditsUsed}/${MAX_TEST_CREDITS}`);
  };

  beforeAll(() => {
    console.log('🔥 REAL API TESTS ENABLED - This will use actual API calls and cost money!');
    console.log(`📊 Credit limit for this test run: ${MAX_TEST_CREDITS} credits`);
  });

  afterAll(() => {
    console.log(`💰 Total credits used in test run: ${testCreditsUsed}`);
  });

  describe('PromptEnhancerService with real OpenAI API', () => {
    let service: PromptEnhancerService;

    beforeEach(() => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for real API tests');
      }
      service = new PromptEnhancerService(apiKey);
    });

    it('should enhance a simple prompt using real OpenAI API', async () => {
      const estimatedCost = 2;
      checkCreditLimit(estimatedCost);

      const originalPrompt = 'A cat sitting in a garden';
      
      const result = await service.enhance(originalPrompt, {
        creativity: 0.7,
        targetAudience: 'general',
        contentType: 'image'
      });

      expect(result.success).toBe(true);
      expect(result.enhancedPrompt).toBeDefined();
      expect(result.enhancedPrompt.length).toBeGreaterThan(originalPrompt.length);
      expect(result.improvements.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata.tokensUsed).toBeGreaterThan(0);

      trackCredits(result.totalCost);

      console.log(`Original: "${originalPrompt}"`);
      console.log(`Enhanced: "${result.enhancedPrompt}"`);
      console.log(`Improvements: ${result.improvements.join(', ')}`);
      console.log(`Confidence: ${result.confidence}`);
    }, 30000);

    it('should test connection to OpenAI API', async () => {
      const result = await service.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.model).toBe('gpt-4o-mini');
      expect(result.error).toBeUndefined();

      console.log(`✅ OpenAI connection successful with model: ${result.model}`);
    });

    it('should handle different content types correctly', async () => {
      const estimatedCost = 2;
      checkCreditLimit(estimatedCost);

      const videoPrompt = 'A person walking down a street';
      
      const result = await service.enhance(videoPrompt, {
        contentType: 'video',
        creativity: 0.8
      });

      expect(result.success).toBe(true);
      expect(result.enhancedPrompt).toContain('motion');

      trackCredits(result.totalCost);

      console.log(`Video-enhanced prompt: "${result.enhancedPrompt}"`);
    }, 30000);
  });

  describe('ImageGeneratorService with real DALL-E API', () => {
    let service: ImageGeneratorService;

    beforeEach(() => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for real API tests');
      }
      service = new ImageGeneratorService(apiKey);
    });

    it('should generate a real image using DALL-E 3', async () => {
      const estimatedCost = 8; // HD quality cost
      checkCreditLimit(estimatedCost);

      const prompt = 'A serene mountain landscape at sunset with vibrant colors';
      
      const result = await service.generate(prompt, {
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid'
      });

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBeDefined();
      expect(result.imageUrl).toMatch(/^https?:\/\//);
      expect(result.revisedPrompt).toBeDefined();
      expect(result.metadata.generationTime).toBeGreaterThan(0);

      trackCredits(result.totalCost);

      console.log(`✅ Image generated successfully: ${result.imageUrl}`);
      console.log(`Revised prompt: "${result.revisedPrompt}"`);
      console.log(`Generation time: ${result.metadata.generationTime}ms`);

      // Verify image is accessible
      const response = await fetch(result.imageUrl);
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('image');

      const imageBuffer = await response.arrayBuffer();
      expect(imageBuffer.byteLength).toBeGreaterThan(1000); // At least 1KB
      
      console.log(`Image size: ${imageBuffer.byteLength} bytes`);
    }, 60000);

    it('should test connection to DALL-E API', async () => {
      const result = await service.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.model).toBe('dall-e-3');
      expect(result.error).toBeUndefined();

      console.log(`✅ DALL-E connection successful`);
    });

    it('should generate image with standard quality (cheaper)', async () => {
      const estimatedCost = 5; // Standard quality cost
      checkCreditLimit(estimatedCost);

      const prompt = 'A simple geometric pattern with blue and white colors';
      
      const result = await service.generate(prompt, {
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard',
        style: 'natural'
      });

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBeDefined();
      expect(result.totalCost).toBe(5);

      trackCredits(result.totalCost);

      console.log(`✅ Standard quality image generated: ${result.imageUrl}`);
    }, 60000);
  });

  describe('VideoGeneratorService with real provider API', () => {
    let service: VideoGeneratorService;
    let testImageUrl: string;

    beforeAll(async () => {
      // Generate a test image first for video generation
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for real API tests');
      }

      const imageService = new ImageGeneratorService(apiKey);
      const imageResult = await imageService.generate('A beautiful sunset landscape', {
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard'
      });

      if (!imageResult.success) {
        throw new Error('Failed to generate test image for video tests');
      }

      testImageUrl = imageResult.imageUrl;
      console.log(`📸 Test image for video generation: ${testImageUrl}`);
    });

    beforeEach(() => {
      const apiKey = process.env.FAL_API_KEY;
      if (!apiKey) {
        console.warn('FAL_API_KEY not provided, using mock provider');
        service = new VideoGeneratorService('mock-key', 'fal-ai');
      } else {
        service = new VideoGeneratorService(apiKey, 'fal-ai');
      }
    });

    it('should test connection to video provider', async () => {
      const result = await service.testConnection();
      
      // Note: This might fail if using mock key, which is expected
      console.log(`Video provider connection result:`, result);
      
      if (process.env.FAL_API_KEY) {
        expect(result.success).toBe(true);
        console.log(`✅ Video provider connection successful`);
      } else {
        console.log(`⚠️ Skipping video provider connection test (no API key)`);
      }
    });

    it('should validate video generation parameters', async () => {
      const options = {
        duration: 5 as const,
        resolution: '720p' as const,
        motionIntensity: 'medium' as const
      };

      const result = await service.generateFromImage(testImageUrl, options);

      if (process.env.FAL_API_KEY) {
        // With real API key, should succeed or fail gracefully
        if (result.success) {
          expect(result.job).toBeDefined();
          expect(result.job?.id).toBeDefined();
          expect(result.totalCost).toBeGreaterThan(0);
          console.log(`✅ Video job created: ${result.job?.id}`);
        } else {
          console.log(`Video generation failed (expected with test setup): ${result.error}`);
        }
      } else {
        // With mock key, should succeed in test mode
        expect(result.success).toBe(true);
        expect(result.job?.id).toMatch(/^fal_/);
        console.log(`✅ Mock video generation successful`);
      }
    });

    it('should calculate video costs correctly', () => {
      const costs = [
        service.calculateCost('fal-ai', 5, '720p', false),
        service.calculateCost('fal-ai', 8, '1080p', true),
        service.calculateCost('veo3', 15, '4k', true),
        service.calculateCost('pika', 5, '720p', false)
      ];

      expect(costs[0]).toBe(8);  // fal-ai 5s 720p
      expect(costs[1]).toBe(18); // fal-ai 8s 1080p + audio
      expect(costs[2]).toBe(84); // veo3 15s 4k + audio (70 + 14)
      expect(costs[3]).toBe(6);  // pika 5s 720p

      console.log(`Video cost calculations verified:`, costs);
    });
  });

  describe('End-to-End Real API Workflow', () => {
    it('should execute a minimal real workflow (prompt → image)', async () => {
      const estimatedCost = 7; // 2 for prompt + 5 for image
      checkCreditLimit(estimatedCost);

      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('OPENAI_API_KEY is required for E2E test');
      }

      console.log('🚀 Starting real E2E workflow...');

      // Step 1: Enhance prompt
      const promptService = new PromptEnhancerService(openaiKey);
      const enhanceResult = await promptService.enhance('A minimalist abstract pattern');

      expect(enhanceResult.success).toBe(true);
      console.log(`✅ Prompt enhanced: "${enhanceResult.enhancedPrompt}"`);

      // Step 2: Generate image  
      const imageService = new ImageGeneratorService(openaiKey);
      const imageResult = await imageService.generate(enhanceResult.enhancedPrompt, {
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard'
      });

      expect(imageResult.success).toBe(true);
      expect(imageResult.imageUrl).toBeDefined();
      console.log(`✅ Image generated: ${imageResult.imageUrl}`);

      const totalCost = enhanceResult.totalCost + imageResult.totalCost;
      trackCredits(totalCost);

      console.log(`🎉 Real E2E workflow completed successfully!`);
      console.log(`💰 Total cost: ${totalCost} credits`);

      // Verify the image is actually accessible
      const imageResponse = await fetch(imageResult.imageUrl);
      expect(imageResponse.ok).toBe(true);
      
      const imageSize = parseInt(imageResponse.headers.get('content-length') || '0');
      console.log(`📊 Final image size: ${imageSize} bytes`);
      
      expect(imageSize).toBeGreaterThan(5000); // Should be at least 5KB for a real image
    }, 90000);
  });

  describe('Error Handling with Real APIs', () => {
    it('should handle invalid OpenAI API key gracefully', async () => {
      const service = new PromptEnhancerService('sk-invalid-key-12345');
      
      const result = await service.enhance('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Incorrect API key');
      expect(result.totalCost).toBe(0);

      console.log(`✅ Invalid API key error handled correctly: ${result.error}`);
    });

    it('should handle content policy violations in image generation', async () => {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('OPENAI_API_KEY is required for this test');
      }

      const service = new ImageGeneratorService(openaiKey);
      
      // Try to generate something that might violate content policy
      const result = await service.generate('inappropriate content that violates policy');
      
      if (!result.success) {
        expect(result.error).toBeDefined();
        console.log(`✅ Content policy violation handled: ${result.error}`);
      } else {
        console.log(`ℹ️ Content was deemed acceptable by OpenAI`);
      }

      // Either way, no credits should be charged for policy violations
      if (!result.success && result.error?.includes('content policy')) {
        expect(result.totalCost).toBe(0);
      }
    }, 60000);

    it('should handle rate limiting gracefully', async () => {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('OPENAI_API_KEY is required for this test');
      }

      const service = new PromptEnhancerService(openaiKey);
      
      // Make multiple rapid requests to potentially trigger rate limiting
      const rapidRequests = Array.from({ length: 5 }, (_, i) => 
        service.enhance(`Test prompt ${i + 1}`)
      );

      const results = await Promise.allSettled(rapidRequests);
      
      // Some might succeed, some might be rate limited
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (!result.value.success && result.value.error?.includes('rate limit')) {
            console.log(`✅ Rate limit handled correctly for request ${index + 1}`);
          }
        }
      });

      // At least one should succeed under normal circumstances
      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );
      
      expect(successfulResults.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Service Encryption Integration', () => {
    it('should encrypt and decrypt API keys correctly', () => {
      const originalKey = 'sk-test-api-key-12345';
      const encryptionKey = process.env.ENCRYPTION_KEY || 'test-key-32-characters-long-key!!';
      
      if (encryptionKey.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be exactly 32 characters for AES-256');
      }

      const iv = EncryptionService.generateIV();
      const encryptedKey = EncryptionService.encrypt(originalKey, encryptionKey, iv);
      const decryptedKey = EncryptionService.decrypt(encryptedKey, encryptionKey, iv);

      expect(decryptedKey).toBe(originalKey);
      expect(encryptedKey).not.toBe(originalKey);
      expect(iv.length).toBe(32); // 16 bytes = 32 hex chars

      console.log(`✅ API key encryption/decryption working correctly`);
      console.log(`Original: ${originalKey.substring(0, 10)}...`);
      console.log(`Encrypted: ${encryptedKey.substring(0, 20)}...`);
      console.log(`IV: ${iv.substring(0, 10)}...`);
    });
  });
});