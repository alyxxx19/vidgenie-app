#!/usr/bin/env npx tsx

/**
 * Script de benchmark de performance
 * Phase 4 - Testing & Launch du PRD V2
 * 
 * Ce script exécute des benchmarks complets du système pour identifier
 * les goulots d'étranglement et valider les performances sous différentes charges
 */

import { PromptEnhancerService } from '../src/services/prompt-enhancer';
import { ImageGeneratorService } from '../src/services/image-generator';
import { VideoGeneratorService } from '../src/services/video-generator';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';

interface BenchmarkConfig {
  name: string;
  description: string;
  iterations: number;
  concurrency: number;
  timeout: number; // milliseconds
  warmup: number; // warmup iterations
}

interface BenchmarkResult {
  config: BenchmarkConfig;
  startTime: number;
  endTime: number;
  totalDuration: number;
  operations: {
    total: number;
    successful: number;
    failed: number;
    timeouts: number;
  };
  performance: {
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number; // ops/sec
    errorRate: number;
  };
  memory: {
    initial: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
    leaked: number; // bytes
  };
  errors: string[];
}

interface SystemMetrics {
  timestamp: number;
  memory: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

class BenchmarkRunner {
  private metrics: SystemMetrics[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;

  private startMetricsCollection(): void {
    this.metrics = [];
    this.metricsInterval = setInterval(() => {
      this.metrics.push({
        timestamp: performance.now(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      });
    }, 100); // Collect every 100ms
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  async runBenchmark(
    config: BenchmarkConfig,
    operation: () => Promise<{ success: boolean; latency: number; error?: string }>
  ): Promise<BenchmarkResult> {
    console.log(`🏁 Starting benchmark: ${config.name}`);
    console.log(`   ${config.description}`);
    console.log(`   Iterations: ${config.iterations}, Concurrency: ${config.concurrency}`);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage();
    let peakMemory = initialMemory;

    // Warmup phase
    if (config.warmup > 0) {
      console.log(`🔥 Warming up with ${config.warmup} operations...`);
      for (let i = 0; i < config.warmup; i++) {
        try {
          await operation();
        } catch (error) {
          // Ignore warmup errors
        }
      }
      
      // Force GC after warmup
      if (global.gc) {
        global.gc();
      }
    }

    // Start metrics collection
    this.startMetricsCollection();

    const results: Array<{ success: boolean; latency: number; error?: string }> = [];
    const errors: string[] = [];
    let successCount = 0;
    let failCount = 0;
    let timeoutCount = 0;

    const startTime = performance.now();

    // Execute operations with concurrency control
    const batches = [];
    for (let i = 0; i < config.iterations; i += config.concurrency) {
      const batchSize = Math.min(config.concurrency, config.iterations - i);
      const batch = Array.from({ length: batchSize }, async () => {
        const operationStart = performance.now();
        
        try {
          const result = await Promise.race([
            operation(),
            new Promise<{ success: boolean; latency: number; error: string }>((_, reject) => 
              setTimeout(() => reject(new Error('Operation timeout')), config.timeout)
            )
          ]);
          
          const latency = performance.now() - operationStart;
          const finalResult = { ...result, latency };
          
          // Track peak memory
          const currentMemory = process.memoryUsage();
          if (currentMemory.heapUsed > peakMemory.heapUsed) {
            peakMemory = currentMemory;
          }
          
          return finalResult;
        } catch (error) {
          const latency = performance.now() - operationStart;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          
          if (errorMsg.includes('timeout')) {
            timeoutCount++;
          } else {
            failCount++;
          }
          
          errors.push(errorMsg);
          return { success: false, latency, error: errorMsg };
        }
      });

      batches.push(batch);
    }

    // Execute all batches sequentially to control concurrency
    for (const batch of batches) {
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      batchResults.forEach(result => {
        if (result.success) {
          successCount++;
        }
      });
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Stop metrics collection
    this.stopMetricsCollection();

    const finalMemory = process.memoryUsage();
    const memoryLeaked = finalMemory.heapUsed - initialMemory.heapUsed;

    // Calculate performance statistics
    const latencies = results.map(r => r.latency).sort((a, b) => a - b);
    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const medianLatency = latencies[Math.floor(latencies.length / 2)];
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
    const p99Latency = latencies[Math.floor(latencies.length * 0.99)];
    const throughput = (successCount / totalDuration) * 1000; // ops/sec
    const errorRate = (failCount + timeoutCount) / config.iterations;

    const benchmarkResult: BenchmarkResult = {
      config,
      startTime,
      endTime,
      totalDuration,
      operations: {
        total: config.iterations,
        successful: successCount,
        failed: failCount,
        timeouts: timeoutCount
      },
      performance: {
        averageLatency,
        medianLatency,
        p95Latency,
        p99Latency,
        throughput,
        errorRate
      },
      memory: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory,
        leaked: memoryLeaked
      },
      errors: errors.slice(0, 10) // Limit to first 10 errors
    };

    this.printBenchmarkResult(benchmarkResult);
    return benchmarkResult;
  }

  private printBenchmarkResult(result: BenchmarkResult): void {
    console.log(`\n📊 Results for: ${result.config.name}`);
    console.log(`   Duration: ${(result.totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Operations: ${result.operations.successful}/${result.operations.total} successful`);
    console.log(`   Throughput: ${result.performance.throughput.toFixed(2)} ops/sec`);
    console.log(`   Average latency: ${result.performance.averageLatency.toFixed(2)}ms`);
    console.log(`   P95 latency: ${result.performance.p95Latency.toFixed(2)}ms`);
    console.log(`   Error rate: ${(result.performance.errorRate * 100).toFixed(1)}%`);
    console.log(`   Memory leaked: ${(result.memory.leaked / 1024 / 1024).toFixed(2)}MB`);
    
    if (result.errors.length > 0) {
      console.log(`   Sample errors: ${result.errors.slice(0, 3).join(', ')}`);
    }
  }

  getSystemMetrics(): SystemMetrics[] {
    return this.metrics;
  }
}

async function setupMockServices(): Promise<void> {
  // Mock OpenAI for consistent benchmarking
  const mockOpenAI = jest.createMockFromModule('openai') as any;
  mockOpenAI.mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockImplementation(() => 
          new Promise(resolve => {
            // Simulate variable response times
            const delay = Math.random() * 300 + 100; // 100-400ms
            setTimeout(() => resolve({
              choices: [{
                message: {
                  content: JSON.stringify({
                    enhancedPrompt: "Benchmark enhanced prompt with realistic content",
                    improvements: ["Performance improvement", "Quality enhancement"],
                    confidence: 0.85,
                    estimatedQuality: "high",
                    tags: ["benchmark", "performance"]
                  })
                }
              }],
              usage: { total_tokens: Math.floor(Math.random() * 200) + 50 }
            }), delay);
          })
        )
      }
    },
    images: {
      generate: jest.fn().mockImplementation(() =>
        new Promise(resolve => {
          // Simulate DALL-E timing variability
          const delay = Math.random() * 2000 + 1500; // 1.5-3.5s
          setTimeout(() => resolve({
            data: [{
              url: `https://example.com/benchmark-image-${Date.now()}.jpg`,
              revised_prompt: 'Benchmark enhanced prompt'
            }]
          }), delay);
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
  global.fetch = jest.fn().mockImplementation(() => 
    new Promise(resolve => {
      const delay = Math.random() * 200 + 50; // 50-250ms
      setTimeout(() => resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(2048)),
        headers: {
          get: (header: string) => header === 'content-type' ? 'image/jpeg' : null
        }
      }), delay);
    })
  );
}

async function runPromptEnhancementBenchmarks(runner: BenchmarkRunner): Promise<BenchmarkResult[]> {
  console.log('\n🚀 Running Prompt Enhancement Benchmarks\n');
  
  const service = new PromptEnhancerService('benchmark-key');
  const results: BenchmarkResult[] = [];

  // Low load test
  results.push(await runner.runBenchmark(
    {
      name: 'Prompt Enhancement - Low Load',
      description: 'Single concurrent requests over time',
      iterations: 50,
      concurrency: 1,
      timeout: 10000,
      warmup: 5
    },
    async () => {
      const start = performance.now();
      const result = await service.enhance(`Benchmark prompt ${Math.random()}`, {
        creativity: Math.random(),
        targetAudience: 'general'
      });
      const latency = performance.now() - start;
      
      return { success: result.success, latency, error: result.error };
    }
  ));

  // Medium load test
  results.push(await runner.runBenchmark(
    {
      name: 'Prompt Enhancement - Medium Load',
      description: 'Multiple concurrent requests',
      iterations: 100,
      concurrency: 5,
      timeout: 15000,
      warmup: 10
    },
    async () => {
      const start = performance.now();
      const result = await service.enhance(`Medium load test ${Math.random()}`, {
        creativity: 0.7,
        targetAudience: 'professional'
      });
      const latency = performance.now() - start;
      
      return { success: result.success, latency, error: result.error };
    }
  ));

  // High load test
  results.push(await runner.runBenchmark(
    {
      name: 'Prompt Enhancement - High Load',
      description: 'High concurrent requests simulating peak traffic',
      iterations: 200,
      concurrency: 10,
      timeout: 20000,
      warmup: 15
    },
    async () => {
      const start = performance.now();
      const result = await service.enhance(`High load test ${Math.random()}`, {
        creativity: Math.random(),
        targetAudience: Math.random() > 0.5 ? 'general' : 'professional',
        contentType: Math.random() > 0.5 ? 'image' : 'video'
      });
      const latency = performance.now() - start;
      
      return { success: result.success, latency, error: result.error };
    }
  ));

  return results;
}

async function runImageGenerationBenchmarks(runner: BenchmarkRunner): Promise<BenchmarkResult[]> {
  console.log('\n🎨 Running Image Generation Benchmarks\n');
  
  const service = new ImageGeneratorService('benchmark-key');
  const results: BenchmarkResult[] = [];

  // Standard quality benchmark
  results.push(await runner.runBenchmark(
    {
      name: 'Image Generation - Standard Quality',
      description: 'DALL-E 3 standard quality image generation',
      iterations: 30,
      concurrency: 3,
      timeout: 30000,
      warmup: 3
    },
    async () => {
      const start = performance.now();
      const result = await service.generate(`Benchmark image ${Math.random()}`, {
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid'
      });
      const latency = performance.now() - start;
      
      return { success: result.success, latency, error: result.error };
    }
  ));

  // HD quality benchmark
  results.push(await runner.runBenchmark(
    {
      name: 'Image Generation - HD Quality',
      description: 'DALL-E 3 HD quality image generation',
      iterations: 20,
      concurrency: 2,
      timeout: 45000,
      warmup: 2
    },
    async () => {
      const start = performance.now();
      const result = await service.generate(`HD benchmark image ${Math.random()}`, {
        model: 'dall-e-3',
        size: '1024x1792',
        quality: 'hd',
        style: 'natural'
      });
      const latency = performance.now() - start;
      
      return { success: result.success, latency, error: result.error };
    }
  ));

  return results;
}

async function runVideoGenerationBenchmarks(runner: BenchmarkRunner): Promise<BenchmarkResult[]> {
  console.log('\n🎬 Running Video Generation Benchmarks\n');
  
  const service = new VideoGeneratorService('benchmark-key', 'fal-ai');
  const results: BenchmarkResult[] = [];

  // Video job creation benchmark
  results.push(await runner.runBenchmark(
    {
      name: 'Video Generation - Job Creation',
      description: 'Video job creation and queueing',
      iterations: 50,
      concurrency: 5,
      timeout: 10000,
      warmup: 5
    },
    async () => {
      const start = performance.now();
      const result = await service.generateFromImage(
        `https://example.com/benchmark-${Math.random()}.jpg`,
        {
          duration: 5,
          resolution: '720p',
          motionIntensity: 'medium'
        }
      );
      const latency = performance.now() - start;
      
      return { success: result.success, latency, error: result.error };
    }
  ));

  // Cost calculation benchmark
  results.push(await runner.runBenchmark(
    {
      name: 'Video Generation - Cost Calculations',
      description: 'High-frequency cost calculations',
      iterations: 10000,
      concurrency: 100,
      timeout: 5000,
      warmup: 100
    },
    async () => {
      const providers: ('fal-ai' | 'veo3' | 'runway' | 'pika')[] = ['fal-ai', 'veo3', 'runway', 'pika'];
      const durations: (5 | 8 | 15 | 30)[] = [5, 8, 15, 30];
      const resolutions: ('720p' | '1080p' | '4k')[] = ['720p', '1080p', '4k'];
      
      const start = performance.now();
      
      // Perform multiple cost calculations
      for (let i = 0; i < 10; i++) {
        const provider = providers[Math.floor(Math.random() * providers.length)];
        const duration = durations[Math.floor(Math.random() * durations.length)];
        const resolution = resolutions[Math.floor(Math.random() * resolutions.length)];
        
        service.calculateCost(provider, duration, resolution, Math.random() > 0.5);
      }
      
      const latency = performance.now() - start;
      
      return { success: true, latency };
    }
  ));

  return results;
}

async function runWorkflowBenchmarks(runner: BenchmarkRunner): Promise<BenchmarkResult[]> {
  console.log('\n⚡ Running End-to-End Workflow Benchmarks\n');
  
  const promptService = new PromptEnhancerService('benchmark-key');
  const imageService = new ImageGeneratorService('benchmark-key');
  const videoService = new VideoGeneratorService('benchmark-key', 'fal-ai');
  const results: BenchmarkResult[] = [];

  // Complete workflow benchmark
  results.push(await runner.runBenchmark(
    {
      name: 'Complete Workflow Pipeline',
      description: 'End-to-end prompt -> image -> video workflow',
      iterations: 10,
      concurrency: 2,
      timeout: 60000,
      warmup: 1
    },
    async () => {
      const start = performance.now();
      
      try {
        // Step 1: Enhance prompt
        const enhanceResult = await promptService.enhance(`Workflow benchmark ${Math.random()}`);
        if (!enhanceResult.success) {
          throw new Error(`Prompt enhancement failed: ${enhanceResult.error}`);
        }
        
        // Step 2: Generate image
        const imageResult = await imageService.generate(enhanceResult.enhancedPrompt);
        if (!imageResult.success) {
          throw new Error(`Image generation failed: ${imageResult.error}`);
        }
        
        // Step 3: Create video job
        const videoResult = await videoService.generateFromImage(imageResult.imageUrl);
        if (!videoResult.success) {
          throw new Error(`Video generation failed: ${videoResult.error}`);
        }
        
        const latency = performance.now() - start;
        return { success: true, latency };
        
      } catch (error) {
        const latency = performance.now() - start;
        return { 
          success: false, 
          latency, 
          error: error instanceof Error ? error.message : 'Unknown workflow error' 
        };
      }
    }
  ));

  return results;
}

async function generateBenchmarkReport(allResults: BenchmarkResult[]): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    },
    summary: {
      totalBenchmarks: allResults.length,
      totalOperations: allResults.reduce((sum, r) => sum + r.operations.total, 0),
      totalSuccessful: allResults.reduce((sum, r) => sum + r.operations.successful, 0),
      averageThroughput: allResults.reduce((sum, r) => sum + r.performance.throughput, 0) / allResults.length,
      overallErrorRate: allResults.reduce((sum, r) => sum + (r.performance.errorRate * r.operations.total), 0) / allResults.reduce((sum, r) => sum + r.operations.total, 0)
    },
    benchmarks: allResults,
    recommendations: generateRecommendations(allResults)
  };

  const reportPath = path.join(process.cwd(), 'benchmark-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n📋 Benchmark Summary');
  console.log('==================');
  console.log(`Total benchmarks: ${report.summary.totalBenchmarks}`);
  console.log(`Total operations: ${report.summary.totalOperations}`);
  console.log(`Success rate: ${((report.summary.totalSuccessful / report.summary.totalOperations) * 100).toFixed(1)}%`);
  console.log(`Average throughput: ${report.summary.averageThroughput.toFixed(2)} ops/sec`);
  console.log(`Overall error rate: ${(report.summary.overallErrorRate * 100).toFixed(2)}%`);
  
  console.log('\n💡 Recommendations:');
  report.recommendations.forEach(rec => {
    console.log(`   ${rec}`);
  });

  console.log(`\n✅ Full benchmark report saved to: ${reportPath}`);
}

function generateRecommendations(results: BenchmarkResult[]): string[] {
  const recommendations: string[] = [];
  
  // Check for high error rates
  const highErrorBenchmarks = results.filter(r => r.performance.errorRate > 0.05);
  if (highErrorBenchmarks.length > 0) {
    recommendations.push(`🔴 High error rates detected in: ${highErrorBenchmarks.map(r => r.config.name).join(', ')}`);
  }
  
  // Check for high latency
  const highLatencyBenchmarks = results.filter(r => r.performance.p95Latency > 10000);
  if (highLatencyBenchmarks.length > 0) {
    recommendations.push(`🟡 High P95 latency (>10s) in: ${highLatencyBenchmarks.map(r => r.config.name).join(', ')}`);
  }
  
  // Check for memory leaks
  const memoryLeakBenchmarks = results.filter(r => r.memory.leaked > 50 * 1024 * 1024); // >50MB
  if (memoryLeakBenchmarks.length > 0) {
    recommendations.push(`🟠 Potential memory leaks in: ${memoryLeakBenchmarks.map(r => r.config.name).join(', ')}`);
  }
  
  // Check for low throughput
  const lowThroughputBenchmarks = results.filter(r => r.performance.throughput < 1 && !r.config.name.includes('Image'));
  if (lowThroughputBenchmarks.length > 0) {
    recommendations.push(`🔵 Low throughput (<1 ops/sec) in: ${lowThroughputBenchmarks.map(r => r.config.name).join(', ')}`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('🟢 All benchmarks performed within acceptable parameters');
  }
  
  // General optimization recommendations
  recommendations.push('💡 Consider implementing Redis caching for frequently requested prompts');
  recommendations.push('💡 Monitor memory usage in production and consider implementing request queuing');
  recommendations.push('💡 Set up performance monitoring and alerting based on these baseline metrics');
  
  return recommendations;
}

async function main(): Promise<void> {
  console.log('🏆 VidGenie Performance Benchmark Suite');
  console.log('=======================================\n');

  const args = process.argv.slice(2);
  const suites = args.length > 0 ? args : ['prompt', 'image', 'video', 'workflow'];

  try {
    // Setup mock services
    await setupMockServices();
    
    const runner = new BenchmarkRunner();
    const allResults: BenchmarkResult[] = [];

    // Run selected benchmark suites
    if (suites.includes('prompt')) {
      const promptResults = await runPromptEnhancementBenchmarks(runner);
      allResults.push(...promptResults);
    }

    if (suites.includes('image')) {
      const imageResults = await runImageGenerationBenchmarks(runner);
      allResults.push(...imageResults);
    }

    if (suites.includes('video')) {
      const videoResults = await runVideoGenerationBenchmarks(runner);
      allResults.push(...videoResults);
    }

    if (suites.includes('workflow')) {
      const workflowResults = await runWorkflowBenchmarks(runner);
      allResults.push(...workflowResults);
    }

    // Generate comprehensive report
    await generateBenchmarkReport(allResults);

  } catch (error) {
    console.error('💥 Benchmark failed:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Benchmark interrupted');
  process.exit(0);
});

// Run benchmarks
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}