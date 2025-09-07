import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiValidationService, type ValidationResult } from '@/services/api-validation';
import { apiKeyRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { secureLog } from '@/lib/secure-logger';

/**
 * POST /api/user/api-keys/validate
 * Valide une clé API sans la sauvegarder
 * Utilisé pour les tests en temps réel dans l'interface
 */
export async function POST(request: NextRequest) {
  try {
    // Authentification
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Parsing du body
    const body = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider et clé API requis pour la validation' },
        { status: 400 }
      );
    }

    // Validation des providers supportés
    const supportedProviders = ['openai', 'nanobanana', 'veo3'];
    if (!supportedProviders.includes(provider.toLowerCase())) {
      return NextResponse.json(
        { error: `Provider non supporté. Supportés: ${supportedProviders.join(', ')}` },
        { status: 400 }
      );
    }

    // Rate limiting avec Redis
    const identifier = getRateLimitIdentifier(request, user.id);
    try {
      const rateLimitResult = await apiKeyRateLimit.limit(identifier);
      
      if (!rateLimitResult.success) {
        secureLog.warn(`Rate limit exceeded for API key validation: ${identifier}`);
        return NextResponse.json({
          success: false,
          error: `Trop de validations. Limite: ${rateLimitResult.limit}/h. Réessayez dans ${Math.ceil((rateLimitResult.reset - Date.now()) / 1000)} secondes.`,
          validationResult: {
            isValid: false,
            provider,
            message: 'Rate limit atteint pour les validations',
            error: {
              code: 'RATE_LIMITED',
              type: 'rate_limit' as const
            }
          }
        }, { status: 429 });
      }
    } catch (rateLimitError) {
      secureLog.error('Rate limit error during validation:', rateLimitError);
      // Continue sans rate limiting en cas d'erreur Redis
    }

    secureLog.info(`Validation de clé ${provider} pour utilisateur ${user.id}`);

    // Validation de la clé
    let validationResult: ValidationResult;
    
    try {
      validationResult = await apiValidationService.validateKey(provider, apiKey);
    } catch (validationError) {
      secureLog.error('Erreur lors de la validation:', validationError);
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la validation de la clé',
        validationResult: {
          isValid: false,
          provider,
          message: 'Erreur technique lors de la validation',
          error: {
            code: 'VALIDATION_ERROR',
            type: 'unknown' as const
          }
        }
      }, { status: 500 });
    }

    // Log du résultat (sans exposer la clé)
    const maskedKey = apiValidationService.maskApiKey(apiKey);
    secureLog.info(`Validation ${provider} pour ${user.id}: ${maskedKey} -> ${validationResult.isValid ? 'VALID' : 'INVALID'}`);

    // Retour du résultat
    return NextResponse.json({
      success: true,
      validationResult: {
        ...validationResult,
        // Ne pas exposer les détails sensibles au frontend
        details: validationResult.isValid ? {
          model: validationResult.details?.model,
          rateLimit: validationResult.details?.rateLimit ? {
            remaining: validationResult.details.rateLimit.remaining
          } : undefined
        } : undefined
      }
    });

  } catch (error) {
    secureLog.error('Erreur serveur lors de la validation:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la validation',
      validationResult: {
        isValid: false,
        provider: 'unknown',
        message: 'Erreur serveur',
        error: {
          code: 'SERVER_ERROR',
          type: 'unknown' as const
        }
      }
    }, { status: 500 });
  }
}

/**
 * GET /api/user/api-keys/validate
 * Valide toutes les clés existantes de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    // Authentification
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Cette fonctionnalité pourrait être implémentée plus tard
    // pour valider toutes les clés stockées d'un utilisateur
    return NextResponse.json({
      success: false,
      error: 'Fonctionnalité pas encore implémentée'
    }, { status: 501 });

  } catch (error) {
    secureLog.error('Erreur lors de la validation globale:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}