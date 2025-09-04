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
  Zap
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
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec crédits */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
              <Wand2 className="w-4 h-4" />
              image_to_video_workflow
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge className="bg-white text-black font-mono text-xs">
                credits: {creditsLoading ? '...' : balance}
              </Badge>
              <Badge className="bg-purple-500 text-white font-mono text-xs">
                cost: {WORKFLOW_COST}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Info className="w-3 h-3" />
            <span>Complete pipeline: DALL-E 3 image generation → Google VEO 3 video creation</span>
          </div>
        </CardContent>
      </Card>

      {/* Interface principale */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Colonne gauche - Configuration */}
        <div className="space-y-4">
          {/* Prompts */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                <Image className="w-4 h-4" />
                image_prompt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Describe the image you want to generate..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="min-h-[80px] bg-white border-border text-black font-mono text-xs"
                maxLength={2000}
                disabled={isRunning}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {predefinedImagePrompts.slice(0, 2).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImagePrompt(prompt)}
                    disabled={isRunning}
                    className="text-xs text-muted-foreground hover:text-white border border-border hover:border-white/20 px-2 py-1 font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    example_{idx + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Video Prompt - Simple ou Avancé */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 font-mono text-sm text-white">
                <Video className="w-4 h-4" />
                video_prompt
              </Label>
              <div className="flex items-center gap-2">
                <Label className="font-mono text-xs text-muted-foreground">advanced</Label>
                <Switch
                  checked={useAdvancedPrompting}
                  onCheckedChange={setUseAdvancedPrompting}
                  disabled={isRunning}
                />
              </div>
            </div>

            {useAdvancedPrompting ? (
              <VideoPromptBuilder
                value={videoPrompt}
                onChange={setVideoPrompt}
                onSettingsChange={setVideoSettings}
              />
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="pt-4">
                  <Textarea
                    placeholder="Describe how the image should be animated (e.g., subtle breathing, blinking eyes, gentle movement)..."
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    className="min-h-[60px] bg-white border-border text-black font-mono text-xs"
                    maxLength={1000}
                    disabled={isRunning}
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {predefinedVideoPrompts.slice(0, 2).map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setVideoPrompt(prompt)}
                        disabled={isRunning}
                        className="text-xs text-muted-foreground hover:text-white border border-border hover:border-white/20 px-2 py-1 font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        motion_{idx + 1}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Configuration technique */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                <Settings className="w-4 h-4" />
                technical_settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Settings */}
              <div className="space-y-3">
                <Label className="font-mono text-xs text-white">dalle3_configuration</Label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">style</Label>
                    <Select value={imageStyle} onValueChange={setImageStyle} disabled={isRunning}>
                      <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vivid">vivid (creative)</SelectItem>
                        <SelectItem value="natural">natural (realistic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">quality</Label>
                    <Select value={imageQuality} onValueChange={setImageQuality} disabled={isRunning}>
                      <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hd">hd (1024×1792px)</SelectItem>
                        <SelectItem value="standard">standard (1024×1024px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="font-mono text-xs text-muted-foreground">aspect_ratio</Label>
                  <Select value={imageSize} onValueChange={setImageSize} disabled={isRunning}>
                    <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
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

              <div className="border-t border-border pt-3 space-y-3">
                <Label className="font-mono text-xs text-white">veo3_configuration</Label>
                
                <div>
                  <Label className="font-mono text-xs text-muted-foreground">resolution</Label>
                  <Select value={videoResolution} onValueChange={setVideoResolution} disabled={isRunning}>
                    <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1080p">1080p (recommended)</SelectItem>
                      <SelectItem value="720p">720p (faster)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="font-mono text-xs text-muted-foreground">duration</Label>
                  <Badge className="bg-muted text-muted-foreground font-mono text-xs">8s_fixed</Badge>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="generateAudio"
                    checked={generateAudio}
                    onCheckedChange={setGenerateAudio}
                    disabled={isRunning}
                  />
                  <label htmlFor="generateAudio" className="font-mono text-xs text-white">
                    generate_audio
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="space-y-2">
            <Button
              onClick={isRunning ? handleCancel : handleStartWorkflow}
              disabled={!isRunning && (!canGenerate || creditsLoading)}
              className={`w-full font-mono text-xs h-10 ${
                isRunning 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-white hover:bg-white/90 text-black'
              }`}
            >
              {isRunning ? (
                <>
                  <AlertCircle className="w-3 h-3 mr-2" />
                  cancel_workflow
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-2" />
                  start_generation
                </>
              )}
            </Button>

            {/* Informations de coût et temps */}
            <div className="text-center text-xs text-muted-foreground font-mono space-y-1">
              <p>cost: {WORKFLOW_COST} credits | eta: ~3 minutes</p>
              <p>pipeline: dalle3 → veo3 → cdn_upload</p>
            </div>

            {/* Avertissements */}
            {!hasEnoughCredits('IMAGE_TO_VIDEO') && (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span className="font-mono">Insufficient credits: {balance}/{WORKFLOW_COST}</span>
              </div>
            )}

            {(!imagePrompt.trim() || !videoPrompt.trim()) && (
              <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400">
                <AlertCircle className="w-3 h-3" />
                <span className="font-mono">Please provide both image and video prompts</span>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite - Visualisation */}
        <div className="space-y-4">
          {workflowId && (
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
          )}

          {!workflowId && !isRunning && (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-mono text-sm text-white mb-2">ready_to_generate</h3>
                <p className="text-xs text-muted-foreground font-mono max-w-sm">
                  Configure your prompts and settings, then click "start_generation" to begin the image-to-video workflow.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  <span className="font-mono">powered by openai + google veo3</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statut de connexion */}
          {workflowId && (
            <div className="text-center">
              <Badge className={`font-mono text-xs ${
                isConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {isConnected ? 'connected' : 'disconnected'}
              </Badge>
              {!isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reconnect}
                  className="ml-2 h-6 font-mono text-xs"
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