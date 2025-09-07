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
import NextImage from 'next/image';
import { secureLog } from '@/lib/secure-logger';

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
      secureLog.error('Cancel error:', error);
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
    <div className="bg-card border border-border rounded-lg overflow-hidden w-full">
      {/* Header modernisé */}
      <div className="border-b border-border bg-secondary/50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-6 h-6 bg-white rounded">
              <Play className="w-3 h-3 text-black" />
            </div>
            <div>
              <h3 className="font-mono text-sm text-white">workflow_execution</h3>
              <p className="text-xs text-muted-foreground font-mono">real-time pipeline progress</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={`font-mono text-xs px-2 py-1 ${
              overallStatus === 'running' ? 'bg-blue-500 text-white' :
              overallStatus === 'completed' ? 'bg-green-500 text-white' :
              overallStatus === 'failed' ? 'bg-red-500 text-white' :
              overallStatus === 'cancelled' ? 'bg-yellow-500 text-black' :
              'bg-muted text-muted-foreground'
            }`}>
              {overallStatus}
            </Badge>
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-mono">elapsed_time</div>
              <div className="font-mono text-sm text-white">
                {formatTime(elapsedTime)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-6">
        {/* Progress Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-mono text-white">overall_progress</div>
            <div className="text-right">
              <div className="font-mono text-lg text-white">{overallProgress}%</div>
              {estimatedTimeRemaining && (
                <div className="text-xs text-muted-foreground font-mono">
                  ~{formatTime(estimatedTimeRemaining)} remaining
                </div>
              )}
            </div>
          </div>
          <div className="relative">
            <Progress value={overallProgress} className="h-3 bg-muted" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs font-mono text-black font-medium">
                {overallProgress > 10 && `${overallProgress}%`}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Steps */}
        <div className="space-y-2">
          <div className="text-sm font-mono text-white mb-4">pipeline_steps</div>
          <div className="space-y-1">
            {steps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-8 top-12 w-px h-8 bg-border" />
                )}
                
                <div className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 ${
                  step.status === 'processing' ? 'border-blue-500/40 bg-blue-500/5 shadow-sm' :
                  step.status === 'completed' ? 'border-green-500/40 bg-green-500/5' :
                  step.status === 'failed' ? 'border-red-500/40 bg-red-500/5' :
                  'border-border bg-secondary/20'
                }`}>
                  {/* Step Icon */}
                  <div className="flex-shrink-0 relative">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center ${
                      step.status === 'processing' ? 'border-blue-500 bg-blue-500/10' :
                      step.status === 'completed' ? 'border-green-500 bg-green-500/10' :
                      step.status === 'failed' ? 'border-red-500 bg-red-500/10' :
                      'border-border bg-muted'
                    }`}>
                      {getStepIcon(step.id, step.status)}
                    </div>
                    {step.status === 'processing' && (
                      <div className="absolute -inset-1 rounded-full border-2 border-blue-500/30 animate-ping" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-mono text-sm text-white truncate">{step.name}</h4>
                      {getStatusBadge(step.status)}
                    </div>
                    
                    {/* Progress Bar for Processing */}
                    {step.status === 'processing' && (
                      <div className="space-y-1">
                        <Progress value={step.progress} className="h-2" />
                        <div className="text-xs text-blue-400 font-mono">
                          {step.progress}% complete
                        </div>
                      </div>
                    )}
                    
                    {/* Error Display */}
                    {step.error && (
                      <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs">
                        <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="font-mono text-red-400">{step.error}</span>
                      </div>
                    )}
                    
                    {/* Completion Time */}
                    {step.completedAt && step.startedAt && (
                      <div className="text-xs text-muted-foreground font-mono">
                        ✓ Completed in {formatTime(step.completedAt.getTime() - step.startedAt.getTime())}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Section - Modernized */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="border-b border-border bg-secondary/50">
            <div className="flex items-center gap-3 px-6 py-4">
              <div className="flex items-center justify-center w-6 h-6 bg-white rounded">
                <Sparkles className="w-3 h-3 text-black" />
              </div>
              <div>
                <h3 className="font-mono text-sm text-white">output_preview</h3>
                <p className="text-xs text-muted-foreground font-mono">generated assets preview</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="text-center space-y-6">
              {result?.imageAsset && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Image className="w-4 h-4 text-green-400" />
                    <h4 className="font-mono text-sm text-white">image_generated</h4>
                    <Badge className="bg-green-500/20 text-green-400 font-mono text-xs">ready</Badge>
                  </div>
                  <div className="relative group">
                    <NextImage 
                      src={result.imageAsset.publicUrl} 
                      alt="Generated image"
                      width={384}
                      height={256}
                      className="w-full max-w-sm mx-auto rounded-lg border border-border shadow-lg transition-transform duration-200 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-lg" />
                  </div>
                </div>
              )}
              
              {result?.videoAsset && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Video className="w-4 h-4 text-green-400" />
                    <h4 className="font-mono text-sm text-white">video_generated</h4>
                    <Badge className="bg-green-500/20 text-green-400 font-mono text-xs">ready</Badge>
                  </div>
                  <div className="relative group">
                    <video 
                      src={result.videoAsset.publicUrl}
                      controls
                      loop
                      muted
                      className="w-full max-w-sm mx-auto rounded-lg border border-border shadow-lg transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-lg pointer-events-none" />
                  </div>
                </div>
              )}
              
              {!result?.imageAsset && !result?.videoAsset && overallStatus === 'running' && (
                <div className="py-12">
                  <div className="relative mx-auto w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-border rounded-full" />
                    <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-4 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-sm text-white">
                      {currentStep ? steps.find(s => s.id === currentStep)?.name || 'processing...' : 'initializing...'}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      pipeline execution in progress
                    </p>
                  </div>
                </div>
              )}
              
              {!result?.imageAsset && !result?.videoAsset && overallStatus !== 'running' && !error && (
                <div className="py-12">
                  <div className="mx-auto w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-sm text-white">awaiting_generation</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      results will appear here once processing begins
                    </p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="py-12">
                  <div className="mx-auto w-16 h-16 rounded-full border-2 border-red-500/40 bg-red-500/10 flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-sm text-red-400">execution_failed</p>
                    <p className="font-mono text-xs text-red-400/80 max-w-sm mx-auto">
                      {error}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Panel - Modernized */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="border-b border-border bg-secondary/50">
            <div className="flex items-center gap-3 px-6 py-4">
              <div className="flex items-center justify-center w-6 h-6 bg-white rounded">
                <Play className="w-3 h-3 text-black" />
              </div>
              <div>
                <h3 className="font-mono text-sm text-white">workflow_actions</h3>
                <p className="text-xs text-muted-foreground font-mono">control and output management</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {overallStatus === 'running' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="w-full font-mono text-xs h-9 border-red-500/40 hover:border-red-500 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all duration-200"
                >
                  <Square className="w-3 h-3 mr-2" />
                  cancel_execution
                </Button>
              )}
              
              {overallStatus === 'completed' && result?.videoAsset && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(result.videoAsset.publicUrl, '_blank')}
                    className="font-mono text-xs h-9 border-border hover:border-white/40 hover:bg-white/5 transition-all duration-200"
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
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
                    className="font-mono text-xs h-9 bg-white hover:bg-white/90 text-black hover:scale-105 transition-all duration-200 shadow-sm"
                  >
                    <Download className="w-3 h-3 mr-2" />
                    download
                  </Button>
                </div>
              )}
              
              {overallStatus === 'completed' && result?.imageAsset && !result?.videoAsset && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(result.imageAsset.publicUrl, '_blank')}
                    className="font-mono text-xs h-9 border-border hover:border-white/40 hover:bg-white/5 transition-all duration-200"
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    view_image
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = result.imageAsset.publicUrl;
                      a.download = result.imageAsset.filename || 'generated-image.png';
                      a.click();
                    }}
                    className="font-mono text-xs h-9 bg-white hover:bg-white/90 text-black hover:scale-105 transition-all duration-200 shadow-sm"
                  >
                    <Download className="w-3 h-3 mr-2" />
                    download
                  </Button>
                </div>
              )}
              
              {(overallStatus === 'failed' || overallStatus === 'cancelled') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="w-full font-mono text-xs h-9 border-border hover:border-white/40 hover:bg-white/5 transition-all duration-200"
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  restart_workflow
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Technical Information - Modernized */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="border-b border-border bg-secondary/50">
            <div className="flex items-center gap-3 px-6 py-4">
              <div className="flex items-center justify-center w-6 h-6 bg-white rounded">
                <Info className="w-3 h-3 text-black" />
              </div>
              <div>
                <h3 className="font-mono text-sm text-white">execution_details</h3>
                <p className="text-xs text-muted-foreground font-mono">workflow metadata</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-2">
                  <div className="text-muted-foreground">workflow_id</div>
                  <div className="text-white bg-secondary/50 px-2 py-1 rounded border border-border">
                    {workflowId.slice(0, 12)}...
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-muted-foreground">total_steps</div>
                  <div className="text-white bg-secondary/50 px-2 py-1 rounded border border-border text-center">
                    {steps.length}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="text-center p-3 bg-secondary/30 border border-border rounded">
                  <div className="text-green-400 font-medium">
                    {steps.filter(s => s.status === 'completed').length}
                  </div>
                  <div className="text-muted-foreground mt-1">completed</div>
                </div>
                <div className="text-center p-3 bg-secondary/30 border border-border rounded">
                  <div className="text-blue-400 font-medium">
                    {steps.filter(s => s.status === 'processing').length}
                  </div>
                  <div className="text-muted-foreground mt-1">processing</div>
                </div>
                <div className="text-center p-3 bg-secondary/30 border border-border rounded">
                  <div className="text-red-400 font-medium">
                    {steps.filter(s => s.status === 'failed').length}
                  </div>
                  <div className="text-muted-foreground mt-1">failed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}