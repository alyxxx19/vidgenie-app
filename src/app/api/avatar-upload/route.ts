import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { secureLog } from '@/lib/secure-logger';

// Configuration S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'vidgenie-avatars';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Schema de validation
const uploadRequestSchema = z.object({
  fileName: z.string().min(1, 'Nom de fichier requis'),
  fileType: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/, 'Format d\'image non supporté'),
  fileSize: z.number().max(MAX_FILE_SIZE, 'Fichier trop volumineux (max 5MB)'),
});

/**
 * POST /api/avatar-upload
 * Génère une presigned URL pour uploader un avatar
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

    // Parsing et validation du body
    const body = await request.json();
    const validatedData = uploadRequestSchema.parse(body);

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const fileExtension = validatedData.fileName.split('.').pop();
    const uniqueFileName = `${user.id}/${timestamp}-avatar.${fileExtension}`;

    // Créer la commande S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: validatedData.fileType,
      ContentLength: validatedData.fileSize,
      Metadata: {
        'user-id': user.id,
        'original-name': validatedData.fileName,
        'upload-timestamp': timestamp.toString(),
      },
    });

    // Générer l'URL pré-signée (expire dans 5 minutes)
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    // URL publique du fichier (sera disponible après upload)
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      data: {
        presignedUrl,
        publicUrl,
        fileName: uniqueFileName,
        expiresIn: 300,
      },
    });

  } catch (error) {
    secureLog.error('Erreur génération presigned URL:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données de fichier invalides',
          details: error.issues 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de la préparation de l\'upload' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/avatar-upload
 * Confirme l'upload et met à jour l'avatar utilisateur
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { publicUrl } = body;

    if (!publicUrl || typeof publicUrl !== 'string') {
      return NextResponse.json(
        { error: 'URL publique requise' },
        { status: 400 }
      );
    }

    // TODO: Vérifier que le fichier existe réellement sur S3
    // TODO: Optionnel - redimensionner l'image avec Sharp

    // Mettre à jour l'avatar dans la base de données
    const { db } = await import('@/server/api/db');
    
    await db.user.update({
      where: { id: user.id },
      data: { 
        avatar: publicUrl,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Avatar mis à jour avec succès',
      avatarUrl: publicUrl,
    });

  } catch (error) {
    secureLog.error('Erreur mise à jour avatar:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'avatar' },
      { status: 500 }
    );
  }
}