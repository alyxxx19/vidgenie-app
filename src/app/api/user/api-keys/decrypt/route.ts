import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { encryptionService } from '@/services/encryption';
import { PrismaClient } from '@prisma/client';
import { secureLog } from '@/lib/secure-logger';

const prisma = new PrismaClient();

/**
 * POST /api/user/api-keys/decrypt
 * Récupère une clé API déchiffrée pour utilisation dans un workflow
 * IMPORTANT: Cet endpoint ne doit être utilisé que par des processes serveur sécurisés
 */
export async function POST(request: NextRequest) {
  try {
    // Authentification via Supabase
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
    const { provider, workflowId } = body;

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider requis' },
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

    // Récupération de la clé API depuis la base de données
    const apiCredential = await prisma.apiCredential.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: provider.toLowerCase()
        }
      },
      select: {
        id: true,
        provider: true,
        encryptedKey: true,
        encryptionIV: true,
        isActive: true,
        validationStatus: true,
        lastError: true
      }
    });

    if (!apiCredential) {
      return NextResponse.json(
        { error: `Clé API ${provider} non trouvée` },
        { status: 404 }
      );
    }

    if (!apiCredential.isActive) {
      return NextResponse.json(
        { error: `Clé API ${provider} désactivée` },
        { status: 403 }
      );
    }

    if (apiCredential.validationStatus !== 'valid') {
      return NextResponse.json(
        { 
          error: `Clé API ${provider} non validée`,
          details: {
            status: apiCredential.validationStatus,
            lastError: apiCredential.lastError
          }
        },
        { status: 403 }
      );
    }

    // Déchiffrement de la clé
    let decryptedKey: string;
    try {
      decryptedKey = encryptionService.decrypt(
        apiCredential.encryptedKey, 
        apiCredential.encryptionIV
      );
    } catch (decryptionError) {
      secureLog.error('Erreur de déchiffrement:', decryptionError);
      return NextResponse.json(
        { error: 'Erreur lors du déchiffrement de la clé' },
        { status: 500 }
      );
    }

    // Log sécurisé (clé masquée)
    secureLog.info(`Clé API ${provider} décryptée pour workflow ${workflowId || 'unknown'} - utilisateur ${user.id}`);

    return NextResponse.json({
      success: true,
      provider: apiCredential.provider,
      apiKey: decryptedKey,
      // Métadonnées pour usage
      metadata: {
        credentialId: apiCredential.id,
        validationStatus: apiCredential.validationStatus,
        workflowId: workflowId || null
      }
    });

  } catch (error) {
    secureLog.error('Erreur lors du décryptage de la clé API:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors du décryptage' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/api-keys/decrypt
 * Récupère plusieurs clés API déchiffrées pour un workflow
 */
export async function GET(request: NextRequest) {
  try {
    // Authentification via Supabase
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupération des paramètres
    const { searchParams } = new URL(request.url);
    const providers = searchParams.get('providers')?.split(',') || [];
    const workflowId = searchParams.get('workflowId');

    if (providers.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un provider requis' },
        { status: 400 }
      );
    }

    // Validation des providers
    const supportedProviders = ['openai', 'nanobanana', 'veo3'];
    const invalidProviders = providers.filter(p => !supportedProviders.includes(p.toLowerCase()));
    if (invalidProviders.length > 0) {
      return NextResponse.json(
        { error: `Providers non supportés: ${invalidProviders.join(', ')}` },
        { status: 400 }
      );
    }

    // Récupération de toutes les clés demandées
    const apiCredentials = await prisma.apiCredential.findMany({
      where: {
        userId: user.id,
        provider: { in: providers.map(p => p.toLowerCase()) },
        isActive: true,
        validationStatus: 'valid'
      },
      select: {
        id: true,
        provider: true,
        encryptedKey: true,
        encryptionIV: true,
        validationStatus: true
      }
    });

    const decryptedKeys: Record<string, string> = {};
    const errors: string[] = [];

    for (const credential of apiCredentials) {
      try {
        const decryptedKey = encryptionService.decrypt(
          credential.encryptedKey, 
          credential.encryptionIV
        );
        decryptedKeys[credential.provider] = decryptedKey;
      } catch (decryptionError) {
        errors.push(`Erreur de déchiffrement pour ${credential.provider}`);
        secureLog.error(`Erreur de déchiffrement pour ${credential.provider}:`, decryptionError);
      }
    }

    // Vérifier les clés manquantes
    const missingProviders = providers.filter(p => 
      !apiCredentials.some(cred => cred.provider === p.toLowerCase())
    );

    if (missingProviders.length > 0) {
      errors.push(`Clés non configurées ou invalides: ${missingProviders.join(', ')}`);
    }

    // Log sécurisé
    secureLog.info(`Clés API décryptées pour workflow ${workflowId || 'unknown'} - utilisateur ${user.id}: ${Object.keys(decryptedKeys).join(', ')}`);

    return NextResponse.json({
      success: true,
      keys: decryptedKeys,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        workflowId: workflowId || null,
        retrievedCount: Object.keys(decryptedKeys).length,
        requestedCount: providers.length
      }
    });

  } catch (error) {
    secureLog.error('Erreur lors du décryptage des clés API:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors du décryptage' },
      { status: 500 }
    );
  }
}