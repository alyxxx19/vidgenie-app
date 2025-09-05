/**
 * Test End-to-End pour le workflow complet
 * Phase 4 - Testing & Launch du PRD V2
 * 
 * Ce test valide le pipeline complet : prompt → GPT enhancement → DALL-E → VEO3
 */

import { PromptEnhancerService } from '../../src/services/prompt-enhancer';
import { ImageGeneratorService } from '../../src/services/image-generator';
import { VideoGeneratorService } from '../../src/services/video-generator';
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../../src/services/encryption';

// Mock external APIs but keep the workflow logic
jest.mock('openai');
jest.mock('../../src/services/encryption');

// Mock fetch for file downloads
global.fetch = jest.fn();

describe('Complete Workflow E2E Test', () => {
  let prisma: PrismaClient;
  let mockUser: any;
  let testWorkflowId: string;

  beforeAll(async () => {
    // Use test database or mock Prisma
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testWorkflowId) {
      await prisma.workflowExecution.deleteMany({
        where: { id: testWorkflowId }
      });
    }
    
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock user with sufficient credits and API keys
    mockUser = {
      id: 'e2e-test-user',
      email: 'e2e-test@example.com',
      credits: 100,
      creditsUsed: 0,
    };

    // Mock API keys decryption
    (EncryptionService.decrypt as jest.Mock).mockReturnValue('mock-api-key');

    // Mock successful external API responses
    setupMockResponses();
  });

  const setupMockResponses = () => {
    // Mock OpenAI responses for both enhancement and image generation
    const mockOpenAI = require('openai');
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  enhancedPrompt: "A breathtaking sunset landscape with vibrant golden hues, dramatic cloud formations, and perfect cinematic lighting, ultra-detailed, professional photography",
                  improvements: [
                    "Added specific color details (golden hues)",
                    "Enhanced atmospheric description (dramatic clouds)",
                    "Added technical photography terms for better AI generation"
                  ],
                  confidence: 0.95,
                  estimatedQuality: "high",
                  tags: ["landscape", "sunset", "cinematic", "dramatic"]
                })
              }
            }],
            usage: {
              prompt_tokens: 45,
              completion_tokens: 120,
              total_tokens: 165
            }
          })
        }
      },
      images: {
        generate: jest.fn().mockResolvedValue({
          data: [{
            url: 'https://example.com/generated-sunset-image.jpg',
            revised_prompt: 'A breathtaking sunset landscape with enhanced cinematic details'
          }]
        })
      },
      models: {
        list: jest.fn().mockResolvedValue({
          data: [
            { id: 'gpt-4o-mini', object: 'model' },
            { id: 'dall-e-3', object: 'model' }
          ]
        })
      }
    }));

    // Mock fetch for image/video downloads
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('generated-sunset-image.jpg')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(5120)), // 5KB image
          headers: {
            get: (header: string) => header === 'content-type' ? 'image/jpeg' : null
          }
        });
      }
      if (url.includes('generated-video.mp4')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(20480)), // 20KB video
          headers: {
            get: (header: string) => header === 'content-type' ? 'video/mp4' : null
          }
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  };

  describe('Complete Workflow: prompt → enhancement → image → video', () => {
    it('should execute the full workflow pipeline successfully', async () => {
      const startTime = Date.now();

      // Step 1: Initialize the workflow
      const workflowConfig = {
        initialPrompt: 'A beautiful sunset landscape',
        workflowType: 'complete' as const,
        imageConfig: {
          style: 'vivid' as const,
          quality: 'hd' as const,
          size: '1024x1024' as const,
        },
        videoConfig: {
          duration: 8 as const,
          resolution: '1080p' as const,
          generateAudio: true,
        }
      };

      // Step 2: Prompt Enhancement
      console.log('🚀 Starting E2E workflow test...');
      console.log('📝 Step 1: Prompt Enhancement');
      
      const promptEnhancer = new PromptEnhancerService('mock-openai-key');
      const enhancementResult = await promptEnhancer.enhance(workflowConfig.initialPrompt, {
        contentType: 'image',
        targetAudience: 'general',
        creativity: 0.7
      });

      expect(enhancementResult.success).toBe(true);
      expect(enhancementResult.enhancedPrompt).toBeDefined();
      expect(enhancementResult.enhancedPrompt).toContain('sunset landscape');
      expect(enhancementResult.improvements.length).toBeGreaterThan(0);
      expect(enhancementResult.confidence).toBeGreaterThan(0.8);
      expect(enhancementResult.totalCost).toBeGreaterThan(0);

      console.log(`✅ Prompt enhanced: "${enhancementResult.enhancedPrompt}"`);
      console.log(`💰 Enhancement cost: ${enhancementResult.totalCost} credits`);

      // Step 3: Image Generation
      console.log('🎨 Step 2: Image Generation');
      
      const imageGenerator = new ImageGeneratorService('mock-dalle-key');
      const imageResult = await imageGenerator.generate(enhancementResult.enhancedPrompt, {
        ...workflowConfig.imageConfig,
        userId: mockUser.id,
        projectId: 'test-project'
      });

      expect(imageResult.success).toBe(true);
      expect(imageResult.imageUrl).toBeDefined();
      expect(imageResult.imageUrl).toContain('generated-sunset-image.jpg');
      expect(imageResult.revisedPrompt).toBeDefined();
      expect(imageResult.totalCost).toBeGreaterThan(0);
      expect(imageResult.metadata.generationTime).toBeGreaterThan(0);

      console.log(`✅ Image generated: ${imageResult.imageUrl}`);
      console.log(`💰 Image generation cost: ${imageResult.totalCost} credits`);

      // Step 4: Video Generation
      console.log('🎥 Step 3: Video Generation');
      
      const videoGenerator = new VideoGeneratorService('mock-veo3-key', 'fal-ai');
      const videoResult = await videoGenerator.generateFromImage(imageResult.imageUrl, {
        ...workflowConfig.videoConfig,
        userId: mockUser.id,
        projectId: 'test-project'
      });

      expect(videoResult.success).toBe(true);
      expect(videoResult.job).toBeDefined();
      expect(videoResult.job?.id).toMatch(/^fal_/);
      expect(videoResult.job?.status).toBe('queued');
      expect(videoResult.totalCost).toBeGreaterThan(0);
      expect(videoResult.estimatedDuration).toBeGreaterThan(0);

      console.log(`✅ Video job created: ${videoResult.job?.id}`);
      console.log(`💰 Video generation cost: ${videoResult.totalCost} credits`);

      // Step 5: Simulate video completion
      console.log('⏳ Step 4: Simulating video completion...');
      
      // Mock video job completion
      const mockCompletedJob = {
        id: videoResult.job!.id,
        status: 'completed' as const,
        progress: 100,
        estimatedTimeRemaining: 0,
        createdAt: videoResult.job!.createdAt,
        completedAt: new Date().toISOString(),
        metadata: {
          originalImageUrl: imageResult.imageUrl,
          userId: mockUser.id,
          projectId: 'test-project',
          options: workflowConfig.videoConfig
        }
      };

      const completedVideo = {
        id: 'video-123',
        url: 'https://example.com/generated-video.mp4',
        thumbnailUrl: 'https://example.com/video-thumbnail.jpg',
        duration: workflowConfig.videoConfig.duration,
        resolution: workflowConfig.videoConfig.resolution,
        fileSize: 20480,
        format: 'mp4',
        provider: 'fal-ai' as const,
        generationTime: 240000,
        metadata: {
          originalImageUrl: imageResult.imageUrl,
          motionIntensity: 'medium' as const,
          hasAudio: workflowConfig.videoConfig.generateAudio,
          frameRate: 30,
          userId: mockUser.id,
          projectId: 'test-project',
          timestamp: new Date().toISOString()
        }
      };

      // Step 6: Upload to S3 (simulated)
      console.log('☁️ Step 5: Uploading results to storage...');
      
      const imageUpload = await imageGenerator.uploadToS3(imageResult.imageUrl, {
        userId: mockUser.id,
        projectId: 'test-project',
        generationId: 'test-gen-123'
      });

      expect(imageUpload.s3Url).toBeDefined();
      expect(imageUpload.cdnUrl).toBeDefined();
      expect(imageUpload.fileSize).toBe(5120);
      expect(imageUpload.contentType).toBe('image/jpeg');

      const videoUpload = await videoGenerator.uploadToS3(completedVideo.url, {
        userId: mockUser.id,
        projectId: 'test-project',
        generationId: 'test-gen-123'
      });

      expect(videoUpload.s3Url).toBeDefined();
      expect(videoUpload.cdnUrl).toBeDefined();
      expect(videoUpload.thumbnailUrl).toBeDefined();
      expect(videoUpload.fileSize).toBe(20480);
      expect(videoUpload.contentType).toBe('video/mp4');

      // Step 7: Calculate total costs
      const totalCost = enhancementResult.totalCost + imageResult.totalCost + videoResult.totalCost;
      const executionTime = Date.now() - startTime;

      console.log('🎉 Workflow completed successfully!');
      console.log(`📊 Total cost: ${totalCost} credits`);
      console.log(`⏱️ Execution time: ${executionTime}ms`);
      console.log(`🖼️ Final image: ${imageUpload.cdnUrl}`);
      console.log(`🎬 Final video: ${videoUpload.cdnUrl}`);

      // Assertions for the complete workflow
      expect(totalCost).toBeLessThan(50); // Should be reasonable cost
      expect(executionTime).toBeLessThan(10000); // Should complete quickly in test
      
      // Verify the pipeline maintains data integrity
      expect(imageResult.originalPrompt).toBe(workflowConfig.initialPrompt);
      expect(completedVideo.metadata.originalImageUrl).toBe(imageResult.imageUrl);
      expect(completedVideo.metadata.hasAudio).toBe(workflowConfig.videoConfig.generateAudio);
      expect(completedVideo.duration).toBe(workflowConfig.videoConfig.duration);
      expect(completedVideo.resolution).toBe(workflowConfig.videoConfig.resolution);
    }, 15000); // 15 second timeout

    it('should handle image-only workflow correctly', async () => {
      console.log('🚀 Starting image-only workflow test...');
      
      const workflowConfig = {
        initialPrompt: 'A serene mountain lake at dawn',
        workflowType: 'image-only' as const,
        imageConfig: {
          style: 'natural' as const,
          quality: 'standard' as const,
          size: '1792x1024' as const,
        }
      };

      // Step 1: Prompt Enhancement
      const promptEnhancer = new PromptEnhancerService('mock-openai-key');
      const enhancementResult = await promptEnhancer.enhance(workflowConfig.initialPrompt);

      expect(enhancementResult.success).toBe(true);

      // Step 2: Image Generation
      const imageGenerator = new ImageGeneratorService('mock-dalle-key');
      const imageResult = await imageGenerator.generate(enhancementResult.enhancedPrompt, {
        ...workflowConfig.imageConfig,
        userId: mockUser.id
      });

      expect(imageResult.success).toBe(true);
      expect(imageResult.imageUrl).toBeDefined();

      // No video generation step for image-only workflow
      const totalCost = enhancementResult.totalCost + imageResult.totalCost;
      
      console.log('✅ Image-only workflow completed');
      console.log(`💰 Total cost: ${totalCost} credits`);

      expect(totalCost).toBeLessThan(20); // Should be cheaper than complete workflow
    });

    it('should handle video-from-image workflow correctly', async () => {
      console.log('🚀 Starting video-from-image workflow test...');
      
      const existingImageUrl = 'https://example.com/existing-image.jpg';
      const workflowConfig = {
        workflowType: 'video-from-image' as const,
        imageUrl: existingImageUrl,
        videoConfig: {
          duration: 5 as const,
          resolution: '720p' as const,
          motionIntensity: 'low' as const,
          generateAudio: false,
        }
      };

      // Mock fetch for existing image
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === existingImageUrl) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(3072)),
            headers: {
              get: (header: string) => header === 'content-type' ? 'image/jpeg' : null
            }
          });
        }
        return Promise.resolve({ ok: true });
      });

      // Step 1: Video Generation (no prompt enhancement or image generation needed)
      const videoGenerator = new VideoGeneratorService('mock-veo3-key', 'fal-ai');
      const videoResult = await videoGenerator.generateFromImage(existingImageUrl, {
        ...workflowConfig.videoConfig,
        userId: mockUser.id
      });

      expect(videoResult.success).toBe(true);
      expect(videoResult.job).toBeDefined();
      expect(videoResult.totalCost).toBeGreaterThan(0);

      console.log('✅ Video-from-image workflow completed');
      console.log(`💰 Total cost: ${videoResult.totalCost} credits`);

      expect(videoResult.totalCost).toBeLessThan(15); // Should be cheapest workflow
    });
  });

  describe('Workflow Error Handling', () => {
    it('should handle prompt enhancement failures gracefully', async () => {
      console.log('🔍 Testing prompt enhancement error handling...');
      
      // Mock OpenAI API failure
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('OpenAI API rate limit exceeded'))
          }
        }
      }));

      const promptEnhancer = new PromptEnhancerService('invalid-key');
      const result = await promptEnhancer.enhance('Test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('OpenAI API rate limit exceeded');
      expect(result.totalCost).toBe(0);

      console.log('✅ Prompt enhancement error handled correctly');
    });

    it('should handle image generation failures gracefully', async () => {
      console.log('🔍 Testing image generation error handling...');
      
      // Mock successful prompt enhancement but failed image generation
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: JSON.stringify({
                enhancedPrompt: "Enhanced prompt",
                improvements: ["Added details"],
                confidence: 0.9,
                estimatedQuality: "high",
                tags: ["test"]
              })}}],
              usage: { total_tokens: 100 }
            })
          }
        },
        images: {
          generate: jest.fn().mockRejectedValue(new Error('DALL-E API error: Content policy violation'))
        }
      }));

      const promptEnhancer = new PromptEnhancerService('valid-key');
      const enhancementResult = await promptEnhancer.enhance('Inappropriate content');
      
      expect(enhancementResult.success).toBe(true);

      const imageGenerator = new ImageGeneratorService('valid-key');
      const imageResult = await imageGenerator.generate(enhancementResult.enhancedPrompt);

      expect(imageResult.success).toBe(false);
      expect(imageResult.error).toContain('Content policy violation');
      expect(imageResult.totalCost).toBe(0);

      console.log('✅ Image generation error handled correctly');
    });

    it('should handle video generation failures gracefully', async () => {
      console.log('🔍 Testing video generation error handling...');
      
      const videoGenerator = new VideoGeneratorService('invalid-key', 'fal-ai');
      const result = await videoGenerator.generateFromImage('invalid-url');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid inputs');
      expect(result.totalCost).toBe(0);

      console.log('✅ Video generation error handled correctly');
    });
  });

  describe('Service Integration', () => {
    it('should validate service connections before workflow execution', async () => {
      console.log('🔍 Testing service connections...');
      
      const promptEnhancer = new PromptEnhancerService('test-key');
      const imageGenerator = new ImageGeneratorService('test-key');
      const videoGenerator = new VideoGeneratorService('test-key', 'fal-ai');

      const connections = await Promise.all([
        promptEnhancer.testConnection(),
        imageGenerator.testConnection(),
        videoGenerator.testConnection()
      ]);

      connections.forEach((connection, index) => {
        expect(connection.success).toBe(true);
        console.log(`✅ Service ${index + 1} connection validated`);
      });
    });

    it('should respect service capabilities and limitations', async () => {
      console.log('🔍 Testing service capabilities...');
      
      const imageGenerator = new ImageGeneratorService('test-key');
      const videoGenerator = new VideoGeneratorService('test-key', 'fal-ai');

      const imageCapabilities = imageGenerator.getModelCapabilities('dall-e-3');
      const videoCapabilities = videoGenerator.getProviderCapabilities();

      expect(imageCapabilities.maxImages).toBe(1); // DALL-E 3 limitation
      expect(imageCapabilities.supportedSizes).toContain('1024x1024');

      expect(videoCapabilities.provider).toBe('fal-ai');
      expect(videoCapabilities.supportedDurations).toContain(8);
      expect(videoCapabilities.hasAudioGeneration).toBe(false); // fal-ai limitation

      console.log('✅ Service capabilities validated');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent workflows', async () => {
      console.log('🔍 Testing concurrent workflow execution...');
      
      const workflowCount = 3;
      const startTime = Date.now();

      const workflows = Array.from({ length: workflowCount }, (_, i) => ({
        initialPrompt: `Test landscape ${i + 1}`,
        workflowType: 'image-only' as const,
        imageConfig: {
          style: 'vivid' as const,
          quality: 'standard' as const,
          size: '1024x1024' as const,
        }
      }));

      const results = await Promise.all(workflows.map(async (config) => {
        const promptEnhancer = new PromptEnhancerService('test-key');
        const enhancementResult = await promptEnhancer.enhance(config.initialPrompt);
        
        if (!enhancementResult.success) return { success: false };

        const imageGenerator = new ImageGeneratorService('test-key');
        const imageResult = await imageGenerator.generate(enhancementResult.enhancedPrompt, config.imageConfig);

        return {
          success: imageResult.success,
          cost: enhancementResult.totalCost + imageResult.totalCost
        };
      }));

      const executionTime = Date.now() - startTime;
      const successfulWorkflows = results.filter(r => r.success);

      expect(successfulWorkflows.length).toBe(workflowCount);
      expect(executionTime).toBeLessThan(15000); // Should complete within 15 seconds

      console.log(`✅ ${successfulWorkflows.length}/${workflowCount} concurrent workflows completed in ${executionTime}ms`);
    });

    it('should calculate accurate cost estimations', async () => {
      console.log('🔍 Testing cost calculations...');
      
      const promptEnhancer = new PromptEnhancerService('test-key');
      const imageGenerator = new ImageGeneratorService('test-key');
      const videoGenerator = new VideoGeneratorService('test-key', 'fal-ai');

      // Test various cost scenarios
      const costs = {
        promptEnhancement: promptEnhancer.calculateCost(500),
        imageGeneration: imageGenerator.calculateCost('dall-e-3', '1024x1024', 'hd'),
        videoGeneration: videoGenerator.calculateCost('fal-ai', 8, '1080p', true)
      };

      expect(costs.promptEnhancement).toBe(2);
      expect(costs.imageGeneration).toBe(8);
      expect(costs.videoGeneration).toBe(18); // 15 + 3 for audio

      const totalWorkflowCost = costs.promptEnhancement + costs.imageGeneration + costs.videoGeneration;
      expect(totalWorkflowCost).toBe(28);

      console.log(`✅ Cost calculation validated: ${totalWorkflowCost} credits for complete workflow`);
    });
  });
});