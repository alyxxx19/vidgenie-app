'use client';

import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { WorkflowNodeData } from '../types/workflow';
import { NODE_THEMES, STATUS_COLORS, NODE_SIZES, HANDLE_STYLES } from '../constants/node-themes';

interface EnhanceNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export function EnhanceNode({ id, data, selected }: EnhanceNodeProps) {
  const theme = NODE_THEMES.enhance;
  const statusColors = STATUS_COLORS[data.status];
  
  const getNodeClasses = () => {
    const baseClasses = `${NODE_SIZES.default} ${statusColors.bg} border-2 transition-all duration-300 rounded-xl shadow-lg backdrop-blur-sm`;
    
    let borderClasses: string = statusColors.border;
    let effectClasses = '';

    // Styles spécifiques selon l'état
    switch (data.status) {
      case 'loading':
        borderClasses = 'border-violet-500';
        effectClasses = 'animate-pulse shadow-lg shadow-purple-500/20';
        break;
      case 'success':
        effectClasses = 'shadow-lg shadow-green-500/20';
        break;
      case 'error':
        effectClasses = 'animate-shake shadow-lg shadow-red-500/20';
        break;
      default:
        if (selected) {
          borderClasses = 'border-violet-500';
          effectClasses = 'shadow-xl shadow-violet-500/30';
        }
    }

    return `${baseClasses} ${borderClasses} ${effectClasses}`;
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'loading':
        return <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />;
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
      loading: 'enhancing',
      success: 'enhanced',
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
  const enhancedText = data.output?.enhancedPrompt || '';

  return (
    <div className={getNodeClasses()}>
      {/* Handle pour la connexion entrante */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={`${HANDLE_STYLES.base} ${HANDLE_STYLES.idle}`}
      />

      {/* Header avec thème coloré violet */}
      <div className={`border-b border-[#333333] bg-gradient-to-r from-[${theme.accent}]/10 to-transparent p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-[${theme.accent}]/20 border border-[${theme.accent}]/30`}>
              <IconComponent className={`w-4 h-4 text-[${theme.accent}] ${data.status === 'loading' ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="font-mono text-sm text-white font-medium">{theme.name}</h3>
              <p className="text-xs text-gray-400 font-mono">ai prompt optimization</p>
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
        {/* Barre de progression pendant le processing */}
        {data.status === 'loading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-purple-400">analyzing_prompt</span>
              <span className="text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="relative">
              <Progress value={progress} className="h-2 bg-[#0A0A0A] border border-[#333333]" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent opacity-50 animate-pulse" />
            </div>
          </div>
        )}

        {/* Prompt original (en gris si disponible) */}
        {data.input && (
          <div className="space-y-2">
            <div className="text-xs font-mono text-gray-400">original_prompt:</div>
            <div className="p-3 bg-[#0A0A0A] border border-[#333333] rounded-lg text-xs text-gray-300 font-mono max-h-20 overflow-y-auto">
              {data.input}
            </div>
          </div>
        )}

        {/* Prompt amélioré (si disponible) */}
        {enhancedText && data.status === 'success' && (
          <div className="space-y-2">
            <div className="text-xs font-mono text-purple-400">enhanced_prompt:</div>
            <div className="p-3 bg-purple-500/5 border border-purple-500/30 rounded-lg text-xs text-white font-mono max-h-24 overflow-y-auto">
              {enhancedText}
            </div>
            <div className="text-xs text-green-400 font-mono">
              ✓ Optimized for DALL-E 3 generation
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

        {/* État d'attente */}
        {data.status === 'idle' && !data.input && (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mx-auto mb-3">
              <IconComponent className="w-5 h-5 text-gray-500" />
            </div>
            <div className="text-xs text-gray-500 font-mono">
              waiting_for_prompt_input
            </div>
          </div>
        )}

        {/* Informations de temps d'exécution */}
        {data.startTime && (
          <div className="text-xs text-gray-400 font-mono">
            {data.status === 'loading' && 'enhancement_in_progress...'}
            {data.endTime && data.startTime && (
              `enhanced_in_${Math.round((data.endTime - data.startTime) / 1000)}s`
            )}
          </div>
        )}
      </div>

      {/* Footer avec informations techniques */}
      <div className="border-t border-[#333333] p-3 bg-[#111111]/50">
        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
          <div className="flex items-center gap-3">
            <span>cost: {data.config?.costCredits || 1}_credits</span>
            <span>model: {data.config?.enhance?.model || 'gpt-4'}</span>
          </div>
          <span className="text-gray-500">ai_enhancement</span>
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