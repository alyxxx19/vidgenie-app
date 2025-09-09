/**
 * Service de validation des clés API pour différents providers
 * Teste la connectivité et la validité des clés sans exposer d'informations sensibles
 */

import { secureLog } from '@/lib/secure-logger';

export interface ValidationResult {
  isValid: boolean;
  provider: string;
  message: string;
  details?: {
    model?: string;
    organization?: string;
    rateLimit?: {
      remaining: number;
      resetTime?: Date;
    };
  };
  error?: {
    code: string;
    type: 'authentication' | 'rate_limit' | 'network' | 'invalid_format' | 'unknown';
  };
}

export class ApiValidationService {
  
  /**
   * Valide une clé API OpenAI
   */
  async validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
    try {
      // Vérification du format de base - plus flexible
      if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 15) {
        return {
          isValid: false,
          provider: 'openai',
          message: 'Format de clé OpenAI invalide (doit commencer par sk-)',
          error: {
            code: 'INVALID_FORMAT',
            type: 'invalid_format'
          }
        };
      }

      // Test avec l'API OpenAI - endpoint léger pour validation
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        // Timeout de 20 secondes avec retry
        signal: AbortSignal.timeout(20000)
      });

      if (response.ok) {
        const data = await response.json();
        return {
          isValid: true,
          provider: 'openai',
          message: 'Clé OpenAI valide',
          details: {
            model: data.data?.[0]?.id || 'GPT models available',
            organization: response.headers.get('openai-organization') || undefined,
            rateLimit: {
              remaining: parseInt(response.headers.get('x-ratelimit-remaining-requests') || '0'),
              resetTime: response.headers.get('x-ratelimit-reset-requests') 
                ? new Date(response.headers.get('x-ratelimit-reset-requests')!)
                : undefined
            }
          }
        };
      } else if (response.status === 401) {
        return {
          isValid: false,
          provider: 'openai',
          message: 'Clé API OpenAI invalide ou expirée',
          error: {
            code: 'UNAUTHORIZED',
            type: 'authentication'
          }
        };
      } else if (response.status === 429) {
        return {
          isValid: false,
          provider: 'openai',
          message: 'Limite de taux atteinte pour cette clé',
          error: {
            code: 'RATE_LIMITED',
            type: 'rate_limit'
          }
        };
      } else {
        return {
          isValid: false,
          provider: 'openai',
          message: `Erreur API OpenAI: ${response.status}`,
          error: {
            code: `HTTP_${response.status}`,
            type: 'unknown'
          }
        };
      }
    } catch (error) {
      secureLog.error('OpenAI validation error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          isValid: false,
          provider: 'openai',
          message: 'Timeout lors de la validation - vérifiez votre connexion (20s)',
          error: {
            code: 'TIMEOUT',
            type: 'network'
          }
        };
      }
      
      return {
        isValid: false,
        provider: 'openai',
        message: `Erreur réseau: ${error instanceof Error ? error.message : 'Inconnue'}`,
        error: {
          code: 'NETWORK_ERROR',
          type: 'network'
        }
      };
    }
  }

  /**
   * Valide une clé API NanoBanana
   */
  async validateNanoBananaKey(apiKey: string): Promise<ValidationResult> {
    try {
      // Vérification du format de base - plus flexible
      if (!apiKey || apiKey.trim().length < 10) {
        return {
          isValid: false,
          provider: 'nanobanana',
          message: 'Format de clé NanoBanana invalide (longueur minimum requise)',
          error: {
            code: 'INVALID_FORMAT',
            type: 'invalid_format'
          }
        };
      }

      // Test avec l'API NanoBanana - endpoint réel pour validation
      const response = await fetch('https://api.nanobananaapi.ai/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/nano-banana',
          prompt: 'test validation',
          output_format: 'jpeg',
          num_inference_steps: 1
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (response.ok || response.status === 202) {
        return {
          isValid: true,
          provider: 'nanobanana',
          message: 'Clé NanoBanana valide (Google Gemini 2.5)'
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          isValid: false,
          provider: 'nanobanana',
          message: 'Clé API NanoBanana invalide ou expirée',
          error: {
            code: 'UNAUTHORIZED',
            type: 'authentication'
          }
        };
      } else {
        return {
          isValid: false,
          provider: 'nanobanana',
          message: `Erreur API NanoBanana: ${response.status}`,
          error: {
            code: `HTTP_${response.status}`,
            type: 'unknown'
          }
        };
      }
    } catch (error) {
      secureLog.error('NanoBanana validation error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          isValid: false,
          provider: 'nanobanana',
          message: 'Timeout lors de la validation - vérifiez votre connexion (20s)',
          error: {
            code: 'TIMEOUT',
            type: 'network'
          }
        };
      }
      
      return {
        isValid: false,
        provider: 'nanobanana',
        message: `Erreur réseau: ${error instanceof Error ? error.message : 'Inconnue'}`,
        error: {
          code: 'NETWORK_ERROR',
          type: 'network'
        }
      };
    }
  }

  /**
   * Valide une clé API VEO3 (Fal.ai)
   */
  async validateVEO3Key(apiKey: string): Promise<ValidationResult> {
    try {
      // Vérification du format de base - plus flexible
      if (!apiKey || apiKey.trim().length < 8) {
        return {
          isValid: false,
          provider: 'veo3',
          message: 'Format de clé VEO3 invalide (longueur minimum requise)',
          error: {
            code: 'INVALID_FORMAT',
            type: 'invalid_format'
          }
        };
      }

      // Test avec l'API Fal.ai - endpoint simple pour validation
      const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: 'test',
          image_size: 'square_hd'
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (response.ok || response.status === 202) {
        return {
          isValid: true,
          provider: 'veo3',
          message: 'Clé VEO3 valide (fal.ai)'
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          isValid: false,
          provider: 'veo3',
          message: 'Clé API VEO3 invalide ou expirée',
          error: {
            code: 'UNAUTHORIZED',
            type: 'authentication'
          }
        };
      } else if (response.status === 429) {
        return {
          isValid: false,
          provider: 'veo3',
          message: 'Limite de taux atteinte pour cette clé VEO3',
          error: {
            code: 'RATE_LIMITED',
            type: 'rate_limit'
          }
        };
      } else if (response.status === 400) {
        // 400 peut indiquer une clé valide mais paramètres invalides
        const errorText = await response.text().catch(() => '');
        if (errorText.includes('prompt') || errorText.includes('parameter')) {
          return {
            isValid: true,
            provider: 'veo3',
            message: 'Clé VEO3 valide (erreur de paramètres attendue)'
          };
        } else {
          return {
            isValid: false,
            provider: 'veo3',
            message: 'Erreur de requête VEO3',
            error: {
              code: 'BAD_REQUEST',
              type: 'unknown'
            }
          };
        }
      } else {
        return {
          isValid: false,
          provider: 'veo3',
          message: `Erreur API VEO3: ${response.status}`,
          error: {
            code: `HTTP_${response.status}`,
            type: 'unknown'
          }
        };
      }
    } catch (error) {
      secureLog.error('VEO3 validation error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          isValid: false,
          provider: 'veo3',
          message: 'Timeout lors de la validation VEO3 - vérifiez votre connexion (20s)',
          error: {
            code: 'TIMEOUT',
            type: 'network'
          }
        };
      }
      
      return {
        isValid: false,
        provider: 'veo3',
        message: `Erreur réseau VEO3: ${error instanceof Error ? error.message : 'Inconnue'}`,
        error: {
          code: 'NETWORK_ERROR',
          type: 'network'
        }
      };
    }
  }

  /**
   * Valide une clé selon son provider avec retry automatique
   */
  async validateKey(provider: string, apiKey: string, retries = 2): Promise<ValidationResult> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let result: ValidationResult;
        
        switch (provider.toLowerCase()) {
          case 'openai':
            result = await this.validateOpenAIKey(apiKey);
            break;
          case 'nanobanana':
            result = await this.validateNanoBananaKey(apiKey);
            break;
          case 'veo3':
            result = await this.validateVEO3Key(apiKey);
            break;
          default:
            return {
              isValid: false,
              provider,
              message: `Provider non supporté: ${provider}`,
              error: {
                code: 'UNSUPPORTED_PROVIDER',
                type: 'invalid_format'
              }
            };
        }
        
        // Si c'est une erreur réseau et qu'il reste des tentatives
        if (!result.isValid && result.error?.type === 'network' && attempt < retries) {
          secureLog.info(`Tentative ${attempt + 1}/${retries + 1} échouée pour ${provider}, retry dans 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Backoff progressif
          continue;
        }
        
        return result;
      } catch (error) {
        secureLog.error(`Erreur lors de la validation ${provider} (tentative ${attempt + 1}):`, error);
        
        if (attempt === retries) {
          return {
            isValid: false,
            provider,
            message: `Échec après ${retries + 1} tentatives`,
            error: {
              code: 'MAX_RETRIES_EXCEEDED',
              type: 'network'
            }
          };
        }
        
        // Attendre avant la prochaine tentative
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    // Cette ligne ne devrait jamais être atteinte
    return {
      isValid: false,
      provider,
      message: 'Erreur inattendue lors de la validation',
      error: {
        code: 'UNEXPECTED_ERROR',
        type: 'unknown'
      }
    };
  }

  /**
   * Valide toutes les clés d'un utilisateur
   */
  async validateAllKeys(keys: Record<string, string>): Promise<Record<string, ValidationResult>> {
    const results: Record<string, ValidationResult> = {};
    
    // Validation en parallèle pour de meilleures performances
    const validationPromises = Object.entries(keys).map(async ([provider, apiKey]) => {
      if (apiKey && apiKey.trim()) {
        try {
          const result = await this.validateKey(provider, apiKey.trim());
          results[provider] = result;
        } catch (error) {
          results[provider] = {
            isValid: false,
            provider,
            message: 'Erreur lors de la validation',
            error: {
              code: 'VALIDATION_ERROR',
              type: 'unknown'
            }
          };
        }
      } else {
        results[provider] = {
          isValid: false,
          provider,
          message: 'Clé vide ou manquante',
          error: {
            code: 'EMPTY_KEY',
            type: 'invalid_format'
          }
        };
      }
    });

    await Promise.allSettled(validationPromises);
    return results;
  }

  /**
   * Masque une clé API pour l'affichage (garde début et fin)
   */
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length <= 8) {
      return '***';
    }
    
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(Math.min(apiKey.length - 8, 20));
    
    return `${start}${middle}${end}`;
  }
}

// Instance singleton
export const apiValidationService = new ApiValidationService();

// Types d'export pour TypeScript
export type ApiProvider = 'openai' | 'nanobanana' | 'veo3';
export type ValidationType = 'authentication' | 'rate_limit' | 'network' | 'invalid_format' | 'unknown';