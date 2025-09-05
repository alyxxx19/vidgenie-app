'use client';

import { Handle, Position } from 'reactflow';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { useWorkflowStore } from '../store/workflow-store';
import { WorkflowNodeData } from '../types/workflow';
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

  const getNodeStyle = () => {
    const baseStyle = 'workflow-node workflow-card transition-all duration-300 ease-in-out';
    
    switch (data.status) {
      case 'loading':
        return `${baseStyle} loading border-blue-500 bg-blue-50/50 shadow-lg`;
      case 'success':
        return `${baseStyle} success border-green-500 bg-green-50/50 shadow-lg`;
      case 'error':
        return `${baseStyle} error border-red-500 bg-red-50/50 shadow-lg`;
      default:
        return `${baseStyle} idle border-gray-300 bg-white/80 backdrop-blur-sm ${
          selected ? 'border-primary shadow-lg' : ''
        }`;
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'loading':
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (data.status) {
      case 'loading':
        return <Badge className="status-badge loading bg-blue-500 text-white font-mono text-xs">processing</Badge>;
      case 'success':
        return <Badge className="status-badge success bg-green-500 text-white font-mono text-xs">ready</Badge>;
      case 'error':
        return <Badge className="status-badge error bg-red-500 text-white font-mono text-xs">error</Badge>;
      default:
        return <Badge className="status-badge bg-gray-500 text-white font-mono text-xs">idle</Badge>;
    }
  };

  const maxLength = data.config?.prompt?.maxLength || 1000;
  const placeholder = data.config?.prompt?.placeholder || 'Enter your prompt...';
  const isValid = prompt.trim().length > 0;
  const isNearLimit = charCount > maxLength * 0.8;

  return (
    <Card className={`w-80 min-h-[200px] ${getNodeStyle()}`}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-gray-800">
            {getStatusIcon()}
            {data.label}
          </CardTitle>
          {getStatusBadge()}
        </div>
        
        {/* Coût en crédits */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">cost: {data.config?.costCredits || 0} credits</span>
          {data.config?.estimatedDuration && (
            <span className="font-mono">• eta: {data.config.estimatedDuration / 1000}s</span>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-3">
        {/* Zone de saisie du prompt */}
        <div className="space-y-2">
          <Label className="text-sm font-mono text-gray-700">your_idea</Label>
          <Textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[80px] bg-white/80 border-gray-200 text-black font-mono text-xs resize-none focus:border-blue-500 transition-colors"
            disabled={data.status === 'loading'}
          />
          
          {/* Compteur de caractères */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {isValid ? (
                <span className="text-green-600 font-mono">✓ valid</span>
              ) : (
                <span className="text-gray-500 font-mono">enter prompt</span>
              )}
            </div>
            <span className={`font-mono ${
              isNearLimit ? 'text-orange-500' : 'text-gray-500'
            }`}>
              {charCount}/{maxLength}
            </span>
          </div>
        </div>

        {/* Message d'erreur */}
        {data.status === 'error' && data.errorMessage && (
          <div className="p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 font-mono">
            {data.errorMessage}
          </div>
        )}

        {/* Informations de temps d'exécution */}
        {data.startTime && (
          <div className="text-xs text-muted-foreground font-mono">
            {data.status === 'loading' && 'started...'}
            {data.endTime && data.startTime && (
              `completed in ${Math.round((data.endTime - data.startTime) / 1000)}s`
            )}
          </div>
        )}
      </CardContent>

      {/* Handle pour la connexion sortante */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={`w-3 h-3 border-2 border-gray-400 bg-white ${data.status === 'success' ? 'success' : data.status === 'loading' ? 'loading' : ''}`}
        style={{
          backgroundColor: data.status === 'success' ? '#10b981' : '#9ca3af',
          borderColor: data.status === 'success' ? '#10b981' : '#9ca3af'
        }}
      />
    </Card>
  );
}