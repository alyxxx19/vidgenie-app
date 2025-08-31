'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { redirect, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Video, 
  Calendar, 
  Users, 
  Settings, 
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Target,
  Share2
} from 'lucide-react';
import Link from 'next/link';

// Mock project data
const mockProjectData = {
  '1': {
    id: '1',
    name: 'Campagne Printemps 2024',
    description: 'Série de contenus lifestyle pour promouvoir la nouvelle collection printemps',
    status: 'active',
    priority: 'high',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-05-31'),
    platforms: ['tiktok', 'instagram', 'youtube'],
    collaborators: [
      { id: '1', name: 'Marie Dubois', email: 'marie@example.com', role: 'Editor' },
      { id: '2', name: 'Julien Martin', email: 'julien@example.com', role: 'Viewer' },
    ],
    content: [
      {
        id: '1',
        title: 'Look printemps casual',
        status: 'completed',
        createdAt: new Date('2024-03-15'),
        platforms: ['tiktok', 'instagram'],
        views: 15420,
        engagement: 8.2,
      },
      {
        id: '2',
        title: 'Tendances mode 2024',
        status: 'published',
        createdAt: new Date('2024-03-18'),
        platforms: ['youtube', 'tiktok'],
        views: 24680,
        engagement: 12.5,
      },
      {
        id: '3',
        title: 'Accessoires must-have',
        status: 'scheduled',
        createdAt: new Date('2024-03-20'),
        platforms: ['instagram'],
        scheduledAt: new Date('2024-03-25'),
      },
    ],
    analytics: {
      totalViews: 156420,
      totalEngagement: 9.8,
      avgCompletionRate: 78,
      topPerformingContent: 'Tendances mode 2024',
      platformBreakdown: {
        tiktok: 60,
        instagram: 25,
        youtube: 15,
      },
    },
  },
};

export default function ProjectDetailPage() {
  const { user, isLoading } = useAuth();
  const params = useParams();
  const projectId = params.id as string;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const project = mockProjectData[projectId as keyof typeof mockProjectData];
  
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Projet introuvable</h2>
          <p className="text-slate-600 mb-4">Le projet demandé n'existe pas</p>
          <Button asChild>
            <Link href="/projects">Retour aux projets</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Terminé</Badge>;
      case 'published':
        return <Badge className="bg-blue-100 text-blue-800">Publié</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-100 text-purple-800">Programmé</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Échec</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredContent = project.content.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || content.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const projectProgress = Math.round((project.content.filter(c => c.status === 'published').length / project.content.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/projects">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Projets
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-slate-600">{project.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </Button>
              <Button asChild>
                <Link href={`/create?project=${project.id}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau contenu
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Project Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Contenus</span>
              </div>
              <div className="text-2xl font-bold">{project.content.length}</div>
              <p className="text-xs text-slate-500">Total créés</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Publiés</span>
              </div>
              <div className="text-2xl font-bold">{project.content.filter(c => c.status === 'published').length}</div>
              <p className="text-xs text-slate-500">{projectProgress}% du projet</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Vues</span>
              </div>
              <div className="text-2xl font-bold">{project.analytics.totalViews.toLocaleString('fr-FR')}</div>
              <p className="text-xs text-slate-500">Engagement {project.analytics.totalEngagement}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium">Équipe</span>
              </div>
              <div className="text-2xl font-bold">{project.collaborators.length + 1}</div>
              <p className="text-xs text-slate-500">Collaborateurs</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="content" className="space-y-6">
          <TabsList>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Contenu ({project.content.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Équipe ({project.collaborators.length})
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            {/* Content Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Rechercher du contenu..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="completed">Terminés</option>
                    <option value="published">Publiés</option>
                    <option value="scheduled">Programmés</option>
                    <option value="failed">Échecs</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Content List */}
            <div className="space-y-4">
              {filteredContent.map((content) => (
                <Card key={content.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-lg">{content.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(content.status)}
                            <span className="text-sm text-slate-500">
                              {content.createdAt.toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {content.platforms.map(platform => (
                              <Badge key={platform} variant="outline" className="text-xs">
                                {platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : 'YouTube'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {content.views && (
                          <div className="text-lg font-bold text-blue-600">
                            {content.views.toLocaleString('fr-FR')}
                          </div>
                        )}
                        {content.engagement && (
                          <p className="text-sm text-slate-500">
                            {content.engagement}% engagement
                          </p>
                        )}
                        {content.scheduledAt && (
                          <p className="text-sm text-slate-500">
                            Programmé pour {content.scheduledAt.toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">
                            <Play className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance globale</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Vues totales</span>
                        <span className="font-medium">{project.analytics.totalViews.toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Engagement moyen</span>
                        <span className="font-medium">{project.analytics.totalEngagement}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Taux de completion</span>
                        <span className="font-medium">{project.analytics.avgCompletionRate}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top contenu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-medium">{project.analytics.topPerformingContent}</h4>
                    <p className="text-sm text-slate-500">24,680 vues</p>
                    <p className="text-sm text-green-600">12.5% engagement</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Répartition plateformes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(project.analytics.platformBreakdown).map(([platform, percentage]) => (
                      <div key={platform}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">
                            {platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : 'YouTube'}
                          </span>
                          <span className="font-medium">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Collaborateurs du projet</CardTitle>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Inviter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Project Owner */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Propriétaire</Badge>
                  </div>

                  {/* Collaborators */}
                  {project.collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-medium">
                          {collaborator.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{collaborator.name}</p>
                          <p className="text-sm text-slate-500">{collaborator.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{collaborator.role}</Badge>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
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