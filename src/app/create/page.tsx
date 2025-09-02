'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Wand2, 
  Clock, 
  Settings,
  CheckCircle,
  Video,
  BookOpen,
  Star,
  Sparkles
} from 'lucide-react';
import { api } from '@/app/providers';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CreatePage() {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState([30]);
  const [platforms, setPlatforms] = useState<string[]>(['tiktok']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Load prompt from URL params if provided
  useEffect(() => {
    const urlPrompt = searchParams?.get('prompt');
    if (urlPrompt) {
      setPrompt(decodeURIComponent(urlPrompt));
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

  if (!user) {
    redirect('/auth/signin');
  }

  const generateMutation = api.jobs.submitGeneration.useMutation({
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      toast.success('Votre contenu est en cours de création');
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(error.message);
    },
  });

  const jobStatusQuery = api.jobs.getStatus.useQuery(
    { jobId: currentJobId! },
    { 
      enabled: !!currentJobId,
      refetchInterval: !!currentJobId ? 2000 : false,
    }
  );
  
  const jobStatus = jobStatusQuery.data;

  const { data: userPrompts } = api.prompts.list.useQuery({ limit: 10 });
  const { data: templates } = api.prompts.getTemplates.useQuery();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Veuillez saisir une description pour votre contenu');
      return;
    }

    setIsGenerating(true);
    generateMutation.mutate({
      prompt: prompt.trim(),
      duration: duration[0]!,
      platforms: platforms as any,
    });
  };

  const predefinedPrompts = [
    'motivational entrepreneurship content',
    'quick productivity tutorial',
    'innovative product presentation',
    'personal development advice',
    'tiktok trend with original twist',
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-white text-black font-mono text-xs">complete</Badge>;
      case 'running':
        return <Badge className="bg-secondary text-white font-mono text-xs animate-minimal-pulse">running</Badge>;
      case 'pending':
        return <Badge className="bg-muted text-white font-mono text-xs">pending</Badge>;
      case 'failed':
        return <Badge className="bg-destructive text-black font-mono text-xs">failed</Badge>;
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
            <h1 className="font-mono text-lg text-white mb-1">content_creator</h1>
            <p className="text-muted-foreground text-xs font-mono">transform ideas into viral content</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Input */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                  <Wand2 className="w-4 h-4" />
                  content_prompt
                </CardTitle>
                <CardDescription className="font-mono text-xs text-muted-foreground">
                  describe what you want to create
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="prompt" className="font-mono text-xs text-white">description</Label>
                  <Textarea
                    id="prompt"
                    placeholder="inspiring video about pursuing dreams with sunset visuals and motivational music..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[80px] mt-1 bg-white border-border text-black font-mono text-xs"
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {prompt.length}/1000 chars
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-xs text-white">suggested_prompts</Label>
                    <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white">
                      <Link href="/prompts">
                        <BookOpen className="w-3 h-3 mr-1" />
                        manage
                      </Link>
                    </Button>
                  </div>
                  
                  {/* User's saved prompts */}
                  {userPrompts && userPrompts.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        saved_prompts
                      </p>
                      {userPrompts.slice(0, 3).map((userPrompt) => (
                        <button
                          key={userPrompt.id}
                          onClick={() => setPrompt(userPrompt.content)}
                          className="w-full text-left p-2 border border-border hover:border-white/20 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs text-white">{userPrompt.title.toLowerCase().replace(/\s+/g, '_')}</span>
                            {userPrompt.isPinned && <Star className="w-3 h-3 text-white" />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
                            {userPrompt.content}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Templates */}
                  {templates && templates.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        popular_templates
                      </p>
                      {templates.slice(0, 3).map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setPrompt(template.content)}
                          className="w-full text-left p-2 border border-border hover:border-white/20 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs text-white">{template.title.toLowerCase().replace(/\s+/g, '_')}</span>
                            <Badge variant="secondary" className="font-mono text-xs">template</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
                            {template.content}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Fallback predefined prompts if no user prompts/templates */}
                  {(!userPrompts || userPrompts.length === 0) && (!templates || templates.length === 0) && (
                    <div className="space-y-1">
                      {predefinedPrompts.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setPrompt(suggestion)}
                          className="w-full text-left p-2 border border-border hover:border-white/20 hover:bg-secondary/50 transition-colors font-mono text-xs text-white"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
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
                <div>
                  <Label className="font-mono text-xs text-white">duration: {duration[0]}s</Label>
                  <Slider
                    value={duration}
                    onValueChange={setDuration}
                    max={60}
                    min={8}
                    step={1}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="font-mono text-xs text-white">target_platforms</Label>
                  <div className="mt-1 space-y-2">
                    {[
                      { id: 'tiktok', label: 'tiktok', optimal: '15-60s' },
                      { id: 'youtube', label: 'youtube_shorts', optimal: '15-60s' },
                      { id: 'instagram', label: 'instagram_reels', optimal: '15-30s' },
                    ].map((platform) => (
                      <div key={platform.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={platform.id}
                            checked={platforms.includes(platform.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPlatforms([...platforms, platform.id]);
                              } else {
                                setPlatforms(platforms.filter(p => p !== platform.id));
                              }
                            }}
                            className="border-border data-[state=checked]:bg-white data-[state=checked]:text-black"
                          />
                          <label htmlFor={platform.id} className="font-mono text-xs text-white">
                            {platform.label}
                          </label>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{platform.optimal}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                {currentJobId && jobStatus ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">progress</span>
                      {getStatusBadge(jobStatus.status)}
                    </div>
                    
                    <div className="space-y-1">
                      <Progress value={jobStatus.progress} className="h-1 bg-secondary" />
                      <div className="text-xs font-mono text-muted-foreground">{jobStatus.progress}%</div>
                    </div>
                    
                    {jobStatus.status === 'running' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <Clock className="w-3 h-3" />
                        <span>eta: {Math.ceil((jobStatus.estimatedTimeRemaining || 0) / 60)}min</span>
                      </div>
                    )}

                    {jobStatus.status === 'completed' && jobStatus.resultAsset && (
                      <div className="p-3 bg-secondary border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-white" />
                          <span className="font-mono text-xs text-white">generation_complete</span>
                        </div>
                        <Button asChild variant="outline" size="sm" className="border-border text-muted-foreground font-mono text-xs h-7">
                          <Link href={`/assets/${jobStatus.resultAsset.id}`}>
                            view_result
                          </Link>
                        </Button>
                      </div>
                    )}
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
                  disabled={!prompt.trim() || platforms.length === 0 || isGenerating}
                  className="w-full bg-white hover:bg-white/90 text-black font-mono text-xs h-8"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin mr-2" />
                      generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 mr-1" />
                      generate_content
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center font-mono">
                  cost: 10 credits • eta: 2-5min
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}