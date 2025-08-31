'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Link as LinkIcon, 
  Settings, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Key,
  Zap,
  Smartphone,
  Globe,
  Share2,
  BarChart3,
  Webhook,
  Code,
  Play
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'analytics' | 'automation' | 'storage';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  icon: string;
  features: string[];
  connectedAt?: Date;
  lastSync?: Date;
  hasSettings: boolean;
  isPremium: boolean;
}

// Mock integrations data
const mockIntegrations: Integration[] = [
  {
    id: 'tiktok',
    name: 'TikTok Business',
    description: 'Publiez directement sur TikTok et accédez aux analytics',
    category: 'social',
    status: 'connected',
    icon: '🎵',
    features: ['Publication automatique', 'Analytics avancées', 'Gestion des hashtags'],
    connectedAt: new Date('2024-02-15'),
    lastSync: new Date('2024-03-20'),
    hasSettings: true,
    isPremium: false,
  },
  {
    id: 'instagram',
    name: 'Instagram Business',
    description: 'Publiez sur Instagram et Stories, analytics incluses',
    category: 'social',
    status: 'connected',
    icon: '📷',
    features: ['Publication posts', 'Publication stories', 'Analytics', 'Programmation'],
    connectedAt: new Date('2024-02-20'),
    lastSync: new Date('2024-03-19'),
    hasSettings: true,
    isPremium: false,
  },
  {
    id: 'youtube',
    name: 'YouTube Creator',
    description: 'Publiez des Shorts et accédez aux métriques YouTube',
    category: 'social',
    status: 'disconnected',
    icon: '📺',
    features: ['Publication Shorts', 'Analytics Studio', 'Gestion des miniatures'],
    hasSettings: true,
    isPremium: false,
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Suivez le trafic et les conversions de vos liens',
    category: 'analytics',
    status: 'error',
    icon: '📊',
    features: ['Suivi du trafic', 'Conversions', 'Attribution multicanal'],
    connectedAt: new Date('2024-01-10'),
    lastSync: new Date('2024-03-15'),
    hasSettings: true,
    isPremium: true,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automatisez vos workflows avec 5000+ applications',
    category: 'automation',
    status: 'disconnected',
    icon: '⚡',
    features: ['Webhooks', 'Triggers personnalisés', '5000+ apps'],
    hasSettings: true,
    isPremium: true,
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Sauvegardez automatiquement vos vidéos sur Drive',
    category: 'storage',
    status: 'connected',
    icon: '💾',
    features: ['Sauvegarde auto', 'Partage d\'équipe', 'Versions illimitées'],
    connectedAt: new Date('2024-01-20'),
    lastSync: new Date('2024-03-20'),
    hasSettings: false,
    isPremium: false,
  },
];

export default function IntegrationsPage() {
  const { user, isLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    tiktok: '',
    instagram: '',
    youtube: '',
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

  const filteredIntegrations = mockIntegrations.filter(integration => {
    if (selectedCategory === 'all') return true;
    return integration.category === selectedCategory;
  });

  const handleConnect = async (integrationId: string) => {
    try {
      // Simulate OAuth flow
      toast.success('Redirection vers l\'authentification...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Intégration connectée avec succès!');
    } catch (error) {
      toast.error('Erreur lors de la connexion');
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter cette intégration?')) {
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Intégration déconnectée');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <XCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connecté</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Erreur</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Déconnecté</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'social':
        return <Share2 className="w-4 h-4" />;
      case 'analytics':
        return <BarChart3 className="w-4 h-4" />;
      case 'automation':
        return <Zap className="w-4 h-4" />;
      case 'storage':
        return <Globe className="w-4 h-4" />;
      default:
        return <LinkIcon className="w-4 h-4" />;
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
                <h1 className="text-2xl font-bold">Intégrations</h1>
                <p className="text-slate-600">Connectez vos plateformes et outils favoris</p>
              </div>
            </div>
            
            <Dialog open={isApiDialogOpen} onOpenChange={setIsApiDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Key className="w-4 h-4 mr-2" />
                  API Keys
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gestion des clés API</DialogTitle>
                  <DialogDescription>
                    Configurez vos clés API pour les intégrations avancées
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tiktok-key">TikTok API Key</Label>
                    <Input
                      id="tiktok-key"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={apiKeys.tiktok}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, tiktok: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="instagram-key">Instagram API Key</Label>
                    <Input
                      id="instagram-key"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={apiKeys.instagram}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, instagram: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="youtube-key">YouTube API Key</Label>
                    <Input
                      id="youtube-key"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={apiKeys.youtube}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, youtube: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsApiDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button>
                      <Key className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">Toutes ({mockIntegrations.length})</TabsTrigger>
            <TabsTrigger value="social">
              <Share2 className="w-4 h-4 mr-1" />
              Réseaux sociaux ({mockIntegrations.filter(i => i.category === 'social').length})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-1" />
              Analytics ({mockIntegrations.filter(i => i.category === 'analytics').length})
            </TabsTrigger>
            <TabsTrigger value="automation">
              <Zap className="w-4 h-4 mr-1" />
              Automation ({mockIntegrations.filter(i => i.category === 'automation').length})
            </TabsTrigger>
            <TabsTrigger value="storage">
              <Globe className="w-4 h-4 mr-1" />
              Stockage ({mockIntegrations.filter(i => i.category === 'storage').length})
            </TabsTrigger>
          </TabsList>

          {['all', 'social', 'analytics', 'automation', 'storage'].map(category => (
            <TabsContent key={category} value={category} className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(category === 'all' ? mockIntegrations : mockIntegrations.filter(i => i.category === category)).map((integration) => (
                  <Card key={integration.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{integration.icon}</div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {integration.name}
                              {integration.isPremium && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">Premium</Badge>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusIcon(integration.status)}
                              {getStatusBadge(integration.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <CardDescription className="mt-2">
                        {integration.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Features */}
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Fonctionnalités:</p>
                        <div className="space-y-1">
                          {integration.features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Connection Info */}
                      {integration.status === 'connected' && (
                        <div className="text-xs text-slate-500">
                          <p>Connecté le {integration.connectedAt?.toLocaleDateString('fr-FR')}</p>
                          <p>Dernière sync: {integration.lastSync?.toLocaleDateString('fr-FR')}</p>
                        </div>
                      )}
                      
                      {integration.status === 'error' && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            Erreur de connexion. Vérifiez vos permissions.
                          </p>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        {integration.status === 'connected' ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleDisconnect(integration.id)}
                            >
                              Déconnecter
                            </Button>
                            {integration.hasSettings && (
                              <Button size="sm" variant="outline">
                                <Settings className="w-3 h-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <Play className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleConnect(integration.id)}
                            disabled={integration.isPremium && user.creditsBalance < 500}
                          >
                            <LinkIcon className="w-3 h-3 mr-1" />
                            Connecter
                          </Button>
                        )}
                      </div>
                      
                      {integration.isPremium && user.creditsBalance < 500 && (
                        <p className="text-xs text-yellow-600">
                          Plan Premium requis
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Integration Stats */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">État des intégrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {mockIntegrations.filter(i => i.status === 'connected').length}
                </div>
                <div className="text-sm text-slate-500">Connectées</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-600">
                  {mockIntegrations.filter(i => i.status === 'disconnected').length}
                </div>
                <div className="text-sm text-slate-500">Disponibles</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {mockIntegrations.filter(i => i.status === 'error').length}
                </div>
                <div className="text-sm text-slate-500">En erreur</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {mockIntegrations.filter(i => i.isPremium).length}
                </div>
                <div className="text-sm text-slate-500">Premium</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhooks & API */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              API & Webhooks
            </CardTitle>
            <CardDescription>
              Configuration avancée pour les développeurs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">API VidGenie</h4>
                <p className="text-sm text-slate-600 mb-4">
                  Intégrez VidGenie dans vos applications avec notre API RESTful
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Key className="w-3 h-3 mr-1" />
                    Générer clé
                  </Button>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Documentation
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Webhooks</h4>
                <p className="text-sm text-slate-600 mb-4">
                  Recevez des notifications en temps réel des événements
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Webhook className="w-3 h-3 mr-1" />
                    Configurer
                  </Button>
                  <Button size="sm" variant="outline">
                    <Play className="w-3 h-3 mr-1" />
                    Tester
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}