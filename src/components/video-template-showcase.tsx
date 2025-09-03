'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Video, 
  Play, 
  Bookmark, 
  Search,
  Sparkles,
  Clock,
  Camera,
  Palette
} from 'lucide-react';
import { VIDEO_TEMPLATES, TEMPLATE_CATEGORIES, type VideoTemplate } from '@/lib/video-templates';

interface VideoTemplateShowcaseProps {
  onSelectTemplate?: (template: VideoTemplate) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export function VideoTemplateShowcase({ 
  onSelectTemplate, 
  selectedCategory = '',
  onCategoryChange 
}: VideoTemplateShowcaseProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Filter templates based on category and search
  const filteredTemplates = VIDEO_TEMPLATES.filter(template => {
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = (template: VideoTemplate) => {
    setSelectedTemplate(template.id);
    onSelectTemplate?.(template);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
          <Video className="w-4 h-4" />
          video_template_library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 bg-white border-border text-black font-mono text-xs"
          />
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <Label className="font-mono text-xs text-white">categories</Label>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => onCategoryChange?.('')}
              className={`p-2 text-xs border transition-colors ${
                selectedCategory === '' 
                  ? 'border-white bg-white/10 text-white' 
                  : 'border-border hover:border-white/20 text-muted-foreground'
              }`}
            >
              <div className="font-mono">All ({VIDEO_TEMPLATES.length})</div>
            </button>
            {TEMPLATE_CATEGORIES.map((category) => (
              <button
                key={category.key}
                onClick={() => onCategoryChange?.(category.key)}
                className={`p-2 text-xs border transition-colors ${
                  selectedCategory === category.key 
                    ? 'border-white bg-white/10 text-white' 
                    : 'border-border hover:border-white/20 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span>{category.icon}</span>
                  <span className="font-mono text-xs">{category.label}</span>
                </div>
                <div className="text-xs text-muted-foreground">({category.count})</div>
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-mono text-xs">No templates found</p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-all ${
                  selectedTemplate === template.id 
                    ? 'border-white bg-white/5' 
                    : 'border-border hover:border-white/20 hover:bg-white/5'
                }`}
                onClick={() => handleTemplateSelect(template)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-mono text-sm text-white mb-1">{template.name}</h4>
                      <p className="font-mono text-xs text-muted-foreground">{template.description}</p>
                    </div>
                    <Badge className={`font-mono text-xs ${
                      template.category === 'marketing' ? 'bg-blue-500' :
                      template.category === 'creative' ? 'bg-purple-500' :
                      template.category === 'educational' ? 'bg-green-500' :
                      'bg-orange-500'
                    } text-white`}>
                      {template.category}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    {/* Motion Info */}
                    <div className="flex items-center gap-2 text-xs">
                      <Camera className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground font-mono">
                        {template.motion.cameraMovement.replace('-', ' ')}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground font-mono">{template.motion.duration}s</span>
                    </div>

                    {/* Mood */}
                    {template.mood.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Palette className="w-3 h-3 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {template.mood.slice(0, 2).map((mood) => (
                            <span key={mood} className="text-muted-foreground font-mono">
                              {mood}
                            </span>
                          ))}
                          {template.mood.length > 2 && (
                            <span className="text-muted-foreground font-mono">+{template.mood.length - 2}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="font-mono text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="outline" className="font-mono text-xs">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Variables */}
                  {template.variables.length > 0 && (
                    <div className="text-xs text-muted-foreground font-mono mb-2">
                      Variables: {template.variables.join(', ')}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleTemplateSelect(template)}
                      className="flex-1 h-6 font-mono text-xs bg-white hover:bg-white/90 text-black"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      use_template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle bookmark/save template
                        console.log('Bookmark template:', template.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Bookmark className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Template Count */}
        <div className="text-center text-xs text-muted-foreground font-mono">
          Showing {filteredTemplates.length} of {VIDEO_TEMPLATES.length} templates
        </div>
      </CardContent>
    </Card>
  );
}