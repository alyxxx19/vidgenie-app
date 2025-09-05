'use client';

import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Share, 
  Copy, 
  ExternalLink,
  FileVideo,
  Play,
  Volume2
} from 'lucide-react';
import { WorkflowNodeData } from '../types/workflow';
import { toast } from 'sonner';

interface OutputNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export function OutputNode({ id, data, selected }: OutputNodeProps) {
  const getNodeStyle = () => {
    const baseStyle = 'transition-all duration-300 ease-in-out';
    
    switch (data.status) {
      case 'loading':
        return `${baseStyle} border-blue-500 bg-blue-50/50 shadow-lg`;
      case 'success':
        return `${baseStyle} border-green-500 bg-green-50/50 shadow-lg glow-white`;
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
        return <FileVideo className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileVideo className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (data.status) {
      case 'loading':
        return <Badge className="bg-blue-500 text-white font-mono text-xs animate-pulse">finalizing</Badge>;
      case 'success':
        return <Badge className="bg-green-500 text-white font-mono text-xs">ready</Badge>;
      case 'error':
        return <Badge className="bg-red-500 text-white font-mono text-xs">failed</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white font-mono text-xs">waiting</Badge>;
    }
  };

  const outputData = data.outputData;
  const hasOutput = data.status === 'success' && outputData?.finalVideoUrl;

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Generated Video',
          text: 'Check out this AI-generated video!',
          url: url
        });
      } catch (error) {
        // User cancelled or share failed
        handleCopyLink(url);
      }
    } else {
      handleCopyLink(url);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <span className="font-mono">cost: {data.config?.costCredits || 0} credits</span>
          {data.config?.estimatedDuration && (
            <span className="font-mono">• eta: {Math.round(data.config.estimatedDuration / 1000)}s</span>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-3">
        {/* Configuration de sortie */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground font-mono">
          {data.config?.output?.formats?.map((format, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 rounded">{format}</span>
          ))}
          {data.config?.output?.quality && (
            <span className="px-2 py-1 bg-gray-100 rounded">
              {data.config.output.quality}
            </span>
          )}
        </div>

        {/* État d'attente */}
        {data.status === 'idle' && (
          <div className="flex items-center justify-center py-6 text-center">
            <div className="space-y-2">
              <FileVideo className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs text-muted-foreground font-mono">
                waiting for video generation
              </p>
            </div>
          </div>
        )}

        {/* État de chargement */}
        {data.status === 'loading' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="text-sm font-mono text-blue-700">
                preparing final output...
              </span>
            </div>
            
            {typeof data.progress === 'number' && (
              <Progress value={data.progress} className="h-2" />
            )}
            
            <div className="text-xs text-muted-foreground font-mono">
              {typeof data.progress === 'number' && (
                <>
                  {data.progress < 50 && 'processing video...'}
                  {data.progress >= 50 && data.progress < 90 && 'optimizing for web...'}
                  {data.progress >= 90 && 'uploading to cdn...'}
                </>
              )}
            </div>
          </div>
        )}

        {/* État de succès avec actions */}
        {data.status === 'success' && hasOutput && (
          <div className="space-y-4">
            {/* Message de succès */}
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span className="font-mono">video ready for download!</span>
            </div>

            {/* Aperçu final avec métadonnées */}
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-3 mb-2">
                <FileVideo className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <div className="font-mono text-sm text-green-800">final_video.mp4</div>
                  {outputData?.metadata && (
                    <div className="text-xs text-green-600 font-mono">
                      {outputData.metadata.duration}s • {outputData.metadata.resolution} • {Math.round(outputData.metadata.fileSize / (1024 * 1024))}MB
                    </div>
                  )}
                </div>
              </div>

              {/* Preview miniature si disponible */}
              {outputData?.finalVideoUrl && (
                <video
                  src={outputData.finalVideoUrl}
                  className="w-full h-20 object-cover rounded border mb-2"
                  controls={false}
                  muted
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>

            {/* Actions principales */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs font-mono bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => outputData?.finalVideoUrl && handleDownload(outputData.finalVideoUrl, 'generated-video.mp4')}
                >
                  <Download className="w-3 h-3 mr-1" />
                  download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-mono"
                  onClick={() => window.open(outputData?.finalVideoUrl, '_blank')}
                >
                  <Play className="w-3 h-3 mr-1" />
                  preview
                </Button>
              </div>

              {/* Actions secondaires */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-mono"
                  onClick={() => outputData?.finalVideoUrl && handleShare(outputData.finalVideoUrl)}
                >
                  <Share className="w-3 h-3 mr-1" />
                  share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-mono"
                  onClick={() => outputData?.finalVideoUrl && handleCopyLink(outputData.finalVideoUrl)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  copy_link
                </Button>
              </div>
            </div>

            {/* Formats de téléchargement alternatifs */}
            {outputData?.downloadUrls && Object.keys(outputData.downloadUrls).length > 1 && (
              <div className="space-y-2">
                <div className="text-xs font-mono text-gray-600">other_formats:</div>
                <div className="flex gap-2">
                  {Object.entries(outputData.downloadUrls).map(([format, url]) => (
                    <Button
                      key={format}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs font-mono"
                      onClick={() => handleDownload(url, `generated-video.${format}`)}
                    >
                      {format}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* État d'erreur */}
        {data.status === 'error' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-mono">output preparation failed</span>
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
    </Card>
  );
}