import * as crypto from 'crypto';
import { secureLog } from '@/lib/secure-logger';

/**
 * Service de chiffrement renforcé avec AES-256-GCM
 * Offre chiffrement + authentification intégrée + protection contre les attaques
 */
export class EnhancedEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12;  // 96 bits pour GCM
  private readonly tagLength = 16; // 128 bits auth tag
  private readonly encryptionKey: Buffer;

  constructor() {
    const keyString = process.env.ENCRYPTION_KEY || this.generateSecureKey();
    
    // Validation de la clé
    if (keyString.length !== this.keyLength) {
      throw new Error(`ENCRYPTION_KEY must be exactly ${this.keyLength} characters long for AES-256-GCM`);
    }

    // Validation que la clé n'est pas la clé par défaut en production
    if (process.env.NODE_ENV === 'production' && keyString === 'dev_key_32_chars_long_for_aes256') {
      throw new Error('Default encryption key cannot be used in production!');
    }

    this.encryptionKey = Buffer.from(keyString, 'utf8');
    
    // Test de fonctionnalité crypto
    this.validateCrypto();
  }

  /**
   * Génère une clé sécurisée pour le développement
   */
  private generateSecureKey(): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production');
    }
    
    secureLog.warn('⚠️  Generating temporary encryption key for development. Set ENCRYPTION_KEY in production!');
    return crypto.randomBytes(this.keyLength).toString('hex').substring(0, this.keyLength);
  }

  /**
   * Valide que le système crypto fonctionne correctement
   */
  private validateCrypto(): void {
    try {
      const testData = 'encryption_test_' + Date.now();
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted.encrypted, encrypted.iv, encrypted.tag);
      
      if (decrypted !== testData) {
        throw new Error('Encryption validation failed');
      }
    } catch (error) {
      throw new Error(`Crypto system validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Chiffre une chaîne avec AES-256-GCM
   * @param plaintext - Texte à chiffrer
   * @param associatedData - Données associées pour l'authentification (optionnel)
   * @returns Objet contenant le texte chiffré, IV et tag d'authentification
   */
  encrypt(plaintext: string, associatedData?: string): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    try {
      // Validation d'entrée
      if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Plaintext must be a non-empty string');
      }

      if (plaintext.length > 1048576) { // 1MB limit
        throw new Error('Plaintext too large (max 1MB)');
      }

      // Génération d'un IV aléatoire sécurisé
      const iv = crypto.randomBytes(this.ivLength);
      
      // Création du cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Ajout des données associées si fournies
      if (associatedData) {
        cipher.setAAD(Buffer.from(associatedData, 'utf8'));
      }
      
      // Chiffrement
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Récupération du tag d'authentification
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Déchiffre une chaîne avec AES-256-GCM
   * @param encrypted - Texte chiffré
   * @param iv - Vecteur d'initialisation
   * @param tag - Tag d'authentification
   * @param associatedData - Données associées (si utilisées lors du chiffrement)
   * @returns Texte déchiffré
   */
  decrypt(encrypted: string, iv: string, tag: string, associatedData?: string): string {
    try {
      // Validation d'entrée
      if (!encrypted || !iv || !tag) {
        throw new Error('Missing required decryption parameters');
      }

      // Conversion des paramètres
      const ivBuffer = Buffer.from(iv, 'base64');
      const tagBuffer = Buffer.from(tag, 'base64');
      
      // Validation des tailles
      if (ivBuffer.length !== this.ivLength) {
        throw new Error('Invalid IV length');
      }
      
      if (tagBuffer.length !== this.tagLength) {
        throw new Error('Invalid authentication tag length');
      }
      
      // Création du decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, ivBuffer);
      decipher.setAuthTag(tagBuffer);
      
      // Ajout des données associées si fournies
      if (associatedData) {
        decipher.setAAD(Buffer.from(associatedData, 'utf8'));
      }
      
      // Déchiffrement
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      // Les erreurs de déchiffrement peuvent indiquer une tentative d'altération
      if (error instanceof Error && error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error('Authentication failed - data may have been tampered with');
      }
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vérifie si des données peuvent être déchiffrées (avec gestion sécurisée des erreurs)
   */
  canDecrypt(encrypted: string, iv: string, tag: string, associatedData?: string): boolean {
    try {
      this.decrypt(encrypted, iv, tag, associatedData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Chiffrement de rotation - rechiffre avec une nouvelle clé
   * Utile pour la rotation des clés de chiffrement
   */
  reencrypt(
    encrypted: string, 
    iv: string, 
    tag: string, 
    oldKey: string,
    associatedData?: string
  ): { encrypted: string; iv: string; tag: string } {
    // Déchiffrer avec l'ancienne clé
    const originalKey = this.encryptionKey;
    (this as any).encryptionKey = Buffer.from(oldKey, 'utf8');
    
    try {
      const plaintext = this.decrypt(encrypted, iv, tag, associatedData);
      
      // Rechiffrer avec la nouvelle clé
      (this as any).encryptionKey = originalKey;
      return this.encrypt(plaintext, associatedData);
    } catch (error) {
      (this as any).encryptionKey = originalKey;
      throw error;
    }
  }

  /**
   * Génère un hash sécurisé pour le logging (sans révéler les données sensibles)
   */
  secureHash(input: string): string {
    if (!input || input.length <= 8) {
      return 'sk-***...***';
    }
    
    // Utilise HMAC-SHA256 pour un hash sécurisé
    const hmac = crypto.createHmac('sha256', this.encryptionKey);
    hmac.update(input);
    const hash = hmac.digest('hex');
    
    // Retourne un format masqué avec une partie du hash
    const start = input.substring(0, 3);
    const end = input.substring(input.length - 3);
    const hashPart = hash.substring(0, 6);
    
    return `${start}***${hashPart}***${end}`;
  }

  /**
   * Nettoie les clés sensibles de la mémoire (sécurité défensive)
   */
  clearSensitiveData(): void {
    // En JavaScript, on ne peut pas vraiment nettoyer la mémoire,
    // mais on peut au moins remplir le buffer avec des zéros
    if (this.encryptionKey) {
      this.encryptionKey.fill(0);
    }
  }

  /**
   * Retourne des informations sur la configuration crypto (pour debug)
   */
  getInfo(): {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    tagLength: number;
    isProduction: boolean;
  } {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
      isProduction: process.env.NODE_ENV === 'production'
    };
  }
}

// Instance singleton avec gestion des erreurs d'initialisation
let enhancedEncryptionService: EnhancedEncryptionService | null = null;

try {
  enhancedEncryptionService = new EnhancedEncryptionService();
} catch (error) {
  secureLog.error('Failed to initialize enhanced encryption service:', error);
  // Fallback vers l'ancien service si nécessaire
}

export { enhancedEncryptionService };

// Types pour TypeScript
export interface EnhancedEncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

export interface CryptoInfo {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  isProduction: boolean;
}

// Wrapper pour compatibilité avec l'ancien service
export class EncryptionServiceAdapter {
  private service: EnhancedEncryptionService;

  constructor() {
    if (!enhancedEncryptionService) {
      throw new Error('Enhanced encryption service not available');
    }
    this.service = enhancedEncryptionService;
  }

  /**
   * Encrypt with backward compatibility (returns old format)
   */
  encrypt(plaintext: string): { encrypted: string; iv: string } {
    const result = this.service.encrypt(plaintext);
    // Combine encrypted + tag for backward compatibility
    const combined = result.encrypted + ':' + result.tag;
    return {
      encrypted: combined,
      iv: result.iv
    };
  }

  /**
   * Decrypt with backward compatibility (expects old format)
   */
  decrypt(encrypted: string, iv: string): string {
    // Split encrypted data and tag
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    return this.service.decrypt(parts[0], iv, parts[1]);
  }

  canDecrypt(encrypted: string, iv: string): boolean {
    const parts = encrypted.split(':');
    if (parts.length !== 2) return false;
    
    return this.service.canDecrypt(parts[0], iv, parts[1]);
  }

  secureHash(input: string): string {
    return this.service.secureHash(input);
  }
}