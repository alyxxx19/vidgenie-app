'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Play, 
  Download, 
  Trash2, 
  ArrowLeft,
  Grid3X3,
  List,
  FileVideo,
  Calendar,
  Loader2,
  Upload,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/app/providers';
import { toast } from 'sonner';

export default function LibraryPage() {
  const { user, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');

  // Fetch real assets data
  const { data: assets, isLoading: assetsLoading } = api.assets.getAll.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: projects } = api.projects.getAll.useQuery(undefined, {
    enabled: !!user,
  });
  
  const deleteAssetMutation = api.assets.delete.useMutation({
    onSuccess: () => {
      toast.success('Asset deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete asset: ${error.message}`);
    },
  });

  const getSignedUrlMutation = api.assets.getSignedUrl.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
    },
    onError: (error) => {
      toast.error(`Failed to download asset: ${error.message}`);
    },
  });

  if (isLoading || assetsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    redirect('/auth/signin');
  }

  // Filter and sort assets
  const filteredAssets = (assets || []).filter(asset => {
    const matchesSearch = asset.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === 'all' || asset.projectId === selectedProject;
    const matchesTag = selectedTag === 'all' || (asset.tags || []).includes(selectedTag);
    
    return matchesSearch && matchesProject && matchesTag;
  });

  // Sort assets
  filteredAssets.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name':
        return a.filename.localeCompare(b.filename);
      case 'most-used':
        return (b.posts?.length || 0) - (a.posts?.length || 0);
      default:
        return 0;
    }
  });

  const allTags = Array.from(new Set((assets || []).flatMap(a => a.tags || [])));
  const allProjects = projects || [];
  
  const handleDeleteAsset = (assetId: string) => {
    deleteAssetMutation.mutate({ id: assetId });
  };

  const handleDownloadAsset = (assetId: string) => {
    getSignedUrlMutation.mutate({ id: assetId });
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
                <h1 className="font-mono text-lg text-white mb-1">library</h1>
                <p className="text-muted-foreground text-xs font-mono">{filteredAssets.length} assets available</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild className="bg-white hover:bg-white/90 text-black font-mono text-xs h-8">
                <Link href="/upload">
                  <Upload className="w-3 h-3 mr-1" />
                  upload
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-border text-white hover:bg-white hover:text-black font-mono text-xs h-8">
                <Link href="/create">
                  <FileVideo className="w-3 h-3 mr-1" />
                  create
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Filters */}
        <Card className="mb-6 bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-xs text-white">filters</span>
              </div>
              {(searchTerm || selectedProject !== 'all' || selectedTag !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedProject('all');
                    setSelectedTag('all');
                  }}
                  className="text-muted-foreground hover:text-white font-mono text-xs h-6"
                >
                  clear_all
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                <Input
                  placeholder="search_videos"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 bg-white border-border text-black font-mono text-xs"
                />
              </div>
              
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-8 bg-white border-border text-black font-mono text-xs">
                  <SelectValue placeholder="all_projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all_projects</SelectItem>
                  {allProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name.toLowerCase().replace(/\s+/g, '_')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="h-8 bg-white border-border text-black font-mono text-xs">
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
                <SelectTrigger className="h-8 bg-white border-border text-black font-mono text-xs">
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

        {/* Assets Grid/List */}
        {filteredAssets.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center">
              <FileVideo className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-mono text-sm text-white mb-2">no_assets_found</h3>
              <p className="text-muted-foreground mb-4 font-mono text-xs">
                {searchTerm || selectedProject !== 'all' || selectedTag !== 'all'
                  ? 'try adjusting filters'
                  : 'create your first content'
                }
              </p>
              <Button asChild className="bg-white text-black font-mono text-xs h-8">
                <Link href="/create">
                  <FileVideo className="w-3 h-3 mr-1" />
                  create_content
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
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className={`bg-card border-border hover:border-white/20 transition-colors animate-slide-in ${viewMode === 'list' ? 'flex' : ''}`}>
                {viewMode === 'grid' ? (
                  <>
                    <div className="relative aspect-video bg-black overflow-hidden">
                      {asset.thumbnailUrl ? (
                        <img 
                          src={asset.thumbnailUrl} 
                          alt={asset.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FileVideo className="w-6 h-6 text-white opacity-50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-black/70 text-white font-mono text-xs">
                          {asset.duration || 30}s
                        </Badge>
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge 
                          variant="secondary" 
                          className={`font-mono text-xs ${
                            asset.status === 'ready' ? 'bg-white/90 text-black' : 
                            asset.status === 'processing' ? 'bg-yellow-500/90 text-black' :
                            'bg-red-500/90 text-white'
                          }`}
                        >
                          {asset.status}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-mono text-sm text-white mb-2 truncate">{asset.filename}</h3>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2 font-mono">
                        {asset.description || 'No description'}
                      </p>
                      
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <Calendar className="w-3 h-3" />
                          {new Date(asset.createdAt).toLocaleDateString('en-US')}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <FileVideo className="w-3 h-3" />
                          {asset.fileSize || 'Unknown size'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(asset.tags || []).map((tag, index) => (
                            <Badge key={`${asset.id}-${tag}-${index}`} variant="outline" className="border-border text-muted-foreground font-mono text-xs">
                              #{tag}
                            </Badge>
                          ))}
                          {asset.project && (
                            <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
                              {asset.project.name.toLowerCase().replace(/\s+/g, '_')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button size="sm" className="flex-1 bg-white text-black font-mono text-xs h-7">
                          <Play className="w-3 h-3 mr-1" />
                          use
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0 border-border text-muted-foreground hover:border-blue-500 hover:text-blue-500"
                          onClick={() => handleDownloadAsset(asset.id)}
                          disabled={getSignedUrlMutation.isLoading}
                        >
                          {getSignedUrlMutation.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0 border-border text-muted-foreground hover:border-red-500 hover:text-red-500"
                          onClick={() => handleDeleteAsset(asset.id)}
                          disabled={deleteAssetMutation.isLoading}
                        >
                          {deleteAssetMutation.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <div className="flex p-3 gap-3">
                    <div className="relative w-24 h-14 bg-black overflow-hidden flex-shrink-0">
                      {asset.thumbnailUrl ? (
                        <img 
                          src={asset.thumbnailUrl} 
                          alt={asset.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FileVideo className="w-4 h-4 text-white opacity-50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                      <div className="absolute bottom-1 right-1">
                        <Badge variant="secondary" className="bg-black/70 text-white font-mono text-xs">
                          {asset.duration || 30}s
                        </Badge>
                      </div>
                      <div className="absolute top-1 left-1">
                        <Badge 
                          variant="secondary" 
                          className={`font-mono text-xs text-[10px] px-1 py-0 ${
                            asset.status === 'ready' ? 'bg-white/90 text-black' : 
                            asset.status === 'processing' ? 'bg-yellow-500/90 text-black' :
                            'bg-red-500/90 text-white'
                          }`}
                        >
                          {asset.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-mono text-sm text-white">{asset.filename}</h3>
                        <div className="flex gap-1">
                          <Button size="sm" className="bg-white text-black font-mono text-xs h-6">
                            <Play className="w-3 h-3 mr-1" />
                            use
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 w-6 p-0 border-border text-muted-foreground hover:border-blue-500 hover:text-blue-500"
                            onClick={() => handleDownloadAsset(asset.id)}
                            disabled={getSignedUrlMutation.isLoading}
                          >
                            {getSignedUrlMutation.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 w-6 p-0 border-border text-muted-foreground hover:border-red-500 hover:text-red-500"
                            onClick={() => handleDeleteAsset(asset.id)}
                            disabled={deleteAssetMutation.isLoading}
                          >
                            {deleteAssetMutation.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2 font-mono">{asset.description || 'No description'}</p>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(asset.createdAt).toLocaleDateString('en-US')}
                        </span>
                        <span>{asset.fileSize || 'Unknown'}</span>
                        <span>used {asset.posts?.length || 0}x</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {asset.project && (
                          <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
                            {asset.project.name.toLowerCase().replace(/\s+/g, '_')}
                          </Badge>
                        )}
                        {(asset.tags || []).map((tag, index) => (
                          <Badge key={`${asset.id}-list-${tag}-${index}`} variant="outline" className="border-border text-muted-foreground font-mono text-xs">
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