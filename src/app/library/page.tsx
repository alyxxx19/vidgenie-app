'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Play, 
  Download, 
  Trash2, 
  ArrowLeft,
  Grid3X3,
  List,
  FileVideo,
  Calendar,
  Tag,
  Clock
} from 'lucide-react';
import Link from 'next/link';

// Mock data for video library
const mockVideos = [
  {
    id: '1',
    filename: 'lifestyle_morning_routine.mp4',
    thumbnail: '/api/placeholder/400/225',
    duration: 28,
    size: '24.5 MB',
    uploadedAt: new Date('2024-01-15'),
    project: 'Campagne Printemps 2024',
    tags: ['lifestyle', 'morning', 'routine'],
    description: 'Routine matinale inspirante pour jeunes professionnels',
    used: 3,
  },
  {
    id: '2',
    filename: 'product_demo_smartphone.mp4',
    thumbnail: '/api/placeholder/400/225',
    duration: 45,
    size: '67.2 MB',
    uploadedAt: new Date('2024-01-12'),
    project: 'Série Tutoriels',
    tags: ['tech', 'smartphone', 'demo'],
    description: 'Démonstration des nouvelles fonctionnalités',
    used: 1,
  },
  {
    id: '3',
    filename: 'cooking_quick_recipe.mp4',
    thumbnail: '/api/placeholder/400/225',
    duration: 35,
    size: '41.8 MB',
    uploadedAt: new Date('2024-01-10'),
    project: 'Content Marketing Q1',
    tags: ['food', 'cooking', 'recipe'],
    description: 'Recette rapide et savoureuse en 5 minutes',
    used: 5,
  },
];

export default function LibraryPage() {
  const { user, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');

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

  // Filter and sort videos
  let filteredVideos = mockVideos.filter(video => {
    const matchesSearch = video.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === 'all' || video.project === selectedProject;
    const matchesTag = selectedTag === 'all' || video.tags.includes(selectedTag);
    
    return matchesSearch && matchesProject && matchesTag;
  });

  // Sort videos
  filteredVideos.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.uploadedAt.getTime() - a.uploadedAt.getTime();
      case 'oldest':
        return a.uploadedAt.getTime() - b.uploadedAt.getTime();
      case 'name':
        return a.filename.localeCompare(b.filename);
      case 'most-used':
        return b.used - a.used;
      default:
        return 0;
    }
  });

  const allTags = Array.from(new Set(mockVideos.flatMap(v => v.tags)));
  const allProjects = Array.from(new Set(mockVideos.map(v => v.project)));

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
                <h1 className="font-mono text-lg text-white mb-1">library</h1>
                <p className="text-muted-foreground text-xs font-mono">{filteredVideos.length} videos available</p>
              </div>
            </div>
            <Button asChild className="bg-white hover:bg-white/90 text-black font-mono text-xs h-8">
              <Link href="/upload">
                <FileVideo className="w-3 h-3 mr-1" />
                upload
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Filters */}
        <Card className="mb-6 bg-card border-border">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                <Input
                  placeholder="search_videos"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 bg-input border-border text-white font-mono text-xs"
                />
              </div>
              
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-8 bg-input border-border text-white font-mono text-xs">
                  <SelectValue placeholder="all_projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all_projects</SelectItem>
                  {allProjects.map(project => (
                    <SelectItem key={project} value={project}>{project.toLowerCase().replace(/\s+/g, '_')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="h-8 bg-input border-border text-white font-mono text-xs">
                  <SelectValue placeholder="all_tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all_tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>#{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 bg-input border-border text-white font-mono text-xs">
                  <SelectValue placeholder="sort_by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">newest</SelectItem>
                  <SelectItem value="oldest">oldest</SelectItem>
                  <SelectItem value="name">name</SelectItem>
                  <SelectItem value="most-used">most_used</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-white text-black' : 'border-border text-muted-foreground'} 
                >
                  <Grid3X3 className="w-3 h-3" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-white text-black' : 'border-border text-muted-foreground'}
                >
                  <List className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Videos Grid/List */}
        {filteredVideos.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center">
              <FileVideo className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-mono text-sm text-white mb-2">no_videos_found</h3>
              <p className="text-muted-foreground mb-4 font-mono text-xs">
                {searchTerm || selectedProject !== 'all' || selectedTag !== 'all'
                  ? 'try adjusting filters'
                  : 'upload your first videos'
                }
              </p>
              <Button asChild className="bg-white text-black font-mono text-xs h-8">
                <Link href="/upload">
                  upload_video
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }>
            {filteredVideos.map((video) => (
              <Card key={video.id} className={`bg-card border-border hover:border-white/20 transition-colors animate-slide-in ${viewMode === 'list' ? 'flex' : ''}`}>
                {viewMode === 'grid' ? (
                  <>
                    <div className="relative aspect-video bg-black overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white opacity-50" />
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-black/70 text-white font-mono text-xs">
                          {video.duration}s
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-mono text-sm text-white mb-2 truncate">{video.filename}</h3>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2 font-mono">
                        {video.description}
                      </p>
                      
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <Calendar className="w-3 h-3" />
                          {video.uploadedAt.toLocaleDateString('en-US')}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <FileVideo className="w-3 h-3" />
                          {video.size}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {video.tags.map((tag, index) => (
                            <Badge key={`${video.id}-${tag}-${index}`} variant="outline" className="border-border text-muted-foreground font-mono text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button size="sm" className="flex-1 bg-white text-black font-mono text-xs h-7">
                          <Play className="w-3 h-3 mr-1" />
                          use
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-border text-muted-foreground">
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-border text-muted-foreground">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <div className="flex p-3 gap-3">
                    <div className="relative w-24 h-14 bg-black overflow-hidden flex-shrink-0">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white opacity-50" />
                      </div>
                      <div className="absolute bottom-1 right-1">
                        <Badge variant="secondary" className="bg-black/70 text-white font-mono text-xs">
                          {video.duration}s
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-mono text-sm text-white">{video.filename}</h3>
                        <div className="flex gap-1">
                          <Button size="sm" className="bg-white text-black font-mono text-xs h-6">
                            <Play className="w-3 h-3 mr-1" />
                            use
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 w-6 p-0 border-border text-muted-foreground">
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 w-6 p-0 border-border text-muted-foreground">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2 font-mono">{video.description}</p>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {video.uploadedAt.toLocaleDateString('en-US')}
                        </span>
                        <span>{video.size}</span>
                        <span>used {video.used}x</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">{video.project.toLowerCase().replace(/\s+/g, '_')}</Badge>
                        {video.tags.map((tag, index) => (
                          <Badge key={`${video.id}-list-${tag}-${index}`} variant="outline" className="border-border text-muted-foreground font-mono text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}