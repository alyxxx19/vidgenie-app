'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { WorkflowVisualizer } from './workflow-visualizer';
import { VideoPromptBuilder } from './video-prompt-builder';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useCredits } from '@/hooks/useCredits';
import { 
  Play, 
  Wand2, 
  Settings, 
  Image, 
  Video,
  Sparkles,
  AlertCircle,
  Info,
  Zap,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export interface WorkflowInterfaceProps {
  className?: string;
  projectId?: string;
}

export function WorkflowInterface({ className, projectId }: WorkflowInterfaceProps) {
  // États du formulaire
  const [imagePrompt, setImagePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [imageStyle, setImageStyle] = useState<'natural' | 'vivid'>('vivid');
  const [imageQuality, setImageQuality] = useState<'standard' | 'hd'>('hd');
  const [imageSize, setImageSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1792');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('1080p');
  const [generateAudio, setGenerateAudio] = useState(true);
  const [useAdvancedPrompting, setUseAdvancedPrompting] = useState(false);
  const [videoSettings, setVideoSettings] = useState<any>(null);

  // Hooks
  const { balance, hasEnoughCredits, isLoading: creditsLoading } = useCredits();
  const {
    isRunning,
    workflowId,
    steps,
    status,
    result,
    error,
    isConnected,
    startWorkflow,
    cancelWorkflow,
    reconnect,
    getOverallProgress,
    getCurrentStep,
    getEstimatedTimeRemaining
  } = useWorkflow();

  const WORKFLOW_COST = 20; // 5 pour image + 15 pour vidéo
  const canGenerate = hasEnoughCredits('IMAGE_TO_VIDEO') && imagePrompt.trim() && videoPrompt.trim();

  const handleStartWorkflow = async () => {
    if (!canGenerate) {
      if (!hasEnoughCredits('IMAGE_TO_VIDEO')) {
        toast.error('Insufficient credits', {
          description: `You need ${WORKFLOW_COST} credits but have ${balance}`,
        });
      } else if (!imagePrompt.trim() || !videoPrompt.trim()) {
        toast.error('Please fill in both prompts');
      }
      return;
    }

    try {
      await startWorkflow({
        imagePrompt: imagePrompt.trim(),
        videoPrompt: videoPrompt.trim(),
        imageConfig: {
          style: imageStyle,
          quality: imageQuality,
          size: imageSize,
        },
        videoConfig: {
          duration: '8s',
          resolution: videoResolution,
          generateAudio,
        },
        projectId,
      });
    } catch (error) {
      // Error already handled by useWorkflow hook
    }
  };

  const handleCancel = async () => {
    try {
      await cancelWorkflow();
    } catch (error) {
      // Error already handled by useWorkflow hook
    }
  };

  // Templates de prompts prédéfinis
  const predefinedImagePrompts = [
    'A modern entrepreneur working in a bright office with plants, professional atmosphere, natural lighting',
    'Minimalist workspace with laptop and coffee cup on clean desk, soft morning light through window',
    'Sunset cityscape with glass buildings reflecting golden light, cinematic composition, urban beauty',
    'Person meditating in serene natural environment, peaceful forest setting, zen atmosphere',
    'Colorful abstract art representing creativity and innovation, flowing patterns, vibrant energy',
  ];

  const predefinedVideoPrompts = [
    'Subtle breathing motion, eyes blinking naturally, hair moving gently in a breeze, professional demeanor',
    'Gentle smile forming, eyes brightening with warmth and happiness, natural facial expressions',
    'Person speaking energetically, mouth moving with natural expressions, engaging body language',
    'Clothing fabric swaying softly, background elements with subtle motion, atmospheric movement',
    'Head turning slightly, maintaining eye contact with natural movement, confident presence',
  ];

  return (
    <div className={`max-w-6xl mx-auto space-y-8 ${className}`}>
      {/* Header moderne avec indicateurs */}
      <div className="border-b border-border pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="flex items-center gap-3 font-mono text-xl text-white">
              <div className="flex items-center justify-center w-8 h-8 bg-white rounded border">
                <Wand2 className="w-4 h-4 text-black" />
              </div>
              image_to_video_workflow
            </h1>
            <p className="text-sm text-muted-foreground font-mono max-w-md">
              Complete AI pipeline: DALL-E 3 image generation → VEO 3 video creation
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-mono">available credits</div>
              <div className="font-mono text-lg text-white">
                {creditsLoading ? '...' : balance}
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-mono">workflow cost</div>
              <div className="font-mono text-lg text-white">
                {WORKFLOW_COST}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interface principale - Layout moderne */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Prompt Section */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="border-b border-border bg-secondary/50">
              <div className="flex items-center gap-3 px-6 py-4">
                <div className="flex items-center justify-center w-6 h-6 bg-white rounded">
                  <Image className="w-3 h-3 text-black" />
                </div>
                <div>
                  <h3 className="font-mono text-sm text-white">image_prompt</h3>
                  <p className="text-xs text-muted-foreground font-mono">describe your image concept</p>
                </div>
                <div className="ml-auto">
                  <Badge className="bg-muted text-muted-foreground font-mono text-xs">
                    {imagePrompt.length}/2000
                  </Badge>
                </div>
              </div>
            </div>
            <div className="p-6">
              <Textarea
                placeholder="A modern entrepreneur working in a bright office with plants, professional atmosphere, natural lighting..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="min-h-[100px] bg-background border-border text-white font-mono text-sm resize-none focus:ring-1 focus:ring-white/20"
                maxLength={2000}
                disabled={isRunning}
              />
              <div className="mt-4 space-y-3">
                <div className="text-xs text-muted-foreground font-mono">quick templates:</div>
                <div className="flex flex-wrap gap-2">
                  {predefinedImagePrompts.slice(0, 3).map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setImagePrompt(prompt)}
                      disabled={isRunning}
                      className="px-3 py-1.5 text-xs font-mono border border-border hover:border-white/40 hover:bg-white/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    >
                      template_{idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Video Prompt Section */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="border-b border-border bg-secondary/50">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-white rounded">
                    <Video className="w-3 h-3 text-black" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm text-white">video_prompt</h3>
                    <p className="text-xs text-muted-foreground font-mono">describe animation and movement</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground font-mono">advanced mode</div>
                  <Switch
                    checked={useAdvancedPrompting}
                    onCheckedChange={setUseAdvancedPrompting}
                    disabled={isRunning}
                  />
                </div>
              </div>
            </div>
            <div className="p-6">
              {useAdvancedPrompting ? (
                <VideoPromptBuilder
                  value={videoPrompt}
                  onChange={setVideoPrompt}
                  onSettingsChange={setVideoSettings}
                />
              ) : (
                <>
                  <Textarea
                    placeholder="Subtle breathing motion, eyes blinking naturally, hair moving gently in a breeze, professional demeanor..."
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    className="min-h-[80px] bg-background border-border text-white font-mono text-sm resize-none focus:ring-1 focus:ring-white/20"
                    maxLength={1000}
                    disabled={isRunning}
                  />
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-mono">motion templates:</div>
                    <Badge className="bg-muted text-muted-foreground font-mono text-xs">
                      {videoPrompt.length}/1000
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {predefinedVideoPrompts.slice(0, 3).map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setVideoPrompt(prompt)}
                        disabled={isRunning}
                        className="px-3 py-1.5 text-xs font-mono border border-border hover:border-white/40 hover:bg-white/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                      >
                        motion_{idx + 1}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Technical Configuration */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* DALL-E Settings */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="border-b border-border bg-secondary/50">
                <div className="flex items-center gap-3 px-6 py-4">
                  <div className="flex items-center justify-center w-6 h-6 bg-white rounded">
                    <Settings className="w-3 h-3 text-black" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm text-white">dall_e_config</h3>
                    <p className="text-xs text-muted-foreground font-mono">image generation settings</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="font-mono text-xs text-muted-foreground">style</Label>
                  <Select value={imageStyle} onValueChange={setImageStyle} disabled={isRunning}>
                    <SelectTrigger className="bg-background border-border text-white font-mono text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="vivid" className="font-mono">vivid (creative)</SelectItem>
                      <SelectItem value="natural" className="font-mono">natural (realistic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-xs text-muted-foreground">quality</Label>
                  <Select value={imageQuality} onValueChange={setImageQuality} disabled={isRunning}>
                    <SelectTrigger className="bg-background border-border text-white font-mono text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="hd" className="font-mono">hd (1024×1792px)</SelectItem>
                      <SelectItem value="standard" className="font-mono">standard (1024×1024px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-xs text-muted-foreground">aspect_ratio</Label>
                  <Select value={imageSize} onValueChange={setImageSize} disabled={isRunning}>
                    <SelectTrigger className="bg-background border-border text-white font-mono text-sm h-10">
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

            {/* VEO Settings */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="border-b border-border bg-secondary/50">
                <div className="flex items-center gap-3 px-6 py-4">
                  <div className="flex items-center justify-center w-6 h-6 bg-white rounded">
                    <Video className="w-3 h-3 text-black" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm text-white">veo3_config</h3>
                    <p className="text-xs text-muted-foreground font-mono">video generation settings</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="font-mono text-xs text-muted-foreground">resolution</Label>
                  <Select value={videoResolution} onValueChange={setVideoResolution} disabled={isRunning}>
                    <SelectTrigger className="bg-background border-border text-white font-mono text-sm h-10">
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
                    id="generateAudio"
                    checked={generateAudio}
                    onCheckedChange={setGenerateAudio}
                    disabled={isRunning}
                  />
                  <label htmlFor="generateAudio" className="font-mono text-sm text-white">
                    generate_audio
                  </label>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Control Panel - Right Column */}
        <div className="space-y-6">
          {/* Workflow Status */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="border-b border-border bg-secondary/50">
              <div className="flex items-center gap-3 px-6 py-4">
                <div className="flex items-center justify-center w-6 h-6 bg-white rounded">
                  <Zap className="w-3 h-3 text-black" />
                </div>
                <div>
                  <h3 className="font-mono text-sm text-white">execution_control</h3>
                  <p className="text-xs text-muted-foreground font-mono">workflow management</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Cost and Timing Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-secondary/30 border border-border rounded">
                  <div className="text-xs text-muted-foreground font-mono mb-1">estimated_cost</div>
                  <div className="text-lg font-mono text-white">{WORKFLOW_COST}</div>
                  <div className="text-xs text-muted-foreground font-mono">credits</div>
                </div>
                <div className="text-center p-4 bg-secondary/30 border border-border rounded">
                  <div className="text-xs text-muted-foreground font-mono mb-1">estimated_time</div>
                  <div className="text-lg font-mono text-white">~3</div>
                  <div className="text-xs text-muted-foreground font-mono">minutes</div>
                </div>
              </div>

              {/* Pipeline Preview */}
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground font-mono">pipeline_overview:</div>
                <div className="flex items-center text-xs font-mono text-white">
                  <span>prompt</span>
                  <ArrowRight className="w-3 h-3 mx-2 text-muted-foreground" />
                  <span>dall_e_3</span>
                  <ArrowRight className="w-3 h-3 mx-2 text-muted-foreground" />
                  <span>veo_3</span>
                  <ArrowRight className="w-3 h-3 mx-2 text-muted-foreground" />
                  <span>output</span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={isRunning ? handleCancel : handleStartWorkflow}
                disabled={!isRunning && (!canGenerate || creditsLoading)}
                size="lg"
                className={`w-full font-mono text-sm h-12 transition-all duration-200 ${
                  isRunning 
                    ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
                    : 'bg-white hover:bg-white/90 text-black border-white hover:scale-[1.02]'
                }`}
              >
                {isRunning ? (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    cancel_workflow
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    start_generation
                  </>
                )}
              </Button>

              {/* Validation Messages */}
              <div className="space-y-2">
                {!hasEnoughCredits('IMAGE_TO_VIDEO') && (
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-red-400 font-mono font-medium">insufficient_credits</div>
                      <div className="text-xs text-red-400/80 font-mono">
                        Need {WORKFLOW_COST}, have {balance}
                      </div>
                    </div>
                  </div>
                )}

                {(!imagePrompt.trim() || !videoPrompt.trim()) && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                    <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-yellow-400 font-mono font-medium">prompts_required</div>
                      <div className="text-xs text-yellow-400/80 font-mono">
                        Both image and video prompts needed
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visualization Area */}
          {workflowId ? (
            <WorkflowVisualizer
              workflowId={workflowId}
              initialSteps={steps}
              onComplete={(result) => {
                toast.success('Workflow completed!', {
                  description: 'Your image and video are ready for download.',
                });
              }}
              onError={(error) => {
                toast.error('Workflow failed', {
                  description: error.message,
                });
              }}
              onCancel={() => {
                toast.info('Workflow cancelled');
              }}
            />
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="border-b border-border bg-secondary/50">
                <div className="flex items-center gap-3 px-6 py-4">
                  <div className="flex items-center justify-center w-6 h-6 bg-white rounded">
                    <Sparkles className="w-3 h-3 text-black" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm text-white">workflow_preview</h3>
                    <p className="text-xs text-muted-foreground font-mono">real-time generation progress</p>
                  </div>
                </div>
              </div>
              <div className="p-6 sm:p-8 lg:p-12">
                <div className="text-center space-y-4 sm:space-y-6">
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center">
                      <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-mono text-xs sm:text-sm text-white">awaiting_execution</h3>
                    <p className="text-xs text-muted-foreground font-mono max-w-xs mx-auto leading-relaxed">
                      Configure your image and video prompts above, then start generation to see real-time progress here.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-center">powered by openai + veo3</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connection Status */}
          {workflowId && (
            <div className="flex items-center justify-center gap-3 p-3 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                } ${isConnected ? 'animate-pulse' : ''}`} />
                <span className="font-mono text-xs text-white">
                  {isConnected ? 'connected' : 'disconnected'}
                </span>
              </div>
              {!isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reconnect}
                  className="h-6 px-2 font-mono text-xs border-border hover:border-white/40"
                >
                  reconnect
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}