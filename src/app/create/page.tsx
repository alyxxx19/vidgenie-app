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
import { 
  Wand2, 
  Clock, 
  Settings,
  CheckCircle,
  Video,
  Image,
  PlayCircle,
  ArrowRight
} from 'lucide-react';
import { api } from '@/app/providers';
import { toast } from 'sonner';
import Link from 'next/link';
// import { useMockImageGeneration } from '@/hooks/useMockImageGeneration';
import { useDevImageGeneration } from '@/hooks/useDevImageGeneration';

export default function CreatePage() {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  
  // Image generation states
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState<'natural' | 'vivid'>('vivid');
  const [imageQuality, setImageQuality] = useState<'standard' | 'hd'>('hd');
  
  // Video generation states
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('1080p');
  const [generateAudio, setGenerateAudio] = useState(true);
  
  // General states
  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [workflowMode, setWorkflowMode] = useState<'complete' | 'image-only' | 'video-from-image'>('complete');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

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

  const { data: userProjects } = api.projects.list.useQuery();

  const handleGenerate = async () => {
    if (workflowMode === 'complete') {
      if (!imagePrompt.trim() || !videoPrompt.trim()) {
        toast.error('Please provide both image and video prompts');
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
      
      setIsGenerating(true);
      const result = await generateRealImage({
        prompt: imagePrompt.trim(),
        style: imageStyle,
        quality: imageQuality,
        projectId: selectedProject,
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

  return (
    <div className="min-h-screen bg-minimal-gradient relative">
      {/* Minimal grid */}
      <div className="absolute inset-0 bg-grid-minimal opacity-30" />
      
      {/* Header */}
      <header className="bg-card border-b border-border relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="animate-slide-in">
            <h1 className="font-mono text-lg text-white mb-1">image_to_video_ai</h1>
            <p className="text-muted-foreground text-xs font-mono">create images with dall-e 3, then generate videos with fal.ai veo 3</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
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
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{mode.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Image Prompt (for complete and image-only modes) */}
            {(workflowMode === 'complete' || workflowMode === 'image-only') && (
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
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                    <Video className="w-4 h-4" />
                    video_prompt
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Describe how the image should be animated (e.g., subtle breathing, blinking eyes, gentle movement)..."
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    className="min-h-[60px] bg-white border-border text-black font-mono text-xs"
                    maxLength={1000}
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {predefinedVideoPrompts.slice(0, 3).map((promptText, idx) => (
                      <button
                        key={idx}
                        onClick={() => setVideoPrompt(promptText)}
                        className="text-xs text-muted-foreground hover:text-white border border-border hover:border-white/20 px-2 py-1 font-mono transition-colors"
                      >
                        {promptText.split(' ').slice(0, 3).join('_')}
                      </button>
                    ))}
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
                    <SelectContent>
                      {userProjects?.map((project) => (
                        <SelectItem key={project.id} value={project.id} className="font-mono text-xs">
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
                    <Label className="font-mono text-xs text-white">image_settings</Label>
                    
                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">style</Label>
                      <Select value={imageStyle} onValueChange={(value: any) => setImageStyle(value)}>
                        <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vivid" className="font-mono text-xs">vivid</SelectItem>
                          <SelectItem value="natural" className="font-mono text-xs">natural</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">quality</Label>
                      <Select value={imageQuality} onValueChange={(value: any) => setImageQuality(value)}>
                        <SelectTrigger className="bg-white border-border text-black font-mono text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hd" className="font-mono text-xs">hd</SelectItem>
                          <SelectItem value="standard" className="font-mono text-xs">standard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Video Configuration */}
                {(workflowMode === 'complete' || workflowMode === 'video-from-image') && (
                  <div className="space-y-3">
                    <Label className="font-mono text-xs text-white">video_settings</Label>
                    
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
                        <SelectContent>
                          <SelectItem value="720p" className="font-mono text-xs">720p</SelectItem>
                          <SelectItem value="1080p" className="font-mono text-xs">1080p</SelectItem>
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
                {realResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">status</span>
                      <Badge className="bg-white text-black font-mono text-xs">image_ready</Badge>
                    </div>
                    
                    <div className="border border-border overflow-hidden">
                      <img 
                        src={realResult.imageUrl} 
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
                      
                      {realResult.enhancedPrompt && realResult.enhancedPrompt !== realResult.originalPrompt && (
                        <div className="mb-2 p-2 bg-black/30 border border-white/10">
                          <div className="text-xs font-mono text-white mb-1">gpt_enhanced_prompt:</div>
                          <div className="text-xs text-muted-foreground font-mono italic">
                            "{realResult.enhancedPrompt}"
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground font-mono mb-2">
                        Credits used: {realResult.creditsUsed} | Remaining: {realResult.remainingCredits}
                      </div>
                      
                      {realResult.note && (
                        <div className="text-xs text-green-400 font-mono mb-2">
                          {realResult.note}
                        </div>
                      )}
                      
                      <Button asChild variant="outline" size="sm" className="border-border text-muted-foreground font-mono text-xs h-7">
                        <a href={realResult.imageUrl} target="_blank" rel="noopener noreferrer">
                          view_full_size
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : isGeneratingReal ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">status</span>
                      <Badge className="bg-orange-500 text-white font-mono text-xs animate-minimal-pulse">generating_image</Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <Progress value={50} className="h-1 bg-secondary" />
                      <div className="text-xs font-mono text-muted-foreground">generating with dall-e 3...</div>
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
                    isGenerating || isGeneratingReal
                  }
                  className="w-full bg-white hover:bg-white/90 text-black font-mono text-xs h-8"
                >
                  {isGenerating || isGeneratingReal ? (
                    <>
                      <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin mr-2" />
                      generating...
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
      </div>
    </div>
  );
}