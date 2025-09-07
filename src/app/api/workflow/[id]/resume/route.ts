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

    // Check if workflow is paused
    if (job.status !== 'PAUSED') {
      return NextResponse.json(
        { 
          error: 'Workflow is not paused',
          currentStatus: job.status
        },
        { status: 400 }
      );
    }

    // Restore original status from metadata
    const providerData = job.providerData as Record<string, any> | null;
    const originalStatus = providerData?.pausedFromStatus || 'GENERATING_VIDEO';
    
    // Update job status back to original
    await db.generationJob.update({
      where: { id: workflowId },
      data: { 
        status: originalStatus,
        // Clean up pause metadata
        providerData: job.providerData ? 
          Object.fromEntries(
            Object.entries(job.providerData as Record<string, any>)
              .filter(([key]) => key !== 'pausedFromStatus')
          ) : 
          undefined
      },
    });

    // Note: Since VEO3 doesn't support actual pause/resume,
    // the workflow will continue normally when resumed
    
    return NextResponse.json({
      success: true,
      workflowId,
      status: originalStatus,
      message: 'Workflow resumed successfully',
    });

  } catch (error) {
    secureLog.error('Resume workflow error:', error);
    
    return NextResponse.json(
      { error: 'Failed to resume workflow' },
      { status: 500 }
    );
  }
}