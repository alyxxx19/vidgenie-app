'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
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

interface ApiKeysResponse {
  success: boolean;
  data: ApiKey[];
}

export interface UserApiKeysStatus {
  openai: {
    available: boolean;
    validated: boolean;
    key?: ApiKey;
  };
  nanobanana: {
    available: boolean;
    validated: boolean;
    key?: ApiKey;
  };
  veo3: {
    available: boolean;
    validated: boolean;
    key?: ApiKey;
  };
}

export function useUserApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<Record<string, ApiKey>>({});
  const [status, setStatus] = useState<UserApiKeysStatus>({
    openai: { available: false, validated: false },
    nanobanana: { available: false, validated: false },
    veo3: { available: false, validated: false }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApiKeys = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

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

      const result: ApiKeysResponse = await response.json();
      
      if (result.success) {
        // Convertir le tableau en objet indexé par provider
        const keysMap = result.data.reduce((acc, key) => {
          acc[key.provider] = key;
          return acc;
        }, {} as Record<string, ApiKey>);
        
        setKeys(keysMap);

        // Mettre à jour le status
        const newStatus: UserApiKeysStatus = {
          openai: {
            available: !!keysMap.openai,
            validated: keysMap.openai?.validationStatus === 'valid',
            key: keysMap.openai
          },
          nanobanana: {
            available: !!keysMap.nanobanana,
            validated: keysMap.nanobanana?.validationStatus === 'valid',
            key: keysMap.nanobanana
          },
          veo3: {
            available: !!keysMap.veo3,
            validated: keysMap.veo3?.validationStatus === 'valid',
            key: keysMap.veo3
          }
        };
        
        setStatus(newStatus);
        setError(null);
      } else {
        throw new Error('Réponse non valide du serveur');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur lors du chargement des clés API:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  // Fonctions utilitaires
  const hasValidKey = useCallback((provider: 'openai' | 'nanobanana' | 'veo3'): boolean => {
    return status[provider].available && status[provider].validated;
  }, [status]);

  const canUseOpenAI = useCallback(() => hasValidKey('openai'), [hasValidKey]);
  const canUseNanoBanana = useCallback(() => hasValidKey('nanobanana'), [hasValidKey]);
  const canUseVEO3 = useCallback(() => hasValidKey('veo3'), [hasValidKey]);

  // Vérifications pour les workflows
  const canRunTextToImage = useCallback(() => {
    return canUseOpenAI() || canUseNanoBanana(); // Enrichissement optionnel + génération
  }, [canUseOpenAI, canUseNanoBanana]);

  const canRunTextToVideo = useCallback(() => {
    return canUseVEO3(); // VEO3 pour génération vidéo directe
  }, [canUseVEO3]);

  const canRunImageToVideo = useCallback(() => {
    return canUseVEO3(); // VEO3 pour image-to-video
  }, [canUseVEO3]);

  const canRunCompleteWorkflow = useCallback(() => {
    return (canUseOpenAI() || canUseNanoBanana()) && canUseVEO3(); // Image + Video
  }, [canUseOpenAI, canUseNanoBanana, canUseVEO3]);

  // Messages d'erreur pour les workflows
  const getWorkflowError = useCallback((workflow: 'text-to-image' | 'text-to-video' | 'image-to-video' | 'complete') => {
    switch (workflow) {
      case 'text-to-image':
        if (!canUseOpenAI() && !canUseNanoBanana()) {
          return 'Clé OpenAI ou NanoBanana requise pour la génération d\'images';
        }
        return null;
      
      case 'text-to-video':
        if (!canUseVEO3()) {
          return 'Clé VEO3 requise pour la génération de vidéos';
        }
        return null;
      
      case 'image-to-video':
        if (!canUseVEO3()) {
          return 'Clé VEO3 requise pour la transformation image-to-video';
        }
        return null;
      
      case 'complete':
        if (!canUseVEO3()) {
          return 'Clé VEO3 requise pour le workflow complet';
        }
        if (!canUseOpenAI() && !canUseNanoBanana()) {
          return 'Clé OpenAI ou NanoBanana requise pour le workflow complet';
        }
        return null;
      
      default:
        return 'Workflow non supporté';
    }
  }, [canUseOpenAI, canUseNanoBanana, canUseVEO3]);

  // Récupérer une clé décryptée (pour usage interne)
  const getDecryptedKey = useCallback(async (provider: 'openai' | 'nanobanana' | 'veo3'): Promise<string | null> => {
    if (!hasValidKey(provider)) {
      return null;
    }

    try {
      // Cette fonctionnalité devrait être implémentée côté serveur
      // pour des raisons de sécurité. Pour l'instant, on retourne null.
      // TODO: Implémenter un endpoint sécurisé pour récupérer les clés décryptées
      console.warn('getDecryptedKey: Fonction non implémentée pour des raisons de sécurité');
      return null;
    } catch (error) {
      console.error('Erreur lors du décryptage de la clé:', error);
      return null;
    }
  }, [hasValidKey]);

  return {
    keys,
    status,
    isLoading,
    error,
    refresh: loadApiKeys,
    
    // Vérifications de disponibilité
    hasValidKey,
    canUseOpenAI,
    canUseNanoBanana,
    canUseVEO3,
    
    // Vérifications par workflow
    canRunTextToImage,
    canRunTextToVideo,
    canRunImageToVideo,
    canRunCompleteWorkflow,
    
    // Utilitaires
    getWorkflowError,
    getDecryptedKey,
    
    // Métriques
    totalKeys: Object.keys(keys).length,
    validKeys: Object.values(status).filter(s => s.validated).length,
    isFullyConfigured: canRunCompleteWorkflow()
  };
}

export default useUserApiKeys;