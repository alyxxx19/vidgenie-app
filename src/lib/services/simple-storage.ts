import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { secureLog } from '@/lib/secure-logger';

export interface StorageResult {
  success: boolean;
  publicUrl?: string;
  localPath?: string;
  error?: string;
}

export class SimpleStorageService {
  private uploadDir: string;

  constructor() {
    // Créer le dossier d'upload local en développement
    this.uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
      secureLog.info('[STORAGE] Created uploads directory:', this.uploadDir);
    }
  }

  async uploadImage(
    buffer: Buffer, 
    filename: string, 
    mimeType: string = 'image/png'
  ): Promise<StorageResult> {
    try {
      // En développement, sauvegarder localement
      if (process.env.NODE_ENV === 'development' || !process.env.S3_ACCESS_KEY_ID) {
        return this.uploadLocal(buffer, filename);
      }

      // En production, utiliser S3 (à implémenter plus tard si besoin)
      return this.uploadToS3(buffer, filename, mimeType);
    } catch (error: any) {
      secureLog.error('[STORAGE] Upload failed:', error);
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }

  private uploadLocal(buffer: Buffer, filename: string): StorageResult {
    try {
      const filePath = join(this.uploadDir, filename);
      writeFileSync(filePath, buffer);
      
      const publicUrl = `/uploads/${filename}`;
      
      secureLog.info('[STORAGE] File saved locally:', filePath);
      
      return {
        success: true,
        publicUrl,
        localPath: filePath,
      };
    } catch (error: any) {
      secureLog.error('[STORAGE] Local upload failed:', error);
      return {
        success: false,
        error: error.message || 'Local upload failed',
      };
    }
  }

  private async uploadToS3(
    buffer: Buffer, 
    filename: string, 
    mimeType: string
  ): Promise<StorageResult> {
    // Pour l'instant, utiliser le stockage local même en "production"
    // Plus tard, on peut implémenter S3 si besoin
    return this.uploadLocal(buffer, filename);
  }

  generateFilename(jobId: string, extension: string = 'png'): string {
    const timestamp = Date.now();
    return `${jobId}-${timestamp}.${extension}`;
  }
}

export const simpleStorage = new SimpleStorageService();