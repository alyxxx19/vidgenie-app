'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Video, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Eye,
  Share2,
  Search,
  Filter,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useState } from 'react';

interface ContentItem {
  id: string;
  title: string;
  prompt?: string;
  createdAt: Date;
  status: string;
  platforms: string[];
  duration?: number;
  views?: number;
  thumbnail?: string;
  publishedUrl?: string;
}

interface ContentHistoryProps {
  content?: ContentItem[];
  isLoading?: boolean;
}

export default function ContentHistory({ content = [], isLoading }: ContentHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.prompt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesPlatform = platformFilter === 'all' || item.platforms.includes(platformFilter);
    
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-white text-black font-mono text-xs">
            complete
          </Badge>
        );
      case 'published':
        return (
          <Badge className="bg-muted text-white font-mono text-xs">
            published
          </Badge>
        );
      case 'running':
        return (
          <Badge className="bg-secondary text-white font-mono text-xs animate-minimal-pulse">
            running
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-destructive text-black font-mono text-xs">
            failed
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="font-mono text-xs">{status}</Badge>;
    }
  };

  const getPlatformBadge = (platform: string) => {
    return (
      <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
        {platform}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique du contenu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-sm text-white">content_history</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 w-40 h-8 bg-input border-border text-white font-mono text-xs"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-24 h-8 bg-input border-border text-white font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="completed">complete</SelectItem>
                <SelectItem value="published">published</SelectItem>
                <SelectItem value="running">running</SelectItem>
                <SelectItem value="failed">failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-24 h-8 bg-input border-border text-white font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="tiktok">tiktok</SelectItem>
                <SelectItem value="youtube">youtube</SelectItem>
                <SelectItem value="instagram">instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredContent.length > 0 ? (
          <div className="space-y-4">
            {filteredContent.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 border-border border-b hover:bg-secondary/50 transition-colors animate-slide-in">
                <div className="w-12 h-12 bg-secondary border border-border flex items-center justify-center overflow-hidden relative">
                  {item.thumbnail ? (
                    <NextImage 
                      src={item.thumbnail} 
                      alt="Content thumbnail" 
                      width={48}
                      height={48}
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <Video className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-mono text-sm text-white truncate">{item.title}</h4>
                    {getStatusBadge(item.status)}
                  </div>
                  
                  {item.prompt && (
                    <p className="text-xs text-muted-foreground truncate mb-1 font-mono">
                      {item.prompt}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.createdAt.toLocaleDateString('en-US')}
                    </span>
                    {item.duration && (
                      <span className="text-xs text-muted-foreground font-mono">
                        • {item.duration}s
                      </span>
                    )}
                    {item.views && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Eye className="w-3 h-3" />
                        {item.views.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {item.platforms.map((platform, index) => (
                      <span key={`${item.id}-${platform}-${index}`}>
                        {getPlatformBadge(platform)}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0 text-muted-foreground hover:text-white">
                      <Link href={`/assets/${item.id}`}>
                        <Eye className="w-3 h-3" />
                      </Link>
                    </Button>
                    
                    {item.publishedUrl && (
                      <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0 text-muted-foreground hover:text-white">
                        <a href={item.publishedUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Video className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-mono text-white mb-2">
              {searchQuery || statusFilter !== 'all' || platformFilter !== 'all' 
                ? 'no_content_found' 
                : 'no_content_yet'}
            </h3>
            <p className="text-muted-foreground mb-4 font-mono text-xs">
              {searchQuery || statusFilter !== 'all' || platformFilter !== 'all'
                ? 'try adjusting filters'
                : 'create your first automated content'}
            </p>
            {(!searchQuery && statusFilter === 'all' && platformFilter === 'all') && (
              <Button asChild className="bg-white text-black font-mono text-xs h-8">
                <Link href="/create">
                  create_content
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}