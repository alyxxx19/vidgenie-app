'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Zap,
  Palette
} from 'lucide-react';
import Link from 'next/link';
import { useUserApiKeys } from '@/hooks/useUserApiKeys';

export type ImageProvider = 'openai' | 'nanobanana';
export type VideoProvider = 'veo3';

interface ProviderSelectorProps {
  selectedImageProvider: ImageProvider;
  onImageProviderChange: (provider: ImageProvider) => void;
  selectedVideoProvider: VideoProvider;
  onVideoProviderChange: (provider: VideoProvider) => void;
  workflowType?: 'image-only' | 'video-only' | 'complete';
  className?: string;
}

const IMAGE_PROVIDERS = {
  openai: {
    name: 'OpenAI GPT-Image-1',
    icon: '🎨',
    description: 'high quality, artistic style, good for creative concepts',
    cost: '5 credits',
    speed: 'fast (~30s)',
    strengths: ['Creative interpretation', 'Artistic style', 'Text rendering'],
    keyRequired: 'openai'
  },
  nanobanana: {
    name: 'NanoBanana',
    icon: '🍌',
    description: 'fast, efficient, good for creative imagery',
    cost: '2 credits',
    speed: 'fast (~45s)',
    strengths: ['Speed', 'Efficiency', 'Creative style'],
    keyRequired: 'nanobanana'
  }
} as const;

const VIDEO_PROVIDERS = {
  veo3: {
    name: 'Google VEO3',
    icon: '🎬',
    description: 'high quality video generation from images',
    cost: '15 credits',
    speed: 'slow (~2-3min)',
    strengths: ['Smooth motion', 'High quality', '8s duration'],
    keyRequired: 'veo3'
  }
} as const;

export function ProviderSelector({
  selectedImageProvider,
  onImageProviderChange,
  selectedVideoProvider,
  onVideoProviderChange,
  workflowType = 'complete',
  className = ''
}: ProviderSelectorProps) {
  const { status } = useUserApiKeys();

  const showImageSelector = workflowType === 'image-only' || workflowType === 'complete';
  const showVideoSelector = workflowType === 'video-only' || workflowType === 'complete';

  const getProviderStatus = (provider: 'openai' | 'nanobanana' | 'veo3') => {
    const providerStatus = status[provider];
    if (!providerStatus.available) return 'not_configured';
    if (!providerStatus.validated) return 'needs_validation';
    return 'ready';
  };

  const getStatusBadge = (provider: 'openai' | 'nanobanana' | 'veo3') => {
    const providerStatus = getProviderStatus(provider);
    
    switch (providerStatus) {
      case 'ready':
        return (
          <Badge className="bg-green-500 text-white text-xs font-mono">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            ready
          </Badge>
        );
      case 'needs_validation':
        return (
          <Badge variant="secondary" className="text-xs font-mono">
            <AlertTriangle className="w-3 h-3 mr-1" />
            needs_validation
          </Badge>
        );
      case 'not_configured':
        return (
          <Badge variant="destructive" className="text-xs font-mono">
            <AlertTriangle className="w-3 h-3 mr-1" />
            not_configured
          </Badge>
        );
    }
  };

  const isProviderAvailable = (provider: 'openai' | 'nanobanana' | 'veo3') => {
    return getProviderStatus(provider) === 'ready';
  };

  if (!showImageSelector && !showVideoSelector) {
    return null;
  }

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
          <Settings className="w-4 h-4" />
          provider_selection
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Image Provider Selection */}
        {showImageSelector && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-mono text-xs text-white">image_generation</Label>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-6 text-xs text-muted-foreground hover:text-white font-mono"
              >
                <Link href="/profile?tab=api-keys">
                  configure_keys
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>

            <Select
              value={selectedImageProvider}
              onValueChange={(value: ImageProvider) => onImageProviderChange(value)}
            >
              <SelectTrigger className="bg-secondary border-border text-white font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/20 shadow-lg">
                {Object.entries(IMAGE_PROVIDERS).map(([key, provider]) => (
                  <SelectItem 
                    key={key} 
                    value={key}
                    disabled={!isProviderAvailable(provider.keyRequired as 'openai' | 'nanobanana')}
                    className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>{provider.icon}</span>
                        <span>{provider.name}</span>
                      </div>
                      {getStatusBadge(provider.keyRequired as 'openai' | 'nanobanana')}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected Provider Details */}
            {selectedImageProvider && (
              <div className="p-3 bg-secondary/20 border border-secondary rounded">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{IMAGE_PROVIDERS[selectedImageProvider].icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-mono text-white text-sm">{IMAGE_PROVIDERS[selectedImageProvider].name}</h4>
                      {getStatusBadge(IMAGE_PROVIDERS[selectedImageProvider].keyRequired as 'openai' | 'nanobanana')}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mb-2">
                      {IMAGE_PROVIDERS[selectedImageProvider].description}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                      <span>Cost: {IMAGE_PROVIDERS[selectedImageProvider].cost}</span>
                      <span>Speed: {IMAGE_PROVIDERS[selectedImageProvider].speed}</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-mono text-white mb-1">Strengths:</div>
                      <div className="flex flex-wrap gap-1">
                        {IMAGE_PROVIDERS[selectedImageProvider].strengths.map((strength) => (
                          <Badge key={strength} variant="outline" className="text-xs font-mono">
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Video Provider Selection */}
        {showVideoSelector && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-mono text-xs text-white">video_generation</Label>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-6 text-xs text-muted-foreground hover:text-white font-mono"
              >
                <Link href="/profile?tab=api-keys">
                  configure_keys
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>

            <Select
              value={selectedVideoProvider}
              onValueChange={(value: VideoProvider) => onVideoProviderChange(value)}
            >
              <SelectTrigger className="bg-secondary border-border text-white font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/20 shadow-lg">
                {Object.entries(VIDEO_PROVIDERS).map(([key, provider]) => (
                  <SelectItem 
                    key={key} 
                    value={key}
                    disabled={!isProviderAvailable(provider.keyRequired as 'veo3')}
                    className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>{provider.icon}</span>
                        <span>{provider.name}</span>
                      </div>
                      {getStatusBadge(provider.keyRequired as 'veo3')}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected Video Provider Details */}
            {selectedVideoProvider && (
              <div className="p-3 bg-secondary/20 border border-secondary rounded">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{VIDEO_PROVIDERS[selectedVideoProvider].icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-mono text-white text-sm">{VIDEO_PROVIDERS[selectedVideoProvider].name}</h4>
                      {getStatusBadge(VIDEO_PROVIDERS[selectedVideoProvider].keyRequired as 'veo3')}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mb-2">
                      {VIDEO_PROVIDERS[selectedVideoProvider].description}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                      <span>Cost: {VIDEO_PROVIDERS[selectedVideoProvider].cost}</span>
                      <span>Speed: {VIDEO_PROVIDERS[selectedVideoProvider].speed}</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-mono text-white mb-1">Features:</div>
                      <div className="flex flex-wrap gap-1">
                        {VIDEO_PROVIDERS[selectedVideoProvider].strengths.map((strength) => (
                          <Badge key={strength} variant="outline" className="text-xs font-mono">
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Provider Recommendations */}
        {showImageSelector && (
          <div className="p-3 bg-secondary/10 border border-secondary/50 rounded">
            <div className="text-xs font-mono text-white mb-2">💡 recommendations:</div>
            <div className="space-y-1 text-xs font-mono text-muted-foreground">
              <div>• Use <strong>OpenAI DALL-E</strong> for creative, artistic, or stylized images</div>
              <div>• Use <strong>NanoBanana</strong> for fast, efficient creative imagery</div>
              {showVideoSelector && (
                <div>• <strong>VEO3</strong> is currently the only video provider (8s duration)</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProviderSelector;