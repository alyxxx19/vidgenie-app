import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { db } from '@/server/api/db';
import { getWorkflowOrchestrator } from '@/lib/services/workflow-orchestrator';
import { secureLog } from '@/lib/secure-logger';

export async function GET(request: NextRequest) {
  try {
    // Authentification (optionnelle pour health check)
    const user = await getServerUser(request);
    
    // Test de connectivité des APIs
    const orchestrator = getWorkflowOrchestrator(db);
    const apiTests = await orchestrator.testAPIs();
    
    // Statistiques de base
    const activeWorkflows = orchestrator.getActiveWorkflowCount();
    const activeWorkflowIds = orchestrator.getActiveWorkflowIds();
    
    // Statistiques de la BDD
    let dbStats = null;
    if (user?.id) {
      try {
        const userJobStats = await db.generationJob.groupBy({
          by: ['status'],
          where: { userId: user.id },
          _count: { status: true },
        });
        
        dbStats = {
          userJobs: userJobStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.status;
            return acc;
          }, {} as Record<string, number>),
        };
      } catch (error) {
        secureLog.warn('Failed to get DB stats:', error);
      }
    }

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      apis: {
        dalle: apiTests.dalle,
        veo3: apiTests.veo3,
        details: apiTests.details,
      },
      workflows: {
        active: activeWorkflows,
        activeIds: activeWorkflowIds.slice(0, 5), // Limiter à 5 pour la confidentialité
      },
      database: {
        connected: true, // Si on arrive ici, la DB est connectée
        stats: dbStats,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasFalKey: !!process.env.FAL_KEY,
        hasS3Config: !!(process.env.S3_BUCKET_NAME && process.env.S3_REGION),
      },
    };

    return NextResponse.json(health);

  } catch (error) {
    secureLog.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}