'use client';

import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Clock, Download, Play, Volume2, VolumeX } from 'lucide-react';
import { WorkflowNodeData } from '../types/workflow';
import { NODE_THEMES, STATUS_COLORS, NODE_SIZES, HANDLE_STYLES } from '../constants/node-themes';

interface VideoGenNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export function VideoGenNode({ id, data, selected }: VideoGenNodeProps) {
  const theme = NODE_THEMES.video;
  const statusColors = STATUS_COLORS[data.status];
  
  const getNodeClasses = () => {
    const baseClasses = `${NODE_SIZES.default} ${statusColors.bg} border-2 transition-all duration-300 rounded-xl shadow-lg backdrop-blur-sm`;
    
    let borderClasses: string = statusColors.border;
    let effectClasses = '';

    // Styles spécifiques selon l'état
    switch (data.status) {
      case 'loading':
        borderClasses = 'border-red-500';
        effectClasses = 'animate-pulse shadow-lg shadow-red-500/20';
        break;
      case 'success':
        effectClasses = 'shadow-lg shadow-green-500/20';
        break;
      case 'error':
        effectClasses = 'animate-shake shadow-lg shadow-red-500/20';
        break;
      default:
        if (selected) {
          borderClasses = 'border-red-500';
          effectClasses = 'shadow-xl shadow-red-500/30';
        }
    }

    return `${baseClasses} ${borderClasses} ${effectClasses}`;
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'loading':
        return <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />;
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
      idle: 'awaiting_image',
      loading: 'animating',
      success: 'video_ready',
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
  const videoConfig = data.config?.video;
  const videoData = data.videoData;
  const hasVideo = data.status === 'success' && videoData?.videoUrl;

  return (
    <div className={getNodeClasses()}>
      {/* Handle pour la connexion entrante */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={`${HANDLE_STYLES.base} ${HANDLE_STYLES.idle}`}
      />

      {/* Header avec thème coloré rouge */}
      <div className={`border-b border-[#333333] bg-gradient-to-r from-[${theme.accent}]/10 to-transparent p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-[${theme.accent}]/20 border border-[${theme.accent}]/30`}>
              <IconComponent className={`w-4 h-4 text-[${theme.accent}] ${data.status === 'loading' ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="font-mono text-sm text-white font-medium">{theme.name}</h3>
              <p className="text-xs text-gray-400 font-mono">veo3 video creation</p>
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
        {/* Configuration */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 font-mono">
          <span>provider: {videoConfig?.provider || 'veo3'}</span>
          <span>duration: {videoConfig?.duration || 8}s</span>
          <span>resolution: {videoConfig?.resolution || '1080p'}</span>
          <span className="flex items-center gap-1">
            {videoConfig?.generateAudio ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {videoConfig?.generateAudio ? 'audio' : 'no_audio'}
          </span>
        </div>

        {/* État d'attente */}
        {data.status === 'idle' && !data.input && (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mx-auto mb-3">
              <IconComponent className="w-5 h-5 text-gray-500" />
            </div>
            <div className="text-xs text-gray-500 font-mono">
              waiting_for_image_input
            </div>
          </div>
        )}

        {/* Barre de progression pendant le processing */}
        {data.status === 'loading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-red-400">animating_video</span>
              <span className="text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="relative">
              <Progress value={progress} className="h-2 bg-[#0A0A0A] border border-[#333333]" />
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-transparent opacity-50 animate-pulse" />
            </div>
            
            {/* Timer écoulé et estimation */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-red-400">
                {progress < 20 && 'analyzing_image'}
                {progress >= 20 && progress < 50 && 'generating_keyframes'}
                {progress >= 50 && progress < 80 && 'interpolating_motion'}
                {progress >= 80 && 'rendering_final_video'}
              </span>
              {data.startTime && (
                <span className="text-gray-400">
                  {Math.round((Date.now() - data.startTime) / 1000)}s_elapsed
                </span>
              )}
            </div>
          </div>
        )}

        {/* État de succès avec aperçu vidéo */}
        {data.status === 'success' && hasVideo && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-green-400 font-mono">
              <CheckCircle className="w-3 h-3" />
              <span>video_generated_successfully</span>
            </div>

            {/* Aperçu vidéo */}
            <div className="relative">
              <video
                src={videoData?.videoUrl}
                className="w-full h-32 object-cover rounded-lg border border-[#333333]"
                controls
                muted
                poster={videoData?.thumbnailUrl}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              
              {/* Overlay avec infos */}
              <div className="absolute bottom-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono backdrop-blur-sm">
                {videoData?.duration}s • {videoConfig?.resolution}
                {videoData?.hasAudio && <Volume2 className="w-3 h-3 inline ml-1" />}
              </div>
            </div>

            {/* Métadonnées de la vidéo */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 font-mono">
              <span>duration: {videoData?.duration}s</span>
              <span>resolution: {videoData?.resolution}</span>
              {videoData?.fileSize && (
                <span>file_size: {Math.round(videoData.fileSize / (1024 * 1024))}MB</span>
              )}
              {videoData?.generationTime && (
                <span>gen_time: {Math.round(videoData.generationTime / 1000)}s</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs font-mono bg-[#0A0A0A] border-[#333333] text-white hover:bg-red-500/10 hover:border-red-500/30"
                onClick={() => window.open(videoData?.videoUrl, '_blank')}
              >
                <Play className="w-3 h-3 mr-1" />
                play_full
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs font-mono bg-[#0A0A0A] border-[#333333] text-white hover:bg-red-500/10 hover:border-red-500/30"
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
                download
              </Button>
            </div>

            <div className="text-xs text-green-400 font-mono">
              ✓ Ready for final output
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
            {data.status === 'loading' && 'animation_in_progress...'}
            {data.endTime && data.startTime && (
              `animated_in_${Math.round((data.endTime - data.startTime) / 1000)}s`
            )}
          </div>
        )}
      </div>

      {/* Footer avec informations techniques */}
      <div className="border-t border-[#333333] p-3 bg-[#111111]/50">
        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
          <div className="flex items-center gap-3">
            <span>cost: {data.config?.costCredits || 15}_credits</span>
            <span>model: {videoConfig?.provider || 'veo3'}</span>
          </div>
          <span className="text-gray-500">video_generation</span>
        </div>
      </div>

      {/* Handle pour la connexion sortante */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={`${HANDLE_STYLES.base} ${
          data.status === 'success' ? HANDLE_STYLES.success :
          data.status === 'loading' ? HANDLE_STYLES.active :
          data.status === 'error' ? HANDLE_STYLES.error :
          HANDLE_STYLES.idle
        }`}
      />
    </div>
  );
}