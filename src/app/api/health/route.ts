import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { secureLog } from '@/lib/secure-logger';

/**
 * Health Check Endpoint
 * Phase 5 - Production Deployment
 * 
 * Provides comprehensive health status for monitoring systems
 * Used by load balancers, monitoring tools, and uptime checks
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    externalApis: HealthCheck;
    storage: HealthCheck;
    jobs: HealthCheck;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    responseTime: number;
  };
  environment: string;
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message?: string;
  lastCheck: string;
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: await checkDatabase(),
        externalApis: await checkExternalApis(),
        storage: await checkStorage(),
        jobs: await checkJobsystem()
      },
      metrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        responseTime: Date.now() - startTime
      },
      environment: process.env.NODE_ENV || 'development'
    };

    // Determine overall health status
    const allChecks = Object.values(healthStatus.checks);
    if (allChecks.some(check => check.status === 'unhealthy')) {
      healthStatus.status = 'unhealthy';
    } else if (allChecks.some(check => check.status === 'degraded')) {
      healthStatus.status = 'degraded';
    }

    // Return appropriate HTTP status code
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthStatus, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    secureLog.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      responseTime: Date.now() - startTime
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const prisma = new PrismaClient();
    
    // Simple database connectivity test
    await prisma.$queryRaw`SELECT 1`;
    
    // Test a basic query performance
    const userCount = await prisma.user.count();
    
    await prisma.$disconnect();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      message: `Database responsive, ${userCount} users`,
      lastCheck: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Database connection failed: ${error}`,
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkExternalApis(): Promise<HealthCheck> {
  const startTime = Date.now();
  const checks: string[] = [];
  
  try {
    // Check OpenAI API availability
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          checks.push('OpenAI: healthy');
        } else {
          checks.push(`OpenAI: degraded (${response.status})`);
        }
      } catch (_error) {
        checks.push('OpenAI: unhealthy');
      }
    }

    // Check Supabase API availability
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.status < 500) {
          checks.push('Supabase: healthy');
        } else {
          checks.push(`Supabase: degraded (${response.status})`);
        }
      } catch (_error) {
        checks.push('Supabase: unhealthy');
      }
    }

    const responseTime = Date.now() - startTime;
    const hasUnhealthy = checks.some(check => check.includes('unhealthy'));
    const hasDegraded = checks.some(check => check.includes('degraded'));
    
    return {
      status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      responseTime,
      message: checks.join(', ') || 'No external APIs configured',
      lastCheck: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `External API checks failed: ${error}`,
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkStorage(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // In a real implementation, you would test S3 connectivity here
    // For now, just check if storage configuration is present
    const hasS3Config = !!(process.env.AWS_ACCESS_KEY_ID && 
                          process.env.AWS_SECRET_ACCESS_KEY && 
                          process.env.AWS_S3_BUCKET);
    
    if (hasS3Config) {
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        message: 'Storage configuration valid',
        lastCheck: new Date().toISOString()
      };
    } else {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: 'Storage configuration incomplete',
        lastCheck: new Date().toISOString()
      };
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Storage check failed: ${error}`,
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkJobsystem(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check if Inngest configuration is present
    const hasInngestConfig = !!(process.env.INNGEST_EVENT_KEY && 
                               process.env.INNGEST_SIGNING_KEY);
    
    if (hasInngestConfig) {
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        message: 'Job system configuration valid',
        lastCheck: new Date().toISOString()
      };
    } else {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: 'Job system configuration incomplete',
        lastCheck: new Date().toISOString()
      };
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Job system check failed: ${error}`,
      lastCheck: new Date().toISOString()
    };
  }
}