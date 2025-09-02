'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { api } from '@/app/providers';
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
  Calendar, 
  Users, 
  ArrowLeft,
  MoreVertical,
  ArrowUpDown,
  Grid3x3,
  List,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
  });

  // Fetch projects from database
  const { data: projects, isLoading: projectsLoading, refetch } = api.projects.getAll.useQuery(undefined, {
    enabled: !!user,
  });
  const createProject = api.projects.create.useMutation();
  const deleteProject = api.projects.delete.useMutation();

  const isLoading = authLoading || projectsLoading;

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

  // Filter and sort projects
  const filteredProjects = (projects || [])
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (project.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
      return matchesSearch;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updated':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const handleCreateProject = async () => {
    if (!newProject.name) {
      toast.error('please enter a project name');
      return;
    }

    try {
      await createProject.mutateAsync({
        name: newProject.name,
        description: newProject.description || undefined,
      });
      
      toast.success('project created successfully');
      setIsCreateDialogOpen(false);
      setNewProject({
        name: '',
        description: '',
      });
      refetch();
    } catch (_error) {
      toast.error('failed to create project');
    }
  };

  const getProgressPercentage = (project: any) => {
    if (!project.contentCount || project.contentCount === 0) return 0;
    return Math.round((project.publishedCount / project.contentCount) * 100);
  };

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
                    <Label htmlFor="project-description" className="font-mono text-xs text-white">description (optional)</Label>
                    <Textarea
                      id="project-description"
                      placeholder="project objectives and scope"
                      value={newProject.description}
                      onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                      className="min-h-[60px] bg-input border-border text-white font-mono text-xs"
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
        {/* Enhanced Filters and Controls */}
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
              

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 h-8 bg-input border-border text-white font-mono text-xs">
                  <SelectValue placeholder="sort_by" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="updated" className="font-mono text-xs">updated</SelectItem>
                  <SelectItem value="created" className="font-mono text-xs">created</SelectItem>
                  <SelectItem value="name" className="font-mono text-xs">name</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-8 px-3 border-border text-muted-foreground hover:text-white font-mono text-xs"
              >
                <ArrowUpDown className="w-3 h-3" />
                {sortOrder}
              </Button>

              <div className="flex gap-1 border border-border overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-8 px-3 font-mono text-xs ${viewMode === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-white'}`}
                >
                  <Grid3x3 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-8 px-3 font-mono text-xs ${viewMode === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-white'}`}
                >
                  <List className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid/List */}
        {filteredProjects.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch" 
            : "space-y-4"
          }>
            {filteredProjects.map((project, index) => (
              <Card key={project.id} className="bg-card border-border hover:border-white/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-glow animate-slide-in h-full flex flex-col" style={{ animationDelay: `${index * 100}ms` }}>
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="font-mono text-sm text-white leading-tight mb-2">
                        {project.name.toLowerCase().replace(/\s+/g, '_')}
                      </CardTitle>
                      <div className="flex items-center gap-1 mb-2">
                        <Badge className="bg-white text-black font-mono text-xs">
                          {project.contentCount} content
                        </Badge>
                        {project.publishedCount > 0 && (
                          <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
                            {project.publishedCount} published
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-white">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <CardDescription className="line-clamp-2 font-mono text-xs text-muted-foreground h-10">
                    {project.description || 'no_description'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
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
                      <div className="text-sm font-mono text-white">{project.contentCount || 0}</div>
                      <div className="text-xs text-muted-foreground font-mono">total</div>
                    </div>
                    <div>
                      <div className="text-sm font-mono text-white">{project.publishedCount || 0}</div>
                      <div className="text-xs text-muted-foreground font-mono">live</div>
                    </div>
                    <div>
                      <div className="text-sm font-mono text-white">{project.scheduledCount || 0}</div>
                      <div className="text-xs text-muted-foreground font-mono">queue</div>
                    </div>
                  </div>
                  
                  {/* Dates */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>
                      created_{new Date(project.createdAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1 pt-2 mt-auto">
                    <Button size="sm" className="flex-1 bg-transparent border-white text-white hover:bg-white hover:text-black font-mono text-xs h-7 rounded-lg border" asChild>
                      <Link href={`/projects/${project.id}`} className="flex items-center justify-center">
                        open
                        <ArrowRight className="ml-1 h-3 w-3" />
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
                    {filteredProjects.reduce((sum, p) => sum + (p.contentCount || 0), 0)}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">content</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-mono text-white">
                    {filteredProjects.reduce((sum, p) => sum + (p.publishedCount || 0), 0)}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">published</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-mono text-white">
                    {filteredProjects.reduce((sum, p) => sum + (p.scheduledCount || 0), 0)}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">scheduled</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}