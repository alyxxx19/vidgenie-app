import * as crypto from 'crypto';

/**
 * Service de chiffrement AES-256 pour les clés API utilisateur
 * Utilise un chiffrement symétrique avec vecteurs d'initialisation uniques
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly encryptionKey: string;

  constructor() {
    // Récupération de la clé de chiffrement depuis les variables d'environnement
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateDefaultKey();
    
    if (this.encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 characters long for AES-256');
    }
  }

  /**
   * Génère une clé par défaut pour le développement (ne pas utiliser en production)
   */
  private generateDefaultKey(): string {
    console.warn('⚠️  Using default encryption key. Set ENCRYPTION_KEY in production!');
    return 'dev_key_32_chars_long_for_aes256';
  }

  /**
   * Chiffre une chaîne de caractères
   * @param plaintext - Texte à chiffrer
   * @returns Objet contenant le texte chiffré et le vecteur d'initialisation
   */
  encrypt(plaintext: string): { encrypted: string; iv: string } {
    try {
      // Génération d'un vecteur d'initialisation aléatoire
      const iv = crypto.randomBytes(16);
      
      // Création du cipher avec la clé et IV
      const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
      
      // Chiffrement
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted,
        iv: iv.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Déchiffre une chaîne de caractères
   * @param encrypted - Texte chiffré
   * @param iv - Vecteur d'initialisation utilisé pour le chiffrement
   * @returns Texte déchiffré
   */
  decrypt(encrypted: string, iv: string): string {
    try {
      // Conversion du vecteur d'initialisation
      const ivBuffer = Buffer.from(iv, 'hex');
      
      // Création du decipher avec la clé et IV
      const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.encryptionKey), ivBuffer);
      
      // Déchiffrement
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vérifie si une paire encrypted/iv peut être déchiffrée
   * Utilisé pour valider l'intégrité des données
   */
  canDecrypt(encrypted: string, iv: string): boolean {
    try {
      this.decrypt(encrypted, iv);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Hash sécurisé d'une chaîne (pour logging sans exposer les clés)
   * @param input - Chaîne à hasher
   * @returns Hash SHA-256 des premiers et derniers caractères
   */
  secureHash(input: string): string {
    if (input.length <= 8) {
      return 'sk-***...***';
    }
    
    const start = input.substring(0, 3);
    const end = input.substring(input.length - 3);
    const middle = '*'.repeat(Math.min(input.length - 6, 20));
    
    return `${start}${middle}${end}`;
  }
}

// Instance singleton pour l'application
export const encryptionService = new EncryptionService();

// Types pour TypeScript
export interface EncryptedData {
  encrypted: string;
  iv: string;
}

export interface ApiKeyData {
  provider: 'openai' | 'flux' | 'veo3';
  encryptedKey: string;
  iv: string;
  isActive: boolean;
  lastValidated?: Date;
  validationStatus: 'valid' | 'invalid' | 'unchecked';
  lastError?: string;
}