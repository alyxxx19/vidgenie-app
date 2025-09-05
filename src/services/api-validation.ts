/**
 * Service de validation des clés API pour différents providers
 * Teste la connectivité et la validité des clés sans exposer d'informations sensibles
 */

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
      // Vérification du format de base
      if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 20) {
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
        // Timeout de 10 secondes
        signal: AbortSignal.timeout(10000)
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
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          isValid: false,
          provider: 'openai',
          message: 'Timeout lors de la validation - vérifiez votre connexion',
          error: {
            code: 'TIMEOUT',
            type: 'network'
          }
        };
      }
      
      return {
        isValid: false,
        provider: 'openai',
        message: 'Erreur réseau lors de la validation',
        error: {
          code: 'NETWORK_ERROR',
          type: 'network'
        }
      };
    }
  }

  /**
   * Valide une clé API DALL-E (utilise la même validation qu'OpenAI)
   */
  async validateDALLEKey(apiKey: string): Promise<ValidationResult> {
    const result = await this.validateOpenAIKey(apiKey);
    return {
      ...result,
      provider: 'dalle',
      message: result.message.replace('OpenAI', 'DALL-E')
    };
  }

  /**
   * Valide une clé API VO3 (Fal.ai)
   */
  async validateVO3Key(apiKey: string): Promise<ValidationResult> {
    try {
      // Vérification du format de base
      if (!apiKey || apiKey.length < 10) {
        return {
          isValid: false,
          provider: 'vo3',
          message: 'Format de clé VO3 invalide',
          error: {
            code: 'INVALID_FORMAT',
            type: 'invalid_format'
          }
        };
      }

      // Test avec l'API VO3/Fal.ai - endpoint de santé ou modèles
      const response = await fetch('https://fal.run/fal-ai/fast-lightning-sdxl', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: "test validation", // Prompt minimal pour validation
          sync_mode: false
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        return {
          isValid: true,
          provider: 'vo3',
          message: 'Clé VO3 valide'
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          isValid: false,
          provider: 'vo3',
          message: 'Clé API VO3 invalide ou expirée',
          error: {
            code: 'UNAUTHORIZED',
            type: 'authentication'
          }
        };
      } else if (response.status === 429) {
        return {
          isValid: false,
          provider: 'vo3',
          message: 'Limite de taux atteinte pour cette clé VO3',
          error: {
            code: 'RATE_LIMITED',
            type: 'rate_limit'
          }
        };
      } else {
        return {
          isValid: false,
          provider: 'vo3',
          message: `Erreur API VO3: ${response.status}`,
          error: {
            code: `HTTP_${response.status}`,
            type: 'unknown'
          }
        };
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          isValid: false,
          provider: 'vo3',
          message: 'Timeout lors de la validation VO3',
          error: {
            code: 'TIMEOUT',
            type: 'network'
          }
        };
      }
      
      return {
        isValid: false,
        provider: 'vo3',
        message: 'Erreur réseau lors de la validation VO3',
        error: {
          code: 'NETWORK_ERROR',
          type: 'network'
        }
      };
    }
  }

  /**
   * Valide une clé selon son provider
   */
  async validateKey(provider: string, apiKey: string): Promise<ValidationResult> {
    switch (provider.toLowerCase()) {
      case 'openai':
        return this.validateOpenAIKey(apiKey);
      case 'dalle':
        return this.validateDALLEKey(apiKey);
      case 'vo3':
        return this.validateVO3Key(apiKey);
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
export type ApiProvider = 'openai' | 'dalle' | 'vo3';
export type ValidationType = 'authentication' | 'rate_limit' | 'network' | 'invalid_format' | 'unknown';