'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { redirect, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Users,
  Target,
  Palette,
  Sparkles,
  Video,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingData {
  step: number;
  profile: {
    creatorType: string;
    industry: string;
    experience: string;
    goals: string[];
    audienceSize: string;
  };
  platforms: {
    selected: string[];
    username: { [key: string]: string };
  };
  preferences: {
    contentTypes: string[];
    postingFrequency: string;
    preferredLength: number;
    topics: string[];
  };
  brand: {
    brandName: string;
    brandColors: string[];
    brandTone: string[];
    brandDescription: string;
  };
}

const initialData: OnboardingData = {
  step: 1,
  profile: {
    creatorType: '',
    industry: '',
    experience: '',
    goals: [],
    audienceSize: '',
  },
  platforms: {
    selected: [],
    username: {},
  },
  preferences: {
    contentTypes: [],
    postingFrequency: '',
    preferredLength: 30,
    topics: [],
  },
  brand: {
    brandName: '',
    brandColors: [],
    brandTone: [],
    brandDescription: '',
  },
};

const creatorTypes = [
  { value: 'solo', label: 'Créateur solo', description: 'Je crée du contenu seul(e)' },
  { value: 'team', label: 'Équipe créative', description: 'Nous sommes une équipe de créateurs' },
  { value: 'business', label: 'Entreprise', description: 'Nous représentons une marque/entreprise' },
  { value: 'agency', label: 'Agence', description: 'Nous gérons plusieurs clients' },
];

const industries = [
  'Lifestyle & Mode', 'Tech & Innovation', 'Food & Cooking', 'Fitness & Santé',
  'Voyage & Aventure', 'Business & Finance', 'Éducation', 'Gaming', 'Art & Design',
  'Musique', 'Comedy & Divertissement', 'Autre'
];

const goals = [
  'Augmenter ma visibilité', 'Vendre mes produits/services', 'Éduquer mon audience',
  'Divertir ma communauté', 'Construire ma marque personnelle', 'Générer des leads',
  'Monétiser mon contenu', 'Développer ma créativité'
];

const contentTypes = [
  'Tutoriels & How-to', 'Lifestyle & Vlogs', 'Product Reviews', 'Behind the scenes',
  'Trends & Challenges', 'Educational', 'Comedy & Entertainment', 'Promotional'
];

const topics = [
  'Motivation', 'Productivité', 'Tech', 'Mode', 'Cuisine', 'Voyage', 'Fitness',
  'Business', 'Art', 'Musique', 'Gaming', 'Lifestyle', 'DIY', 'Beauté'
];

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isLoading2, setIsLoading2] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cyber-gradient flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-glow-pulse">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-cyber-textMuted">Préparation de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/auth/signin');
  }

  const totalSteps = 5;
  const progressPercentage = (data.step / totalSteps) * 100;

  const nextStep = () => {
    if (data.step < totalSteps) {
      setData(prev => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const prevStep = () => {
    if (data.step > 1) {
      setData(prev => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const finishOnboarding = async () => {
    setIsLoading2(true);
    try {
      // Simulate saving onboarding data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Configuration terminée! Bienvenue sur VidGenie 🎉');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
      setIsLoading2(false);
    }
  };

  const canProceed = () => {
    switch (data.step) {
      case 1:
        return data.profile.creatorType && data.profile.industry && data.profile.experience;
      case 2:
        return data.platforms.selected.length > 0;
      case 3:
        return data.preferences.contentTypes.length > 0 && data.preferences.postingFrequency;
      case 4:
        return data.brand.brandName;
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-cyber-gradient relative overflow-hidden flex items-center justify-center p-6">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute top-10 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="w-full max-w-3xl relative z-10">
        {/* Progress */}
        <div className="mb-12 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white uppercase tracking-wide">
              ÉTAPE {data.step} SUR {totalSteps}
            </span>
            <span className="text-sm text-primary font-mono">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="relative">
            <Progress value={progressPercentage} className="h-3 bg-secondary" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>

        <Card className="bg-card/90 backdrop-blur-lg border-secondary shadow-cyber animate-scale-in">
          <CardHeader className="text-center pb-8">
            {data.step === 1 && (
              <>
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-glow-pulse">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="font-[var(--font-poppins)] text-3xl text-white mb-3">PROFIL CRÉATEUR</CardTitle>
                <CardDescription className="text-cyber-textMuted text-lg">
                  Configurons votre identité numérique pour maximiser vos performances
                </CardDescription>
              </>
            )}
            
            {data.step === 2 && (
              <>
                <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-glow-pulse">
                  <Video className="w-10 h-10 text-accent" />
                </div>
                <CardTitle className="text-2xl">Vos plateformes</CardTitle>
                <CardDescription>
                  Sur quelles plateformes voulez-vous publier?
                </CardDescription>
              </>
            )}
            
            {data.step === 3 && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Vos préférences</CardTitle>
                <CardDescription>
                  Définissez votre stratégie de contenu
                </CardDescription>
              </>
            )}
            
            {data.step === 4 && (
              <>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Palette className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle className="text-2xl">Votre marque</CardTitle>
                <CardDescription>
                  Configurez votre identité visuelle
                </CardDescription>
              </>
            )}
            
            {data.step === 5 && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Tout est prêt!</CardTitle>
                <CardDescription>
                  Votre compte VidGenie est configuré et prêt à l'emploi
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Profile */}
            {data.step === 1 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Vous êtes... *</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {creatorTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setData(prev => ({
                          ...prev,
                          profile: { ...prev.profile, creatorType: type.value }
                        }))}
                        className={`p-4 border rounded-lg text-left transition-all ${
                          data.profile.creatorType === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-slate-500">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="industry">Secteur d'activité *</Label>
                  <Select 
                    value={data.profile.industry}
                    onValueChange={(value) => setData(prev => ({
                      ...prev,
                      profile: { ...prev.profile, industry: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre secteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map(industry => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="experience">Expérience en création de contenu *</Label>
                  <Select 
                    value={data.profile.experience}
                    onValueChange={(value) => setData(prev => ({
                      ...prev,
                      profile: { ...prev.profile, experience: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Votre niveau d'expérience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Débutant (0-6 mois)</SelectItem>
                      <SelectItem value="intermediate">Intermédiaire (6 mois - 2 ans)</SelectItem>
                      <SelectItem value="advanced">Avancé (2-5 ans)</SelectItem>
                      <SelectItem value="expert">Expert (5+ ans)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base font-medium">Vos objectifs</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {goals.map((goal) => (
                      <label key={goal} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={data.profile.goals.includes(goal)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setData(prev => ({
                                ...prev,
                                profile: { ...prev.profile, goals: [...prev.profile.goals, goal] }
                              }));
                            } else {
                              setData(prev => ({
                                ...prev,
                                profile: { ...prev.profile, goals: prev.profile.goals.filter(g => g !== goal) }
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{goal}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Platforms */}
            {data.step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Plateformes cibles *</Label>
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    {[
                      { id: 'tiktok', name: 'TikTok', icon: '🎵', description: 'Vidéos courtes virales' },
                      { id: 'instagram', name: 'Instagram', icon: '📷', description: 'Stories et Reels' },
                      { id: 'youtube', name: 'YouTube Shorts', icon: '📺', description: 'Shorts sur YouTube' },
                    ].map((platform) => (
                      <div
                        key={platform.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          data.platforms.selected.includes(platform.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => {
                          const selected = data.platforms.selected.includes(platform.id)
                            ? data.platforms.selected.filter(p => p !== platform.id)
                            : [...data.platforms.selected, platform.id];
                          setData(prev => ({
                            ...prev,
                            platforms: { ...prev.platforms, selected }
                          }));
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl">{platform.icon}</div>
                          <div className="flex-1">
                            <h3 className="font-medium">{platform.name}</h3>
                            <p className="text-sm text-slate-500">{platform.description}</p>
                          </div>
                          {data.platforms.selected.includes(platform.id) && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        
                        {data.platforms.selected.includes(platform.id) && (
                          <div className="mt-4">
                            <Label htmlFor={`username-${platform.id}`} className="text-sm">
                              Nom d'utilisateur (optionnel)
                            </Label>
                            <Input
                              id={`username-${platform.id}`}
                              placeholder={`@votre_${platform.id}`}
                              value={data.platforms.username[platform.id] || ''}
                              onChange={(e) => setData(prev => ({
                                ...prev,
                                platforms: {
                                  ...prev.platforms,
                                  username: { ...prev.platforms.username, [platform.id]: e.target.value }
                                }
                              }))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preferences */}
            {data.step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Types de contenu *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {contentTypes.map((type) => (
                      <label key={type} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={data.preferences.contentTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setData(prev => ({
                                ...prev,
                                preferences: { ...prev.preferences, contentTypes: [...prev.preferences.contentTypes, type] }
                              }));
                            } else {
                              setData(prev => ({
                                ...prev,
                                preferences: { ...prev.preferences, contentTypes: prev.preferences.contentTypes.filter(t => t !== type) }
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Fréquence de publication *</Label>
                  <Select 
                    value={data.preferences.postingFrequency}
                    onValueChange={(value) => setData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, postingFrequency: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="À quelle fréquence voulez-vous publier?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidienne (7/semaine)</SelectItem>
                      <SelectItem value="frequent">Fréquente (4-6/semaine)</SelectItem>
                      <SelectItem value="regular">Régulière (2-3/semaine)</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire (1/semaine)</SelectItem>
                      <SelectItem value="occasional">Occasionnelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base font-medium">Sujets favoris</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {topics.map((topic) => (
                      <label key={topic} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={data.preferences.topics.includes(topic)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setData(prev => ({
                                ...prev,
                                preferences: { ...prev.preferences, topics: [...prev.preferences.topics, topic] }
                              }));
                            } else {
                              setData(prev => ({
                                ...prev,
                                preferences: { ...prev.preferences, topics: prev.preferences.topics.filter(t => t !== topic) }
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{topic}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Brand */}
            {data.step === 4 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="brand-name">Nom de votre marque *</Label>
                  <Input
                    id="brand-name"
                    placeholder="Ex: Mon Business, @MonPseudo..."
                    value={data.brand.brandName}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      brand: { ...prev.brand, brandName: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="brand-description">Description de votre marque</Label>
                  <Textarea
                    id="brand-description"
                    placeholder="Décrivez votre marque, vos valeurs, votre mission..."
                    value={data.brand.brandDescription}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      brand: { ...prev.brand, brandDescription: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">Ton de voix</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['Professionnel', 'Décontracté', 'Inspirant', 'Humoristique', 'Éducatif', 'Authentique'].map((tone) => (
                      <label key={tone} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={data.brand.brandTone.includes(tone)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setData(prev => ({
                                ...prev,
                                brand: { ...prev.brand, brandTone: [...prev.brand.brandTone, tone] }
                              }));
                            } else {
                              setData(prev => ({
                                ...prev,
                                brand: { ...prev.brand, brandTone: prev.brand.brandTone.filter(t => t !== tone) }
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{tone}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Summary */}
            {data.step === 5 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-slate-900 mb-3">Votre profil</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-500">Type:</span> 
                        <span className="ml-2">{creatorTypes.find(t => t.value === data.profile.creatorType)?.label}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Secteur:</span> 
                        <span className="ml-2">{data.profile.industry}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Expérience:</span> 
                        <span className="ml-2">{data.profile.experience}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-slate-900 mb-3">Plateformes</h3>
                    <div className="flex flex-wrap gap-2">
                      {data.platforms.selected.map(platform => (
                        <Badge key={platform} variant="outline">
                          {platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : 'YouTube'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-slate-900 mb-3">Marque</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-500">Nom:</span> 
                      <span className="ml-2 font-medium">{data.brand.brandName}</span>
                    </div>
                    {data.brand.brandTone.length > 0 && (
                      <div>
                        <span className="text-slate-500">Ton:</span> 
                        <span className="ml-2">{data.brand.brandTone.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">🎉 Configuration terminée!</h4>
                  <p className="text-sm text-blue-700">
                    Votre compte est maintenant optimisé pour vos besoins. 
                    Vous pouvez commencer à créer du contenu immédiatement.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={prevStep}
                disabled={data.step === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>
              
              {data.step < totalSteps ? (
                <Button 
                  onClick={nextStep}
                  disabled={!canProceed()}
                >
                  Suivant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={finishOnboarding}
                  disabled={isLoading2}
                >
                  {isLoading2 ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Configuration...
                    </>
                  ) : (
                    <>
                      Commencer à créer
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip Link */}
        {data.step < totalSteps && (
          <div className="text-center mt-6">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/dashboard')}
              className="text-slate-500 hover:text-slate-700"
            >
              Passer l'onboarding
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}