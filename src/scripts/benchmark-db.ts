/**
 * Script de benchmark pour valider les optimisations de base de données
 * PHASE 4 - Optimisation base de données et backend
 */

import { PrismaClient } from '@prisma/client';
import { createOptimizedQueries } from '@/lib/db/optimized-queries';
import { checkDatabaseHealth, getPerformanceStats } from '@/lib/db/performance-monitor';

const prisma = new PrismaClient();

interface BenchmarkResult {
  name: string;
  executionTime: number;
  recordsReturned: number;
  success: boolean;
  error?: string;
}

/**
 * Benchmark des requêtes optimisées vs non-optimisées
 */
async function benchmarkQueries(userId: string): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const optimizedQueries = createOptimizedQueries(prisma);

  // 1. Assets list - Version non-optimisée
  try {
    const start = Date.now();
    const assetsUnoptimized = await prisma.asset.findMany({
      where: { userId },
      include: {
        project: true,
        posts: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    results.push({
      name: 'Assets List (Unoptimized)',
      executionTime: Date.now() - start,
      recordsReturned: assetsUnoptimized.length,
      success: true,
    });
  } catch (error) {
    results.push({
      name: 'Assets List (Unoptimized)',
      executionTime: 0,
      recordsReturned: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 2. Assets list - Version optimisée
  try {
    const start = Date.now();
    const assetsOptimized = await optimizedQueries.getUserAssets(userId, { limit: 20 });
    
    results.push({
      name: 'Assets List (Optimized)',
      executionTime: Date.now() - start,
      recordsReturned: assetsOptimized.data.length,
      success: true,
    });
  } catch (error) {
    results.push({
      name: 'Assets List (Optimized)',
      executionTime: 0,
      recordsReturned: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 3. Dashboard analytics - Version non-optimisée
  try {
    const start = Date.now();
    const [assets, jobs, credits] = await Promise.all([
      prisma.asset.findMany({ where: { userId }, take: 100 }),
      prisma.job.findMany({ where: { userId }, take: 50 }),
      prisma.creditTransaction.findMany({ where: { userId }, take: 50 }),
    ]);
    
    results.push({
      name: 'Dashboard Data (Unoptimized)',
      executionTime: Date.now() - start,
      recordsReturned: assets.length + jobs.length + credits.length,
      success: true,
    });
  } catch (error) {
    results.push({
      name: 'Dashboard Data (Unoptimized)',
      executionTime: 0,
      recordsReturned: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 4. Dashboard analytics - Version optimisée
  try {
    const start = Date.now();
    const analytics = await optimizedQueries.getDashboardAnalytics(userId, 30);
    
    results.push({
      name: 'Dashboard Data (Optimized)',
      executionTime: Date.now() - start,
      recordsReturned: 1, // Un objet avec toutes les stats
      success: true,
    });
  } catch (error) {
    results.push({
      name: 'Dashboard Data (Optimized)',
      executionTime: 0,
      recordsReturned: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 5. Credit history - Pagination optimisée
  try {
    const start = Date.now();
    const creditHistory = await optimizedQueries.getUserCreditHistory(userId, { limit: 50 });
    
    results.push({
      name: 'Credit History (Optimized Pagination)',
      executionTime: Date.now() - start,
      recordsReturned: creditHistory.data.length,
      success: true,
    });
  } catch (error) {
    results.push({
      name: 'Credit History (Optimized Pagination)',
      executionTime: 0,
      recordsReturned: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 6. Main feed - Version optimisée
  try {
    const start = Date.now();
    const feed = await optimizedQueries.getMainFeed(userId, { limit: 20 });
    
    results.push({
      name: 'Main Feed (Optimized)',
      executionTime: Date.now() - start,
      recordsReturned: feed.data.length,
      success: true,
    });
  } catch (error) {
    results.push({
      name: 'Main Feed (Optimized)',
      executionTime: 0,
      recordsReturned: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * Benchmark des index de base de données
 */
async function benchmarkIndexes(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  // Test des requêtes qui utilisent les nouveaux index
  const testQueries = [
    {
      name: 'User lookup by email (unique index)',
      query: () => prisma.user.findUnique({ where: { email: 'test@example.com' } }),
    },
    {
      name: 'Assets by userId and status (composite index)',
      query: () => prisma.asset.findMany({ 
        where: { userId: 'test', status: 'completed' },
        take: 10 
      }),
    },
    {
      name: 'Jobs by status and priority (composite index)',
      query: () => prisma.job.findMany({ 
        where: { status: 'pending' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 10 
      }),
    },
    {
      name: 'Generation jobs by status and kind (composite index)',
      query: () => prisma.generationJob.findMany({ 
        where: { status: 'RUNNING', kind: 'IMAGE' },
        take: 10 
      }),
    },
    {
      name: 'Credit transactions by user and date (composite index)',
      query: () => prisma.creditTransaction.findMany({ 
        where: { 
          userId: 'test',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        take: 50 
      }),
    },
  ];

  for (const test of testQueries) {
    try {
      const start = Date.now();
      const result = await test.query();
      const executionTime = Date.now() - start;
      
      results.push({
        name: test.name,
        executionTime,
        recordsReturned: Array.isArray(result) ? result.length : (result ? 1 : 0),
        success: true,
      });
    } catch (error) {
      results.push({
        name: test.name,
        executionTime: 0,
        recordsReturned: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Fonction principale du benchmark
 */
async function runBenchmark() {
  console.log('🚀 Starting Database Optimization Benchmark...\n');
  
  try {
    // 1. Santé de la base de données
    console.log('📊 Checking database health...');
    const health = await checkDatabaseHealth(prisma);
    console.log('Database Health:', JSON.stringify(health, null, 2));
    console.log('');

    // 2. Trouver un utilisateur de test ou en créer un
    let testUser = await prisma.user.findFirst();
    if (!testUser) {
      console.log('⚠️  No users found, creating test user...');
      testUser = await prisma.user.create({
        data: {
          email: `benchmark-${Date.now()}@test.com`,
          name: 'Benchmark Test User',
          credits: 1000,
        },
      });
    }

    console.log(`📝 Using test user: ${testUser.email} (${testUser.id})\n`);

    // 3. Benchmark des requêtes optimisées
    console.log('🔍 Running query optimization benchmarks...');
    const queryResults = await benchmarkQueries(testUser.id);
    
    console.log('\n📈 Query Benchmark Results:');
    console.log('╭─────────────────────────────────────────┬──────────────┬─────────────╮');
    console.log('│ Query Name                              │ Time (ms)    │ Records     │');
    console.log('├─────────────────────────────────────────┼──────────────┼─────────────┤');
    
    queryResults.forEach(result => {
      const name = result.name.padEnd(39);
      const time = result.success ? result.executionTime.toString().padStart(10) : 'FAILED'.padStart(10);
      const records = result.success ? result.recordsReturned.toString().padStart(9) : 'N/A'.padStart(9);
      
      console.log(`│ ${name} │ ${time}    │ ${records}   │`);
      
      if (!result.success && result.error) {
        console.log(`│   ❌ Error: ${result.error.substring(0, 60)}... │              │             │`);
      }
    });
    
    console.log('╰─────────────────────────────────────────┴──────────────┴─────────────╯\n');

    // 4. Benchmark des index
    console.log('🗂️  Running index optimization benchmarks...');
    const indexResults = await benchmarkIndexes();
    
    console.log('\n📊 Index Benchmark Results:');
    console.log('╭─────────────────────────────────────────┬──────────────┬─────────────╮');
    console.log('│ Index Test Name                         │ Time (ms)    │ Records     │');
    console.log('├─────────────────────────────────────────┼──────────────┼─────────────┤');
    
    indexResults.forEach(result => {
      const name = result.name.padEnd(39);
      const time = result.success ? result.executionTime.toString().padStart(10) : 'FAILED'.padStart(10);
      const records = result.success ? result.recordsReturned.toString().padStart(9) : 'N/A'.padStart(9);
      
      console.log(`│ ${name} │ ${time}    │ ${records}   │`);
    });
    
    console.log('╰─────────────────────────────────────────┴──────────────┴─────────────╯\n');

    // 5. Analyse des résultats
    console.log('📋 Benchmark Summary:');
    const allResults = [...queryResults, ...indexResults];
    const successCount = allResults.filter(r => r.success).length;
    const totalTime = allResults.filter(r => r.success).reduce((sum, r) => sum + r.executionTime, 0);
    const avgTime = totalTime / successCount;
    
    console.log(`   ✅ Successful queries: ${successCount}/${allResults.length}`);
    console.log(`   ⏱️  Average execution time: ${Math.round(avgTime)}ms`);
    console.log(`   🚀 Total benchmark time: ${totalTime}ms`);

    // Recommandations
    console.log('\n💡 Recommendations:');
    const slowQueries = allResults.filter(r => r.success && r.executionTime > 100);
    if (slowQueries.length > 0) {
      console.log(`   ⚠️  ${slowQueries.length} queries took over 100ms - consider further optimization`);
      slowQueries.forEach(q => {
        console.log(`      - ${q.name}: ${q.executionTime}ms`);
      });
    } else {
      console.log('   🎉 All queries performed well (under 100ms)');
    }

    const failedQueries = allResults.filter(r => !r.success);
    if (failedQueries.length > 0) {
      console.log(`   ❌ ${failedQueries.length} queries failed - investigate errors`);
    }

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n✨ Benchmark completed!');
  }
}

// Exécuter le benchmark si appelé directement
if (require.main === module) {
  runBenchmark().catch(console.error);
}

export { runBenchmark, benchmarkQueries, benchmarkIndexes };