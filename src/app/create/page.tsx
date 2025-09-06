'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PromptBuilder } from '@/components/prompt-builder';
import { VideoPromptBuilder } from '@/components/video-prompt-builder';
import { WorkflowInterface } from '@/components/workflow-interface';
import { WorkflowInterfaceV2 } from '@/components/workflow/workflow-interface-v2';
import { WorkflowStepsVisualizer } from '@/components/workflow-steps-visualizer';
import { WorkflowTypeSelector, WorkflowType } from '@/components/workflow/WorkflowTypeSelector';
import { useWorkflowStore } from '@/components/workflow/store/workflow-store';
import { promptUtils } from '@/lib/utils/prompt-utils';
import { 
  Wand2, 
  Clock, 
  Settings,
  CheckCircle,
  Video,
  Image,
  PlayCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '@/app/providers';
import { toast } from 'sonner';
import Link from 'next/link';
// import { useMockImageGeneration } from '@/hooks/useMockImageGeneration';
import { useDevImageGeneration } from '@/hooks/useDevImageGeneration';
import { useTestPromptEnhancement } from '@/hooks/useTestPromptEnhancement';
import { useCredits, useCreditsCheck, CREDIT_COSTS } from '@/hooks/useCredits';
import { CreditsDisplay, CostEstimator } from '@/components/credits-display';

export default function CreatePage() {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  
  // Crédits
  const { balance, hasEnoughCredits, isLoading: creditsLoading } = useCredits();
  const imageCreditsCheck = useCreditsCheck('IMAGE_GENERATION');
  const videoCreditsCheck = useCreditsCheck('VIDEO_GENERATION');
  
  // Image generation states
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState<'natural' | 'vivid'>('vivid');
  const [imageQuality, setImageQuality] = useState<'standard' | 'hd'>('hd');
  const [imageSize, setImageSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1792');
  
  // Advanced prompt settings
  const [enhanceEnabled, setEnhanceEnabled] = useState(true);
  const [temperature, setTemperature] = useState(0.7);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [artStyle, setArtStyle] = useState('');
  const [composition, setComposition] = useState('');
  const [mood, setMood] = useState('');
  
  // Video generation states
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('1080p');
  const [generateAudio, setGenerateAudio] = useState(true);
  const [videoSettings, setVideoSettings] = useState<any>(null);
  
  // General states
  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [workflowMode, setWorkflowMode] = useState<'complete' | 'image-only' | 'video-from-image' | 'workflow'>('workflow');
  const [selectedWorkflowType, setSelectedWorkflowType] = useState<WorkflowType | null>(null);
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [workflowCurrentStep, setWorkflowCurrentStep] = useState(0);

  // Load prompt from URL params if provided
  useEffect(() => {
    const urlPrompt = searchParams?.get('prompt');
    if (urlPrompt) {
      setImagePrompt(decodeURIComponent(urlPrompt));
      setVideoPrompt(decodeURIComponent(urlPrompt));
    }
  }, [searchParams]);

  if (authLoading) {
    return <div className="min-h-screen bg-minimal-gradient flex items-center justify-center">
      <div className="text-center animate-slide-in">
        <div className="w-8 h-8 border border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground font-mono text-xs">initializing_creator...</p>
      </div>
    </div>;
  }

  if (!user && process.env.NODE_ENV !== 'development') {
    redirect('/auth/signin');
  }

  // Real OpenAI image generation hook
  const { 
    generateImage: generateRealImage, 
    isGenerating: isGeneratingReal, 
    generationResult: realResult,
    error: realError 
  } = useDevImageGeneration();
  
  // Test prompt enhancement hook (no DB required)
  const {
    testPromptEnhancement,
    isGenerating: isTestingPrompt,
    testResult,
    error: testError
  } = useTestPromptEnhancement();


  // Complete workflow mutation
  const generateCompleteWorkflowMutation = api.generation.generateImageToVideo.useMutation({
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      toast.success('Image-to-video workflow started');
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(error.message);
    },
  });

  const jobStatusQuery = api.generation.getJobStatus.useQuery(
    { jobId: currentJobId! },
    { 
      enabled: !!currentJobId,
      refetchInterval: !!currentJobId ? 2000 : false,
    }
  );
  
  const jobStatus = jobStatusQuery.data;

  // Mise à jour du workflow step basé sur le statut du job
  useEffect(() => {
    if (!jobStatus || workflowMode === 'workflow') return;

    let step = 0;
    switch (jobStatus.status) {
      case 'QUEUED':
        step = 1;
        break;
      case 'GENERATING_IMAGE':
        step = workflowMode === 'complete' ? 2 : 2;
        break;
      case 'IMAGE_READY':
        step = workflowMode === 'complete' ? 3 : workflowMode === 'image-only' ? 3 : 1;
        break;
      case 'GENERATING_VIDEO':
        step = workflowMode === 'complete' ? 4 : 2;
        break;
      case 'VIDEO_READY':
        step = workflowMode === 'complete' ? 5 : 3;
        break;
      case 'FAILED':
        step = workflowCurrentStep; // Garde l'étape courante en cas d'erreur
        break;
      default:
        step = 0;
    }
    setWorkflowCurrentStep(step);
  }, [jobStatus, workflowMode, workflowCurrentStep]);

  // Réinitialiser le workflow step quand on change de mode
  useEffect(() => {
    setWorkflowCurrentStep(0);
    setCurrentJobId(null);
  }, [workflowMode]);

  const { data: userProjects } = api.projects.list.useQuery();

  const handleGenerate = async () => {
    if (workflowMode === 'complete') {
      if (!imagePrompt.trim() || !videoPrompt.trim()) {
        toast.error('Please provide both image and video prompts');
        return;
      }
      
      // Vérifier les crédits pour le workflow complet
      const totalCost = CREDIT_COSTS.IMAGE_TO_VIDEO + (enhanceEnabled ? CREDIT_COSTS.GPT_ENHANCEMENT : 0);
      if (!hasEnoughCredits('IMAGE_TO_VIDEO', enhanceEnabled ? CREDIT_COSTS.GPT_ENHANCEMENT : 0)) {
        const shortage = totalCost - balance;
        toast.error(`Insufficient credits. You need ${shortage} more credits for this workflow.`);
        return;
      }
      
      setIsGenerating(true);
      generateCompleteWorkflowMutation.mutate({
        imagePrompt: imagePrompt.trim(),
        videoPrompt: videoPrompt.trim(),
        imageStyle,
        imageQuality,
        videoDuration: '8s' as const,
        videoResolution,
        generateAudio,
        projectId: selectedProject,
      });
    } else if (workflowMode === 'image-only') {
      if (!imagePrompt.trim()) {
        toast.error('Please provide an image prompt');
        return;
      }
      
      // Vérifier les crédits pour l'image
      const imageCost = CREDIT_COSTS.IMAGE_GENERATION + (enhanceEnabled ? CREDIT_COSTS.GPT_ENHANCEMENT : 0);
      if (!hasEnoughCredits('IMAGE_GENERATION', enhanceEnabled ? CREDIT_COSTS.GPT_ENHANCEMENT : 0)) {
        const shortage = imageCost - balance;
        toast.error(`Insufficient credits. You need ${shortage} more credits for image generation.`);
        return;
      }
      
      // Use real OpenAI generation with enhanced prompts
      setIsGenerating(true);
      const result = await generateRealImage({
        prompt: imagePrompt.trim(),
        style: imageStyle,
        quality: imageQuality,
        size: imageSize,
        projectId: selectedProject,
        // Advanced options
        enhanceEnabled,
        temperature,
        negativePrompt: negativePrompt.trim() || undefined,
        artStyle: artStyle || undefined,
        composition: composition || undefined,
        mood: mood || undefined,
      });
      
      setIsGenerating(false);
      
      if (result) {
        toast.success('Image generated successfully!');
      }
    }
  };

  const predefinedImagePrompts = [
    'a modern entrepreneur working in a bright office with plants',
    'minimalist workspace with laptop and coffee cup',
    'sunset cityscape with glass buildings reflecting golden light',
    'person meditating in serene natural environment',
    'colorful abstract art representing creativity and innovation',
  ];

  const predefinedVideoPrompts = [
    'subtle breathing motion, eyes blinking naturally, hair moving gently in a breeze',
    'gentle smile forming, eyes brightening with warmth and happiness',
    'person speaking energetically, mouth moving with natural expressions',
    'clothing fabric swaying softly, background elements with subtle motion',
    'head turning slightly, maintaining eye contact with natural movement',
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VIDEO_READY':
        return <Badge className="bg-white text-black font-mono text-xs">video_complete</Badge>;
      case 'IMAGE_READY':
        return <Badge className="bg-blue-500 text-white font-mono text-xs">image_ready</Badge>;
      case 'GENERATING_VIDEO':
        return <Badge className="bg-purple-500 text-white font-mono text-xs animate-minimal-pulse">generating_video</Badge>;
      case 'GENERATING_IMAGE':
        return <Badge className="bg-orange-500 text-white font-mono text-xs animate-minimal-pulse">generating_image</Badge>;
      case 'QUEUED':
        return <Badge className="bg-muted text-white font-mono text-xs">queued</Badge>;
      case 'FAILED':
        return <Badge className="bg-destructive text-white font-mono text-xs">failed</Badge>;
      default:
        return <Badge variant="secondary" className="font-mono text-xs">{status}</Badge>;
    }
  };

  const handleWorkflowTypeSelect = (type: WorkflowType) => {
    setSelectedWorkflowType(type);
  };

  const { generateWorkflowFromTemplate } = useWorkflowStore();

  const handleContinueToConfiguration = () => {
    setShowWorkflowSelector(false);
    if (selectedWorkflowType) {
      generateWorkflowFromTemplate(selectedWorkflowType);
      toast.success(`${selectedWorkflowType} workflow generated!`);
    }
  };

  const handleBackToSelector = () => {
    setShowWorkflowSelector(true);
    setSelectedWorkflowType(null);
  };

  return (
    <div className="min-h-screen bg-minimal-gradient relative">
      {/* Minimal grid */}
      <div className="absolute inset-0 bg-grid-minimal opacity-30" />
      
      {/* Header */}
      <header className="bg-card border-b border-border relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="animate-slide-in flex items-center justify-between">
            <div>
              <h1 className="font-mono text-lg text-white mb-1">
                {showWorkflowSelector ? 'workflow_creator' : 
                 selectedWorkflowType === 'text-to-video' ? 'text_to_video_ai' :
                 selectedWorkflowType === 'text-to-image' ? 'text_to_image_ai' :
                 selectedWorkflowType === 'image-to-video' ? 'image_to_video_ai' :
                 'content_generator_ai'}
              </h1>
              <p className="text-muted-foreground text-xs font-mono">
                {showWorkflowSelector ? 'select your content creation workflow type' :
                 selectedWorkflowType === 'text-to-video' ? 'generate videos directly from text descriptions' :
                 selectedWorkflowType === 'text-to-image' ? 'create images with dall-e 3' :
                 selectedWorkflowType === 'image-to-video' ? 'animate images with veo3' :
                 'create content with ai'}
              </p>
            </div>
            {!showWorkflowSelector && (
              <Button
                variant="outline"
                onClick={handleBackToSelector}
                className="border-border hover:border-white/40 hover:bg-white/5 text-white font-mono text-xs h-8"
              >
                <ArrowRight className="w-3 h-3 mr-1 rotate-180" />
                back_to_selection
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Affichage des crédits */}
        <div className="mb-6">
          <CreditsDisplay variant="compact" />
        </div>

        {/* Workflow Type Selector */}
        {showWorkflowSelector && (
          <WorkflowTypeSelector
            selectedType={selectedWorkflowType}
            onSelect={handleWorkflowTypeSelect}
            onContinue={selectedWorkflowType ? handleContinueToConfiguration : undefined}
          />
        )}
        
        {/* Smart Workflow Interface - Only show after workflow type is selected */}
        {!showWorkflowSelector && workflowMode === 'workflow' && selectedWorkflowType && (
          <WorkflowInterfaceV2 projectId={selectedProject} />
        )}

        {/* Workflow Steps Visualizer - New Design */}
        {!showWorkflowSelector && workflowMode !== 'workflow' && (
          <div className="mb-8">
            <WorkflowStepsVisualizer 
              workflowType={workflowMode as 'complete' | 'image-only' | 'video-from-image'}
              currentStep={workflowCurrentStep}
              onStepClick={(stepId) => {
                console.log('Step clicked:', stepId);
                // Ici on pourrait ajouter une logique pour expliquer chaque étape
              }}
            />
          </div>
        )}
        
        {/* Legacy Interface */}
        {!showWorkflowSelector && workflowMode !== 'workflow' && (
          <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Input */}
          <div className="lg:col-span-1 space-y-4">
            {/* Workflow Mode Selection */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                  <ArrowRight className="w-4 h-4" />
                  workflow_mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { id: 'workflow', label: 'smart_workflow', desc: 'Advanced pipeline with real-time visualization', icon: Sparkles },
                    { id: 'complete', label: 'image_to_video', desc: 'Complete workflow: image → video', icon: ArrowRight },
                    { id: 'image-only', label: 'image_only', desc: 'Generate image with DALL-E 3', icon: Image },
                    { id: 'video-from-image', label: 'video_from_image', desc: 'Create video from existing image', icon: PlayCircle },
                  ].map((mode) => (
                    <div 
                      key={mode.id}
                      className={`p-2 border cursor-pointer transition-colors ${
                        workflowMode === mode.id 
                          ? 'border-white bg-white/5' 
                          : 'border-border hover:border-white/20'
                      }`}
                      onClick={() => setWorkflowMode(mode.id as any)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <mode.icon className="w-3 h-3 text-white" />
                        <span className="font-mono text-xs text-white">{mode.label}</span>
                        {mode.id === 'workflow' && <Badge className="bg-green-500 text-white font-mono text-xs">new</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{mode.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Image Prompt - Use advanced PromptBuilder for image-only mode */}
            {workflowMode === 'image-only' ? (
              <PromptBuilder
                value={imagePrompt}
                onChange={setImagePrompt}
                onEnhanceToggle={setEnhanceEnabled}
                enhanceEnabled={enhanceEnabled}
              />
            ) : (workflowMode === 'complete' || workflowMode === 'video-from-image') && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                    <Image className="w-4 h-4" />
                    image_prompt
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="A modern entrepreneur working in a bright office with plants..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="min-h-[60px] bg-white border-border text-black font-mono text-xs"
                    maxLength={1000}
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {predefinedImagePrompts.slice(0, 3).map((promptText, idx) => (
                      <button
                        key={idx}
                        onClick={() => setImagePrompt(promptText)}
                        className="text-xs text-muted-foreground hover:text-white border border-border hover:border-white/20 px-2 py-1 font-mono transition-colors"
                      >
                        {promptText.split(' ').slice(0, 3).join('_')}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Video Prompt (for complete and video-from-image modes) */}
            {(workflowMode === 'complete' || workflowMode === 'video-from-image') && (
              <VideoPromptBuilder
                value={videoPrompt}
                onChange={setVideoPrompt}
                onSettingsChange={setVideoSettings}
                onEnhanceToggle={setEnhanceEnabled}
                enhanceEnabled={enhanceEnabled}
              />
            )}

            {/* Video Template Showcase for video modes */}
            {(workflowMode === 'complete' || workflowMode === 'video-from-image') && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                    <Sparkles className="w-4 h-4" />
                    quick_templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { name: 'Product Showcase', desc: 'Professional 360° rotation', emoji: '📦' },
                      { name: 'Abstract Motion', desc: 'Fluid patterns & colors', emoji: '🎨' },
                      { name: 'Character Action', desc: 'Dynamic expressions', emoji: '🎭' },
                    ].map((template, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          // This would normally apply the full template
                          const samplePrompts = [
                            'Professional product display with smooth 360° rotation, premium lighting',
                            'Abstract fluid patterns with organic movement, vibrant colors morphing',
                            'Dynamic character performing expressive actions, engaging personality'
                          ];
                          setVideoPrompt(samplePrompts[idx]);
                        }}
                        className="flex items-center gap-3 p-3 text-left border border-border hover:border-white/20 hover:bg-white/5 transition-colors"
                      >
                        <span className="text-lg">{template.emoji}</span>
                        <div>
                          <div className="font-mono text-xs text-white">{template.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{template.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-center">
                    <button className="font-mono text-xs text-muted-foreground hover:text-white transition-colors">
                      → browse_all_templates (15+)
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Selection */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                  <Settings className="w-4 h-4" />
                  project_settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="font-mono text-xs text-white">project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
                      <SelectValue placeholder="Select project (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/20 shadow-lg">
                      {userProjects?.map((project) => (
                        <SelectItem key={project.id} value={project.id} className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Configuration */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                  <Settings className="w-4 h-4" />
                  configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image Configuration */}
                {(workflowMode === 'complete' || workflowMode === 'image-only') && (
                  <div className="space-y-3 border-b border-border pb-3">
                    <Label className="flex items-center gap-2 font-mono text-xs text-white">
                      <Settings className="w-3 h-3" />
                      dalle3_settings
                    </Label>
                    
                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">style</Label>
                      <Select value={imageStyle} onValueChange={(value: any) => setImageStyle(value)}>
                        <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white/20 shadow-lg">
                          <SelectItem value="vivid" className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">vivid (more creative)</SelectItem>
                          <SelectItem value="natural" className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">natural (more realistic)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">quality</Label>
                      <Select value={imageQuality} onValueChange={(value: any) => setImageQuality(value)}>
                        <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white/20 shadow-lg">
                          <SelectItem value="hd" className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">hd (1024×1792px, 5 credits)</SelectItem>
                          <SelectItem value="standard" className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">standard (1024×1024px, 3 credits)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">dimensions</Label>
                      <Select value={imageSize} onValueChange={(value: any) => setImageSize(value)}>
                        <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white/20 shadow-lg">
                          <SelectItem value="1024x1792" className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">1024×1792 (portrait)</SelectItem>
                          <SelectItem value="1792x1024" className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">1792×1024 (landscape)</SelectItem>
                          <SelectItem value="1024x1024" className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">1024×1024 (square)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cost Estimation for image-only mode */}
                    {workflowMode === 'image-only' && (
                      <div className="p-2 bg-secondary/30 border border-border rounded">
                        <div className="text-xs font-mono text-white mb-1">cost_estimate:</div>
                        <CostEstimator 
                          operations={{
                            IMAGE_GENERATION: 1,
                            ...(enhanceEnabled && { GPT_ENHANCEMENT: 1 })
                          }}
                        />
                        {!imageCreditsCheck.canPerform && (
                          <div className="text-xs text-red-400 font-mono mt-1">
                            ⚠️ {imageCreditsCheck.message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Video Configuration */}
                {(workflowMode === 'complete' || workflowMode === 'video-from-image') && (
                  <div className="space-y-3">
                    <Label className="font-mono text-xs text-white">video_settings</Label>
                    
                    {/* Cost estimation pour complete workflow */}
                    {workflowMode === 'complete' && (
                      <div className="p-2 bg-secondary/30 border border-border rounded">
                        <div className="text-xs font-mono text-white mb-1">workflow_cost:</div>
                        <CostEstimator 
                          operations={{
                            IMAGE_TO_VIDEO: 1,
                            ...(enhanceEnabled && { GPT_ENHANCEMENT: 1 })
                          }}
                        />
                        {!hasEnoughCredits('IMAGE_TO_VIDEO', enhanceEnabled ? CREDIT_COSTS.GPT_ENHANCEMENT : 0) && (
                          <div className="text-xs text-red-400 font-mono mt-1">
                            ⚠️ Insufficient credits for complete workflow
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">duration: 8s (fixed)</Label>
                      <div className="mt-1 p-2 bg-muted border border-border text-muted-foreground font-mono text-xs">
                        Fal.ai Veo3 only supports 8-second videos
                      </div>
                    </div>

                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">resolution</Label>
                      <Select value={videoResolution} onValueChange={(value: any) => setVideoResolution(value)}>
                        <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white/20 shadow-lg">
                          <SelectItem value="720p" className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">720p</SelectItem>
                          <SelectItem value="1080p" className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">1080p</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">audio_generation</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="checkbox"
                          id="generateAudio"
                          checked={generateAudio}
                          onChange={(e) => setGenerateAudio(e.target.checked)}
                          className="h-3 w-3"
                        />
                        <label htmlFor="generateAudio" className="font-mono text-xs text-white">
                          generate_audio {!generateAudio && '(saves 33% credits)'}
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview & Actions */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm text-white">preview_&_generation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Generation Status */}
                {(realResult || testResult) ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">status</span>
                      <Badge className="bg-white text-black font-mono text-xs">image_ready</Badge>
                    </div>
                    
                    <div className="border border-border overflow-hidden">
                      <img 
                        src={(realResult?.imageUrl || testResult?.mockImageUrl) || ''} 
                        alt="Generated image" 
                        className="w-full h-auto"
                        style={{ maxHeight: '200px', objectFit: 'contain' }}
                      />
                    </div>

                    <div className="p-3 bg-secondary border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-white" />
                        <span className="font-mono text-xs text-white">generation_complete</span>
                      </div>
                      
                      {/* Enhanced Prompt Display */}
                      {((realResult?.enhancedPrompt && realResult.enhancedPrompt !== realResult.originalPrompt) || 
                        (testResult?.enhancedPrompt && testResult.enhancedPrompt !== testResult.originalPrompt)) && (
                        <div className="mb-2 space-y-2">
                          <div className="p-2 bg-black/30 border border-white/10">
                            <div className="flex items-center gap-1 text-xs font-mono text-white mb-1">
                              <Sparkles className="w-3 h-3" />
                              gpt_enhanced_prompt:
                            </div>
                            <div className="text-xs text-muted-foreground font-mono italic">
                              "{(realResult?.enhancedPrompt || testResult?.enhancedPrompt)}"
                            </div>
                          </div>
                          
                          {/* Prompt Settings */}
                          {(realResult?.promptSettings || testResult?.settings) && (
                            <div className="p-2 bg-secondary/20 border border-border/50">
                              <div className="text-xs font-mono text-white mb-1">enhancement_settings:</div>
                              <div className="text-xs text-muted-foreground font-mono space-y-1">
                                {(realResult?.promptSettings?.temperature || testResult?.settings?.temperature) && (
                                  <div>creativity: {(realResult?.promptSettings?.temperature || testResult?.settings?.temperature)}</div>
                                )}
                                {(realResult?.promptSettings?.artStyle || testResult?.settings?.artStyle) && (
                                  <div>style: {(realResult?.promptSettings?.artStyle || testResult?.settings?.artStyle)}</div>
                                )}
                                {(realResult?.promptSettings?.mood || testResult?.settings?.mood) && (
                                  <div>mood: {(realResult?.promptSettings?.mood || testResult?.settings?.mood)}</div>
                                )}
                                {(realResult?.promptSettings?.composition || testResult?.settings?.composition) && (
                                  <div>composition: {(realResult?.promptSettings?.composition || testResult?.settings?.composition)}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground font-mono mb-2">
                        {testResult ? (
                          <span>🧪 Test Mode - No credits used | Enhanced: {testResult.enhancementWorked ? '✅' : '❌'}</span>
                        ) : (
                          <span>Credits used: {realResult?.creditsUsed} | Remaining: {realResult?.remainingCredits}</span>
                        )}
                      </div>
                      
                      {(realResult?.note || testResult?.note) && (
                        <div className={`text-xs font-mono mb-2 ${
                          (realResult?.note || testResult?.note || '').includes('enhanced') ? 'text-green-400' :
                          (realResult?.note || testResult?.note || '').includes('disabled') ? 'text-yellow-400' :
                          'text-orange-400'
                        }`}>
                          {(realResult?.note || testResult?.note)}
                        </div>
                      )}
                      
                      <Button asChild variant="outline" size="sm" className="border-border text-muted-foreground font-mono text-xs h-7">
                        <a href={(realResult?.imageUrl || testResult?.mockImageUrl) || '#'} target="_blank" rel="noopener noreferrer">
                          {testResult ? 'view_test_image' : 'view_full_size'}
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (isGeneratingReal || isTestingPrompt) ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">status</span>
                      <Badge className="bg-orange-500 text-white font-mono text-xs animate-minimal-pulse">generating_image</Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <Progress value={50} className="h-1 bg-secondary" />
                      <div className="text-xs font-mono text-muted-foreground">
                        {isTestingPrompt ? 'testing prompt enhancement...' : 'generating with dall-e 3...'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-border">
                    <Video className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-3 font-mono text-xs">
                      preview appears after generation
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={
                    (workflowMode === 'complete' && (!imagePrompt.trim() || !videoPrompt.trim())) ||
                    (workflowMode === 'image-only' && !imagePrompt.trim()) ||
                    (workflowMode === 'video-from-image' && !videoPrompt.trim()) ||
                    isGenerating || isGeneratingReal || isTestingPrompt ||
                    // Désactiver si pas assez de crédits
                    (workflowMode === 'image-only' && !imageCreditsCheck.canPerform) ||
                    (workflowMode === 'complete' && !hasEnoughCredits('IMAGE_TO_VIDEO', enhanceEnabled ? CREDIT_COSTS.GPT_ENHANCEMENT : 0)) ||
                    (workflowMode === 'video-from-image' && !videoCreditsCheck.canPerform)
                  }
                  className="w-full bg-white hover:bg-white/90 text-black font-mono text-xs h-8"
                >
                  {isGenerating || isGeneratingReal || isTestingPrompt ? (
                    <>
                      <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin mr-2" />
                      {isTestingPrompt ? 'testing...' : 'generating...'}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 mr-1" />
                      {workflowMode === 'complete' && 'start_image_to_video'}
                      {workflowMode === 'image-only' && 'generate_image'}
                      {workflowMode === 'video-from-image' && 'generate_video'}
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground text-center font-mono space-y-1">
                  <p>
                    cost: {(() => {
                      if (workflowMode === 'complete') return '20 credits'; // 5 + 15
                      if (workflowMode === 'image-only') return '5 credits';
                      if (workflowMode === 'video-from-image') return '15 credits';
                      return '20 credits';
                    })()} 
                  </p>
                  <p>
                    eta: {(() => {
                      if (workflowMode === 'complete') return '2-5min'; // Image + Video (shorter with 8s videos)
                      if (workflowMode === 'image-only') return '30-60s';
                      if (workflowMode === 'video-from-image') return '1-3min'; // Shorter with 8s videos
                      return '2-5min';
                    })()} 
                  </p>
                  <p className="text-muted-foreground/60">
                    powered by openai + fal.ai veo 3
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}