import { createHash } from 'crypto';
import { uploadRateLimit, getRateLimitIdentifier, applyRateLimit } from './rate-limit';

/**
 * Service de validation stricte des fichiers uploadés
 * Implémente plusieurs couches de sécurité pour prévenir les attaques
 */

// Configuration des types de fichiers autorisés
const ALLOWED_MIME_TYPES = {
  image: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ],
  video: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm'
  ],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4'
  ],
  document: [
    'application/pdf',
    'text/plain',
    'application/json'
  ]
} as const;

// Extensions de fichiers autorisées (double vérification)
const ALLOWED_EXTENSIONS = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'],
  video: ['.mp4', '.mpeg', '.mov', '.webm'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a'],
  document: ['.pdf', '.txt', '.json']
} as const;

// Tailles maximales par type (en bytes)
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024,    // 10MB
  video: 500 * 1024 * 1024,   // 500MB
  audio: 50 * 1024 * 1024,    // 50MB
  document: 25 * 1024 * 1024  // 25MB
} as const;

// Signatures de fichiers malveillants à bloquer
const MALICIOUS_SIGNATURES = [
  // Exécutables Windows
  '4D5A',         // MZ header (.exe)
  '504B0304',     // ZIP header (peut contenir des exécutables)
  '526172211A',   // RAR header
  '377ABCAF271C', // 7z header
  
  // Scripts potentiellement dangereux
  '3C3F706870',   // <?php
  '3C736372697074', // <script
  
  // Headers de fichiers système
  'FFFE',         // UTF-16 BOM (potentiel script)
  'EFBBBF',       // UTF-8 BOM + script
];

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    originalName: string;
    mimeType: string;
    size: number;
    extension: string;
    hash: string;
    category: keyof typeof ALLOWED_MIME_TYPES | null;
  };
  sanitizedName?: string;
}

export interface FileValidationOptions {
  category?: keyof typeof ALLOWED_MIME_TYPES;
  maxSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  checkMaliciousContent?: boolean;
  quarantine?: boolean;
}

export class FileValidationService {
  /**
   * Validation complète d'un fichier uploadé
   */
  static async validateFile(
    file: File,
    options: FileValidationOptions = {}
  ): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        extension: this.getFileExtension(file.name),
        hash: '',
        category: null
      }
    };

    // 1. Validation du nom de fichier
    this.validateFileName(file.name, result);

    // 2. Détection de la catégorie
    result.metadata.category = this.detectFileCategory(file.type, result.metadata.extension);
    
    // 3. Validation du type MIME
    this.validateMimeType(file.type, result.metadata.category, options, result);

    // 4. Validation de l'extension
    this.validateExtension(result.metadata.extension, result.metadata.category, options, result);

    // 5. Validation de la taille
    this.validateFileSize(file.size, result.metadata.category, options, result);

    // 6. Génération du hash du fichier
    try {
      result.metadata.hash = await this.generateFileHash(file);
    } catch (error) {
      result.errors.push('Impossible de générer le hash du fichier');
    }

    // 7. Vérification du contenu malveillant
    if (options.checkMaliciousContent !== false) {
      await this.checkMaliciousContent(file, result);
    }

    // 8. Génération du nom de fichier sécurisé
    result.sanitizedName = this.sanitizeFileName(file.name, result.metadata.hash);

    // 9. Validation finale
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validation avec rate limiting pour prévenir les abus
   */
  static async validateFileWithRateLimit(
    file: File,
    request: Request,
    userId?: string,
    options: FileValidationOptions = {}
  ): Promise<FileValidationResult> {
    try {
      // Application du rate limiting
      const identifier = getRateLimitIdentifier(request, userId);
      await applyRateLimit(
        uploadRateLimit,
        identifier,
        'Trop d\'uploads récents. Veuillez patienter avant d\'uploader d\'autres fichiers.'
      );

      return await this.validateFile(file, options);
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Erreur de rate limiting'],
        warnings: [],
        metadata: {
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          extension: this.getFileExtension(file.name),
          hash: '',
          category: null
        }
      };
    }
  }

  /**
   * Validation du nom de fichier
   */
  private static validateFileName(fileName: string, result: FileValidationResult): void {
    // Vérifications de base
    if (!fileName || fileName.trim().length === 0) {
      result.errors.push('Nom de fichier manquant');
      return;
    }

    if (fileName.length > 255) {
      result.errors.push('Nom de fichier trop long (max 255 caractères)');
    }

    // Caractères dangereux
    const dangerousChars = /[<>:"|?*\x00-\x1F]/;
    if (dangerousChars.test(fileName)) {
      result.errors.push('Le nom de fichier contient des caractères non autorisés');
    }

    // Noms de fichiers système Windows/Unix dangereux
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    const nameWithoutExt = fileName.split('.')[0];
    if (reservedNames.test(nameWithoutExt)) {
      result.errors.push('Nom de fichier réservé système');
    }

    // Double extensions suspectes
    const suspiciousExtensions = /\.(exe|bat|cmd|scr|pif|com)\..*$/i;
    if (suspiciousExtensions.test(fileName)) {
      result.errors.push('Extension de fichier suspecte détectée');
    }

    // Fichier caché ou backup suspect
    if (fileName.startsWith('.ht') || fileName.includes('.bak')) {
      result.warnings.push('Fichier système ou de sauvegarde détecté');
    }
  }

  /**
   * Détecte la catégorie du fichier
   */
  private static detectFileCategory(mimeType: string, extension: string): keyof typeof ALLOWED_MIME_TYPES | null {
    // Vérification par MIME type en priorité
    for (const [category, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
      if (mimes.includes(mimeType as any)) {
        return category as keyof typeof ALLOWED_MIME_TYPES;
      }
    }

    // Fallback sur l'extension
    for (const [category, extensions] of Object.entries(ALLOWED_EXTENSIONS)) {
      if (extensions.includes(extension.toLowerCase())) {
        return category as keyof typeof ALLOWED_MIME_TYPES;
      }
    }

    return null;
  }

  /**
   * Validation du type MIME
   */
  private static validateMimeType(
    mimeType: string, 
    category: keyof typeof ALLOWED_MIME_TYPES | null,
    options: FileValidationOptions,
    result: FileValidationResult
  ): void {
    const allowedTypes = options.allowedMimeTypes || 
      (category ? ALLOWED_MIME_TYPES[category] : []);

    if (!mimeType || mimeType.trim() === '') {
      result.errors.push('Type MIME manquant');
      return;
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(mimeType)) {
      result.errors.push(`Type MIME non autorisé: ${mimeType}`);
    }

    // Vérification des MIME types suspects
    const suspiciousMimes = [
      'application/octet-stream',
      'application/x-executable',
      'application/x-msdownload',
      'text/html',
      'text/javascript',
      'application/javascript'
    ];

    if (suspiciousMimes.includes(mimeType)) {
      result.errors.push(`Type MIME potentiellement dangereux: ${mimeType}`);
    }
  }

  /**
   * Validation de l'extension
   */
  private static validateExtension(
    extension: string,
    category: keyof typeof ALLOWED_MIME_TYPES | null,
    options: FileValidationOptions,
    result: FileValidationResult
  ): void {
    const allowedExts = options.allowedExtensions || 
      (category ? ALLOWED_EXTENSIONS[category] : []);

    if (!extension) {
      result.warnings.push('Fichier sans extension');
      return;
    }

    if (allowedExts.length > 0 && !allowedExts.includes(extension.toLowerCase())) {
      result.errors.push(`Extension non autorisée: ${extension}`);
    }

    // Extensions dangereuses
    const dangerousExts = [
      '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.dll',
      '.jar', '.js', '.vbs', '.ps1', '.sh', '.php', '.asp'
    ];

    if (dangerousExts.includes(extension.toLowerCase())) {
      result.errors.push(`Extension dangereuse détectée: ${extension}`);
    }
  }

  /**
   * Validation de la taille du fichier
   */
  private static validateFileSize(
    size: number,
    category: keyof typeof ALLOWED_MIME_TYPES | null,
    options: FileValidationOptions,
    result: FileValidationResult
  ): void {
    if (size <= 0) {
      result.errors.push('Fichier vide');
      return;
    }

    const maxSize = options.maxSize || 
      (category ? MAX_FILE_SIZES[category] : 5 * 1024 * 1024); // 5MB par défaut

    if (size > maxSize) {
      result.errors.push(`Fichier trop volumineux: ${this.formatBytes(size)} (max: ${this.formatBytes(maxSize)})`);
    }

    // Taille minimum (anti DoS avec fichiers très petits)
    if (size < 10) {
      result.warnings.push('Fichier très petit (possiblement corrompu)');
    }
  }

  /**
   * Vérification du contenu malveillant
   */
  private static async checkMaliciousContent(file: File, result: FileValidationResult): Promise<void> {
    try {
      // Lecture des premiers bytes pour vérifier les signatures
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const header = Array.from(bytes.slice(0, 16))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join('');

      // Vérification des signatures malveillantes
      for (const signature of MALICIOUS_SIGNATURES) {
        if (header.startsWith(signature)) {
          result.errors.push('Signature de fichier malveillant détectée');
          return;
        }
      }

      // Vérifications spécifiques par catégorie
      if (result.metadata.category === 'image') {
        await this.validateImageContent(bytes, result);
      } else if (result.metadata.category === 'document') {
        await this.validateDocumentContent(bytes, result);
      }

    } catch (error) {
      result.warnings.push('Impossible de vérifier le contenu du fichier');
    }
  }

  /**
   * Validation spécifique des images
   */
  private static async validateImageContent(bytes: Uint8Array, result: FileValidationResult): Promise<void> {
    // Vérification des headers d'image valides
    const imageHeaders = {
      'FFD8FF': 'jpeg',
      '89504E47': 'png', 
      '47494638': 'gif',
      '524946': 'webp'
    };

    const header = Array.from(bytes.slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');

    let validHeader = false;
    for (const [headerSig, _] of Object.entries(imageHeaders)) {
      if (header.startsWith(headerSig)) {
        validHeader = true;
        break;
      }
    }

    if (!validHeader && result.metadata.mimeType.startsWith('image/')) {
      result.errors.push('Header d\'image invalide (possible fichier malveillant)');
    }

    // Recherche de scripts embarqués dans les métadonnées
    const content = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (content.includes('<script') || content.includes('javascript:') || content.includes('<?php')) {
      result.errors.push('Code exécutable détecté dans l\'image');
    }
  }

  /**
   * Validation spécifique des documents
   */
  private static async validateDocumentContent(bytes: Uint8Array, result: FileValidationResult): Promise<void> {
    const content = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1024));
    
    // Recherche de contenu suspect dans les documents
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        result.errors.push('Contenu suspect détecté dans le document');
        break;
      }
    }
  }

  /**
   * Génération d'un hash sécurisé du fichier
   */
  private static async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hash = createHash('sha256');
    hash.update(new Uint8Array(buffer));
    return hash.digest('hex');
  }

  /**
   * Nettoyage du nom de fichier
   */
  private static sanitizeFileName(originalName: string, hash: string): string {
    // Nettoyage du nom
    let sanitized = originalName
      .replace(/[^a-zA-Z0-9.-_]/g, '_') // Remplace les caractères spéciaux
      .replace(/_{2,}/g, '_') // Réduit les underscores multiples
      .substring(0, 100); // Limite la longueur

    // Ajout d'un hash pour l'unicité
    const extension = this.getFileExtension(originalName);
    const nameWithoutExt = sanitized.replace(extension, '');
    const shortHash = hash.substring(0, 8);
    
    return `${nameWithoutExt}_${shortHash}${extension}`;
  }

  /**
   * Extraction de l'extension du fichier
   */
  private static getFileExtension(fileName: string): string {
    const match = fileName.match(/(\.[^.]+)$/);
    return match ? match[1] : '';
  }

  /**
   * Formatage de la taille en bytes
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export des types et constantes utiles
export { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZES };

// Instance pour utilisation directe
export const fileValidation = FileValidationService;