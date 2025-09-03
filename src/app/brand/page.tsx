'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Palette, 
  Upload, 
  Image, 
  Type, 
  Download,
  Copy,
  Edit3,
  Trash2,
  Plus,
  Eye,
  Save,
  Wand2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface BrandAsset {
  id: string;
  name: string;
  type: 'logo' | 'font' | 'color' | 'template';
  url?: string;
  value?: string;
  description?: string;
  createdAt: Date;
  usageCount: number;
}

interface BrandGuidelines {
  brandName: string;
  tagline: string;
  description: string;
  toneOfVoice: string[];
  keywords: string[];
  prohibitedWords: string[];
  targetAudience: string;
}

// Mock brand data
const mockBrandAssets: BrandAsset[] = [
  {
    id: '1',
    name: 'Logo Principal',
    type: 'logo',
    url: '/api/placeholder/200/200',
    description: 'Logo principal à utiliser sur tous les contenus',
    createdAt: new Date('2024-01-15'),
    usageCount: 47,
  },
  {
    id: '2',
    name: 'Logo Simplifié',
    type: 'logo',
    url: '/api/placeholder/200/200',
    description: 'Version simplifiée pour les petits formats',
    createdAt: new Date('2024-01-15'),
    usageCount: 23,
  },
  {
    id: '3',
    name: 'Bleu Principal',
    type: 'color',
    value: '#3B82F6',
    description: 'Couleur principale de la marque',
    createdAt: new Date('2024-01-15'),
    usageCount: 89,
  },
  {
    id: '4',
    name: 'Vert Accent',
    type: 'color',
    value: '#10B981',
    description: 'Couleur d&apos;accent pour les CTA',
    createdAt: new Date('2024-01-15'),
    usageCount: 34,
  },
  {
    id: '5',
    name: 'Montserrat Bold',
    type: 'font',
    value: 'Montserrat',
    description: 'Police principale pour les titres',
    createdAt: new Date('2024-01-15'),
    usageCount: 67,
  },
];

const mockGuidelines: BrandGuidelines = {
  brandName: 'VidGenie',
  tagline: 'Créez. Publiez. Performez.',
  description: 'VidGenie aide les créateurs de contenu à automatiser leur production de vidéos courtes pour les réseaux sociaux.',
  toneOfVoice: ['Inspirant', 'Accessible', 'Innovant', 'Professionnel'],
  keywords: ['créativité', 'automatisation', 'performance', 'viral', 'engagement'],
  prohibitedWords: ['difficile', 'compliqué', 'ennuyeux', 'impossible'],
  targetAudience: 'Créateurs de contenu, influenceurs, entreprises (18-45 ans)',
};

export default function BrandPage() {
  const { user, isLoading } = useAuth();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isGuidelinesEditOpen, setIsGuidelinesEditOpen] = useState(false);
  const [guidelines, setGuidelines] = useState(mockGuidelines);
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'logo',
    description: '',
  });

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

  const handleUploadAsset = async () => {
    if (!newAsset.name) {
      toast.error('Veuillez saisir un nom pour l&apos;asset');
      return;
    }

    try {
      // Simulate asset upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Asset ajouté à votre brand kit!');
      setIsUploadDialogOpen(false);
      setNewAsset({ name: '', type: 'logo', description: '' });
    } catch (_error) {
      toast.error('Erreur lors de l&apos;upload');
    }
  };

  const handleSaveGuidelines = async () => {
    try {
      // Simulate saving guidelines
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Guidelines sauvegardées!');
      setIsGuidelinesEditOpen(false);
    } catch (_error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier');
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'logo':
        return <Image className="w-4 h-4" />;
      case 'color':
        return <Palette className="w-4 h-4" />;
      case 'font':
        return <Type className="w-4 h-4" />;
      default:
        return <Image className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Brand Management</h1>
                <p className="text-slate-600">Gérez votre identité de marque et vos assets</p>
              </div>
            </div>
            
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel asset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un asset de marque</DialogTitle>
                  <DialogDescription>
                    Uploadez un logo, définissez une couleur ou ajoutez une police
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="asset-name">Nom de l&apos;asset *</Label>
                    <Input
                      id="asset-name"
                      placeholder="Ex: Logo principal"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="asset-type">Type</Label>
                    <select 
                      value={newAsset.type} 
                      onChange={(e) => setNewAsset(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    >
                      <option value="logo">Logo/Image</option>
                      <option value="color">Couleur</option>
                      <option value="font">Police</option>
                      <option value="template">Template</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="asset-description">Description</Label>
                    <Textarea
                      id="asset-description"
                      placeholder="Utilisation et contexte de cet asset..."
                      value={newAsset.description}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  {newAsset.type === 'logo' && (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">
                        Glissez-déposez votre logo ou cliquez pour sélectionner
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        PNG, JPG, SVG jusqu&apos;à 10MB
                      </p>
                    </div>
                  )}
                  
                  {newAsset.type === 'color' && (
                    <div>
                      <Label>Couleur</Label>
                      <div className="flex gap-2">
                        <Input type="color" className="w-16 h-10" />
                        <Input placeholder="#3B82F6" className="flex-1" />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleUploadAsset}>
                      Ajouter l&apos;asset
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="assets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assets">Assets ({mockBrandAssets.length})</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Brand Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockBrandAssets.map((asset) => (
                <Card key={asset.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getAssetIcon(asset.type)}
                        {asset.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {asset.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Asset Preview */}
                    {asset.type === 'logo' && asset.url && (
                      <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
                        <Image className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                    
                    {asset.type === 'color' && asset.value && (
                      <div className="space-y-2">
                        <div 
                          className="h-20 rounded-lg border"
                          style={{ backgroundColor: asset.value }}
                        />
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                            {asset.value}
                          </code>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => copyToClipboard(asset.value!)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {asset.type === 'font' && asset.value && (
                      <div className="space-y-2">
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold" style={{ fontFamily: asset.value }}>
                            Aa Bb Cc
                          </p>
                          <p className="text-sm text-slate-500 mt-1">{asset.value}</p>
                        </div>
                      </div>
                    )}
                    
                    {asset.description && (
                      <p className="text-sm text-slate-600">{asset.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Utilisé {asset.usageCount} fois</span>
                      <span>{asset.createdAt.toLocaleDateString('fr-FR')}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        Aperçu
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Brand Guidelines Tab */}
          <TabsContent value="guidelines" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Guidelines de marque</CardTitle>
                  <Button 
                    variant="outline"
                    onClick={() => setIsGuidelinesEditOpen(true)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-slate-900 mb-2">Identité</h3>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-slate-500">Nom de marque</Label>
                          <p className="font-medium">{guidelines.brandName}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Slogan</Label>
                          <p className="font-medium">{guidelines.tagline}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-slate-900 mb-2">Description</h3>
                      <p className="text-sm text-slate-600">{guidelines.description}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-slate-900 mb-2">Audience cible</h3>
                      <p className="text-sm text-slate-600">{guidelines.targetAudience}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-slate-900 mb-2">Ton de voix</h3>
                      <div className="flex flex-wrap gap-2">
                        {guidelines.toneOfVoice.map((tone) => (
                          <Badge key={tone} className="bg-blue-100 text-blue-800">
                            {tone}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-slate-900 mb-2">Mots-clés favoris</h3>
                      <div className="flex flex-wrap gap-2">
                        {guidelines.keywords.map((keyword) => (
                          <Badge key={keyword} variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-slate-900 mb-2">Mots à éviter</h3>
                      <div className="flex flex-wrap gap-2">
                        {guidelines.prohibitedWords.map((word) => (
                          <Badge key={word} className="bg-red-100 text-red-800">
                            {word}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Brand Application Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Application de la marque</CardTitle>
                <CardDescription>
                  Exemples d&apos;utilisation de votre identité visuelle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="aspect-video bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center mb-3">
                      <div className="text-white font-bold text-lg">LOGO</div>
                    </div>
                    <p className="text-sm font-medium">Post TikTok</p>
                    <p className="text-xs text-slate-500">1080x1920px</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="aspect-video bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center mb-3">
                      <div className="text-white font-bold text-lg">LOGO</div>
                    </div>
                    <p className="text-sm font-medium">Story Instagram</p>
                    <p className="text-xs text-slate-500">1080x1920px</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-3">
                      <div className="text-white font-bold text-lg">LOGO</div>
                    </div>
                    <p className="text-sm font-medium">Short YouTube</p>
                    <p className="text-xs text-slate-500">1080x1920px</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guidelines Edit Dialog */}
            <Dialog open={isGuidelinesEditOpen} onOpenChange={setIsGuidelinesEditOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Modifier les guidelines</DialogTitle>
                  <DialogDescription>
                    Mettez à jour votre identité de marque
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nom de marque</Label>
                      <Input
                        value={guidelines.brandName}
                        onChange={(e) => setGuidelines(prev => ({ ...prev, brandName: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label>Slogan</Label>
                      <Input
                        value={guidelines.tagline}
                        onChange={(e) => setGuidelines(prev => ({ ...prev, tagline: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={guidelines.description}
                      onChange={(e) => setGuidelines(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Audience cible</Label>
                    <Textarea
                      value={guidelines.targetAudience}
                      onChange={(e) => setGuidelines(prev => ({ ...prev, targetAudience: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Ton de voix (séparé par virgules)</Label>
                    <Input
                      value={guidelines.toneOfVoice.join(', ')}
                      onChange={(e) => setGuidelines(prev => ({ 
                        ...prev, 
                        toneOfVoice: e.target.value.split(',').map(t => t.trim()) 
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Mots-clés favoris (séparés par virgules)</Label>
                    <Input
                      value={guidelines.keywords.join(', ')}
                      onChange={(e) => setGuidelines(prev => ({ 
                        ...prev, 
                        keywords: e.target.value.split(',').map(k => k.trim()) 
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Mots à éviter (séparés par virgules)</Label>
                    <Input
                      value={guidelines.prohibitedWords.join(', ')}
                      onChange={(e) => setGuidelines(prev => ({ 
                        ...prev, 
                        prohibitedWords: e.target.value.split(',').map(w => w.trim()) 
                      }))}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsGuidelinesEditOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSaveGuidelines}>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Templates de marque</CardTitle>
                <CardDescription>
                  Templates pré-configurés avec votre identité visuelle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {['Template Lifestyle', 'Template Tutorial', 'Template Promotion'].map((template, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <div className="aspect-video bg-gradient-to-br from-blue-600 via-purple-600 to-green-600 rounded-t-lg flex items-center justify-center">
                        <div className="text-white font-bold text-lg">PREVIEW</div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">{template}</h4>
                        <p className="text-sm text-slate-500 mb-4">
                          Template optimisé pour vos couleurs et polices de marque
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1">
                            <Wand2 className="w-3 h-3 mr-1" />
                            Utiliser
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}