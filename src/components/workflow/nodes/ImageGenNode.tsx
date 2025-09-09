'use client';

import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Clock, Download, ExternalLink } from 'lucide-react';
import { WorkflowNodeData } from '../types/workflow';
import { NODE_THEMES, STATUS_COLORS, NODE_SIZES, HANDLE_STYLES } from '../constants/node-themes';
import NextImage from 'next/image';

interface ImageGenNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export function ImageGenNode({ id, data, selected }: ImageGenNodeProps) {
  const theme = NODE_THEMES.image;
  const statusColors = STATUS_COLORS[data.status];
  
  const getNodeClasses = () => {
    const baseClasses = `${NODE_SIZES.default} ${statusColors.bg} border-2 transition-all duration-300 rounded-xl shadow-lg backdrop-blur-sm`;
    
    let borderClasses: string = statusColors.border;
    let effectClasses = '';

    // Styles spécifiques selon l'état
    switch (data.status) {
      case 'loading':
        borderClasses = 'border-green-500';
        effectClasses = 'animate-pulse shadow-lg shadow-green-500/20';
        break;
      case 'success':
        effectClasses = 'shadow-lg shadow-green-500/20';
        break;
      case 'error':
        effectClasses = 'animate-shake shadow-lg shadow-red-500/20';
        break;
      default:
        if (selected) {
          borderClasses = 'border-green-500';
          effectClasses = 'shadow-xl shadow-green-500/30';
        }
    }

    return `${baseClasses} ${borderClasses} ${effectClasses}`;
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'loading':
        return <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />;
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
      idle: 'awaiting_prompt',
      loading: 'generating',
      success: 'generated',
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
  const imageConfig = data.config?.image;
  const imageData = data.imageData;
  const hasImage = data.status === 'success' && imageData?.imageUrl;

  return (
    <div className={getNodeClasses()}>
      {/* Handle pour la connexion entrante */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={`${HANDLE_STYLES.base} ${HANDLE_STYLES.idle}`}
      />

      {/* Header avec thème coloré vert */}
      <div className={`border-b border-[#333333] bg-gradient-to-r from-[${theme.accent}]/10 to-transparent p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-[${theme.accent}]/20 border border-[${theme.accent}]/30`}>
              <IconComponent className={`w-4 h-4 text-[${theme.accent}] ${data.status === 'loading' ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="font-mono text-sm text-white font-medium">{theme.name}</h3>
              <p className="text-xs text-gray-400 font-mono">dall-e 3 generation</p>
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
          <span>provider: {imageConfig?.provider || 'dalle'}</span>
          <span>style: {imageConfig?.style || 'vivid'}</span>
          <span>quality: {imageConfig?.quality || 'hd'}</span>
          <span>size: {imageConfig?.size || '1024x1792'}</span>
        </div>

        {/* État d'attente */}
        {data.status === 'idle' && !data.input && (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mx-auto mb-3">
              <IconComponent className="w-5 h-5 text-gray-500" />
            </div>
            <div className="text-xs text-gray-500 font-mono">
              waiting_for_enhanced_prompt
            </div>
          </div>
        )}

        {/* Barre de progression pendant le processing */}
        {data.status === 'loading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-green-400">generating_image</span>
              <span className="text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="relative">
              <Progress value={progress} className="h-2 bg-[#0A0A0A] border border-[#333333]" />
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-transparent opacity-50 animate-pulse" />
            </div>
            <div className="text-xs text-green-400 font-mono">
              {progress < 30 && 'processing_prompt'}
              {progress >= 30 && progress < 70 && 'rendering_image'}
              {progress >= 70 && 'finalizing_output'}
            </div>
          </div>
        )}

        {/* État de succès avec aperçu de l'image */}
        {data.status === 'success' && hasImage && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-green-400 font-mono">
              <CheckCircle className="w-3 h-3" />
              <span>image_generated_successfully</span>
            </div>

            {/* Aperçu de l'image */}
            <div className="relative">
              <NextImage
                src={imageData?.imageUrl || '/placeholder-image.png'}
                alt="Generated image"
                width={200}
                height={128}
                className="w-full h-32 object-cover rounded-lg border border-[#333333]"
                unoptimized
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {imageData?.thumbnailUrl && (
                <NextImage
                  src={imageData.thumbnailUrl}
                  alt="Thumbnail"
                  width={32}
                  height={32}
                  className="absolute top-2 right-2 w-8 h-8 object-cover rounded border-2 border-white shadow-lg"
                  unoptimized
                />
              )}
            </div>

            {/* Métadonnées de l'image */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 font-mono">
              {imageData?.width && imageData?.height && (
                <span>resolution: {imageData.width}×{imageData.height}</span>
              )}
              {imageData?.fileSize && (
                <span>file_size: {Math.round(imageData.fileSize / 1024)}KB</span>
              )}
              {imageData?.generationTime && (
                <span>gen_time: {Math.round(imageData.generationTime / 1000)}s</span>
              )}
              <span>format: PNG</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs font-mono bg-[#0A0A0A] border-[#333333] text-white hover:bg-green-500/10 hover:border-green-500/30"
                onClick={() => window.open(imageData?.imageUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                view_full
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs font-mono bg-[#0A0A0A] border-[#333333] text-white hover:bg-green-500/10 hover:border-green-500/30"
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
                download
              </Button>
            </div>

            <div className="text-xs text-green-400 font-mono">
              ✓ Ready for video generation
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
            {data.status === 'loading' && 'generation_in_progress...'}
            {data.endTime && data.startTime && (
              `generated_in_${Math.round((data.endTime - data.startTime) / 1000)}s`
            )}
          </div>
        )}
      </div>

      {/* Footer avec informations techniques */}
      <div className="border-t border-[#333333] p-3 bg-[#111111]/50">
        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
          <div className="flex items-center gap-3">
            <span>cost: {data.config?.costCredits || 5}_credits</span>
            <span>model: {imageConfig?.provider || 'dalle-3'}</span>
          </div>
          <span className="text-gray-500">image_generation</span>
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