import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { encryptionService } from '@/services/encryption';
import { apiValidationService, type ValidationResult } from '@/services/api-validation';
import prisma from '@/lib/prisma';

/**
 * GET /api/user/api-keys
 * Récupère les clés API de l'utilisateur (chiffrées, pour affichage masqué)
 */
export async function GET(request: NextRequest) {
  console.log('[API-KEYS GET] Starting request');
  
  try {
    // Authentification via Supabase
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[API-KEYS GET] Auth check:', { userId: user?.id, error: authError });

    if (authError || !user) {
      console.error('[API-KEYS GET] Auth failed:', authError);
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupération des clés API depuis la base de données
    console.log('[API-KEYS GET] Fetching credentials for user:', user.id);
    
    const apiCredentials = await prisma.apiCredential.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      select: {
        id: true,
        provider: true,
        encryptedKey: true,
        encryptionIV: true,
        isActive: true,
        lastValidated: true,
        validationStatus: true,
        lastError: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Formatage des données pour le frontend (clés masquées)
    const formattedKeys = apiCredentials.map(credential => {
      let maskedKey = '';
      try {
        // Déchiffrement temporaire pour masquage
        const decryptedKey = encryptionService.decrypt(credential.encryptedKey, credential.encryptionIV);
        maskedKey = apiValidationService.maskApiKey(decryptedKey);
      } catch {
        maskedKey = 'Erreur de déchiffrement';
      }

      return {
        id: credential.id,
        provider: credential.provider,
        maskedKey,
        isActive: credential.isActive,
        lastValidated: credential.lastValidated,
        validationStatus: credential.validationStatus,
        lastError: credential.lastError,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt
      };
    });

    console.log('[API-KEYS GET] Returning', formattedKeys.length, 'keys');
    
    return NextResponse.json({
      success: true,
      data: formattedKeys
    });

  } catch (error) {
    console.error('[API-KEYS GET] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/api-keys
 * Sauvegarde ou met à jour les clés API de l'utilisateur
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
    const { provider, apiKey, validateKey = false } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider et clé API requis' },
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

    let validationResult: ValidationResult | null = null;

    // Validation de la clé si demandée
    if (validateKey) {
      try {
        validationResult = await apiValidationService.validateKey(provider, apiKey);
        
        if (!validationResult.isValid) {
          return NextResponse.json({
            success: false,
            error: 'Clé API invalide',
            validationResult
          }, { status: 400 });
        }
      } catch (validationError) {
        console.error('Erreur lors de la validation:', validationError);
        return NextResponse.json({
          success: false,
          error: 'Erreur lors de la validation de la clé'
        }, { status: 500 });
      }
    }

    // Chiffrement de la clé
    let encryptedData;
    try {
      encryptedData = encryptionService.encrypt(apiKey);
    } catch (encryptionError) {
      console.error('Erreur de chiffrement:', encryptionError);
      return NextResponse.json(
        { error: 'Erreur lors du chiffrement de la clé' },
        { status: 500 }
      );
    }

    // Sauvegarde en base de données (upsert)
    const savedCredential = await prisma.apiCredential.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: provider.toLowerCase()
        }
      },
      update: {
        encryptedKey: encryptedData.encrypted,
        encryptionIV: encryptedData.iv,
        isActive: true,
        lastValidated: validationResult ? new Date() : null,
        validationStatus: validationResult ? (validationResult.isValid ? 'valid' : 'invalid') : 'unchecked',
        lastError: validationResult && !validationResult.isValid ? validationResult.message : null,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        provider: provider.toLowerCase(),
        encryptedKey: encryptedData.encrypted,
        encryptionIV: encryptedData.iv,
        isActive: true,
        lastValidated: validationResult ? new Date() : null,
        validationStatus: validationResult ? (validationResult.isValid ? 'valid' : 'invalid') : 'unchecked',
        lastError: validationResult && !validationResult.isValid ? validationResult.message : null
      }
    });

    // Log sécurisé (clé masquée)
    console.log(`Clé API ${provider} sauvegardée pour l'utilisateur ${user.id}: ${apiValidationService.maskApiKey(apiKey)}`);

    return NextResponse.json({
      success: true,
      data: {
        id: savedCredential.id,
        provider: savedCredential.provider,
        maskedKey: apiValidationService.maskApiKey(apiKey),
        isActive: savedCredential.isActive,
        validationStatus: savedCredential.validationStatus,
        lastValidated: savedCredential.lastValidated
      },
      validationResult
    });

  } catch (error) {
    console.error('[API-KEYS POST] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la sauvegarde', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/api-keys
 * Supprime une clé API spécifique
 */
export async function DELETE(request: NextRequest) {
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

    // Récupération du provider depuis les paramètres
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider requis' },
        { status: 400 }
      );
    }

    // Suppression de la base de données
    const deletedCredential = await prisma.apiCredential.deleteMany({
      where: {
        userId: user.id,
        provider: provider.toLowerCase()
      }
    });

    if (deletedCredential.count === 0) {
      return NextResponse.json(
        { error: 'Clé API non trouvée' },
        { status: 404 }
      );
    }

    console.log(`Clé API ${provider} supprimée pour l'utilisateur ${user.id}`);

    return NextResponse.json({
      success: true,
      message: `Clé ${provider} supprimée avec succès`
    });

  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression' },
      { status: 500 }
    );
  }
}