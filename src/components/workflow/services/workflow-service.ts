'use client';

import { WorkflowConfig, WorkflowNodeStatus, WorkflowResult } from '../types/workflow';
import { secureLog } from '@/lib/secure-logger';

export interface WorkflowServiceEvents {
  'workflow:start': (config: WorkflowConfig) => void;
  'workflow:progress': (data: { nodeId: string; progress: number; status: WorkflowNodeStatus }) => void;
  'workflow:nodeComplete': (data: { nodeId: string; result: any }) => void;
  'workflow:complete': (result: WorkflowResult) => void;
  'workflow:error': (data: { nodeId: string; error: string }) => void;
}

export class WorkflowService {
  private eventListeners: Map<keyof WorkflowServiceEvents, Function[]> = new Map();
  private currentJobId: string | null = null;
  private eventSource: EventSource | null = null;

  constructor() {
    this.initEventListeners();
  }

  private initEventListeners() {
    // Initialize event listener arrays
    const events: (keyof WorkflowServiceEvents)[] = [
      'workflow:start',
      'workflow:progress',
      'workflow:nodeComplete',
      'workflow:complete',
      'workflow:error'
    ];

    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  on<T extends keyof WorkflowServiceEvents>(event: T, listener: WorkflowServiceEvents[T]) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  off<T extends keyof WorkflowServiceEvents>(event: T, listener: WorkflowServiceEvents[T]) {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private emit<T extends keyof WorkflowServiceEvents>(
    event: T,
    ...args: Parameters<WorkflowServiceEvents[T]>
  ) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        (listener as any)(...args);
      } catch (error) {
        secureLog.error(`Error in workflow event listener for ${event}:`, error);
      }
    });
  }

  async startWorkflow(config: WorkflowConfig): Promise<{ jobId: string; success: boolean; error?: string }> {
    try {
      secureLog.info('[WORKFLOW-SERVICE] Starting workflow with config:', config);
      
      this.emit('workflow:start', config);

      // Call the API to start the workflow
      const response = await fetch('/api/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: inclure les cookies de session
        body: JSON.stringify({
          imagePrompt: config.imagePrompt,
          videoPrompt: config.videoPrompt,
          imageConfig: config.imageConfig,
          videoConfig: config.videoConfig,
          projectId: config.projectId,
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        // Essayer de récupérer le message d'erreur du serveur
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Si la réponse n'est pas du JSON, utiliser le message par défaut
        }
        
        secureLog.error('[WORKFLOW-SERVICE] API error:', { 
          status: response.status, 
          statusText: response.statusText,
          errorMessage,
          url: response.url 
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to start workflow');
      }

      this.currentJobId = data.jobId;
      
      // Start listening for workflow progress
      this.startProgressListener(data.jobId);

      return {
        jobId: data.jobId,
        success: true,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      secureLog.error('[WORKFLOW-SERVICE] Error starting workflow:', errorMessage);
      
      this.emit('workflow:error', {
        nodeId: 'prompt-node',
        error: errorMessage
      });

      return {
        jobId: '',
        success: false,
        error: errorMessage,
      };
    }
  }

  private startProgressListener(jobId: string) {
    // Close existing connection
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Create new Server-Sent Events connection
    this.eventSource = new EventSource(`/api/workflow/stream/${jobId}`);

    this.eventSource.onopen = () => {
      secureLog.info('[WORKFLOW-SERVICE] Progress stream connected');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        secureLog.info('[WORKFLOW-SERVICE] Progress update:', data);

        switch (data.type) {
          case 'progress':
            this.emit('workflow:progress', {
              nodeId: this.mapStepToNodeId(data.stepId),
              progress: data.progress,
              status: this.mapStepStatusToNodeStatus(data.status),
            });
            break;

          case 'step_complete':
            this.emit('workflow:nodeComplete', {
              nodeId: this.mapStepToNodeId(data.stepId),
              result: data.result,
            });
            break;

          case 'workflow_complete':
            this.emit('workflow:complete', {
              success: true,
              imageUrl: data.imageUrl,
              videoUrl: data.videoUrl,
              duration: data.duration,
              metadata: data.metadata,
            });
            this.cleanup();
            break;

          case 'workflow_error':
            this.emit('workflow:error', {
              nodeId: this.mapStepToNodeId(data.stepId || 'unknown'),
              error: data.error || 'Workflow failed',
            });
            this.cleanup();
            break;
        }
      } catch (error) {
        secureLog.error('[WORKFLOW-SERVICE] Error parsing progress data:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      secureLog.error('[WORKFLOW-SERVICE] Progress stream error:', error);
      this.emit('workflow:error', {
        nodeId: 'unknown',
        error: 'Connection to workflow progress lost',
      });
      this.cleanup();
    };
  }

  private mapStepToNodeId(stepId: string): string {
    const mapping: { [key: string]: string } = {
      'validation': 'prompt-node',
      'prompt_enhancement': 'enhance-node', 
      'image_generation': 'image-node',
      'image_upload': 'image-node',
      'video_generation': 'video-node',
      'video_upload': 'video-node',
      'finalization': 'output-node',
    };

    return mapping[stepId] || stepId;
  }

  private mapStepStatusToNodeStatus(status: string): WorkflowNodeStatus {
    const mapping: { [key: string]: WorkflowNodeStatus } = {
      'pending': 'idle',
      'processing': 'loading',
      'completed': 'success',
      'failed': 'error',
    };

    return mapping[status] || 'idle';
  }

  async pauseWorkflow(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentJobId) {
      return { success: false, error: 'No active workflow' };
    }

    try {
      const response = await fetch(`/api/workflow/pause/${this.currentJobId}`, {
        method: 'POST',
      });

      const data = await response.json();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  async resumeWorkflow(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentJobId) {
      return { success: false, error: 'No active workflow' };
    }

    try {
      const response = await fetch(`/api/workflow/resume/${this.currentJobId}`, {
        method: 'POST',
      });

      const data = await response.json();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  async cancelWorkflow(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentJobId) {
      return { success: false, error: 'No active workflow' };
    }

    try {
      const response = await fetch(`/api/workflow/cancel/${this.currentJobId}`, {
        method: 'POST',
      });

      const data = await response.json();
      this.cleanup();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.cleanup();
      return { success: false, error: errorMessage };
    }
  }

  async getWorkflowStatus(jobId?: string): Promise<{ 
    success: boolean; 
    status?: any; 
    error?: string 
  }> {
    const targetJobId = jobId || this.currentJobId;
    if (!targetJobId) {
      return { success: false, error: 'No job ID provided' };
    }

    try {
      const response = await fetch(`/api/workflow/status/${targetJobId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private cleanup() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.currentJobId = null;
  }

  disconnect() {
    this.cleanup();
    this.eventListeners.clear();
  }

  getCurrentJobId(): string | null {
    return this.currentJobId;
  }
}

// Singleton instance
export const workflowService = new WorkflowService();