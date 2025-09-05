/**
 * Tests de performance et load testing
 * Phase 4 - Testing & Launch du PRD V2
 * 
 * Ces tests valident la performance du système sous charge et identifient
 * les goulots d'étranglement potentiels
 */

import { PromptEnhancerService } from '../../src/services/prompt-enhancer';
import { ImageGeneratorService } from '../../src/services/image-generator';
import { VideoGeneratorService } from '../../src/services/video-generator';

// Mock external APIs for performance testing
jest.mock('openai');
jest.mock('../../src/services/encryption');

// Mock fetch
global.fetch = jest.fn();

describe('Performance and Load Testing', () => {
  let performanceResults: PerformanceResult[] = [];

  interface PerformanceResult {
    test: string;
    operations: number;
    totalTime: number;
    averageTime: number;
    throughput: number; // operations per second
    memory: {
      used: number;
      peak: number;
    };
    success: boolean;
    errors: string[];
  }

  const measurePerformance = async (
    testName: string,
    operation: () => Promise<void>,
    iterations: number = 10
  ): Promise<PerformanceResult> => {
    const errors: string[] = [];
    let successCount = 0;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const initialMemory = process.memoryUsage();
    const startTime = process.hrtime.bigint();
    
    const promises = Array.from({ length: iterations }, async (_, i) => {
      try {
        await operation();
        successCount++;
      } catch (error) {
        errors.push(`Operation ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    await Promise.all(promises);
    
    const endTime = process.hrtime.bigint();
    const finalMemory = process.memoryUsage();
    
    const totalTimeMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const averageTimeMs = totalTimeMs / iterations;
    const throughput = (successCount / totalTimeMs) * 1000; // ops per second

    const result: PerformanceResult = {
      test: testName,
      operations: iterations,
      totalTime: totalTimeMs,
      averageTime: averageTimeMs,
      throughput,
      memory: {
        used: finalMemory.heapUsed - initialMemory.heapUsed,
        peak: Math.max(finalMemory.heapUsed, initialMemory.heapUsed)
      },
      success: successCount === iterations,
      errors
    };

    performanceResults.push(result);
    return result;
  };

  beforeAll(() => {
    console.log('🚀 Starting performance and load tests...');
    
    // Setup mocks for consistent performance testing
    const mockOpenAI = require('openai');
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockImplementation(() => 
            new Promise(resolve => {
              // Simulate realistic API response time
              setTimeout(() => resolve({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      enhancedPrompt: "Enhanced test prompt with additional details",
                      improvements: ["Added detail", "Improved clarity"],
                      confidence: 0.9,
                      estimatedQuality: "high",
                      tags: ["test"]
                    })
                  }
                }],
                usage: { total_tokens: 100 }
              }), Math.random() * 200 + 100) // 100-300ms
            })
          )
        }
      },
      images: {
        generate: jest.fn().mockImplementation(() =>
          new Promise(resolve => {
            // Simulate DALL-E response time
            setTimeout(() => resolve({
              data: [{
                url: 'https://example.com/generated-image.jpg',
                revised_prompt: 'Enhanced test prompt'
              }]
            }), Math.random() * 1000 + 2000) // 2-3 seconds
          })
        )
      },
      models: {
        list: jest.fn().mockResolvedValue({
          data: [{ id: 'gpt-4o-mini', object: 'model' }]
        })
      }
    }));

    // Mock fetch for uploads
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      return new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
          headers: {
            get: (header: string) => header === 'content-type' ? 'image/jpeg' : null
          }
        }), Math.random() * 100 + 50); // 50-150ms
      });
    });
  });

  afterAll(() => {
    console.log('\n📊 Performance Test Results Summary:');
    console.log('=====================================');
    
    performanceResults.forEach(result => {
      console.log(`\n🔬 ${result.test}:`);
      console.log(`   Operations: ${result.operations}`);
      console.log(`   Total time: ${result.totalTime.toFixed(2)}ms`);
      console.log(`   Average time: ${result.averageTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${result.throughput.toFixed(2)} ops/sec`);
      console.log(`   Memory used: ${(result.memory.used / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Success rate: ${result.success ? '100%' : `${((result.operations - result.errors.length) / result.operations * 100).toFixed(1)}%`}`);
      
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
      }
    });

    // Generate performance report
    const report = {
      timestamp: new Date().toISOString(),
      environment: 'test',
      results: performanceResults,
      summary: {
        totalTests: performanceResults.length,
        totalOperations: performanceResults.reduce((sum, r) => sum + r.operations, 0),
        averageThroughput: performanceResults.reduce((sum, r) => sum + r.throughput, 0) / performanceResults.length,
        successRate: performanceResults.filter(r => r.success).length / performanceResults.length
      }
    };

    require('fs').writeFileSync(
      require('path').join(process.cwd(), 'performance-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Performance report saved to performance-report.json');
  });

  describe('Prompt Enhancement Performance', () => {
    let service: PromptEnhancerService;

    beforeEach(() => {
      service = new PromptEnhancerService('test-key');
    });

    it('should handle high-frequency prompt enhancement requests', async () => {
      const result = await measurePerformance(
        'High-frequency prompt enhancement',
        async () => {
          await service.enhance('A simple test prompt', {
            creativity: 0.7,
            targetAudience: 'general'
          });
        },
        50 // 50 concurrent requests
      );

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(1); // At least 1 op/sec
      expect(result.averageTime).toBeLessThan(5000); // Less than 5 seconds average

      console.log(`✅ Prompt enhancement throughput: ${result.throughput.toFixed(2)} ops/sec`);
    }, 60000);

    it('should maintain performance under sustained load', async () => {
      const result = await measurePerformance(
        'Sustained prompt enhancement load',
        async () => {
          await service.enhance(`Test prompt ${Math.random()}`, {
            creativity: Math.random(),
            targetAudience: 'general'
          });
        },
        100 // 100 requests
      );

      expect(result.success).toBe(true);
      expect(result.memory.used).toBeLessThan(100 * 1024 * 1024); // Less than 100MB

      console.log(`✅ Sustained load memory usage: ${(result.memory.used / 1024 / 1024).toFixed(2)}MB`);
    }, 120000);

    it('should handle burst traffic efficiently', async () => {
      // Simulate burst of requests followed by quiet period
      const burstResults = [];
      
      for (let burst = 0; burst < 3; burst++) {
        const result = await measurePerformance(
          `Burst traffic wave ${burst + 1}`,
          async () => {
            await service.enhance(`Burst prompt ${burst}-${Math.random()}`);
          },
          20 // 20 requests per burst
        );
        
        burstResults.push(result);
        
        // Wait between bursts
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // All bursts should succeed
      burstResults.forEach((result, index) => {
        expect(result.success).toBe(true);
        console.log(`✅ Burst ${index + 1} throughput: ${result.throughput.toFixed(2)} ops/sec`);
      });

      // Performance should be consistent across bursts
      const throughputs = burstResults.map(r => r.throughput);
      const avgThroughput = throughputs.reduce((a, b) => a + b) / throughputs.length;
      const maxDeviation = Math.max(...throughputs.map(t => Math.abs(t - avgThroughput)));
      
      expect(maxDeviation / avgThroughput).toBeLessThan(0.5); // Less than 50% deviation
    }, 90000);
  });

  describe('Image Generation Performance', () => {
    let service: ImageGeneratorService;

    beforeEach(() => {
      service = new ImageGeneratorService('test-key');
    });

    it('should handle concurrent image generation requests', async () => {
      const result = await measurePerformance(
        'Concurrent image generation',
        async () => {
          await service.generate('Test image prompt', {
            model: 'dall-e-3',
            size: '1024x1024',
            quality: 'standard'
          });
        },
        10 // 10 concurrent requests (lower due to longer processing time)
      );

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(10000); // Less than 10 seconds average

      console.log(`✅ Image generation average time: ${result.averageTime.toFixed(2)}ms`);
    }, 60000);

    it('should optimize memory usage during image processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const result = await measurePerformance(
        'Image processing memory test',
        async () => {
          const imageResult = await service.generate('Memory test prompt');
          if (imageResult.success) {
            // Simulate image upload
            await service.uploadToS3(imageResult.imageUrl, {
              generationId: `test-${Math.random()}`
            });
          }
        },
        20
      );

      const memoryIncrease = result.memory.used;
      const memoryIncreasePerOp = memoryIncrease / result.operations;

      expect(memoryIncreasePerOp).toBeLessThan(10 * 1024 * 1024); // Less than 10MB per operation

      console.log(`✅ Memory per image operation: ${(memoryIncreasePerOp / 1024 / 1024).toFixed(2)}MB`);
    }, 90000);
  });

  describe('Video Generation Performance', () => {
    let service: VideoGeneratorService;

    beforeEach(() => {
      service = new VideoGeneratorService('test-key', 'fal-ai');
    });

    it('should handle video job creation efficiently', async () => {
      const result = await measurePerformance(
        'Video job creation',
        async () => {
          await service.generateFromImage('https://example.com/test-image.jpg', {
            duration: 5,
            resolution: '720p',
            motionIntensity: 'medium'
          });
        },
        25
      );

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(2000); // Job creation should be fast

      console.log(`✅ Video job creation time: ${result.averageTime.toFixed(2)}ms`);
    }, 30000);

    it('should calculate costs efficiently at scale', async () => {
      const result = await measurePerformance(
        'Video cost calculations',
        async () => {
          // Test various cost calculations
          const providers: ('fal-ai' | 'veo3' | 'runway' | 'pika')[] = ['fal-ai', 'veo3', 'runway', 'pika'];
          const durations: (5 | 8 | 15 | 30)[] = [5, 8, 15, 30];
          const resolutions: ('720p' | '1080p' | '4k')[] = ['720p', '1080p', '4k'];
          
          providers.forEach(provider => {
            durations.forEach(duration => {
              resolutions.forEach(resolution => {
                service.calculateCost(provider, duration, resolution, Math.random() > 0.5);
              });
            });
          });
        },
        1000 // 1000 iterations of cost calculations
      );

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(10); // Should be very fast

      console.log(`✅ Cost calculation throughput: ${result.throughput.toFixed(0)} calcs/sec`);
    }, 10000);
  });

  describe('Workflow Pipeline Performance', () => {
    it('should handle end-to-end workflow performance', async () => {
      const promptService = new PromptEnhancerService('test-key');
      const imageService = new ImageGeneratorService('test-key');
      const videoService = new VideoGeneratorService('test-key', 'fal-ai');

      const result = await measurePerformance(
        'End-to-end workflow pipeline',
        async () => {
          // Step 1: Enhance prompt
          const enhanceResult = await promptService.enhance('Performance test prompt');
          expect(enhanceResult.success).toBe(true);

          // Step 2: Generate image
          const imageResult = await imageService.generate(enhanceResult.enhancedPrompt);
          expect(imageResult.success).toBe(true);

          // Step 3: Create video job
          const videoResult = await videoService.generateFromImage(imageResult.imageUrl);
          expect(videoResult.success).toBe(true);
        },
        5 // Fewer iterations due to complexity
      );

      expect(result.success).toBe(true);
      expect(result.averageTime).toBeLessThan(15000); // Less than 15 seconds for full pipeline

      console.log(`✅ Full workflow average time: ${(result.averageTime / 1000).toFixed(2)}s`);
    }, 120000);

    it('should maintain consistent performance across workflow types', async () => {
      const promptService = new PromptEnhancerService('test-key');
      const imageService = new ImageGeneratorService('test-key');

      const workflowTypes = [
        { type: 'image-only', steps: 2 },
        { type: 'complete', steps: 3 },
        { type: 'video-from-image', steps: 1 }
      ];

      const performanceByType = [];

      for (const workflow of workflowTypes) {
        const result = await measurePerformance(
          `${workflow.type} workflow`,
          async () => {
            if (workflow.type === 'image-only' || workflow.type === 'complete') {
              const enhanceResult = await promptService.enhance('Test prompt');
              const imageResult = await imageService.generate(enhanceResult.enhancedPrompt);
              expect(imageResult.success).toBe(true);
            }
            
            if (workflow.type === 'video-from-image') {
              const videoService = new VideoGeneratorService('test-key', 'fal-ai');
              const videoResult = await videoService.generateFromImage('https://example.com/test.jpg');
              expect(videoResult.success).toBe(true);
            }
          },
          8 // 8 iterations per workflow type
        );

        performanceByType.push({ ...workflow, performance: result });
        console.log(`✅ ${workflow.type} workflow: ${result.averageTime.toFixed(2)}ms avg`);
      }

      // All workflow types should perform reasonably
      performanceByType.forEach(({ type, performance }) => {
        expect(performance.success).toBe(true);
        expect(performance.averageTime).toBeLessThan(20000);
      });
    }, 180000);
  });

  describe('Resource Management and Limits', () => {
    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by creating large objects
      const largeObjects: Buffer[] = [];
      
      try {
        // Create some memory pressure (but not too much in test environment)
        for (let i = 0; i < 10; i++) {
          largeObjects.push(Buffer.alloc(1024 * 1024)); // 1MB each
        }

        const service = new PromptEnhancerService('test-key');
        
        const result = await measurePerformance(
          'Performance under memory pressure',
          async () => {
            await service.enhance('Memory pressure test prompt');
          },
          20
        );

        expect(result.success).toBe(true);
        expect(result.errors.length).toBe(0);

        console.log(`✅ Performance under memory pressure: ${result.throughput.toFixed(2)} ops/sec`);

      } finally {
        // Cleanup large objects
        largeObjects.length = 0;
        if (global.gc) {
          global.gc();
        }
      }
    }, 60000);

    it('should handle error recovery efficiently', async () => {
      const service = new PromptEnhancerService('test-key');
      
      // Mock to fail 50% of the time
      const mockOpenAI = require('openai');
      const originalCreate = mockOpenAI().chat.completions.create;
      
      mockOpenAI().chat.completions.create.mockImplementation(() => {
        if (Math.random() < 0.5) {
          return Promise.reject(new Error('Simulated API error'));
        }
        return originalCreate();
      });

      const result = await measurePerformance(
        'Error recovery performance',
        async () => {
          try {
            await service.enhance('Error recovery test');
          } catch (error) {
            // Expected - error recovery is part of the test
          }
        },
        50
      );

      // Should handle errors without crashing
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeLessThan(50); // Some should succeed
      
      console.log(`✅ Error recovery: ${result.errors.length}/50 operations failed gracefully`);

      // Restore original mock
      mockOpenAI().chat.completions.create.mockImplementation(originalCreate);
    }, 30000);

    it('should maintain performance with concurrent different operations', async () => {
      const promptService = new PromptEnhancerService('test-key');
      const imageService = new ImageGeneratorService('test-key');
      const videoService = new VideoGeneratorService('test-key', 'fal-ai');

      const startTime = process.hrtime.bigint();
      
      // Run different operations concurrently
      const operations = await Promise.allSettled([
        // 10 prompt enhancements
        ...Array.from({ length: 10 }, () => 
          promptService.enhance(`Concurrent test ${Math.random()}`)
        ),
        // 5 image generations
        ...Array.from({ length: 5 }, () => 
          imageService.generate(`Image test ${Math.random()}`)
        ),
        // 5 video jobs
        ...Array.from({ length: 5 }, () => 
          videoService.generateFromImage('https://example.com/concurrent-test.jpg')
        )
      ]);

      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1000000;

      const successful = operations.filter(op => 
        op.status === 'fulfilled' && 
        (op.value as any).success !== false
      ).length;

      const successRate = successful / operations.length;

      expect(successRate).toBeGreaterThan(0.8); // At least 80% success
      expect(totalTimeMs).toBeLessThan(30000); // Complete within 30 seconds

      console.log(`✅ Concurrent operations: ${successful}/${operations.length} successful in ${(totalTimeMs / 1000).toFixed(2)}s`);
    }, 60000);
  });
});