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
import { toast } from 'sonner';

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
      await startWorkflow(config);
    } catch (error) {
      console.error('Failed to start workflow:', error);
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
      <Card className="bg-card/80 backdrop-blur-sm border-secondary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
              <Wand2 className="w-4 h-4" />
              workflow_control
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge className={`text-white font-mono text-xs ${getStatusColor()}`}>
                {getStatusIcon()}
                {isRunning ? 'running' : isPaused ? 'paused' : result ? 'completed' : error ? 'error' : 'idle'}
              </Badge>
              <Badge className="bg-white/10 text-white font-mono text-xs">
                credits: {balance}
              </Badge>
            </div>
          </div>
          
          {/* Progression globale */}
          {(isRunning || result || error) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>step {currentStep}/{totalSteps}</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="progress-enhanced h-2" />
              {totalCreditsUsed > 0 && (
                <div className="text-xs text-muted-foreground font-mono">
                  credits used: {totalCreditsUsed}/{estimatedTotalCost}
                </div>
              )}
            </div>
          )}
        </CardHeader>

        {/* Contrôles principaux */}
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleStart}
              disabled={!canStart}
              className="workflow-button bg-white hover:bg-white/90 text-black font-mono text-xs h-8 px-4 transition-all duration-200"
            >
              <Play className="w-3 h-3 mr-1" />
              start
            </Button>

            {isRunning && (
              <>
                <Button
                  onClick={handlePauseResume}
                  variant="outline"
                  size="sm"
                  className="workflow-button border-secondary text-white hover:bg-secondary/50 font-mono text-xs h-8 transition-all duration-200"
                >
                  {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </Button>
                
                <Button
                  onClick={cancelWorkflow}
                  variant="outline"
                  size="sm"
                  className="workflow-button border-red-500 text-red-400 hover:bg-red-500/10 font-mono text-xs h-8 transition-all duration-200"
                >
                  <Square className="w-3 h-3" />
                </Button>
              </>
            )}

            <Button
              onClick={resetWorkflow}
              variant="outline"
              size="sm"
              disabled={isRunning}
              className="border-secondary text-white hover:bg-secondary/50 font-mono text-xs h-8"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration des prompts */}
      <Card className="bg-card/80 backdrop-blur-sm border-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
            <Image className="w-4 h-4" />
            image_prompt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="min-h-[80px] bg-secondary/50 border-secondary text-white font-mono text-xs"
            maxLength={1000}
            disabled={isRunning}
          />
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground font-mono">
            <span>{imagePrompt.length}/1000</span>
            <span>cost: 5 credits</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-sm border-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
            <Video className="w-4 h-4" />
            video_prompt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={videoPrompt}
            onChange={(e) => setVideoPrompt(e.target.value)}
            placeholder="Describe how the image should be animated..."
            className="min-h-[60px] bg-secondary/50 border-secondary text-white font-mono text-xs"
            maxLength={500}
            disabled={isRunning}
          />
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground font-mono">
            <span>{videoPrompt.length}/500</span>
            <span>cost: 15 credits</span>
          </div>
        </CardContent>
      </Card>

      {/* Configuration technique */}
      <Card className="bg-card/80 backdrop-blur-sm border-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
            <Settings className="w-4 h-4" />
            technical_config
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration image */}
          <div className="space-y-3">
            <Label className="font-mono text-xs text-white">dalle3_settings</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-mono text-xs text-muted-foreground">style</Label>
                <Select value={imageStyle} onValueChange={setImageStyle} disabled={isRunning}>
                  <SelectTrigger className="bg-secondary/50 border-secondary text-white font-mono text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vivid">vivid</SelectItem>
                    <SelectItem value="natural">natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-mono text-xs text-muted-foreground">quality</Label>
                <Select value={imageQuality} onValueChange={setImageQuality} disabled={isRunning}>
                  <SelectTrigger className="bg-secondary/50 border-secondary text-white font-mono text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hd">hd</SelectItem>
                    <SelectItem value="standard">standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="font-mono text-xs text-muted-foreground">aspect_ratio</Label>
              <Select value={imageSize} onValueChange={setImageSize} disabled={isRunning}>
                <SelectTrigger className="bg-secondary/50 border-secondary text-white font-mono text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1792">1024×1792 (portrait)</SelectItem>
                  <SelectItem value="1792x1024">1792×1024 (landscape)</SelectItem>
                  <SelectItem value="1024x1024">1024×1024 (square)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Configuration vidéo */}
          <div className="border-t border-secondary pt-3 space-y-3">
            <Label className="font-mono text-xs text-white">veo3_settings</Label>
            
            <div>
              <Label className="font-mono text-xs text-muted-foreground">resolution</Label>
              <Select value={videoResolution} onValueChange={setVideoResolution} disabled={isRunning}>
                <SelectTrigger className="bg-secondary/50 border-secondary text-white font-mono text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={generateAudio}
                onCheckedChange={setGenerateAudio}
                disabled={isRunning}
              />
              <Label className="font-mono text-xs text-white">generate_audio</Label>
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              duration: 8s (fixed for veo3)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultat ou erreur */}
      {(result || error) && (
        <Card className={`border-secondary ${
          result ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
        }`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 font-mono text-sm ${
              result ? 'text-green-400' : 'text-red-400'
            }`}>
              {result ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {result ? 'workflow_completed' : 'workflow_error'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result && (
              <div className="space-y-2">
                <div className="text-xs text-green-400 font-mono">
                  ✓ Video generated successfully!
                </div>
                {result.imageUrl && (
                  <div className="text-xs text-muted-foreground font-mono">
                    Image: {result.imageUrl.substring(0, 50)}...
                  </div>
                )}
                {result.videoUrl && (
                  <div className="text-xs text-muted-foreground font-mono">
                    Video: {result.videoUrl.substring(0, 50)}...
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <div className="text-xs text-red-400 font-mono">
                Error in {error.nodeId}: {error.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}