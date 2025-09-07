'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Settings, 
  Zap,
  Clock,
  AlertCircle,
  CheckCircle2,
  Image,
  Video,
  Wand2
} from 'lucide-react';
import { useWorkflowStore } from './store/workflow-store';
import { WorkflowConfig } from './types/workflow';
import { useState } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from 'sonner';
import { secureLog } from '@/lib/secure-logger';

interface WorkflowControlsProps {
  className?: string;
  projectId?: string;
}

export function WorkflowControls({ className, projectId }: WorkflowControlsProps) {
  const {
    isRunning,
    isPaused,
    overallProgress,
    currentStep,
    totalSteps,
    estimatedTotalCost,
    totalCreditsUsed,
    result,
    error,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    resetWorkflow
  } = useWorkflowStore();

  const { balance, hasEnoughCredits } = useCredits();
  const { user, loading: authLoading } = useAuth();

  // États du formulaire
  const [imagePrompt, setImagePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [imageStyle, setImageStyle] = useState<'natural' | 'vivid'>('vivid');
  const [imageQuality, setImageQuality] = useState<'standard' | 'hd'>('hd');
  const [imageSize, setImageSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1792');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('1080p');
  const [generateAudio, setGenerateAudio] = useState(true);

  const canStart = !isRunning && imagePrompt.trim() && videoPrompt.trim() && hasEnoughCredits('IMAGE_TO_VIDEO');

  const handleStart = async () => {
    // Vérification de l'authentification
    secureLog.info('[WORKFLOW-CONTROLS] Starting workflow - Auth check:', { 
      user: !!user, 
      userId: user?.id, 
      authLoading 
    });

    if (authLoading) {
      toast.error('Authentication in progress, please wait');
      return;
    }

    if (!user) {
      toast.error('Authentication required', {
        description: 'Please sign in to start a workflow'
      });
      return;
    }

    if (!canStart) {
      if (!hasEnoughCredits('IMAGE_TO_VIDEO')) {
        toast.error('Insufficient credits', {
          description: `You need ${estimatedTotalCost} credits but have ${balance}`
        });
      } else if (!imagePrompt.trim() || !videoPrompt.trim()) {
        toast.error('Please fill in both prompts');
      }
      return;
    }

    const config: WorkflowConfig = {
      imagePrompt: imagePrompt.trim(),
      videoPrompt: videoPrompt.trim(),
      imageConfig: {
        style: imageStyle,
        quality: imageQuality,
        size: imageSize
      },
      videoConfig: {
        duration: 8, // Fixed pour VEO3
        resolution: videoResolution,
        generateAudio
      },
      projectId
    };

    try {
      secureLog.info('[WORKFLOW-CONTROLS] Starting workflow with config:', config);
      await startWorkflow(config);
    } catch (error) {
      secureLog.error('[WORKFLOW-CONTROLS] Failed to start workflow:', error);
      
      // Gestion des erreurs spécifiques
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Authentication required')) {
          toast.error('Authentication failed', {
            description: 'Please sign out and sign in again'
          });
        } else if (error.message.includes('403')) {
          toast.error('Access denied', {
            description: 'You do not have permission to start workflows'
          });
        } else if (error.message.includes('Insufficient credits')) {
          toast.error('Insufficient credits', {
            description: 'Please add more credits to your account'
          });
        } else {
          toast.error('Workflow failed to start', {
            description: error.message
          });
        }
      } else {
        toast.error('Unexpected error occurred');
      }
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeWorkflow();
    } else {
      pauseWorkflow();
    }
  };

  const getProgressStatus = () => {
    if (error) return 'error';
    if (result) return 'completed';
    if (isRunning) return 'running';
    return 'idle';
  };

  const getStatusColor = () => {
    switch (getProgressStatus()) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (getProgressStatus()) {
      case 'running': return <Clock className="w-4 h-4 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* En-tête avec progression globale */}
      <Card className="bg-card border border-border">
        <div className="border-b border-border bg-secondary/50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 bg-blue-500/20 border border-blue-500/30 rounded">
                <Wand2 className="w-3 h-3 text-blue-400" />
              </div>
              <div>
                <h3 className="font-mono text-sm text-white">workflow_control</h3>
                <p className="text-xs text-muted-foreground font-mono">pipeline execution management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`font-mono text-xs ${
                getProgressStatus() === 'running' ? 'bg-blue-500 text-white' :
                getProgressStatus() === 'completed' ? 'bg-green-500 text-white' :
                getProgressStatus() === 'error' ? 'bg-red-500 text-white' :
                'bg-muted text-muted-foreground'
              }`}>
                {getProgressStatus()}
              </Badge>
              <Badge className="bg-secondary/50 text-white font-mono text-xs">
                {balance}_credits
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Progression globale */}
        {(isRunning || result || error) && (
          <div className="p-6 border-b border-border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-mono text-white">execution_progress</div>
                <div className="text-right">
                  <div className="font-mono text-lg text-white">{Math.round(overallProgress)}%</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    step {currentStep}/{totalSteps}
                  </div>
                </div>
              </div>
              <div className="relative">
                <Progress value={overallProgress} className="h-3 bg-muted" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-mono text-black font-medium">
                    {overallProgress > 10 && `${Math.round(overallProgress)}%`}
                  </div>
                </div>
              </div>
              {totalCreditsUsed > 0 && (
                <div className="text-xs text-muted-foreground font-mono text-center">
                  credits_used: {totalCreditsUsed}/{estimatedTotalCost}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contrôles principaux */}
        <div className="p-6">
          <div className="space-y-3">
            <Button
              onClick={handleStart}
              disabled={!canStart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono text-sm h-10 hover:scale-105 transition-all duration-200 shadow-sm"
            >
              <Play className="w-4 h-4 mr-2" />
              start_pipeline
            </Button>

            {isRunning && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handlePauseResume}
                  variant="outline"
                  className="border-border hover:border-white/40 hover:bg-white/5 text-white font-mono text-xs h-8 transition-all duration-200"
                >
                  {isPaused ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
                  {isPaused ? 'resume' : 'pause'}
                </Button>
                
                <Button
                  onClick={cancelWorkflow}
                  variant="outline"
                  className="border-red-500/40 hover:border-red-500 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-mono text-xs h-8 transition-all duration-200"
                >
                  <Square className="w-3 h-3 mr-1" />
                  cancel
                </Button>
              </div>
            )}

            <Button
              onClick={resetWorkflow}
              variant="outline"
              disabled={isRunning}
              className="w-full border-border hover:border-white/40 hover:bg-white/5 text-white font-mono text-xs h-8 transition-all duration-200"
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              reset_workflow
            </Button>
          </div>
        </div>
      </Card>

      {/* Configuration des prompts */}
      <Card className="bg-card border border-border">
        <div className="border-b border-border bg-secondary/50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 bg-green-500/20 border border-green-500/30 rounded">
                <Image className="w-3 h-3 text-green-400" />
              </div>
              <div>
                <h3 className="font-mono text-sm text-white">image_prompt</h3>
                <p className="text-xs text-muted-foreground font-mono">describe your image concept</p>
              </div>
            </div>
            <Badge className="bg-muted text-muted-foreground font-mono text-xs">
              {imagePrompt.length}/1000
            </Badge>
          </div>
        </div>
        <div className="p-6">
          <Textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="A modern entrepreneur working in a bright office with plants, professional atmosphere, natural lighting..."
            className="min-h-[100px] bg-background border-border text-white font-mono text-sm resize-none focus:ring-1 focus:ring-white/20"
            maxLength={1000}
            disabled={isRunning}
          />
          <div className="mt-3 text-xs text-muted-foreground font-mono text-center">
            cost_estimate: 5_credits
          </div>
        </div>
      </Card>

      <Card className="bg-card border border-border">
        <div className="border-b border-border bg-secondary/50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 bg-red-500/20 border border-red-500/30 rounded">
                <Video className="w-3 h-3 text-red-400" />
              </div>
              <div>
                <h3 className="font-mono text-sm text-white">video_prompt</h3>
                <p className="text-xs text-muted-foreground font-mono">describe animation and movement</p>
              </div>
            </div>
            <Badge className="bg-muted text-muted-foreground font-mono text-xs">
              {videoPrompt.length}/500
            </Badge>
          </div>
        </div>
        <div className="p-6">
          <Textarea
            value={videoPrompt}
            onChange={(e) => setVideoPrompt(e.target.value)}
            placeholder="Subtle breathing motion, eyes blinking naturally, hair moving gently in a breeze, professional demeanor..."
            className="min-h-[80px] bg-background border-border text-white font-mono text-sm resize-none focus:ring-1 focus:ring-white/20"
            maxLength={500}
            disabled={isRunning}
          />
          <div className="mt-3 text-xs text-muted-foreground font-mono text-center">
            cost_estimate: 15_credits
          </div>
        </div>
      </Card>

      {/* Configuration technique */}
      <Card className="bg-card border border-border">
        <div className="border-b border-border bg-secondary/50">
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="flex items-center justify-center w-6 h-6 bg-amber-500/20 border border-amber-500/30 rounded">
              <Settings className="w-3 h-3 text-amber-400" />
            </div>
            <div>
              <h3 className="font-mono text-sm text-white">technical_config</h3>
              <p className="text-xs text-muted-foreground font-mono">generation parameters</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Configuration image */}
          <div className="space-y-4">
            <Label className="font-mono text-sm text-white">dalle3_settings</Label>
            
            <div className="space-y-3">
              <div>
                <Label className="font-mono text-xs text-muted-foreground">style</Label>
                <Select value={imageStyle} onValueChange={setImageStyle} disabled={isRunning}>
                  <SelectTrigger className="bg-background border-border text-white font-mono text-sm h-10 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="vivid" className="font-mono">vivid (creative)</SelectItem>
                    <SelectItem value="natural" className="font-mono">natural (realistic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-mono text-xs text-muted-foreground">quality</Label>
                <Select value={imageQuality} onValueChange={setImageQuality} disabled={isRunning}>
                  <SelectTrigger className="bg-background border-border text-white font-mono text-sm h-10 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="hd" className="font-mono">hd (1024×1792px)</SelectItem>
                    <SelectItem value="standard" className="font-mono">standard (1024×1024px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-mono text-xs text-muted-foreground">aspect_ratio</Label>
                <Select value={imageSize} onValueChange={setImageSize} disabled={isRunning}>
                  <SelectTrigger className="bg-background border-border text-white font-mono text-sm h-10 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="1024x1792" className="font-mono">1024×1792 (portrait)</SelectItem>
                    <SelectItem value="1792x1024" className="font-mono">1792×1024 (landscape)</SelectItem>
                    <SelectItem value="1024x1024" className="font-mono">1024×1024 (square)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Configuration vidéo */}
          <div className="border-t border-border pt-4 space-y-4">
            <Label className="font-mono text-sm text-white">veo3_settings</Label>
            
            <div className="space-y-3">
              <div>
                <Label className="font-mono text-xs text-muted-foreground">resolution</Label>
                <Select value={videoResolution} onValueChange={setVideoResolution} disabled={isRunning}>
                  <SelectTrigger className="bg-background border-border text-white font-mono text-sm h-10 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="1080p" className="font-mono">1080p (recommended)</SelectItem>
                    <SelectItem value="720p" className="font-mono">720p (faster)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-xs text-muted-foreground">duration</Label>
                  <Badge className="bg-muted text-muted-foreground font-mono text-xs">8s_fixed</Badge>
                </div>
                <div className="p-3 bg-secondary/30 border border-border rounded text-xs font-mono text-muted-foreground">
                  VEO3 supports fixed 8-second duration
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  checked={generateAudio}
                  onCheckedChange={setGenerateAudio}
                  disabled={isRunning}
                />
                <label className="font-mono text-sm text-white">
                  generate_audio
                </label>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Résultat ou erreur */}
      {(result || error) && (
        <Card className={`border border-border ${
          result ? 'bg-green-500/10 border-green-500/40' : 'bg-red-500/10 border-red-500/40'
        }`}>
          <div className="border-b border-border bg-secondary/50">
            <div className="flex items-center gap-3 px-6 py-4">
              <div className={`flex items-center justify-center w-6 h-6 rounded ${
                result ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {result ? <CheckCircle2 className="w-3 h-3 text-white" /> : <AlertCircle className="w-3 h-3 text-white" />}
              </div>
              <div>
                <h3 className={`font-mono text-sm ${
                  result ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result ? 'workflow_completed' : 'workflow_error'}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {result ? 'pipeline execution successful' : 'pipeline execution failed'}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {result && (
              <div className="space-y-3">
                <div className="text-sm text-green-400 font-mono">
                  ✓ Video generated successfully!
                </div>
                <div className="space-y-2 text-xs font-mono">
                  {result.imageUrl && (
                    <div className="p-2 bg-secondary/30 border border-border rounded">
                      <span className="text-muted-foreground">image_url:</span>
                      <span className="text-white ml-2">{result.imageUrl.substring(0, 40)}...</span>
                    </div>
                  )}
                  {result.videoUrl && (
                    <div className="p-2 bg-secondary/30 border border-border rounded">
                      <span className="text-muted-foreground">video_url:</span>
                      <span className="text-white ml-2">{result.videoUrl.substring(0, 40)}...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {error && (
              <div className="space-y-3">
                <div className="text-sm text-red-400 font-mono">
                  ✗ Pipeline execution failed
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                  <div className="text-xs text-red-400 font-mono">
                    <span className="text-muted-foreground">node:</span> {error.nodeId}
                  </div>
                  <div className="text-xs text-red-400 font-mono mt-1">
                    <span className="text-muted-foreground">error:</span> {error.message}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}