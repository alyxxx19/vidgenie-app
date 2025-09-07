import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { db } from '@/server/api/db';
import { getWorkflowOrchestrator } from '@/lib/services/workflow-orchestrator';
import { secureLog } from '@/lib/secure-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const user = await getServerUser(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const workflowId = (await params).id;
    
    // Verify that the job belongs to the user
    const job = await db.generationJob.findFirst({
      where: {
        id: workflowId,
        userId: user.id,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check if workflow can be paused
    if (!['GENERATING_VIDEO', 'IMAGE_READY'].includes(job.status)) {
      return NextResponse.json(
        { 
          error: 'Workflow cannot be paused in current status',
          currentStatus: job.status
        },
        { status: 400 }
      );
    }

    // Update job status to paused
    await db.generationJob.update({
      where: { id: workflowId },
      data: { 
        status: 'PAUSED',
        // Keep the original status in metadata for resume
        providerData: job.providerData ? {
          ...job.providerData as Record<string, any>,
          pausedFromStatus: job.status
        } : {
          pausedFromStatus: job.status
        }
      },
    });

    // Note: VEO3 doesn't support actual pause/resume, 
    // but we can track the pause state for UI purposes
    
    return NextResponse.json({
      success: true,
      workflowId,
      status: 'PAUSED',
      message: 'Workflow paused successfully',
    });

  } catch (error) {
    secureLog.error('Pause workflow error:', error);
    
    return NextResponse.json(
      { error: 'Failed to pause workflow' },
      { status: 500 }
    );
  }
}