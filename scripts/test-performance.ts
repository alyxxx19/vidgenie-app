#!/usr/bin/env npx tsx

/**
 * Test de performance pour les timeouts et la gestion des erreurs
 */

import { promises as fs } from 'fs';
import { performance } from 'perf_hooks';

interface PerformanceTestResult {
  test: string;
  success: boolean;
  duration: number;
  error?: string;
  metrics?: Record<string, number>;
}

async function measureBuildTime(): Promise<PerformanceTestResult> {
  console.log('⏱️  Testing build performance...');
  const start = performance.now();
  
  try {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'pipe',
        env: {
          ...process.env,
          DATABASE_URL: "prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19zUnEyX1J4dGlRazBiZUJreGpqNjMiLCJhcGlfa2V5IjoiMDFLNDVYUktTQ1dRRDNYOVM0V05GTkVSWjciLCJ0ZW5hbnRfaWQiOiJlMzVjMjgxNTFhZTM3ZmQ2NjcyZDJmNzE5NDNhMjVkZThiZTRkZjg3MGFlMTE1MjI5ODc0NDQ4NzZjZTg2ZjFiIiwiaW50ZXJuYWxfc2VjcmV0IjoiMWYxMmZkOWUtMTVlMy00MzI5LWI0YjctZjU5ZmFlMDY2MjhlIn0.G4DayjDs6sZBj4Uj09v8cCkcaVgm06pkCo4qktQ6ucg",
          ENCRYPTION_KEY: "vidgenie2024encryptkey32charskey"
        }
      });

      buildProcess.on('close', (code) => {
        const end = performance.now();
        const duration = end - start;
        
        if (code === 0) {
          resolve({
            test: 'build-performance',
            success: true,
            duration,
            metrics: {
              buildTimeMs: duration,
              buildTimeSec: duration / 1000
            }
          });
        } else {
          resolve({
            test: 'build-performance',
            success: false,
            duration,
            error: `Build failed with code ${code}`
          });
        }
      });

      // Timeout après 2 minutes
      setTimeout(() => {
        buildProcess.kill();
        const end = performance.now();
        resolve({
          test: 'build-performance',
          success: false,
          duration: end - start,
          error: 'Build timeout after 2 minutes'
        });
      }, 120000);
    });
  } catch (error) {
    const end = performance.now();
    return {
      test: 'build-performance',
      success: false,
      duration: end - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function measureFileLoadTimes(): Promise<PerformanceTestResult> {
  console.log('📁 Testing file load performance...');
  const start = performance.now();
  
  try {
    const criticalFiles = [
      'src/app/create/page.tsx',
      'src/components/workflow/store/workflow-store.ts',
      'src/inngest/workflow-executor.ts',
      'src/app/api/workflow/[id]/stream/route.ts'
    ];

    const loadTimes: Record<string, number> = {};
    
    for (const file of criticalFiles) {
      const fileStart = performance.now();
      await fs.readFile(file, 'utf8');
      const fileEnd = performance.now();
      loadTimes[file] = fileEnd - fileStart;
    }

    const end = performance.now();
    const totalDuration = end - start;
    
    // Vérifier qu'aucun fichier ne prend plus de 100ms à charger
    const slowFiles = Object.entries(loadTimes).filter(([_, time]) => time > 100);
    
    return {
      test: 'file-load-performance',
      success: slowFiles.length === 0,
      duration: totalDuration,
      error: slowFiles.length > 0 ? `Slow files detected: ${slowFiles.map(([f]) => f).join(', ')}` : undefined,
      metrics: {
        totalLoadTime: totalDuration,
        averageFileTime: totalDuration / criticalFiles.length,
        ...loadTimes
      }
    };
  } catch (error) {
    const end = performance.now();
    return {
      test: 'file-load-performance',
      success: false,
      duration: end - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testTimeoutHandling(): Promise<PerformanceTestResult> {
  console.log('⏰ Testing timeout handling...');
  const start = performance.now();
  
  try {
    // Simuler des timeouts comme dans les workers Inngest
    const timeoutTests = [
      // Test 1: Timeout court (doit réussir)
      new Promise(resolve => setTimeout(() => resolve('success'), 100)),
      
      // Test 2: Timeout long (doit être géré)
      Promise.race([
        new Promise(resolve => setTimeout(() => resolve('success'), 2000)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
      ]),
      
      // Test 3: Gestion d'erreur
      new Promise((_, reject) => setTimeout(() => reject(new Error('Test error')), 50))
    ];

    const results = await Promise.allSettled(timeoutTests);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const expectedSuccessCount = 1; // Seul le premier doit réussir
    
    const end = performance.now();
    
    return {
      test: 'timeout-handling',
      success: successCount === expectedSuccessCount,
      duration: end - start,
      metrics: {
        totalTests: results.length,
        successfulTests: successCount,
        failedTests: results.length - successCount
      }
    };
  } catch (error) {
    const end = performance.now();
    return {
      test: 'timeout-handling',
      success: false,
      duration: end - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testMemoryUsage(): Promise<PerformanceTestResult> {
  console.log('💾 Testing memory usage...');
  const start = performance.now();
  
  try {
    const memBefore = process.memoryUsage();
    
    // Simuler un workflow avec beaucoup de données
    const largeData = [];
    for (let i = 0; i < 10000; i++) {
      largeData.push({
        id: `node-${i}`,
        type: 'workflow-node',
        data: {
          prompt: `Test prompt ${i}`.repeat(10),
          output: {
            imageUrl: `https://example.com/image-${i}.jpg`,
            metadata: { generated: true, size: 1024 * 1024 }
          }
        }
      });
    }
    
    const memAfter = process.memoryUsage();
    
    // Nettoyer
    largeData.length = 0;
    
    // Forcer le garbage collector si disponible
    if (global.gc) {
      global.gc();
    }
    
    const memFinal = process.memoryUsage();
    
    const end = performance.now();
    
    const memoryIncrease = memAfter.heapUsed - memBefore.heapUsed;
    const memoryFreed = memAfter.heapUsed - memFinal.heapUsed;
    
    // Vérifier que l'augmentation mémoire reste raisonnable (< 100MB)
    const memoryIncreaseReasonable = memoryIncrease < 100 * 1024 * 1024;
    
    return {
      test: 'memory-usage',
      success: memoryIncreaseReasonable,
      duration: end - start,
      error: !memoryIncreaseReasonable ? `Memory increase too high: ${Math.round(memoryIncrease / 1024 / 1024)}MB` : undefined,
      metrics: {
        memoryIncreaseMB: Math.round(memoryIncrease / 1024 / 1024),
        memoryFreedMB: Math.round(memoryFreed / 1024 / 1024),
        heapUsedBefore: Math.round(memBefore.heapUsed / 1024 / 1024),
        heapUsedAfter: Math.round(memAfter.heapUsed / 1024 / 1024),
        heapUsedFinal: Math.round(memFinal.heapUsed / 1024 / 1024)
      }
    };
  } catch (error) {
    const end = performance.now();
    return {
      test: 'memory-usage',
      success: false,
      duration: end - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function runPerformanceTests(): Promise<void> {
  console.log('🚀 Starting Performance & Timeout Tests...\n');
  
  const tests = [
    measureFileLoadTimes,
    testTimeoutHandling,
    testMemoryUsage,
    measureBuildTime // Le plus long en dernier
  ];
  
  const results: PerformanceTestResult[] = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.test}: PASS (${Math.round(result.duration)}ms)`);
      } else {
        console.log(`❌ ${result.test}: FAIL (${Math.round(result.duration)}ms) - ${result.error}`);
      }
      
      if (result.metrics) {
        Object.entries(result.metrics).forEach(([key, value]) => {
          console.log(`   📊 ${key}: ${typeof value === 'number' ? Math.round(value * 100) / 100 : value}`);
        });
      }
      
      console.log(''); // ligne vide
    } catch (error) {
      console.log(`💥 Test failed: ${error}`);
    }
  }
  
  // Résumé final
  console.log('📊 Performance Test Results Summary:');
  console.log('═'.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = `${Math.round(result.duration)}ms`;
    const error = result.error ? ` - ${result.error}` : '';
    console.log(`${status} ${result.test} (${duration})${error}`);
  });
  
  console.log('═'.repeat(60));
  console.log(`Total: ${successCount}/${totalTests} tests passed`);
  console.log(`Total duration: ${Math.round(totalDuration)}ms (${Math.round(totalDuration / 1000)}s)`);
  
  if (successCount === totalTests) {
    console.log('🎉 All performance tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some performance tests failed. Please review the results above.');
    process.exit(1);
  }
}

// Exécuter les tests
runPerformanceTests().catch(error => {
  console.error('💥 Performance test execution failed:', error);
  process.exit(1);
});