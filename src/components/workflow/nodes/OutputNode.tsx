'use client';

import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Share, 
  Copy, 
  Clock,
  Play,
  Volume2
} from 'lucide-react';
import { WorkflowNodeData } from '../types/workflow';
import { NODE_THEMES, STATUS_COLORS, NODE_SIZES, HANDLE_STYLES } from '../constants/node-themes';
import { toast } from 'sonner';

interface OutputNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export function OutputNode({ id, data, selected }: OutputNodeProps) {
  const theme = NODE_THEMES.output;
  const statusColors = STATUS_COLORS[data.status];
  
  const getNodeClasses = () => {
    const baseClasses = `${NODE_SIZES.default} ${statusColors.bg} border-2 transition-all duration-300 rounded-xl backdrop-blur-sm`;
    
    let borderClasses = statusColors.border;
    let effectClasses = '';

    // Styles spécifiques selon l'état (couleurs statiques pour éviter les problèmes CSS)
    switch (data.status) {
      case 'loading':
        borderClasses = 'border-orange-500/60';
        effectClasses = 'animate-pulse';
        break;
      case 'success':
        borderClasses = 'border-green-500/60';
        effectClasses = '';
        break;
      case 'error':
        borderClasses = 'border-red-500/60';
        effectClasses = 'animate-shake';
        break;
      default:
        if (selected) {
          borderClasses = 'border-orange-500/60';
          effectClasses = '';
        }
    }

    return `${baseClasses} ${borderClasses} ${effectClasses}`;
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'loading':
        return <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const badgeTexts = {
      idle: 'awaiting_video',
      loading: 'finalizing',
      success: 'ready',
      error: 'error'
    };

    return (
      <Badge className={`${statusColors.badge} font-mono text-xs px-2 py-1`}>
        {badgeTexts[data.status]}
      </Badge>
    );
  };

  const IconComponent = theme.icon;
  const progress = data.progress || 0;
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
    <div className={getNodeClasses()}>
      {/* Handle pour la connexion entrante */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={`${HANDLE_STYLES.base} ${HANDLE_STYLES.idle}`}
      />

      {/* Header avec thème coloré orange */}
      <div className="border-b border-[#333333] bg-gradient-to-r from-orange-500/10 to-transparent p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30">
              <IconComponent className={`w-4 h-4 text-orange-400 ${data.status === 'loading' ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="font-mono text-sm text-white font-medium">{theme.name}</h3>
              <p className="text-xs text-gray-400 font-mono">project finalization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-4 space-y-4">
        {/* Configuration de sortie */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-400 font-mono">
          {data.config?.output?.formats?.map((format, index) => (
            <span key={index} className="px-2 py-1 bg-[#0A0A0A] border border-[#333333] rounded">{format}</span>
          ))}
          {data.config?.output?.quality && (
            <span className="px-2 py-1 bg-[#0A0A0A] border border-[#333333] rounded">
              {data.config.output.quality}
            </span>
          )}
        </div>

        {/* État d'attente */}
        {data.status === 'idle' && !data.input && (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mx-auto mb-3">
              <IconComponent className="w-5 h-5 text-gray-500" />
            </div>
            <div className="text-xs text-gray-500 font-mono">
              waiting_for_video_generation
            </div>
          </div>
        )}

        {/* Barre de progression pendant le processing */}
        {data.status === 'loading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-orange-400">finalizing_output</span>
              <span className="text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="relative">
              <div className="h-2 bg-[#0A0A0A] border border-[#333333] rounded overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-transparent opacity-50 animate-pulse" />
            </div>
            <div className="text-xs text-orange-400 font-mono">
              {progress < 50 && 'processing_video'}
              {progress >= 50 && progress < 90 && 'optimizing_for_web'}
              {progress >= 90 && 'uploading_to_cdn'}
            </div>
          </div>
        )}

        {/* État de succès avec actions */}
        {data.status === 'success' && hasOutput && (
          <div className="space-y-4">
            {/* Message de succès */}
            <div className="flex items-center gap-2 text-xs text-green-400 font-mono">
              <CheckCircle className="w-3 h-3" />
              <span>video_ready_for_download</span>
            </div>

            {/* Aperçu final avec métadonnées */}
            <div className="p-3 bg-green-500/5 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <IconComponent className="w-5 h-5 text-orange-400" />
                <div className="flex-1">
                  <div className="font-mono text-sm text-white">final_video.mp4</div>
                  {outputData?.metadata && (
                    <div className="text-xs text-green-400 font-mono">
                      {outputData.metadata.duration}s • {outputData.metadata.resolution} • {Math.round(outputData.metadata.fileSize / (1024 * 1024))}MB
                    </div>
                  )}
                </div>
              </div>

              {/* Preview miniature si disponible */}
              {outputData?.finalVideoUrl && (
                <video
                  src={outputData.finalVideoUrl}
                  className="w-full h-20 object-cover rounded-lg border border-[#333333] mb-2"
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
                  className="h-8 text-xs font-mono bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  onClick={() => outputData?.finalVideoUrl && handleDownload(outputData.finalVideoUrl, 'generated-video.mp4')}
                >
                  <Download className="w-3 h-3 mr-1" />
                  download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-mono bg-[#0A0A0A] border-[#333333] text-white hover:bg-orange-500/10 hover:border-orange-500/30"
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
                  className="h-7 text-xs font-mono bg-[#0A0A0A] border-[#333333] text-white hover:bg-orange-500/10 hover:border-orange-500/30"
                  onClick={() => outputData?.finalVideoUrl && handleShare(outputData.finalVideoUrl)}
                >
                  <Share className="w-3 h-3 mr-1" />
                  share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-mono bg-[#0A0A0A] border-[#333333] text-white hover:bg-orange-500/10 hover:border-orange-500/30"
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
                <div className="text-xs font-mono text-gray-400">other_formats:</div>
                <div className="flex gap-2">
                  {Object.entries(outputData.downloadUrls).map(([format, url]) => (
                    <Button
                      key={format}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs font-mono bg-[#0A0A0A] border-[#333333] text-white hover:bg-orange-500/10 hover:border-orange-500/30"
                      onClick={() => handleDownload(url, `generated-video.${format}`)}
                    >
                      {format}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-xs text-orange-400 font-mono flex items-center gap-2">
              <CheckCircle className="w-3 h-3" />
              ✓ Project completed successfully
            </div>
          </div>
        )}

        {/* Message d'erreur */}
        {data.status === 'error' && data.errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-red-400 font-mono">{data.errorMessage}</span>
            </div>
          </div>
        )}

        {/* Informations de temps d'exécution */}
        {data.startTime && (
          <div className="text-xs text-gray-400 font-mono">
            {data.status === 'loading' && 'finalization_in_progress...'}
            {data.endTime && data.startTime && (
              `completed_in_${Math.round((data.endTime - data.startTime) / 1000)}s`
            )}
          </div>
        )}
      </div>

      {/* Footer avec informations techniques */}
      <div className="border-t border-[#333333] p-3 bg-[#111111]/50">
        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
          <div className="flex items-center gap-3">
            <span>cost: {data.config?.costCredits || 0}_credits</span>
            <span>output: final_video</span>
          </div>
          <span className="text-gray-500">project_output</span>
        </div>
      </div>
    </div>
  );
}