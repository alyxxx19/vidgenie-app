'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause,
  Square,
  CheckCircle, 
  XCircle, 
  Clock, 
  Image, 
  Video, 
  Upload,
  Shield,
  Sparkles,
  AlertCircle,
  Download,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface WorkflowVisualizerProps {
  workflowId: string;
  initialSteps?: WorkflowStep[];
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

const STEP_ICONS = {
  validation: Shield,
  image_generation: Image,
  image_upload: Upload,
  video_generation: Video,
  video_upload: Upload,
  finalization: Sparkles,
} as const;

const STEP_COLORS = {
  pending: 'text-muted-foreground',
  processing: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
} as const;

export function WorkflowVisualizer({ 
  workflowId, 
  initialSteps = [],
  onComplete,
  onError,
  onCancel
}: WorkflowVisualizerProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps);
  const [overallStatus, setOverallStatus] = useState<'running' | 'completed' | 'failed' | 'cancelled'>('running');
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // Timer pour temps écoulé
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Calculer le progrès global et l'étape courante
  useEffect(() => {
    if (steps.length === 0) return;

    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const failedSteps = steps.filter(s => s.status === 'failed').length;
    const processingSteps = steps.filter(s => s.status === 'processing');

    // Calculer le progrès global
    let progress = (completedSteps / steps.length) * 100;
    
    // Ajouter le progrès de l'étape en cours
    if (processingSteps.length > 0) {
      const processingStep = processingSteps[0];
      progress += (processingStep.progress / 100) * (1 / steps.length) * 100;
    }

    setOverallProgress(Math.min(Math.round(progress), 100));
    setCurrentStep(processingSteps[0]?.id || null);

    // Déterminer le statut global
    if (failedSteps.length > 0) {
      setOverallStatus('failed');
      setError(steps.find(s => s.status === 'failed')?.error || 'Workflow failed');
    } else if (completedSteps === steps.length && steps.length > 0) {
      setOverallStatus('completed');
    } else {
      setOverallStatus('running');
    }
  }, [steps]);

  const handleCancel = useCallback(async () => {
    try {
      const response = await fetch(`/api/workflow/${workflowId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel workflow');
      }

      setOverallStatus('cancelled');
      onCancel?.();
    } catch (error) {
      console.error('Cancel error:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel');
    }
  }, [workflowId, onCancel]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStepIcon = (stepId: string, status: WorkflowStep['status']) => {
    const IconComponent = STEP_ICONS[stepId as keyof typeof STEP_ICONS] || Clock;
    
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (status === 'failed') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (status === 'processing') {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    } else {
      return <IconComponent className={`w-5 h-5 ${STEP_COLORS[status]}`} />;
    }
  };

  const getStatusBadge = (status: WorkflowStep['status']) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
    } as const;

    const colors = {
      pending: 'bg-muted text-muted-foreground',
      processing: 'bg-blue-500 text-white animate-pulse',
      completed: 'bg-green-500 text-white',
      failed: 'bg-red-500 text-white',
    } as const;

    return (
      <Badge className={`font-mono text-xs ${colors[status]}`}>
        {status}
      </Badge>
    );
  };

  return (
    <Card className="bg-card border-border w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
            <Play className="w-4 h-4" />
            workflow_pipeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={`font-mono text-xs ${
              overallStatus === 'running' ? 'bg-blue-500 text-white animate-pulse' :
              overallStatus === 'completed' ? 'bg-green-500 text-white' :
              overallStatus === 'failed' ? 'bg-red-500 text-white' :
              'bg-yellow-500 text-black'
            }`}>
              {overallStatus}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progrès global */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-white">overall_progress</span>
            <span className="font-mono text-xs text-muted-foreground">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          {estimatedTimeRemaining && (
            <div className="text-center">
              <span className="font-mono text-xs text-muted-foreground">
                ~{formatTime(estimatedTimeRemaining)} remaining
              </span>
            </div>
          )}
        </div>

        {/* Étapes du workflow */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Ligne de connexion */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 top-10 w-0.5 h-6 bg-border" />
              )}
              
              <div className={`flex items-center gap-3 p-3 rounded border transition-all ${
                step.status === 'processing' ? 'border-blue-500 bg-blue-500/5' :
                step.status === 'completed' ? 'border-green-500/20 bg-green-500/5' :
                step.status === 'failed' ? 'border-red-500/20 bg-red-500/5' :
                'border-border bg-card'
              }`}>
                {/* Icône de l'étape */}
                <div className="flex-shrink-0">
                  {getStepIcon(step.id, step.status)}
                </div>

                {/* Contenu de l'étape */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-white">{step.name}</span>
                    {getStatusBadge(step.status)}
                  </div>
                  
                  {step.status === 'processing' && (
                    <Progress value={step.progress} className="h-1" />
                  )}
                  
                  {step.error && (
                    <div className="flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      <span className="font-mono">{step.error}</span>
                    </div>
                  )}
                  
                  {step.completedAt && step.startedAt && (
                    <div className="text-xs text-muted-foreground font-mono">
                      Completed in {formatTime(step.completedAt.getTime() - step.startedAt.getTime())}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Zone de prévisualisation */}
        <div className="border border-border rounded p-4 bg-muted/50">
          <div className="text-center space-y-3">
            {result?.imageAsset && (
              <div className="space-y-2">
                <h4 className="font-mono text-sm text-white">generated_image</h4>
                <img 
                  src={result.imageAsset.publicUrl} 
                  alt="Generated image"
                  className="w-full max-w-xs mx-auto rounded border border-border"
                />
              </div>
            )}
            
            {result?.videoAsset && (
              <div className="space-y-2">
                <h4 className="font-mono text-sm text-white">generated_video</h4>
                <video 
                  src={result.videoAsset.publicUrl}
                  controls
                  loop
                  muted
                  className="w-full max-w-xs mx-auto rounded border border-border"
                />
              </div>
            )}
            
            {!result?.imageAsset && !result?.videoAsset && overallStatus === 'running' && (
              <div className="py-8">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="font-mono text-xs text-muted-foreground">
                  {currentStep ? `Processing: ${steps.find(s => s.id === currentStep)?.name}` : 'Preparing...'}
                </p>
              </div>
            )}
            
            {error && (
              <div className="py-8 text-center">
                <XCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <p className="font-mono text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {overallStatus === 'running' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex-1 font-mono text-xs h-8"
            >
              <Square className="w-3 h-3 mr-1" />
              cancel
            </Button>
          )}
          
          {overallStatus === 'completed' && result?.videoAsset && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(result.videoAsset.publicUrl, '_blank')}
                className="flex-1 font-mono text-xs h-8"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                view_video
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = result.videoAsset.publicUrl;
                  a.download = result.videoAsset.filename || 'generated-video.mp4';
                  a.click();
                }}
                className="flex-1 font-mono text-xs h-8 bg-white hover:bg-white/90 text-black"
              >
                <Download className="w-3 h-3 mr-1" />
                download
              </Button>
            </>
          )}
          
          {(overallStatus === 'failed' || overallStatus === 'cancelled') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="flex-1 font-mono text-xs h-8"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              try_again
            </Button>
          )}
        </div>

        {/* Informations techniques */}
        <div className="text-xs text-muted-foreground font-mono space-y-1 border-t border-border pt-2">
          <div className="flex justify-between">
            <span>workflow_id:</span>
            <span className="font-mono">{workflowId.slice(0, 8)}...</span>
          </div>
          <div className="flex justify-between">
            <span>total_steps:</span>
            <span>{steps.length}</span>
          </div>
          <div className="flex justify-between">
            <span>completed:</span>
            <span>{steps.filter(s => s.status === 'completed').length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}