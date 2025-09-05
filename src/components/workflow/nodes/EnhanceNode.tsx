'use client';

import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { WorkflowNodeData } from '../types/workflow';

interface EnhanceNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export function EnhanceNode({ id, data, selected }: EnhanceNodeProps) {
  const getNodeStyle = () => {
    const baseStyle = 'transition-all duration-300 ease-in-out';
    
    switch (data.status) {
      case 'loading':
        return `${baseStyle} border-blue-500 bg-blue-50/50 shadow-lg`;
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
        return <Brain className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Brain className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (data.status) {
      case 'loading':
        return <Badge className="bg-blue-500 text-white font-mono text-xs animate-pulse">enhancing</Badge>;
      case 'success':
        return <Badge className="bg-green-500 text-white font-mono text-xs">enhanced</Badge>;
      case 'error':
        return <Badge className="bg-red-500 text-white font-mono text-xs">failed</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white font-mono text-xs">waiting</Badge>;
    }
  };

  const hasEnhancement = data.enhanceData?.enhancedPrompt && 
    data.enhanceData.enhancedPrompt !== data.enhanceData.originalPrompt;

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
          <span className="font-mono">cost: {data.config?.costCredits || 1} credits</span>
          {data.config?.estimatedDuration && (
            <span className="font-mono">• eta: {data.config.estimatedDuration / 1000}s</span>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-3">
        {/* Configuration du modèle */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">
            model: {data.config?.enhance?.model || 'gpt-4-turbo'}
          </span>
          <span className="font-mono">
            • temp: {data.config?.enhance?.temperature || 0.7}
          </span>
        </div>

        {/* État d'attente */}
        {data.status === 'idle' && (
          <div className="flex items-center justify-center py-6 text-center">
            <div className="space-y-2">
              <Brain className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs text-muted-foreground font-mono">
                waiting for prompt input
              </p>
            </div>
          </div>
        )}

        {/* État de chargement */}
        {data.status === 'loading' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm font-mono text-blue-700">
                enhancing prompt with gpt...
              </span>
            </div>
            
            {typeof data.progress === 'number' && (
              <Progress value={data.progress} className="h-2" />
            )}
            
            <div className="text-xs text-muted-foreground font-mono">
              analyzing context and improving language
            </div>
          </div>
        )}

        {/* État de succès avec comparaison avant/après */}
        {data.status === 'success' && hasEnhancement && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span className="font-mono">prompt successfully enhanced</span>
            </div>

            {/* Prompt original */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-mono">original:</div>
              <div className="p-2 bg-gray-100 border rounded text-xs text-gray-700 font-mono italic">
                "{data.enhanceData?.originalPrompt}"
              </div>
            </div>

            {/* Prompt amélioré */}
            <div className="space-y-1">
              <div className="text-xs text-green-600 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                enhanced:
              </div>
              <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 font-mono">
                "{data.enhanceData?.enhancedPrompt}"
              </div>
            </div>

            {/* Métadonnées */}
            {data.enhanceData?.tokensUsed && (
              <div className="text-xs text-muted-foreground font-mono">
                tokens used: {data.enhanceData.tokensUsed}
                {data.enhanceData.improvementScore && (
                  <span> • improvement: {data.enhanceData.improvementScore}%</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* État d'erreur */}
        {data.status === 'error' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-mono">enhancement failed</span>
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