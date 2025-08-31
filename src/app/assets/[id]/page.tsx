'use client';

import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Share2, 
  Edit3, 
  Calendar, 
  Eye,
  Hash,
  Sparkles,
  Play,
  Copy,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/app/providers';
import { toast } from '@/components/ui/use-toast';
import { useState } from 'react';
import SEOEditor from '@/components/seo-editor';

interface AssetPageProps {
  params: { id: string };
}

export default function AssetPage({ params }: AssetPageProps) {
  const { user, isLoading } = useAuth();
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [editingHashtags, setEditingHashtags] = useState<string | null>(null);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    redirect('/auth/signin');
  }

  const { data: asset, isLoading: assetLoading } = api.assets.getById.useQuery({ id: params.id });
  const updateSEOMutation = api.assets.updateSEO.useMutation();
  const publishMutation = api.publishing.publishToPlatform.useMutation();

  if (assetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Asset non trouvé</h1>
          <p className="text-slate-600 mb-4">Cet asset n'existe pas ou vous n'y avez pas accès.</p>
          <Button asChild>
            <Link href="/dashboard">Retour au dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const seoData = asset.aiConfig as any;
  const platforms = ['tiktok', 'youtube', 'instagram'];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié !',
      description: 'Contenu copié dans le presse-papier',
    });
  };

  const handleSEOSave = (platform: string, data: { description: string; hashtags: string[] }) => {
    updateSEOMutation.mutate({
      id: params.id,
      platform: platform as any,
      description: data.description,
      hashtags: data.hashtags,
    });
  };

  const handlePublish = (platform: string, data: { description: string; hashtags: string[] }) => {
    publishMutation.mutate({
      assetId: params.id,
      platform: platform as any,
      description: data.description,
      hashtags: data.hashtags,
    }, {
      onSuccess: () => {
        toast({
          title: 'Publication lancée',
          description: `Votre contenu est en cours de publication sur ${platform}`,
        });
      },
      onError: (error) => {
        toast({
          title: 'Erreur de publication',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Contenu généré</h1>
              <p className="text-slate-600">
                Créé le {new Date(asset.createdAt).toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  Retour au dashboard
                </Link>
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Video Preview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Aperçu vidéo
                </CardTitle>
                <CardDescription>
                  {asset.width}x{asset.height} • {asset.duration}s • {(asset.fileSize / 1024 / 1024).toFixed(1)}MB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[9/16] bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <Play className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      Aperçu vidéo simulé
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Mode développement
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Générateur IA</span>
                    <Badge variant="secondary">{seoData?.provider || 'Mock AI'}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Score qualité</span>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">{seoData?.qualityScore || 8}/10</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Coût génération</span>
                    <span className="text-sm">{Math.round((seoData?.generationCost || 10) * 10)} crédits</span>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <div>
                      <Label>Titre généré</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm bg-slate-50 p-2 rounded flex-1">
                          {seoData?.title || asset.filename?.replace('.mp4', '') || 'Contenu généré'}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(seoData?.title || asset.filename?.replace('.mp4', '') || 'Contenu généré')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Prompt original</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm bg-slate-50 p-2 rounded flex-1">
                          {asset.prompt}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(asset.prompt || '')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Mots-clés détectés</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(seoData?.keywords || ['contenu', 'vidéo', 'création']).map((keyword: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - SEO & Publishing */}
          <div className="lg:col-span-1">
            <SEOEditor
              assetId={asset.id}
              initialSEOData={seoData?.seoData}
              platforms={platforms}
              onSave={handleSEOSave}
              onPublish={handlePublish}
            />
          </div>
        </div>
      </div>
    </div>
  );
}