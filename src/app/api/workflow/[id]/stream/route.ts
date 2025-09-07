import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { db } from '@/server/api/db';
import { getWorkflowOrchestrator } from '@/lib/services/workflow-orchestrator';
import { secureLog } from '@/lib/secure-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentification
    const user = await getServerUser(request);
    if (!user?.id) {
      return new Response('Authentication required', { status: 401 });
    }

    const workflowId = (await params).id;
    
    // Vérifier que le job appartient à l'utilisateur
    const job = await db.generationJob.findFirst({
      where: {
        id: workflowId,
        userId: user.id,
      },
    });

    if (!job) {
      return new Response('Workflow not found', { status: 404 });
    }

    // Configuration des headers SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Headers SSE
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Envoyer le statut initial
        send({
          type: 'status',
          workflowId,
          status: job.status,
          timestamp: new Date().toISOString(),
        });

        // Écouter les mises à jour du workflow
        const orchestrator = getWorkflowOrchestrator(db);
        
        const handleWorkflowUpdate = (updateData: any) => {
          if (updateData.workflowId === workflowId) {
            send({
              type: 'workflow:update',
              ...updateData,
            });
          }
        };

        orchestrator.on('workflow:update', handleWorkflowUpdate);

        // Ping périodique pour maintenir la connexion
        const pingInterval = setInterval(() => {
          send({
            type: 'ping',
            timestamp: new Date().toISOString(),
          });
        }, 30000); // Ping toutes les 30 secondes

        // Vérifier périodiquement si le workflow est terminé
        const statusInterval = setInterval(async () => {
          try {
            const currentJob = await db.generationJob.findUnique({
              where: { id: workflowId },
              include: {
                imageAsset: true,
                videoAsset: true,
              },
            });

            if (currentJob && ['VIDEO_READY', 'FAILED'].includes(currentJob.status)) {
              send({
                type: 'workflow:complete',
                workflowId,
                status: currentJob.status,
                result: {
                  imageAsset: currentJob.imageAsset,
                  videoAsset: currentJob.videoAsset,
                  errorMessage: currentJob.errorMessage,
                },
                timestamp: new Date().toISOString(),
              });
              
              // Nettoyer et fermer la connexion
              clearInterval(statusInterval);
              clearInterval(pingInterval);
              orchestrator.off('workflow:update', handleWorkflowUpdate);
              controller.close();
            }
          } catch (error) {
            secureLog.error('Status check error:', error);
            send({
              type: 'error',
              error: 'Status check failed',
              timestamp: new Date().toISOString(),
            });
          }
        }, 5000); // Vérifier toutes les 5 secondes

        // Gérer la fermeture de connexion
        request.signal.addEventListener('abort', () => {
          clearInterval(statusInterval);
          clearInterval(pingInterval);
          orchestrator.off('workflow:update', handleWorkflowUpdate);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    secureLog.error('SSE stream error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}