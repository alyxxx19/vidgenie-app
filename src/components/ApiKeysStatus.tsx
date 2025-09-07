'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  RefreshCcw,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { useUserApiKeys } from '@/hooks/useUserApiKeys';
import { toast } from 'sonner';

interface ApiKeysStatusProps {
  selectedWorkflow?: 'text-to-image' | 'text-to-video' | 'image-to-video' | 'complete' | null;
  showCompact?: boolean;
  className?: string;
}

export function ApiKeysStatus({ 
  selectedWorkflow = null, 
  showCompact = false, 
  className = '' 
}: ApiKeysStatusProps) {
  const {
    status,
    isLoading,
    error,
    refresh,
    canRunTextToImage,
    canRunTextToVideo,
    canRunImageToVideo,
    canRunCompleteWorkflow,
    getWorkflowError,
    totalKeys,
    validKeys,
    isFullyConfigured
  } = useUserApiKeys();

  const handleRefresh = async () => {
    await refresh();
    toast.success('État des clés API actualisé');
  };

  // Détermine si le workflow sélectionné peut fonctionner
  const canRunSelectedWorkflow = () => {
    switch (selectedWorkflow) {
      case 'text-to-image':
        return canRunTextToImage();
      case 'text-to-video':
        return canRunTextToVideo();
      case 'image-to-video':
        return canRunImageToVideo();
      case 'complete':
        return canRunCompleteWorkflow();
      default:
        return true; // Pas de workflow sélectionné
    }
  };

  const getWorkflowErrorMessage = () => {
    if (!selectedWorkflow) return null;
    return getWorkflowError(selectedWorkflow);
  };

  if (showCompact) {
    return (
      <div className={`flex items-center gap-3 p-3 bg-secondary/20 border border-secondary rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-white" />
          <span className="font-mono text-xs text-white">api_keys:</span>
          <Badge variant={isFullyConfigured ? 'default' : 'secondary'} className="text-xs font-mono">
            {validKeys}/{totalKeys} configured
          </Badge>
        </div>
        
        {selectedWorkflow && !canRunSelectedWorkflow() && (
          <Alert className="flex-1 p-2 border-destructive bg-destructive/10">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription className="text-xs font-mono text-destructive ml-2">
              {getWorkflowErrorMessage()}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-6 w-6 p-0 hover:bg-white/10"
          >
            <RefreshCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-6 w-6 p-0 hover:bg-white/10"
          >
            <Link href="/profile?tab=api-keys">
              <Settings className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
            <Shield className="w-4 h-4" />
            api_keys_status
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant={isFullyConfigured ? 'default' : 'secondary'} className="text-xs font-mono">
              {isFullyConfigured ? 'ready' : 'config_required'}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-6 text-xs text-muted-foreground hover:text-white"
            >
              <RefreshCcw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status global */}
        <div className="grid grid-cols-3 gap-3">
          {/* OpenAI */}
          <div className="flex items-center gap-2 p-2 border border-border rounded">
            <div className={`w-2 h-2 rounded-full ${
              status.openai.validated ? 'bg-green-500' : 
              status.openai.available ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <div className="flex-1">
              <div className="text-xs font-mono text-white">OpenAI</div>
              <div className="text-xs font-mono text-muted-foreground">
                {status.openai.validated ? 'validated' : 
                 status.openai.available ? 'needs_validation' : 'not_configured'}
              </div>
            </div>
          </div>

          {/* NanoBanana */}
          <div className="flex items-center gap-2 p-2 border border-border rounded">
            <div className={`w-2 h-2 rounded-full ${
              status.nanobanana.validated ? 'bg-green-500' : 
              status.nanobanana.available ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <div className="flex-1">
              <div className="text-xs font-mono text-white">NanoBanana</div>
              <div className="text-xs font-mono text-muted-foreground">
                {status.nanobanana.validated ? 'validated' : 
                 status.nanobanana.available ? 'needs_validation' : 'not_configured'}
              </div>
            </div>
          </div>

          {/* VEO3 */}
          <div className="flex items-center gap-2 p-2 border border-border rounded">
            <div className={`w-2 h-2 rounded-full ${
              status.veo3.validated ? 'bg-green-500' : 
              status.veo3.available ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <div className="flex-1">
              <div className="text-xs font-mono text-white">VEO3</div>
              <div className="text-xs font-mono text-muted-foreground">
                {status.veo3.validated ? 'validated' : 
                 status.veo3.available ? 'needs_validation' : 'not_configured'}
              </div>
            </div>
          </div>
        </div>

        {/* Capacités du workflow */}
        {selectedWorkflow && (
          <div className="space-y-2">
            <div className="text-xs font-mono text-white mb-2">workflow_compatibility:</div>
            
            {canRunSelectedWorkflow() ? (
              <Alert className="border-green-500 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="text-xs font-mono text-green-400">
                  {selectedWorkflow}_workflow: ready_to_run
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs font-mono">
                  {selectedWorkflow}_workflow: {getWorkflowErrorMessage()}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="flex-1 border-border text-white hover:bg-secondary/50 font-mono text-xs"
          >
            <Link href="/profile?tab=api-keys" className="flex items-center gap-1">
              <Key className="w-3 h-3" />
              configure_keys
            </Link>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs text-muted-foreground hover:text-white font-mono"
          >
            <a 
              href="https://docs.anthropic.com/en/docs/claude-code" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              guide
              <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        </div>

        {/* Note de sécurité */}
        <div className="text-xs text-muted-foreground font-mono pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>byok_model: your keys, direct billing, aes-256 encrypted</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ApiKeysStatus;