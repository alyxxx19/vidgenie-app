'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Search, 
  HelpCircle, 
  Book, 
  MessageCircle, 
  Video,
  ExternalLink,
  ChevronRight,
  Play,
  FileText,
  Users,
  Zap,
  Settings,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';

const faqData = [
  {
    category: 'Démarrage',
    questions: [
      {
        q: 'Comment créer ma première vidéo?',
        a: 'Rendez-vous sur la page "Créer", saisissez votre prompt, sélectionnez vos plateformes et cliquez sur "Générer". L\'IA créera votre vidéo en quelques minutes.',
      },
      {
        q: 'Quels formats vidéo sont supportés?',
        a: 'VidGenie génère automatiquement au format optimal pour chaque plateforme : 9:16 pour TikTok/Instagram, 16:9 pour YouTube Shorts.',
      },
      {
        q: 'Combien de temps prend la génération?',
        a: 'En moyenne 2-5 minutes selon la complexité. Vous recevrez une notification quand c\'est prêt.',
      },
    ],
  },
  {
    category: 'Crédits',
    questions: [
      {
        q: 'Comment fonctionnent les crédits?',
        a: 'Chaque génération consomme 1 crédit. Votre plan détermine votre quota mensuel. Les crédits se renouvellent chaque mois.',
      },
      {
        q: 'Que se passe-t-il si je dépasse mon quota?',
        a: 'Vous pouvez acheter des crédits supplémentaires ou passer à un plan supérieur. Aucune interruption de service.',
      },
      {
        q: 'Les crédits non utilisés sont-ils reportés?',
        a: 'Non, les crédits se renouvellent chaque mois. Utilisez-les pour maximiser votre abonnement.',
      },
    ],
  },
  {
    category: 'Publication',
    questions: [
      {
        q: 'Puis-je programmer mes publications?',
        a: 'Oui! Utilisez le calendrier éditorial pour programmer vos contenus aux heures optimales.',
      },
      {
        q: 'Les hashtags sont-ils générés automatiquement?',
        a: 'Oui, notre IA génère des hashtags optimisés pour chaque plateforme selon votre contenu.',
      },
      {
        q: 'Puis-je modifier le contenu avant publication?',
        a: 'Absolument! Vous pouvez éditer le texte, les hashtags et programmer la publication.',
      },
    ],
  },
];

const tutorialVideos = [
  {
    id: '1',
    title: 'Prise en main rapide (5 min)',
    description: 'Créez votre première vidéo en 5 minutes',
    duration: '5:24',
    thumbnail: '/api/placeholder/300/169',
  },
  {
    id: '2',
    title: 'Optimiser vos prompts',
    description: 'Techniques avancées pour de meilleurs résultats',
    duration: '8:12',
    thumbnail: '/api/placeholder/300/169',
  },
  {
    id: '3',
    title: 'Gestion d\'équipe',
    description: 'Collaborer efficacement avec votre équipe',
    duration: '6:45',
    thumbnail: '/api/placeholder/300/169',
  },
];

const helpTopics = [
  {
    icon: <Video className="w-5 h-5" />,
    title: 'Création de contenu',
    description: 'Prompts, génération, personnalisation',
    articles: 12,
  },
  {
    icon: <CreditCard className="w-5 h-5" />,
    title: 'Facturation & Crédits',
    description: 'Plans, paiements, quotas',
    articles: 8,
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Collaboration',
    description: 'Équipes, permissions, partage',
    articles: 6,
  },
  {
    icon: <Settings className="w-5 h-5" />,
    title: 'Paramètres',
    description: 'Configuration, intégrations, sécurité',
    articles: 10,
  },
];

export default function HelpPage() {
  const { user, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter FAQ based on search and category
  const filteredFAQ = faqData.filter(category => {
    if (selectedCategory !== 'all' && category.category.toLowerCase() !== selectedCategory) {
      return false;
    }
    if (!searchTerm) return true;
    
    return category.questions.some(q => 
      q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.a.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Centre d'aide</h1>
              <p className="text-slate-600">Trouvez des réponses et apprenez à utiliser VidGenie</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Search */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Recherchez dans l'aide... Ex: comment créer une vidéo"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="guides">Guides</TabsTrigger>
            <TabsTrigger value="videos">Tutoriels</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            {/* Categories Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
              >
                Toutes
              </Button>
              {faqData.map(category => (
                <Button
                  key={category.category}
                  size="sm"
                  variant={selectedCategory === category.category.toLowerCase() ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.category.toLowerCase())}
                >
                  {category.category}
                </Button>
              ))}
            </div>

            {/* FAQ Items */}
            <div className="space-y-6">
              {filteredFAQ.map((category) => (
                <div key={category.category}>
                  <h3 className="text-lg font-medium mb-4">{category.category}</h3>
                  <div className="space-y-4">
                    {category.questions
                      .filter(q => 
                        !searchTerm || 
                        q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        q.a.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((qa, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="flex gap-4">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <HelpCircle className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium mb-2">{qa.q}</h4>
                              <p className="text-slate-600">{qa.a}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Guides Tab */}
          <TabsContent value="guides" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {helpTopics.map((topic, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        {topic.icon}
                      </div>
                      <h3 className="font-medium mb-2">{topic.title}</h3>
                      <p className="text-sm text-slate-500 mb-4">{topic.description}</p>
                      <Badge variant="outline">{topic.articles} articles</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Guides */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="w-5 h-5" />
                  Guides populaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    'Guide de démarrage complet',
                    'Optimiser ses prompts pour de meilleurs résultats',
                    'Stratégies de publication multi-plateformes',
                    'Gestion d\'équipe et collaboration',
                    'Analytics et métriques de performance',
                  ].map((guide, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{guide}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Tutorials Tab */}
          <TabsContent value="videos" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutorialVideos.map((video) => (
                <Card key={video.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-80" />
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Badge className="bg-black/70 text-white">{video.duration}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">{video.title}</h3>
                    <p className="text-sm text-slate-500">{video.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Support client
                  </CardTitle>
                  <CardDescription>
                    Notre équipe vous répond sous 24h
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email de support</span>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Contacter
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Chat en direct</span>
                      <Badge className="bg-green-100 text-green-800">Disponible</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Temps de réponse moyen</span>
                      <span className="text-sm font-medium">2h 15min</span>
                    </div>
                  </div>
                  
                  <Button className="w-full">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Démarrer une conversation
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Ressources utiles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Book className="w-4 h-4 mr-2" />
                    Documentation complète
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Communauté Discord
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Video className="w-4 h-4 mr-2" />
                    Chaîne YouTube
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Blog & actualités
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>État des services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Génération IA
                    </span>
                    <Badge className="bg-green-100 text-green-800">Opérationnel</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      API Réseaux sociaux
                    </span>
                    <Badge className="bg-green-100 text-green-800">Opérationnel</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Système de paiement
                    </span>
                    <Badge className="bg-green-100 text-green-800">Opérationnel</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Analytics
                    </span>
                    <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full mt-4">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Page de statut complète
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}