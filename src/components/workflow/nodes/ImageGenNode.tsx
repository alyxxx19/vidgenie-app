'use client';

import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Image, AlertCircle, CheckCircle, Download, ExternalLink } from 'lucide-react';
import { WorkflowNodeData } from '../types/workflow';

interface ImageGenNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export function ImageGenNode({ id, data, selected }: ImageGenNodeProps) {
  const getNodeStyle = () => {
    const baseStyle = 'transition-all duration-300 ease-in-out';
    
    switch (data.status) {
      case 'loading':
        return `${baseStyle} border-orange-500 bg-orange-50/50 shadow-lg`;
      case 'success':
        return `${baseStyle} border-green-500 bg-green-50/50 shadow-lg`;
      case 'error':
        return `${baseStyle} border-red-500 bg-red-50/50 shadow-lg animate-shake`;
      default:
        return `${baseStyle} border-gray-300 bg-white/80 backdrop-blur-sm ${
          selected ? 'border-primary shadow-lg' : ''
        }`;
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'loading':
        return <Image className="w-4 h-4 text-orange-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Image className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (data.status) {
      case 'loading':
        return <Badge className="bg-orange-500 text-white font-mono text-xs animate-pulse">generating</Badge>;
      case 'success':
        return <Badge className="bg-green-500 text-white font-mono text-xs">generated</Badge>;
      case 'error':
        return <Badge className="bg-red-500 text-white font-mono text-xs">failed</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white font-mono text-xs">waiting</Badge>;
    }
  };

  const imageConfig = data.config?.image;
  const imageData = data.imageData;
  const hasImage = data.status === 'success' && imageData?.imageUrl;

  return (
    <Card className={`w-80 min-h-[200px] ${getNodeStyle()}`}>
      {/* Handle d'entrée */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 border-2 border-gray-400 bg-white"
      />

      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-gray-800">
            {getStatusIcon()}
            {data.label}
          </CardTitle>
          {getStatusBadge()}
        </div>
        
        {/* Coût et temps estimé */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">cost: {data.config?.costCredits || 5} credits</span>
          {data.config?.estimatedDuration && (
            <span className="font-mono">• eta: {Math.round(data.config.estimatedDuration / 1000)}s</span>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-3">
        {/* Configuration */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-mono">
          <span>provider: {imageConfig?.provider || 'dalle'}</span>
          <span>style: {imageConfig?.style || 'vivid'}</span>
          <span>quality: {imageConfig?.quality || 'hd'}</span>
          <span>size: {imageConfig?.size || '1024x1792'}</span>
        </div>

        {/* État d'attente */}
        {data.status === 'idle' && (
          <div className="flex items-center justify-center py-6 text-center">
            <div className="space-y-2">
              <Image className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs text-muted-foreground font-mono">
                waiting for enhanced prompt
              </p>
            </div>
          </div>
        )}

        {/* État de chargement */}
        {data.status === 'loading' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="text-sm font-mono text-orange-700">
                generating image with dall-e 3...
              </span>
            </div>
            
            {typeof data.progress === 'number' && (
              <Progress value={data.progress} className="h-2" />
            )}
            
            <div className="text-xs text-muted-foreground font-mono">
              creating {imageConfig?.size || '1024x1792'} {imageConfig?.quality || 'hd'} image
            </div>

            {/* Simulation de progression par étapes */}
            {typeof data.progress === 'number' && (
              <div className="text-xs text-muted-foreground font-mono">
                {data.progress < 30 && 'processing prompt...'}
                {data.progress >= 30 && data.progress < 70 && 'rendering image...'}
                {data.progress >= 70 && 'finalizing...'}
              </div>
            )}
          </div>
        )}

        {/* État de succès avec aperçu de l'image */}
        {data.status === 'success' && hasImage && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span className="font-mono">image generated successfully</span>
            </div>

            {/* Aperçu de l'image */}
            <div className="relative">
              <img
                src={imageData?.imageUrl}
                alt="Generated image"
                className="w-full h-32 object-cover rounded border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {imageData?.thumbnailUrl && (
                <img
                  src={imageData.thumbnailUrl}
                  alt="Thumbnail"
                  className="absolute top-2 right-2 w-8 h-8 object-cover rounded border-2 border-white shadow"
                />
              )}
            </div>

            {/* Métadonnées de l'image */}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-mono">
              {imageData?.width && imageData?.height && (
                <span>size: {imageData.width}×{imageData.height}</span>
              )}
              {imageData?.fileSize && (
                <span>size: {Math.round(imageData.fileSize / 1024)}KB</span>
              )}
              {imageData?.generationTime && (
                <span>time: {Math.round(imageData.generationTime / 1000)}s</span>
              )}
              <span>format: PNG</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs font-mono"
                onClick={() => window.open(imageData?.imageUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                view
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs font-mono"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = imageData?.imageUrl || '';
                  link.download = 'generated-image.png';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="w-3 h-3 mr-1" />
                save
              </Button>
            </div>
          </div>
        )}

        {/* État d'erreur */}
        {data.status === 'error' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-mono">generation failed</span>
            </div>
            
            {data.errorMessage && (
              <div className="p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 font-mono">
                {data.errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Temps d'exécution */}
        {data.startTime && data.endTime && (
          <div className="text-xs text-muted-foreground font-mono">
            completed in {Math.round((data.endTime - data.startTime) / 1000)}s
          </div>
        )}
      </CardContent>

      {/* Handle de sortie */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 border-2 border-gray-400 bg-white"
        style={{
          backgroundColor: data.status === 'success' ? '#10b981' : '#9ca3af',
          borderColor: data.status === 'success' ? '#10b981' : '#9ca3af'
        }}
      />
    </Card>
  );
}