import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkflowStep } from '@/components/workflow-visualizer';
import { secureLog } from '@/lib/secure-logger';

export interface WorkflowStreamData {
  type: 'status' | 'workflow:update' | 'workflow:complete' | 'error' | 'ping';
  workflowId?: string;
  stepId?: string;
  step?: WorkflowStep;
  allSteps?: WorkflowStep[];
  status?: string;
  result?: any;
  error?: string;
  timestamp: string;
}

export interface UseWorkflowStreamResult {
  steps: WorkflowStep[];
  status: 'connecting' | 'connected' | 'completed' | 'failed' | 'disconnected';
  result: any;
  error: string | null;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
}

export function useWorkflowStream(workflowId: string | null): UseWorkflowStreamResult {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'completed' | 'failed' | 'disconnected'>('disconnected');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setStatus('disconnected');
  }, []);

  const connect = useCallback(() => {
    if (!workflowId || eventSourceRef.current) return;

    setStatus('connecting');
    setError(null);

    const eventSource = new EventSource(`/api/workflow/${workflowId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      secureLog.info('SSE connection opened');
      setIsConnected(true);
      setStatus('connected');
      reconnectAttempts.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data: WorkflowStreamData = JSON.parse(event.data);
        secureLog.info('SSE message received:', data);

        switch (data.type) {
          case 'workflow:update':
            if (data.allSteps) {
              setSteps([...data.allSteps]);
            } else if (data.step && data.stepId) {
              setSteps(prev => {
                const newSteps = [...prev];
                const stepIndex = newSteps.findIndex(s => s.id === data.stepId);
                if (stepIndex !== -1) {
                  newSteps[stepIndex] = { ...data.step! };
                } else {
                  newSteps.push(data.step!);
                }
                return newSteps;
              });
            }
            break;

          case 'workflow:complete':
            setStatus(data.status === 'FAILED' ? 'failed' : 'completed');
            if (data.result) {
              setResult(data.result);
            }
            if (data.result?.errorMessage) {
              setError(data.result.errorMessage);
            }
            // Garder la connexion ouverte pour permettre les téléchargements
            break;

          case 'status':
            secureLog.info('Workflow status:', data.status);
            break;

          case 'error':
            secureLog.error('SSE error:', data.error);
            setError(data.error || 'Unknown error');
            setStatus('failed');
            break;

          case 'ping':
            secureLog.info('SSE ping received');
            break;

          default:
            secureLog.info('Unknown SSE message type:', data.type);
        }
      } catch (err) {
        secureLog.error('Failed to parse SSE message:', err);
        setError('Failed to parse server message');
      }
    };

    eventSource.onerror = (err) => {
      secureLog.error('SSE error:', err);
      setIsConnected(false);
      
      // Ne pas essayer de se reconnecter si le workflow est terminé
      if (status === 'completed' || status === 'failed') {
        disconnect();
        return;
      }

      // Tentative de reconnexion avec backoff exponentiel
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
        secureLog.info(`SSE reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          eventSource.close();
          reconnectAttempts.current++;
          connect();
        }, delay);
      } else {
        setError('Connection lost. Please refresh the page.');
        setStatus('failed');
        disconnect();
      }
    };

  }, [workflowId, status]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Connexion initiale
  useEffect(() => {
    if (workflowId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [workflowId, connect, disconnect]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Gestion de la visibilité de la page pour économiser les ressources
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page cachée, on peut réduire la fréquence ou suspendre
        secureLog.info('Page hidden, SSE connection maintained');
      } else {
        // Page visible, s'assurer que la connexion est active
        if (workflowId && !eventSourceRef.current && status !== 'completed' && status !== 'failed') {
          secureLog.info('Page visible, reconnecting SSE');
          reconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [workflowId, status, reconnect]);

  return {
    steps,
    status,
    result,
    error,
    isConnected,
    reconnect,
    disconnect,
  };
}