'use client';

import { Handle, Position } from 'reactflow';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useWorkflowStore } from '../store/workflow-store';
import { WorkflowNodeData } from '../types/workflow';
import { NODE_THEMES, STATUS_COLORS, NODE_SIZES, HANDLE_STYLES } from '../constants/node-themes';
import { useState, useEffect } from 'react';

interface PromptNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export function PromptNode({ id, data, selected }: PromptNodeProps) {
  const { updateNodeData, updateNodeStatus } = useWorkflowStore();
  const [prompt, setPrompt] = useState(data.promptData?.originalPrompt || '');
  const [charCount, setCharCount] = useState(data.promptData?.characterCount || 0);
  
  const theme = NODE_THEMES.prompt;
  const statusColors = STATUS_COLORS[data.status];

  // Mettre à jour le store quand le prompt change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateNodeData(id, {
        input: prompt,
        promptData: {
          originalPrompt: prompt,
          characterCount: charCount
        }
      });
      
      // Changer le statut basé sur si le prompt est valide
      if (prompt.trim()) {
        updateNodeStatus(id, 'success');
      } else {
        updateNodeStatus(id, 'idle');
      }
    }, 300); // Debounce pour éviter trop d'updates

    return () => clearTimeout(timeoutId);
  }, [prompt, charCount, id, updateNodeData, updateNodeStatus]);

  const handlePromptChange = (value: string) => {
    const maxLength = data.config?.prompt?.maxLength || 1000;
    if (value.length <= maxLength) {
      setPrompt(value);
      setCharCount(value.length);
    }
  };

  const getNodeClasses = () => {
    const baseClasses = `${NODE_SIZES.default} ${statusColors.bg} border-2 transition-all duration-300 rounded-xl shadow-lg backdrop-blur-sm`;
    
    let borderClasses = statusColors.border;
    let effectClasses = '';

    // Styles spécifiques selon l'état
    switch (data.status) {
      case 'loading':
        borderClasses = `border-[${theme.accent}]`;
        effectClasses = 'animate-pulse shadow-lg shadow-blue-500/20';
        break;
      case 'success':
        effectClasses = 'shadow-lg shadow-green-500/20';
        break;
      case 'error':
        effectClasses = 'animate-shake shadow-lg shadow-red-500/20';
        break;
      default:
        if (selected) {
          borderClasses = `border-[${theme.accent}]`;
          effectClasses = `shadow-xl shadow-[${theme.accent}]/30`;
        }
    }

    return `${baseClasses} ${borderClasses} ${effectClasses}`;
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'loading':
        return <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />;
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
      idle: 'awaiting_input',
      loading: 'processing',
      success: 'ready',
      error: 'error'
    };

    return (
      <Badge className={`${statusColors.badge} font-mono text-xs px-2 py-1`}>
        {badgeTexts[data.status]}
      </Badge>
    );
  };

  const maxLength = data.config?.prompt?.maxLength || 1000;
  const placeholder = data.config?.prompt?.placeholder || 'Describe the image you want to generate...';
  const isValid = prompt.trim().length > 0;
  const isNearLimit = charCount > maxLength * 0.8;
  const IconComponent = theme.icon;

  return (
    <div className={getNodeClasses()}>
      {/* Header avec thème coloré */}
      <div className={`border-b border-[#333333] bg-gradient-to-r from-[${theme.accent}]/10 to-transparent p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-[${theme.accent}]/20 border border-[${theme.accent}]/30`}>
              <IconComponent className={`w-4 h-4 text-[${theme.accent}]`} />
            </div>
            <div>
              <h3 className="font-mono text-sm text-white font-medium">{theme.name}</h3>
              <p className="text-xs text-gray-400 font-mono">user input processing</p>
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
        {/* Zone de saisie du prompt */}
        <div className="space-y-2">
          <Label className="text-xs font-mono text-gray-300">your_prompt</Label>
          <Textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[100px] bg-[#0A0A0A] border-[#333333] text-white font-mono text-sm resize-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-colors"
            disabled={data.status === 'loading'}
          />
          
          {/* Validation et compteur */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              {isValid ? (
                <span className="text-green-400">✓ valid_prompt</span>
              ) : (
                <span className="text-gray-500">enter_your_idea</span>
              )}
            </div>
            <span className={`${
              isNearLimit ? 'text-orange-400' : 'text-gray-500'
            }`}>
              {charCount}/{maxLength}
            </span>
          </div>
        </div>

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
            {data.status === 'loading' && 'processing_started...'}
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
            {data.config?.estimatedDuration && (
              <span>eta: ~{data.config.estimatedDuration / 1000}s</span>
            )}
          </div>
          <span className="text-gray-500">user_input</span>
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