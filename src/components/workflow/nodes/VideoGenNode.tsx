'use client';

import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Video, AlertCircle, CheckCircle, Download, ExternalLink, Play, Volume2, VolumeX } from 'lucide-react';
import { WorkflowNodeData } from '../types/workflow';

interface VideoGenNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export function VideoGenNode({ id, data, selected }: VideoGenNodeProps) {
  const getNodeStyle = () => {
    const baseStyle = 'transition-all duration-300 ease-in-out';
    
    switch (data.status) {
      case 'loading':
        return `${baseStyle} border-purple-500 bg-purple-50/50 shadow-lg`;
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
        return <Video className="w-4 h-4 text-purple-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Video className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (data.status) {
      case 'loading':
        return <Badge className="bg-purple-500 text-white font-mono text-xs animate-pulse">animating</Badge>;
      case 'success':
        return <Badge className="bg-green-500 text-white font-mono text-xs">video_ready</Badge>;
      case 'error':
        return <Badge className="bg-red-500 text-white font-mono text-xs">failed</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white font-mono text-xs">waiting</Badge>;
    }
  };

  const videoConfig = data.config?.video;
  const videoData = data.videoData;
  const hasVideo = data.status === 'success' && videoData?.videoUrl;

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
          <span className="font-mono">cost: {data.config?.costCredits || 15} credits</span>
          {data.config?.estimatedDuration && (
            <span className="font-mono">• eta: {Math.round(data.config.estimatedDuration / 1000)}s</span>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-3">
        {/* Configuration */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-mono">
          <span>provider: {videoConfig?.provider || 'veo3'}</span>
          <span>duration: {videoConfig?.duration || 8}s</span>
          <span>resolution: {videoConfig?.resolution || '1080p'}</span>
          <span className="flex items-center gap-1">
            {videoConfig?.generateAudio ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {videoConfig?.generateAudio ? 'audio' : 'no_audio'}
          </span>
        </div>

        {/* État d'attente */}
        {data.status === 'idle' && (
          <div className="flex items-center justify-center py-6 text-center">
            <div className="space-y-2">
              <Video className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs text-muted-foreground font-mono">
                waiting for image input
              </p>
            </div>
          </div>
        )}

        {/* État de chargement avec timer */}
        {data.status === 'loading' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-500 animate-pulse" />
              <span className="text-sm font-mono text-purple-700">
                animating with veo3...
              </span>
            </div>
            
            {typeof data.progress === 'number' && (
              <Progress value={data.progress} className="h-2" />
            )}
            
            {/* Timer estimé */}
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>creating {videoConfig?.duration || 8}s video</span>
              {data.startTime && (
                <span>
                  {Math.round((Date.now() - data.startTime) / 1000)}s elapsed
                </span>
              )}
            </div>

            {/* Étapes de progression */}
            {typeof data.progress === 'number' && (
              <div className="text-xs text-muted-foreground font-mono">
                {data.progress < 20 && 'analyzing image...'}
                {data.progress >= 20 && data.progress < 50 && 'generating keyframes...'}
                {data.progress >= 50 && data.progress < 80 && 'interpolating motion...'}
                {data.progress >= 80 && 'rendering final video...'}
              </div>
            )}
          </div>
        )}

        {/* État de succès avec aperçu vidéo */}
        {data.status === 'success' && hasVideo && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span className="font-mono">video generated successfully</span>
            </div>

            {/* Aperçu vidéo */}
            <div className="relative">
              <video
                src={videoData?.videoUrl}
                className="w-full h-32 object-cover rounded border"
                controls
                muted
                poster={videoData?.thumbnailUrl}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              
              {/* Overlay avec infos */}
              <div className="absolute bottom-1 left-1 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
                {videoData?.duration}s • {videoConfig?.resolution}
                {videoData?.hasAudio && <Volume2 className="w-3 h-3 inline ml-1" />}
              </div>
            </div>

            {/* Métadonnées de la vidéo */}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-mono">
              <span>duration: {videoData?.duration}s</span>
              <span>resolution: {videoData?.resolution}</span>
              {videoData?.fileSize && (
                <span>size: {Math.round(videoData.fileSize / (1024 * 1024))}MB</span>
              )}
              {videoData?.generationTime && (
                <span>time: {Math.round(videoData.generationTime / 1000)}s</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs font-mono"
                onClick={() => window.open(videoData?.videoUrl, '_blank')}
              >
                <Play className="w-3 h-3 mr-1" />
                play
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs font-mono"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = videoData?.videoUrl || '';
                  link.download = 'generated-video.mp4';
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
              <span className="text-sm font-mono">video generation failed</span>
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