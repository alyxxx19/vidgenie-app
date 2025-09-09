import OpenAI from 'openai';
import { secureLog } from '@/lib/secure-logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  reason?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ContentModerationService {
  moderateText(content: string): Promise<ModerationResult>;
  moderateImage(imageUrl: string): Promise<ModerationResult>;
}

class OpenAIModerationService implements ContentModerationService {
  async moderateText(content: string): Promise<ModerationResult> {
    try {
      const response = await openai.moderations.create({
        input: content,
      });

      const result = response.results[0];
      if (!result) {
        return { flagged: false, categories: [], severity: 'low' };
      }

      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category);

      const severity = this.calculateSeverity(result.category_scores as unknown as Record<string, number>);

      return {
        flagged: result.flagged,
        categories: flaggedCategories,
        reason: flaggedCategories.length > 0 
          ? `Content flagged for: ${flaggedCategories.join(', ')}`
          : undefined,
        severity,
      };
    } catch (error) {
      secureLog.error('Text moderation error:', error);
      // En cas d'erreur, on refuse par sécurité
      return {
        flagged: true,
        categories: ['moderation_error'],
        reason: 'Moderation service unavailable',
        severity: 'high',
      };
    }
  }

  async moderateImage(imageUrl: string): Promise<ModerationResult> {
    try {
      // OpenAI n'a pas d'API de modération d'image directe
      // On utilise la vision API pour analyser le contenu
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image for inappropriate content. Respond with JSON: {"flagged": boolean, "categories": string[], "reason": string, "severity": "low"|"medium"|"high"}. Categories can include: violence, adult, hate, harassment, illegal, dangerous.',
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from vision API');
      }

      const result = JSON.parse(content) as ModerationResult;
      return result;
    } catch (error) {
      secureLog.error('Image moderation error:', error);
      // En cas d'erreur, on refuse par sécurité
      return {
        flagged: true,
        categories: ['moderation_error'],
        reason: 'Image moderation service unavailable',
        severity: 'high',
      };
    }
  }

  private calculateSeverity(scores: Record<string, number>): 'low' | 'medium' | 'high' {
    const maxScore = Math.max(...Object.values(scores));
    
    if (maxScore > 0.8) return 'high';
    if (maxScore > 0.5) return 'medium';
    return 'low';
  }
}

// Règles de contenu spécifiques à VidGenie
export const CONTENT_RULES = {
  // Mots-clés interdits
  BLOCKED_KEYWORDS: [
    'violence', 'hate', 'harassment', 'illegal', 'drugs', 'weapons',
    'explicit', 'adult', 'nsfw', 'gore', 'suicide', 'self-harm',
  ],
  
  // Patterns suspects dans les prompts
  SUSPICIOUS_PATTERNS: [
    /nude|naked|sex|porn/i,
    /kill|murder|death|violence/i,
    /hack|steal|fraud|scam/i,
    /drug|cocaine|heroin|meth/i,
  ],
  
  // Longueur maximale des prompts
  MAX_PROMPT_LENGTH: 2000,
  
  // Mots minimum requis
  MIN_PROMPT_WORDS: 3,
};

export class VidGenieModerationService implements ContentModerationService {
  private openaiService: OpenAIModerationService;
  
  constructor() {
    this.openaiService = new OpenAIModerationService();
  }

  async moderateText(content: string): Promise<ModerationResult> {
    // Vérifications locales rapides
    const localCheck = this.checkLocalRules(content);
    if (localCheck.flagged) {
      return localCheck;
    }

    // Modération OpenAI
    return await this.openaiService.moderateText(content);
  }

  async moderateImage(imageUrl: string): Promise<ModerationResult> {
    return await this.openaiService.moderateImage(imageUrl);
  }

  private checkLocalRules(content: string): ModerationResult {
    const lowerContent = content.toLowerCase();
    
    // Vérifier la longueur
    if (content.length > CONTENT_RULES.MAX_PROMPT_LENGTH) {
      return {
        flagged: true,
        categories: ['length_exceeded'],
        reason: `Content exceeds maximum length of ${CONTENT_RULES.MAX_PROMPT_LENGTH} characters`,
        severity: 'medium',
      };
    }

    // Vérifier le nombre minimum de mots
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount < CONTENT_RULES.MIN_PROMPT_WORDS) {
      return {
        flagged: true,
        categories: ['insufficient_content'],
        reason: `Content must contain at least ${CONTENT_RULES.MIN_PROMPT_WORDS} words`,
        severity: 'low',
      };
    }

    // Vérifier les mots-clés interdits
    const blockedWords = CONTENT_RULES.BLOCKED_KEYWORDS.filter(keyword =>
      lowerContent.includes(keyword)
    );
    
    if (blockedWords.length > 0) {
      return {
        flagged: true,
        categories: ['blocked_keywords'],
        reason: `Content contains blocked keywords: ${blockedWords.join(', ')}`,
        severity: 'high',
      };
    }

    // Vérifier les patterns suspects
    const suspiciousPattern = CONTENT_RULES.SUSPICIOUS_PATTERNS.find(pattern =>
      pattern.test(content)
    );
    
    if (suspiciousPattern) {
      return {
        flagged: true,
        categories: ['suspicious_pattern'],
        reason: 'Content matches suspicious pattern',
        severity: 'high',
      };
    }

    return { flagged: false, categories: [], severity: 'low' };
  }
}

// Instance singleton
export const contentModerationService = new VidGenieModerationService();

// Fonction utilitaire pour modérer un prompt avant génération
export async function moderatePrompt(prompt: string): Promise<{
  allowed: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}> {
  // En mode développement, on bypasse la modération pour simplifier les tests
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_MODERATION === 'true') {
    secureLog.info('[DEV] Moderation bypassed for prompt:', prompt.slice(0, 50) + '...');
    return {
      allowed: true,
      reason: 'Development mode - moderation bypassed',
      severity: 'low',
    };
  }

  try {
    const result = await contentModerationService.moderateText(prompt);
    
    return {
      allowed: !result.flagged,
      reason: result.reason,
      severity: result.severity,
    };
  } catch (error) {
    secureLog.error('Prompt moderation error:', error);
    
    // En mode développement, on autorise en cas d'erreur de service
    if (process.env.NODE_ENV === 'development') {
      secureLog.warn('[DEV] Moderation service failed, allowing content in development mode');
      return {
        allowed: true,
        reason: 'Development mode - moderation service unavailable but content allowed',
        severity: 'low',
      };
    }
    
    // En production, on refuse par sécurité
    return {
      allowed: false,
      reason: 'Content moderation service unavailable',
      severity: 'high',
    };
  }
}

// Fonction pour modérer une image générée
export async function moderateGeneratedImage(imageUrl: string): Promise<{
  allowed: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}> {
  try {
    const result = await contentModerationService.moderateImage(imageUrl);
    
    return {
      allowed: !result.flagged,
      reason: result.reason,
      severity: result.severity,
    };
  } catch (error) {
    secureLog.error('Image moderation error:', error);
    // En cas d'erreur, on autorise mais on log
    secureLog.warn('Image moderation failed, allowing content but logging for review');
    return {
      allowed: true,
      reason: 'Moderation service unavailable - content allowed for review',
      severity: 'low',
    };
  }
}