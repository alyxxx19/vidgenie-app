import { useState, useCallback } from 'react';
import { useWorkflowStream } from './useWorkflowStream';
import { toast } from 'sonner';

export interface WorkflowConfig {
  imagePrompt: string;
  videoPrompt: string;
  imageConfig?: {
    style: 'natural' | 'vivid';
    quality: 'standard' | 'hd';
    size: '1024x1024' | '1792x1024' | '1024x1792';
  };
  videoConfig?: {
    duration: '8s';
    resolution: '720p' | '1080p';
    generateAudio: boolean;
  };
  projectId?: string;
}

export interface WorkflowResult {
  success: boolean;
  workflowId?: string;
  imageAsset?: any;
  videoAsset?: any;
  error?: string;
}

export interface UseWorkflowResult {
  // État du workflow
  isRunning: boolean;
  workflowId: string | null;
  
  // Données du stream
  steps: any[];
  status: string;
  result: any;
  error: string | null;
  isConnected: boolean;
  
  // Actions
  startWorkflow: (config: WorkflowConfig) => Promise<void>;
  cancelWorkflow: () => Promise<void>;
  reconnect: () => void;
  
  // Méthodes utilitaires
  getOverallProgress: () => number;
  getCurrentStep: () => string | null;
  getEstimatedTimeRemaining: () => number | null;
}

export function useWorkflow(): UseWorkflowResult {
  const [isRunning, setIsRunning] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Stream SSE pour les mises à jour temps réel
  const {
    steps,
    status,
    result,
    error: streamError,
    isConnected,
    reconnect,
    disconnect
  } = useWorkflowStream(workflowId);

  const [localError, setLocalError] = useState<string | null>(null);
  const error = streamError || localError;

  const startWorkflow = useCallback(async (config: WorkflowConfig) => {
    try {
      setLocalError(null);
      setIsRunning(true);
      setStartTime(Date.now());

      const response = await fetch('/api/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start workflow');
      }

      setWorkflowId(data.workflowId);
      
      toast.success('Workflow started successfully!', {
        description: 'Generating your image and video...',
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setLocalError(errorMessage);
      setIsRunning(false);
      setWorkflowId(null);
      setStartTime(null);
      
      toast.error('Failed to start workflow', {
        description: errorMessage,
      });
      
      throw err;
    }
  }, []);

  const cancelWorkflow = useCallback(async () => {
    if (!workflowId) return;

    try {
      const response = await fetch(`/api/workflow/${workflowId}/cancel`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel workflow');
      }

      setIsRunning(false);
      disconnect();
      
      toast.success('Workflow cancelled', {
        description: `Refunded ${data.refundAmount} credits`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to cancel workflow', {
        description: errorMessage,
      });
      throw err;
    }
  }, [workflowId, disconnect]);

  // Calculer le progrès global
  const getOverallProgress = useCallback(() => {
    if (steps.length === 0) return 0;
    
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const processingSteps = steps.filter(s => s.status === 'processing');
    
    let progress = (completedSteps / steps.length) * 100;
    
    // Ajouter le progrès de l'étape en cours
    if (processingSteps.length > 0) {
      const processingStep = processingSteps[0];
      progress += (processingStep.progress / 100) * (1 / steps.length) * 100;
    }
    
    return Math.min(Math.round(progress), 100);
  }, [steps]);

  // Obtenir l'étape courante
  const getCurrentStep = useCallback(() => {
    const processingStep = steps.find(s => s.status === 'processing');
    return processingStep?.id || null;
  }, [steps]);

  // Estimer le temps restant
  const getEstimatedTimeRemaining = useCallback(() => {
    if (!startTime || steps.length === 0) return null;
    
    const elapsed = Date.now() - startTime;
    const progress = getOverallProgress();
    
    if (progress <= 0) return null;
    
    const estimatedTotal = (elapsed / progress) * 100;
    const remaining = estimatedTotal - elapsed;
    
    return Math.max(0, remaining);
  }, [startTime, steps, getOverallProgress]);

  // Mettre à jour l'état du workflow basé sur le statut
  useState(() => {
    if (status === 'completed' || status === 'failed') {
      setIsRunning(false);
    }
  });

  // Notifications pour les étapes importantes
  useState(() => {
    const completedImageStep = steps.find(s => s.id === 'image_generation' && s.status === 'completed');
    const completedVideoStep = steps.find(s => s.id === 'video_generation' && s.status === 'completed');
    
    if (completedImageStep && !completedImageStep.notified) {
      toast.success('Image generated!', {
        description: 'Starting video conversion...',
      });
      completedImageStep.notified = true;
    }
    
    if (completedVideoStep && !completedVideoStep.notified) {
      toast.success('Video generated!', {
        description: 'Finalizing your creation...',
      });
      completedVideoStep.notified = true;
    }
  });

  return {
    // État
    isRunning,
    workflowId,
    
    // Données du stream
    steps,
    status,
    result,
    error,
    isConnected,
    
    // Actions
    startWorkflow,
    cancelWorkflow,
    reconnect,
    
    // Utilitaires
    getOverallProgress,
    getCurrentStep,
    getEstimatedTimeRemaining,
  };
}