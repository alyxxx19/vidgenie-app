'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect, useParams } from 'next/navigation';
import { api } from '@/app/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Video, 
  Users, 
  Settings, 
  Plus,
  Search,
  MoreVertical,
  Play,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';


export default function ProjectDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const projectId = params.id as string;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch project data
  const { data: project, isLoading: projectLoading } = api.projects.getById.useQuery(
    { id: projectId },
    { enabled: !!user && !!projectId }
  );

  const isLoading = authLoading || projectLoading;

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

  if (!project && !projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-mono text-white mb-2">project_not_found</h2>
          <p className="text-muted-foreground mb-4 font-mono text-sm">requested project does not exist</p>
          <Button asChild className="bg-white text-black font-mono text-xs">
            <Link href="/projects">back_to_projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-white text-black font-mono text-xs">completed</Badge>;
      case 'published':
        return <Badge className="bg-white text-black font-mono text-xs">published</Badge>;
      case 'scheduled':
        return <Badge className="bg-muted text-white font-mono text-xs">scheduled</Badge>;
      case 'failed':
        return <Badge className="bg-destructive text-background font-mono text-xs">failed</Badge>;
      default:
        return <Badge variant="secondary" className="font-mono text-xs">{status}</Badge>;
    }
  };

  // Filter project assets and posts
  const filteredAssets = (project?.assets || []).filter(asset => {
    const matchesSearch = asset.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPosts = (project?.posts || []).filter(post => {
    const matchesSearch = (post.title || post.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const allContent = [...filteredAssets, ...filteredPosts];
  const totalContent = (project?.assets?.length || 0) + (project?.posts?.length || 0);
  const publishedCount = (project?.posts || []).filter(p => p.status === 'published').length;
  const projectProgress = totalContent > 0 ? Math.round((publishedCount / totalContent) * 100) : 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background with Grid Pattern like Landing Page */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #000000 0%, #111111 100%)'
      }} />
      <div className="absolute inset-0 opacity-50" style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 39px,
          rgba(38, 38, 38, 0.3) 39px,
          rgba(38, 38, 38, 0.3) 40px
        ),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 39px,
          rgba(38, 38, 38, 0.3) 39px,
          rgba(38, 38, 38, 0.3) 40px
        )`
      }} />
      {/* Header */}
      <header className="bg-card border-b border-border relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white">
                <Link href="/projects">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  back
                </Link>
              </Button>
              <div>
                <h1 className="font-mono text-lg text-white mb-1">{project?.name.toLowerCase().replace(/\s+/g, '_')}</h1>
                <p className="text-muted-foreground text-xs font-mono">{project?.description || 'no_description'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-black font-mono text-xs h-8">
                <Settings className="w-3 h-3 mr-1" />
                settings
              </Button>
              <Button asChild className="bg-white hover:bg-white/90 text-black font-mono text-xs h-8">
                <Link href={`/create?project=${project.id}`}>
                  <Plus className="w-3 h-3 mr-1" />
                  new_content
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Project Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-white" />
                <span className="text-sm font-mono text-white">contents</span>
              </div>
              <div className="text-2xl font-mono text-white">{totalContent}</div>
              <p className="text-xs text-muted-foreground font-mono">total_created</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-white" />
                <span className="text-sm font-mono text-white">published</span>
              </div>
              <div className="text-2xl font-mono text-white">{publishedCount}</div>
              <p className="text-xs text-muted-foreground font-mono">{projectProgress}%_progress</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-sm font-mono text-white">views</span>
              </div>
              <div className="text-2xl font-mono text-white">-</div>
              <p className="text-xs text-muted-foreground font-mono">coming_soon</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-white" />
                <span className="text-sm font-mono text-white">team</span>
              </div>
              <div className="text-2xl font-mono text-white">1</div>
              <p className="text-xs text-muted-foreground font-mono">collaborators</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="bg-card border-border">
            <TabsTrigger value="content" className="flex items-center gap-2 font-mono text-xs text-muted-foreground data-[state=active]:text-background data-[state=active]:bg-foreground">
              <Video className="w-3 h-3" />
              content_({totalContent})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 font-mono text-xs text-muted-foreground data-[state=active]:text-background data-[state=active]:bg-foreground">
              <TrendingUp className="w-3 h-3" />
              analytics
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2 font-mono text-xs text-muted-foreground data-[state=active]:text-background data-[state=active]:bg-foreground">
              <Users className="w-3 h-3" />
              team_(1)
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            {/* Content Filters */}
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                    <Input
                      placeholder="search_content"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-7 h-8 bg-white border-border text-black font-mono text-xs"
                    />
                  </div>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 h-8 bg-white border-border text-black font-mono text-xs rounded-md"
                  >
                    <option value="all">all_status</option>
                    <option value="completed">completed</option>
                    <option value="published">published</option>
                    <option value="scheduled">scheduled</option>
                    <option value="failed">failed</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Content List */}
            <div className="space-y-4">
              {/* Assets */}
              {filteredAssets.map((asset) => (
                <Card key={`asset-${asset.id}`} className="bg-card border-border hover:border-white/20 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-foreground rounded-lg flex items-center justify-center">
                          <Video className="w-6 h-6 text-background" />
                        </div>
                        
                        <div>
                          <h3 className="font-mono text-sm text-white">{asset.filename.toLowerCase()}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(asset.status)}
                            <span className="text-xs text-muted-foreground font-mono">
                              {new Date(asset.createdAt).toLocaleDateString('en-US')}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge variant="outline" className="text-xs border-border text-muted-foreground font-mono">
                              {asset.mimeType}
                            </Badge>
                            {asset.duration && (
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground font-mono">
                                {Math.round(asset.duration)}s
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-mono text-white">
                          {(asset.fileSize / 1024 / 1024).toFixed(1)}MB
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {asset.width}x{asset.height}
                        </p>
                        
                        <div className="flex gap-1 mt-3">
                          <Button size="sm" variant="outline" className="border-border text-muted-foreground font-mono text-xs h-7">
                            <Play className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-border text-muted-foreground font-mono text-xs h-7">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Posts */}
              {filteredPosts.map((post) => (
                <Card key={`post-${post.id}`} className="bg-card border-border hover:border-white/20 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-foreground rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-background" />
                        </div>
                        
                        <div>
                          <h3 className="font-mono text-sm text-white">{(post.title || 'untitled').toLowerCase().replace(/\s+/g, '_')}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(post.status)}
                            <span className="text-xs text-muted-foreground font-mono">
                              {new Date(post.createdAt).toLocaleDateString('en-US')}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {post.platforms.map(platform => (
                              <Badge key={platform} variant="outline" className="text-xs border-border text-muted-foreground font-mono">
                                {platform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {post.scheduledAt && (
                          <p className="text-xs text-muted-foreground font-mono">
                            scheduled_{new Date(post.scheduledAt).toLocaleDateString('en-US')}
                          </p>
                        )}
                        
                        <div className="flex gap-1 mt-3">
                          <Button size="sm" variant="outline" className="border-border text-muted-foreground font-mono text-xs h-7">
                            <Play className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-border text-muted-foreground font-mono text-xs h-7">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {allContent.length === 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="py-8 text-center">
                    <Video className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-mono text-sm text-white mb-2">no_content_yet</h3>
                    <p className="text-muted-foreground mb-4 font-mono text-xs">create your first content</p>
                    <Button asChild className="bg-white text-black font-mono text-xs h-8">
                      <Link href={`/create?project=${projectId}`}>
                        <Plus className="w-3 h-3 mr-1" />
                        new_content
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-lg text-white">analytics_dashboard</CardTitle>
                <CardDescription className="font-mono text-xs text-muted-foreground">coming_soon</CardDescription>
              </CardHeader>
              <CardContent className="py-8 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-mono text-sm text-white mb-2">analytics_in_development</h3>
                <p className="text-muted-foreground font-mono text-xs">detailed metrics and insights will be available soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-lg text-white">project_team</CardTitle>
                  <Button variant="outline" size="sm" className="border-border text-muted-foreground font-mono text-xs h-8">
                    <Plus className="w-3 h-3 mr-1" />
                    invite
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Project Owner */}
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black font-mono font-medium">
                        {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-mono text-sm text-white">{user?.name || 'user'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{user?.email}</p>
                      </div>
                    </div>
                    <Badge className="bg-white text-black font-mono text-xs">owner</Badge>
                  </div>

                  {/* Collaboration coming soon */}
                  <Card className="bg-card border-border">
                    <CardContent className="py-8 text-center">
                      <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <h3 className="font-mono text-sm text-white mb-2">team_collaboration</h3>
                      <p className="text-muted-foreground font-mono text-xs">invite team members - coming soon</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}