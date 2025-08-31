'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
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
  ArrowRight, 
  Wand2, 
  Clock, 
  Settings,
  Loader2,
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
    return <div className="min-h-screen bg-cyber-gradient flex items-center justify-center">
      <div className="text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-glow-pulse">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <p className="text-cyber-textMuted">Initialisation du créateur...</p>
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
    'Créez une vidéo motivante sur l\'entrepreneuriat',
    'Tutoriel rapide sur une astuce de productivité',
    'Présentation d\'un produit innovant',
    'Conseil de développement personnel',
    'Trend TikTok avec une twist originale',
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Terminé</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Échec</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-cyber-gradient relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" />
      
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-lg border-b border-secondary relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="animate-fade-in-up">
            <h1 className="font-[var(--font-poppins)] text-4xl font-bold text-white mb-2">LABORATOIRE DE CRÉATION</h1>
            <p className="text-cyber-textMuted text-lg">Transformez vos idées en contenus viraux avec l'IA de pointe</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Input */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  Votre idée
                </CardTitle>
                <CardDescription>
                  Décrivez le contenu que vous souhaitez créer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Description du contenu</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Ex: Une vidéo inspirante sur l'importance de poursuivre ses rêves, avec des visuels de coucher de soleil et une musique motivante..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] mt-2"
                    maxLength={1000}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    {prompt.length}/1000 caractères
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Prompts suggérés</Label>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/prompts">
                        <BookOpen className="w-3 h-3 mr-1" />
                        Gérer
                      </Link>
                    </Button>
                  </div>
                  
                  {/* User's saved prompts */}
                  {userPrompts && userPrompts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Vos prompts sauvegardés
                      </p>
                      {userPrompts.slice(0, 3).map((userPrompt) => (
                        <button
                          key={userPrompt.id}
                          onClick={() => setPrompt(userPrompt.content)}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{userPrompt.title}</span>
                            {userPrompt.isPinned && <Star className="w-3 h-3 text-yellow-500" />}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {userPrompt.content}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Templates */}
                  {templates && templates.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Templates populaires
                      </p>
                      {templates.slice(0, 3).map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setPrompt(template.content)}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{template.title}</span>
                            <Badge variant="secondary" className="text-xs">Template</Badge>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {template.content}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Fallback predefined prompts if no user prompts/templates */}
                  {(!userPrompts || userPrompts.length === 0) && (!templates || templates.length === 0) && (
                    <div className="space-y-2">
                      {predefinedPrompts.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setPrompt(suggestion)}
                          className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
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
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Durée de la vidéo: {duration[0]}s</Label>
                  <Slider
                    value={duration}
                    onValueChange={setDuration}
                    max={60}
                    min={8}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Plateformes cibles</Label>
                  <div className="mt-2 space-y-3">
                    {[
                      { id: 'tiktok', label: 'TikTok', optimal: '15-60s' },
                      { id: 'youtube', label: 'YouTube Shorts', optimal: '15-60s' },
                      { id: 'instagram', label: 'Instagram Reels', optimal: '15-30s' },
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
                          />
                          <label htmlFor={platform.id} className="font-medium">
                            {platform.label}
                          </label>
                        </div>
                        <span className="text-xs text-slate-500">{platform.optimal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview & Actions */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Aperçu & génération</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Generation Status */}
                {currentJobId && jobStatus ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Progression</span>
                      {getStatusBadge(jobStatus.status)}
                    </div>
                    
                    <Progress value={jobStatus.progress} />
                    
                    {jobStatus.status === 'running' && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>Temps estimé: {Math.ceil((jobStatus.estimatedTimeRemaining || 0) / 60)} min</span>
                      </div>
                    )}

                    {jobStatus.status === 'completed' && jobStatus.resultAsset && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-800">Génération terminée !</span>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/assets/${jobStatus.resultAsset.id}`}>
                            Voir le résultat
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                    <Video className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">
                      L'aperçu apparaîtra ici après génération
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || platforms.length === 0 || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Générer le contenu
                    </>
                  )}
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  Coût: 10 crédits • Temps estimé: 2-5 minutes
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}