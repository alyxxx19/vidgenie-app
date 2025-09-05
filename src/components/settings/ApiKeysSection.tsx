'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ApiKeyInput } from './ApiKeyInput';
import { 
  Key, 
  Shield, 
  RefreshCcw, 
  AlertTriangle, 
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  provider: string;
  maskedKey: string;
  isActive: boolean;
  validationStatus: 'valid' | 'invalid' | 'unchecked';
  lastValidated: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiKeysData {
  success: boolean;
  data: ApiKey[];
}

interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: any;
}

const API_KEY_CONFIGS = {
  openai: {
    label: 'openai_api_key',
    placeholder: 'sk-...',
    helpText: 'text generation & prompt enhancement',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  dalle: {
    label: 'dalle_api_key',
    placeholder: 'sk-...',
    helpText: 'image generation with dall-e 3',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  vo3: {
    label: 'vo3_api_key',
    placeholder: 'fal_...',
    helpText: 'image-to-video transformation',
    docsUrl: 'https://fal.ai/dashboard'
  }
} as const;

export function ApiKeysSection() {
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKey>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chargement initial des clés API
  const loadApiKeys = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result: ApiKeysData = await response.json();
      
      if (result.success) {
        // Convertir le tableau en objet indexé par provider
        const keysMap = result.data.reduce((acc, key) => {
          acc[key.provider] = key;
          return acc;
        }, {} as Record<string, ApiKey>);
        
        setApiKeys(keysMap);
      } else {
        throw new Error('Réponse non valide du serveur');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      toast.error(`Erreur lors du chargement: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Rafraîchissement des données
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadApiKeys(false);
    setIsRefreshing(false);
    toast.success('Clés API actualisées');
  }, [loadApiKeys]);

  // Sauvegarde d'une clé API
  const handleSaveKey = useCallback(async (provider: string, apiKey: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          apiKey,
          validateKey: false // La validation est faite séparément
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Recharger les données pour avoir les informations à jour
        await loadApiKeys(false);
        return true;
      } else {
        throw new Error(result.error || 'Échec de la sauvegarde');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur lors de la sauvegarde: ${errorMessage}`);
      return false;
    }
  }, [loadApiKeys]);

  // Validation d'une clé API
  const handleValidateKey = useCallback(async (provider: string, apiKey: string): Promise<ValidationResult> => {
    try {
      const response = await fetch('/api/user/api-keys/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          apiKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.validationResult) {
        return {
          isValid: result.validationResult.isValid,
          message: result.validationResult.message,
          details: result.validationResult.details
        };
      } else {
        throw new Error('Réponse de validation invalide');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        isValid: false,
        message: errorMessage,
        details: null
      };
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  // Rendu du statut global
  const renderGlobalStatus = () => {
    const totalKeys = Object.keys(API_KEY_CONFIGS).length;
    const configuredKeys = Object.keys(apiKeys).length;
    const validKeys = Object.values(apiKeys).filter(key => key.validationStatus === 'valid').length;

    return (
      <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-secondary">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-full">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-mono text-white text-sm">api_keys_status</h3>
            <p className="text-xs text-muted-foreground font-mono">
              {configuredKeys}/{totalKeys} configured • {validKeys} validated
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={validKeys === totalKeys ? 'default' : 'secondary'} className="font-mono text-xs">
            {validKeys === totalKeys ? 'ready' : 'config_required'}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 border-secondary text-white hover:bg-secondary/50 font-mono text-xs"
          >
            <RefreshCcw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            refresh
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-secondary animate-fade-in-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white font-mono text-sm">
            <Shield className="w-5 h-5" />
            api_keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-mono">loading_api_keys...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-secondary animate-fade-in-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white font-mono text-sm">
            <Shield className="w-5 h-5" />
            api_keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-mono text-xs">
              api_keys_load_error: {error}
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadApiKeys()}
                className="mt-2 h-8 font-mono text-xs"
              >
                retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-secondary animate-fade-in-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white font-mono text-sm">
          <Shield className="w-5 h-5" />
          api_keys
        </CardTitle>
        <CardDescription className="text-muted-foreground font-mono text-xs">
          configure your own api keys for ai services
          • encrypted & securely stored
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Statut global */}
        {renderGlobalStatus()}

        {/* Message informatif */}
        <Alert className="border-secondary bg-secondary/20">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm font-mono text-muted-foreground">
            <span className="text-white">byok_model:</span> use your own api keys for direct billing
            • platform usage charged via credits only
          </AlertDescription>
        </Alert>

        <Separator />

        {/* Configuration des clés */}
        <div className="space-y-8">
          {Object.entries(API_KEY_CONFIGS).map(([provider, config]) => {
            const existingKey = apiKeys[provider];
            
            return (
              <div key={provider} className="space-y-3">
                {/* En-tête de la section */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="font-mono text-white text-sm">{config.label}</h4>
                    {existingKey && (
                      <Badge 
                        variant={
                          existingKey.validationStatus === 'valid' ? 'default' :
                          existingKey.validationStatus === 'invalid' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs font-mono"
                      >
                        {existingKey.validationStatus === 'valid' && (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            valid
                          </>
                        )}
                        {existingKey.validationStatus === 'invalid' && 'invalid'}
                        {existingKey.validationStatus === 'unchecked' && 'unchecked'}
                      </Badge>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-6 text-xs text-muted-foreground hover:text-white font-mono"
                  >
                    <a 
                      href={config.docsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      get_key
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </div>

                {/* Composant de saisie */}
                <ApiKeyInput
                  label={config.label}
                  provider={provider as 'openai' | 'dalle' | 'vo3'}
                  placeholder={config.placeholder}
                  helpText={config.helpText}
                  value={existingKey?.maskedKey}
                  onSave={handleSaveKey}
                  onValidate={handleValidateKey}
                />

                {/* Informations sur la dernière validation */}
                {existingKey && existingKey.lastValidated && (
                  <div className="text-xs text-muted-foreground font-mono">
                    last_validation: {new Date(existingKey.lastValidated).toISOString().split('T')[0]} {new Date(existingKey.lastValidated).toTimeString().split(' ')[0]}
                  </div>
                )}

                {/* Erreur de la dernière validation */}
                {existingKey && existingKey.lastError && existingKey.validationStatus === 'invalid' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-mono">
                      validation_error: {existingKey.lastError}
                    </AlertDescription>
                  </Alert>
                )}

                {provider !== 'vo3' && <Separator className="mt-6" />}
              </div>
            );
          })}
        </div>

        {/* Note de sécurité */}
        <Alert className="mt-6 border-secondary bg-secondary/20">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-sm font-mono text-muted-foreground">
            <span className="text-white">security:</span> aes-256 encryption before storage
            • never exposed in logs • workflow execution only
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}