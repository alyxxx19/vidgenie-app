'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Hash, 
  Copy, 
  Save, 
  RefreshCw, 
  Sparkles,
  TrendingUp,
  Eye,
  BarChart3,
  Calendar,
  Share2,
  ExternalLink
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface SEOEditorProps {
  assetId: string;
  initialSEOData?: {
    title?: string;
    keywords?: string[];
    hashtags?: Record<string, string[]>;
    descriptions?: Record<string, string>;
  };
  platforms: string[];
  onSave: (platform: string, data: { description: string; hashtags: string[] }) => void;
  onPublish?: (platform: string, data: { description: string; hashtags: string[] }) => void;
}

export default function SEOEditor({ assetId, initialSEOData, platforms, onSave, onPublish }: SEOEditorProps) {
  const [activeTab, setActiveTab] = useState(platforms[0] || 'tiktok');
  const [editedData, setEditedData] = useState<Record<string, { description: string; hashtags: string[] }>>(() => {
    const initial: Record<string, { description: string; hashtags: string[] }> = {};
    platforms.forEach(platform => {
      initial[platform] = {
        description: initialSEOData?.descriptions?.[platform] || '',
        hashtags: initialSEOData?.hashtags?.[platform] || [],
      };
    });
    return initial;
  });

  const platformConfig = {
    tiktok: {
      name: 'TikTok',
      color: 'bg-pink-500',
      maxDescription: 2200,
      maxHashtags: 20,
      suggestedHashtags: ['#fyp', '#viral', '#tiktok', '#trending'],
    },
    youtube: {
      name: 'YouTube Shorts',
      color: 'bg-red-500',
      maxDescription: 5000,
      maxHashtags: 15,
      suggestedHashtags: ['#shorts', '#viral', '#youtube', '#trending'],
    },
    instagram: {
      name: 'Instagram Reels',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      maxDescription: 2200,
      maxHashtags: 30,
      suggestedHashtags: ['#reels', '#instagram', '#viral', '#trending'],
    },
  };

  const updateDescription = (platform: string, description: string) => {
    setEditedData(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        description,
      },
    }));
  };

  const addHashtag = (platform: string, hashtag: string) => {
    const currentHashtags = editedData[platform]?.hashtags || [];
    if (!currentHashtags.includes(hashtag)) {
      setEditedData(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          hashtags: [...currentHashtags, hashtag],
        },
      }));
    }
  };

  const removeHashtag = (platform: string, hashtag: string) => {
    setEditedData(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        hashtags: prev[platform]?.hashtags.filter(h => h !== hashtag) || [],
      },
    }));
  };

  const regenerateSEO = async (platform: string) => {
    // Mock SEO regeneration - in real app, call AI service
    const mockKeywords = ['création', 'contenu', 'viral', 'inspiration'];
    const mockDescription = `Découvrez ce contenu incroyable créé avec l'IA ! Parfait pour ${platformConfig[platform as keyof typeof platformConfig]?.name}. Ne manquez pas cette création unique qui va faire sensation ! 🚀✨`;
    const mockHashtags = [
      ...platformConfig[platform as keyof typeof platformConfig]?.suggestedHashtags || [],
      ...mockKeywords.map(k => `#${k}`),
    ];

    setEditedData(prev => ({
      ...prev,
      [platform]: {
        description: mockDescription,
        hashtags: mockHashtags.slice(0, platformConfig[platform as keyof typeof platformConfig]?.maxHashtags || 15),
      },
    }));

    toast({
      title: 'SEO régénéré',
      description: `Nouveau contenu optimisé pour ${platformConfig[platform as keyof typeof platformConfig]?.name}`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié !',
      description: 'Contenu copié dans le presse-papier',
    });
  };

  const savePlatformSEO = (platform: string) => {
    const data = editedData[platform];
    if (data) {
      onSave(platform, data);
      toast({
        title: 'Sauvegardé',
        description: `SEO mis à jour pour ${platformConfig[platform as keyof typeof platformConfig]?.name}`,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Optimisation SEO
        </CardTitle>
        <CardDescription>
          Contenu optimisé automatiquement pour chaque plateforme
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            {platforms.map(platform => {
              const config = platformConfig[platform as keyof typeof platformConfig];
              return (
                <TabsTrigger key={platform} value={platform} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config?.color || 'bg-slate-400'}`} />
                  {config?.name || platform}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {platforms.map(platform => {
            const config = platformConfig[platform as keyof typeof platformConfig];
            const data = editedData[platform] || { description: '', hashtags: [] };

            return (
              <TabsContent key={platform} value={platform} className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Description ({data.description.length}/{config?.maxDescription})</Label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => regenerateSEO(platform)}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Régénérer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(data.description)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copier
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={data.description}
                      onChange={(e) => updateDescription(platform, e.target.value)}
                      placeholder={`Description optimisée pour ${config?.name}...`}
                      className="min-h-[100px]"
                      maxLength={config?.maxDescription}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Hashtags ({data.hashtags.length}/{config?.maxHashtags})</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(data.hashtags.join(' '))}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copier
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {data.hashtags.map((hashtag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-red-100"
                          onClick={() => removeHashtag(platform, hashtag)}
                        >
                          {hashtag}
                          <span className="ml-1 text-red-500">×</span>
                        </Badge>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-slate-600">Hashtags suggérés :</p>
                      <div className="flex flex-wrap gap-1">
                        {config?.suggestedHashtags.map((hashtag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="cursor-pointer hover:bg-blue-50"
                            onClick={() => addHashtag(platform, hashtag)}
                          >
                            + {hashtag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>Portée estimée: {Math.floor(Math.random() * 10000 + 5000)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Score viral: {Math.floor(Math.random() * 30 + 70)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => savePlatformSEO(platform)}
                        className="flex-1"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Sauvegarder
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Programmer
                      </Button>
                      <Button
                        onClick={() => onPublish?.(platform, data)}
                        className="flex-1"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Publier
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
          
          {/* Global publishing actions */}
          <TabsContent value={activeTab} className="pt-6 border-t space-y-4">
            <h4 className="font-medium">Actions globales</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  platforms.forEach(platform => {
                    const data = editedData[platform];
                    if (data) onSave(platform, data);
                  });
                }}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Tout sauvegarder
              </Button>
              <Button
                onClick={() => {
                  platforms.forEach(platform => {
                    const data = editedData[platform];
                    if (data) onPublish?.(platform, data);
                  });
                }}
                className="w-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Publier partout
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}