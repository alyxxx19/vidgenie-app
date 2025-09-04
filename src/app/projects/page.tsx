'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { api } from '@/app/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
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
  ArrowRight,
  Tag,
  Target,
  Palette,
  Clock,
  CheckCircle2,
  X,
  Hash
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
    category: '',
    tags: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high',
    platforms: [] as string[],
    startDate: '',
    endDate: '',
    targetPosts: '',
    color: '#ffffff',
  });
  const [currentTag, setCurrentTag] = useState('');
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch projects from database
  const { data: projects, isLoading: projectsLoading, refetch } = api.projects.getAll.useQuery(undefined, {
    enabled: !!user,
  });
  const createProject = api.projects.create.useMutation();
  const deleteProject = api.projects.delete.useMutation();

  // Handle auth and loading states
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth/signin?redirectTo=' + encodeURIComponent('/projects');
    }
  }, [authLoading, user]);

  const isLoading = authLoading || (!user && !authLoading) || projectsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
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

    setIsCreating(true);
    try {
      await createProject.mutateAsync({
        name: newProject.name,
        description: newProject.description || undefined,
        category: newProject.category || undefined,
        tags: newProject.tags,
        priority: newProject.priority,
        platforms: newProject.platforms,
        startDate: newProject.startDate ? new Date(newProject.startDate) : undefined,
        endDate: newProject.endDate ? new Date(newProject.endDate) : undefined,
        targetPosts: newProject.targetPosts ? parseInt(newProject.targetPosts) : undefined,
        color: newProject.color !== '#ffffff' ? newProject.color : undefined,
      });
      
      toast.success('project created successfully');
      setIsCreateDialogOpen(false);
      setStep(1);
      setNewProject({
        name: '',
        description: '',
        category: '',
        tags: [],
        priority: 'medium',
        platforms: [],
        startDate: '',
        endDate: '',
        targetPosts: '',
        color: '#ffffff',
      });
      refetch();
    } catch (_error) {
      toast.error('failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const addTag = () => {
    if (currentTag && !newProject.tags.includes(currentTag)) {
      setNewProject(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewProject(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const togglePlatform = (platform: string) => {
    setNewProject(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
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
            
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setStep(1);
                setNewProject({
                  name: '',
                  description: '',
                  category: '',
                  tags: [],
                  priority: 'medium',
                  platforms: [],
                  startDate: '',
                  endDate: '',
                  targetPosts: '',
                  color: '#ffffff',
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-white hover:bg-white/90 text-black font-mono text-xs h-8 hover:scale-105 transition-all duration-300">
                  <Plus className="w-3 h-3 mr-1" />
                  new_project
                </Button>
              </DialogTrigger>
              <DialogPortal>
                <DialogOverlay className="backdrop-blur-[5px] bg-black/30" />
                <DialogContent className="max-w-2xl bg-black border-border overflow-hidden" showCloseButton={false}>
                  <div className="absolute inset-0 bg-black" />
                
                <DialogHeader className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="font-mono text-white text-lg flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          step === 1 ? 'bg-white text-black' : 
                          step === 2 ? 'bg-white/20 text-white' : 
                          'bg-white/10 text-muted-foreground'
                        }`}>
                          <Plus className="w-4 h-4" />
                        </div>
                        create_project
                      </DialogTitle>
                      <DialogDescription className="font-mono text-muted-foreground text-xs ml-10">
                        step {step}/3 - {step === 1 ? 'basic info' : step === 2 ? 'classification' : 'planning'}
                      </DialogDescription>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((s) => (
                        <div
                          key={s}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            s <= step ? 'bg-white' : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="relative z-10">
                  {/* Step 1: Basic Information */}
                  {step === 1 && (
                    <div className="space-y-4 animate-fade-in-up">
                      <div>
                        <Label htmlFor="project-name" className="font-mono text-xs text-white flex items-center gap-2">
                          <Hash className="w-3 h-3" />
                          project_name *
                        </Label>
                        <Input
                          id="project-name"
                          placeholder="my_awesome_project"
                          value={newProject.name}
                          onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                          className="h-10 bg-white border-border text-black font-mono text-sm mt-2"
                          autoFocus
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="project-description" className="font-mono text-xs text-white">description</Label>
                        <Textarea
                          id="project-description"
                          placeholder="describe your project goals and content strategy..."
                          value={newProject.description}
                          onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                          className="min-h-[80px] bg-white border-border text-black font-mono text-sm mt-2 resize-none"
                        />
                      </div>

                      <div>
                        <Label className="font-mono text-xs text-white flex items-center gap-2">
                          <Target className="w-3 h-3" />
                          category
                        </Label>
                        <Select value={newProject.category} onValueChange={(value) => setNewProject(prev => ({ ...prev, category: value }))}>
                          <SelectTrigger className="h-10 bg-white border-border text-black font-mono text-sm mt-2">
                            <SelectValue placeholder="select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="lifestyle" className="font-mono text-xs">lifestyle</SelectItem>
                            <SelectItem value="tech" className="font-mono text-xs">tech</SelectItem>
                            <SelectItem value="business" className="font-mono text-xs">business</SelectItem>
                            <SelectItem value="entertainment" className="font-mono text-xs">entertainment</SelectItem>
                            <SelectItem value="education" className="font-mono text-xs">education</SelectItem>
                            <SelectItem value="fitness" className="font-mono text-xs">fitness</SelectItem>
                            <SelectItem value="food" className="font-mono text-xs">food</SelectItem>
                            <SelectItem value="travel" className="font-mono text-xs">travel</SelectItem>
                            <SelectItem value="other" className="font-mono text-xs">other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Classification & Tags */}
                  {step === 2 && (
                    <div className="space-y-4 animate-fade-in-up">
                      <div>
                        <Label className="font-mono text-xs text-white flex items-center gap-2">
                          <Tag className="w-3 h-3" />
                          tags
                        </Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="add_tag"
                            value={currentTag}
                            onChange={(e) => setCurrentTag(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addTag()}
                            className="h-8 bg-white border-border text-black font-mono text-xs"
                          />
                          <Button 
                            onClick={addTag} 
                            size="sm" 
                            className="bg-white text-black hover:bg-white/90 font-mono text-xs h-8"
                          >
                            add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {newProject.tags.map((tag) => (
                            <Badge 
                              key={tag} 
                              variant="secondary" 
                              className="font-mono text-xs bg-white/10 text-white hover:bg-white/20 cursor-pointer group"
                              onClick={() => removeTag(tag)}
                            >
                              {tag}
                              <X className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Separator className="bg-border" />

                      <div>
                        <Label className="font-mono text-xs text-white flex items-center gap-2">
                          <Target className="w-3 h-3" />
                          priority
                        </Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[
                            { value: 'low', label: 'low', color: 'bg-muted-foreground' },
                            { value: 'medium', label: 'medium', color: 'bg-white' },
                            { value: 'high', label: 'high', color: 'bg-white' }
                          ].map((priority) => (
                            <Button
                              key={priority.value}
                              variant="outline"
                              size="sm"
                              onClick={() => setNewProject(prev => ({ ...prev, priority: priority.value as any }))}
                              className={`h-10 font-mono text-xs transition-all duration-300 ${
                                newProject.priority === priority.value
                                  ? 'bg-white text-black border-white'
                                  : 'bg-transparent border-border text-muted-foreground hover:text-white hover:border-white/30'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full mr-2 ${priority.color}`} />
                              {priority.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="font-mono text-xs text-white flex items-center gap-2">
                          <Palette className="w-3 h-3" />
                          project_color
                        </Label>
                        <div className="flex items-center gap-3 mt-2">
                          <input
                            type="color"
                            value={newProject.color}
                            onChange={(e) => setNewProject(prev => ({ ...prev, color: e.target.value }))}
                            className="w-10 h-10 rounded border border-border bg-transparent cursor-pointer"
                          />
                          <Input
                            value={newProject.color}
                            onChange={(e) => setNewProject(prev => ({ ...prev, color: e.target.value }))}
                            className="h-10 bg-white border-border text-black font-mono text-xs"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Planning & Platforms */}
                  {step === 3 && (
                    <div className="space-y-4 animate-fade-in-up">
                      <div>
                        <Label className="font-mono text-xs text-white flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          target_platforms
                        </Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[
                            { id: 'tiktok', label: 'TikTok', color: 'hover:bg-pink-500/20' },
                            { id: 'instagram', label: 'Instagram', color: 'hover:bg-purple-500/20' },
                            { id: 'youtube', label: 'YouTube', color: 'hover:bg-red-500/20' }
                          ].map((platform) => (
                            <Button
                              key={platform.id}
                              variant="outline"
                              size="sm"
                              onClick={() => togglePlatform(platform.id)}
                              className={`h-12 font-mono text-xs transition-all duration-300 ${platform.color} ${
                                newProject.platforms.includes(platform.id)
                                  ? 'bg-white text-black border-white'
                                  : 'bg-transparent border-border text-muted-foreground hover:text-white hover:border-white/30'
                              }`}
                            >
                              <CheckCircle2 className={`w-3 h-3 mr-2 ${
                                newProject.platforms.includes(platform.id) ? 'opacity-100' : 'opacity-0'
                              } transition-opacity`} />
                              {platform.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Separator className="bg-border" />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="start-date" className="font-mono text-xs text-white flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            start_date
                          </Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={newProject.startDate}
                            onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                            className="h-10 bg-white border-border text-black font-mono text-xs mt-2"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="end-date" className="font-mono text-xs text-white">end_date</Label>
                          <Input
                            id="end-date"
                            type="date"
                            value={newProject.endDate}
                            onChange={(e) => setNewProject(prev => ({ ...prev, endDate: e.target.value }))}
                            className="h-10 bg-white border-border text-black font-mono text-xs mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="target-posts" className="font-mono text-xs text-white flex items-center gap-2">
                          <Target className="w-3 h-3" />
                          target_posts
                        </Label>
                        <Input
                          id="target-posts"
                          type="number"
                          placeholder="50"
                          value={newProject.targetPosts}
                          onChange={(e) => setNewProject(prev => ({ ...prev, targetPosts: e.target.value }))}
                          className="h-10 bg-white border-border text-black font-mono text-xs mt-2"
                        />
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4 border-t border-border relative z-10">
                    <Button 
                      variant="outline" 
                      onClick={() => step > 1 ? setStep(step - 1) : setIsCreateDialogOpen(false)}
                      className="font-mono text-xs h-8 border-border text-muted-foreground hover:text-white"
                      disabled={isCreating}
                    >
                      {step > 1 ? 'previous' : 'cancel'}
                    </Button>
                    
                    <div className="flex gap-2">
                      {step < 3 ? (
                        <Button 
                          onClick={() => setStep(step + 1)}
                          className="bg-white text-black hover:bg-white/90 font-mono text-xs h-8"
                          disabled={step === 1 && !newProject.name}
                        >
                          next
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleCreateProject} 
                          className="bg-white text-black hover:bg-white/90 font-mono text-xs h-8"
                          disabled={!newProject.name || isCreating}
                        >
                          {isCreating ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-black mr-2" />
                              creating...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              create_project
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Custom close button */}
                  <button
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 z-20"
                  >
                    <X className="h-4 w-4 text-white" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
              </DialogContent>
              </DialogPortal>
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
                  className="pl-7 h-8 bg-white border-border text-black font-mono text-xs"
                />
              </div>
              

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 h-8 bg-white border-border text-black font-mono text-xs">
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
                {searchTerm 
                  ? 'no_projects_found' 
                  : 'no_projects_yet'
                }
              </h3>
              <p className="text-muted-foreground mb-4 font-mono text-xs">
                {searchTerm
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