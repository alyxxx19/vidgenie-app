'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Folder, 
  Video, 
  Calendar, 
  Users, 
  ArrowLeft,
  MoreVertical,
  Edit3,
  Trash2,
  Share2,
  Target,
  Clock,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { mockProjects, type Project, getStatusBadge, getPriorityBadge } from '@/lib/mock-data';

export default function ProjectsPage() {
  const { user, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'medium',
    platforms: [] as string[],
    startDate: '',
    endDate: '',
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

  // Filter projects
  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });


  const getPlatformIcon = (platform: string) => {
    // Return platform-specific styling
    return platform;
  };

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      // Simulate project creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Projet créé avec succès!');
      setIsCreateDialogOpen(false);
      setNewProject({
        name: '',
        description: '',
        priority: 'medium',
        platforms: [],
        startDate: '',
        endDate: '',
      });
    } catch (error) {
      toast.error('Erreur lors de la création du projet');
    }
  };

  const getProgressPercentage = (project: Project) => {
    if (project.contentCount === 0) return 0;
    return Math.round((project.publishedCount / project.contentCount) * 100);
  };

  return (
    <div className="min-h-screen bg-minimal-gradient">
      {/* Minimal grid */}
      <div className="absolute inset-0 bg-grid-minimal opacity-30" />
      
      {/* Header */}
      <header className="bg-card border-b border-border relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white">
                <Link href="/dashboard">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  back
                </Link>
              </Button>
              <div>
                <h1 className="font-mono text-lg text-white mb-1">projects</h1>
                <p className="text-muted-foreground text-xs font-mono">content organization</p>
              </div>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white hover:bg-white/90 text-black font-mono text-xs h-8">
                  <Plus className="w-3 h-3 mr-1" />
                  new_project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-mono text-white text-sm">create_project</DialogTitle>
                  <DialogDescription className="font-mono text-muted-foreground text-xs">
                    organize content into projects
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="project-name" className="font-mono text-xs text-white">name *</Label>
                    <Input
                      id="project-name"
                      placeholder="project_name_here"
                      value={newProject.name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                      className="h-8 bg-input border-border text-white font-mono text-xs"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="project-description" className="font-mono text-xs text-white">description *</Label>
                    <Textarea
                      id="project-description"
                      placeholder="project objectives and scope"
                      value={newProject.description}
                      onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                      className="min-h-[60px] bg-input border-border text-white font-mono text-xs"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="priority" className="font-mono text-xs text-white">priority</Label>
                      <Select 
                        value={newProject.priority} 
                        onValueChange={(value) => setNewProject(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger className="h-8 bg-input border-border text-white font-mono text-xs">
                          <SelectValue placeholder="select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">low</SelectItem>
                          <SelectItem value="medium">medium</SelectItem>
                          <SelectItem value="high">high</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="start-date" className="font-mono text-xs text-white">start_date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={newProject.startDate}
                        onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                        className="h-8 bg-input border-border text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="end-date" className="font-mono text-xs text-white">end_date (optional)</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject(prev => ({ ...prev, endDate: e.target.value }))}
                      className="h-8 bg-input border-border text-white font-mono text-xs"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="font-mono text-xs h-8">
                      cancel
                    </Button>
                    <Button onClick={handleCreateProject} className="bg-white text-black font-mono text-xs h-8">
                      create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Filters */}
        <Card className="mb-6 bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                <Input
                  placeholder="search_projects"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 bg-input border-border text-white font-mono text-xs"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 bg-input border-border text-white font-mono text-xs">
                  <SelectValue placeholder="filter_status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all</SelectItem>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="completed">complete</SelectItem>
                  <SelectItem value="paused">paused</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="bg-card border-border hover:border-white/20 transition-colors animate-slide-in">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="font-mono text-sm text-white leading-tight mb-2">
                        {project.name.toLowerCase().replace(/\s+/g, '_')}
                      </CardTitle>
                      <div className="flex items-center gap-1 mb-2">
                        {(() => {
                          const statusBadge = getStatusBadge(project.status);
                          return <Badge className={statusBadge.className}>{statusBadge.label}</Badge>;
                        })()}
                        {(() => {
                          const priorityBadge = getPriorityBadge(project.priority);
                          return <Badge variant="outline" className={priorityBadge.className}>{priorityBadge.label}</Badge>;
                        })()}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-white">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <CardDescription className="line-clamp-2 font-mono text-xs text-muted-foreground">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono">progress</span>
                      <span className="font-mono text-white">{getProgressPercentage(project)}%</span>
                    </div>
                    <Progress value={getProgressPercentage(project)} className="h-1 bg-secondary" />
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-mono text-white">{project.contentCount}</div>
                      <div className="text-xs text-muted-foreground font-mono">total</div>
                    </div>
                    <div>
                      <div className="text-sm font-mono text-white">{project.publishedCount}</div>
                      <div className="text-xs text-muted-foreground font-mono">live</div>
                    </div>
                    <div>
                      <div className="text-sm font-mono text-white">{project.scheduledCount}</div>
                      <div className="text-xs text-muted-foreground font-mono">queue</div>
                    </div>
                  </div>
                  
                  {/* Platforms */}
                  <div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {project.platforms.map((platform, index) => (
                        <Badge key={`${project.id}-${platform}-${index}`} variant="outline" className="border-border text-muted-foreground font-mono text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Collaborators */}
                  {project.collaborators.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-mono">
                        {project.collaborators.length} collaborators
                      </span>
                    </div>
                  )}
                  
                  {/* Dates */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {project.startDate.toLocaleDateString('en-US')}
                      {project.endDate && ` - ${project.endDate.toLocaleDateString('en-US')}`}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1 pt-2">
                    <Button size="sm" className="flex-1 bg-white text-black font-mono text-xs h-7" asChild>
                      <Link href={`/projects/${project.id}`}>
                        open
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="border-border text-muted-foreground font-mono text-xs h-7" asChild>
                      <Link href={`/create?project=${project.id}`}>
                        +content
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center">
              <Folder className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-mono text-sm text-white mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'no_projects_found' 
                  : 'no_projects_yet'
                }
              </h3>
              <p className="text-muted-foreground mb-4 font-mono text-xs">
                {searchTerm || statusFilter !== 'all'
                  ? 'try adjusting filters'
                  : 'create your first project'
                }
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-white text-black font-mono text-xs h-8">
                <Plus className="w-3 h-3 mr-1" />
                new_project
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Global Stats */}
        {filteredProjects.length > 0 && (
          <Card className="mt-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="font-mono text-sm text-white">global_stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-mono text-white">
                    {filteredProjects.length}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">projects</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-mono text-white">
                    {filteredProjects.reduce((sum, p) => sum + p.contentCount, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">content</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-mono text-white">
                    {filteredProjects.reduce((sum, p) => sum + p.publishedCount, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">published</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-mono text-white">
                    {new Set(filteredProjects.flatMap(p => p.collaborators)).size}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">users</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}