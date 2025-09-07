/**
 * Système de chiffrement avancé et gestion des secrets
 * PHASE 6.3 - Chiffrement et sécurité des données
 */

import crypto from 'crypto';
import { secureLog } from './secure-logger';

// Configuration des algorithmes de chiffrement
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm' as const,
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  saltLength: 32,
  iterations: 100000, // PBKDF2 iterations
} as const;

// Clés dérivées en mémoire pour performance
const keyCache = new Map<string, Buffer>();

interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
  salt?: string;
}

interface KeyDerivationOptions {
  salt?: Buffer;
  iterations?: number;
  keyLength?: number;
}

/**
 * Génère une clé de chiffrement sécurisée à partir d'un mot de passe
 */
function deriveKey(
  password: string, 
  options: KeyDerivationOptions = {}
): { key: Buffer; salt: Buffer } {
  const {
    salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength),
    iterations = ENCRYPTION_CONFIG.iterations,
    keyLength = ENCRYPTION_CONFIG.keyLength,
  } = options;

  const cacheKey = `${password}:${salt.toString('base64')}`;
  
  // Vérifier le cache pour éviter les recalculs coûteux
  if (keyCache.has(cacheKey)) {
    return { key: keyCache.get(cacheKey)!, salt };
  }

  const key = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
  
  // Cache limité pour éviter la fuite mémoire
  if (keyCache.size < 10) {
    keyCache.set(cacheKey, key);
  }

  return { key, salt };
}

/**
 * Chiffre des données avec AES-256-GCM
 */
export function encryptData(
  data: string | Buffer, 
  password: string,
  additionalData?: string
): EncryptedData {
  try {
    const plaintext = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    
    // Générer IV aléatoire
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    
    // Dériver la clé
    const { key, salt } = deriveKey(password);
    
    // Créer le cipher
    const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, key);
    cipher.setAAD(Buffer.from(additionalData || '', 'utf8'));
    
    // Chiffrer
    const encrypted = Buffer.concat([
      cipher.update(plaintext),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();

    const result: EncryptedData = {
      data: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt.toString('base64'),
    };

    secureLog.debug('Data encrypted successfully', {
      dataLength: plaintext.length,
      hasAdditionalData: !!additionalData,
    });

    return result;
    
  } catch (error) {
    secureLog.error('Encryption failed', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Déchiffre des données avec AES-256-GCM
 */
export function decryptData(
  encryptedData: EncryptedData, 
  password: string,
  additionalData?: string
): Buffer {
  try {
    const encrypted = Buffer.from(encryptedData.data, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const salt = encryptedData.salt ? Buffer.from(encryptedData.salt, 'base64') : undefined;

    // Dériver la clé avec le salt stocké
    const { key } = deriveKey(password, { salt });
    
    // Créer le decipher
    const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from(additionalData || '', 'utf8'));
    
    // Déchiffrer
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    secureLog.debug('Data decrypted successfully', {
      dataLength: decrypted.length,
      hasAdditionalData: !!additionalData,
    });

    return decrypted;
    
  } catch (error) {
    secureLog.error('Decryption failed', error);
    throw new Error('Decryption failed or data tampered');
  }
}

/**
 * Chiffre une chaîne de caractères (helper)
 */
export function encryptString(text: string, password: string): string {
  const encrypted = encryptData(text, password, 'string');
  return JSON.stringify(encrypted);
}

/**
 * Déchiffre une chaîne de caractères (helper)
 */
export function decryptString(encryptedText: string, password: string): string {
  const encryptedData = JSON.parse(encryptedText) as EncryptedData;
  const decrypted = decryptData(encryptedData, password, 'string');
  return decrypted.toString('utf8');
}

/**
 * Génère un hash sécurisé pour les mots de passe
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const saltBuffer = salt ? Buffer.from(salt, 'base64') : crypto.randomBytes(32);
  const hash = crypto.pbkdf2Sync(password, saltBuffer, 100000, 64, 'sha256');
  
  return {
    hash: hash.toString('base64'),
    salt: saltBuffer.toString('base64'),
  };
}

/**
 * Vérifie un mot de passe contre son hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: newHash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'base64'), Buffer.from(newHash, 'base64'));
}

/**
 * Génère une clé API sécurisée
 */
export function generateApiKey(prefix = 'vg'): string {
  const randomBytes = crypto.randomBytes(32);
  const checksum = crypto.createHash('sha256').update(randomBytes).digest().slice(0, 4);
  const combined = Buffer.concat([randomBytes, checksum]);
  return `${prefix}_${combined.toString('base64url')}`;
}

/**
 * Valide une clé API
 */
export function validateApiKey(apiKey: string, expectedPrefix = 'vg'): boolean {
  try {
    if (!apiKey.startsWith(`${expectedPrefix}_`)) {
      return false;
    }

    const keyPart = apiKey.slice(expectedPrefix.length + 1);
    const combined = Buffer.from(keyPart, 'base64url');
    
    if (combined.length !== 36) { // 32 + 4 bytes
      return false;
    }

    const randomBytes = combined.slice(0, 32);
    const providedChecksum = combined.slice(32);
    const calculatedChecksum = crypto.createHash('sha256').update(randomBytes).digest().slice(0, 4);

    return crypto.timingSafeEqual(providedChecksum, calculatedChecksum);
  } catch {
    return false;
  }
}

/**
 * Génère un token temporaire sécurisé
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Génère un UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Classe pour la gestion sécurisée des secrets
 */
export class SecretManager {
  private masterKey: string;
  private cache: Map<string, { value: string; expires: number }> = new Map();

  constructor(masterKey?: string) {
    this.masterKey = masterKey || process.env.ENCRYPTION_KEY || '';
    if (!this.masterKey) {
      throw new Error('Master key is required for SecretManager');
    }
  }

  /**
   * Stocke un secret de manière chiffrée
   */
  async storeSecret(key: string, value: string, ttl = 3600000): Promise<void> {
    try {
      const encrypted = encryptString(value, this.masterKey);
      const expires = Date.now() + ttl;
      
      this.cache.set(key, { value: encrypted, expires });
      
      secureLog.debug('Secret stored', { key: this.hashKey(key), ttl });
    } catch (error) {
      secureLog.error('Failed to store secret', { key: this.hashKey(key), error });
      throw error;
    }
  }

  /**
   * Récupère un secret déchiffré
   */
  async getSecret(key: string): Promise<string | null> {
    try {
      const cached = this.cache.get(key);
      
      if (!cached) {
        return null;
      }

      if (cached.expires < Date.now()) {
        this.cache.delete(key);
        secureLog.debug('Secret expired', { key: this.hashKey(key) });
        return null;
      }

      const decrypted = decryptString(cached.value, this.masterKey);
      secureLog.debug('Secret retrieved', { key: this.hashKey(key) });
      
      return decrypted;
    } catch (error) {
      secureLog.error('Failed to retrieve secret', { key: this.hashKey(key), error });
      return null;
    }
  }

  /**
   * Supprime un secret
   */
  async deleteSecret(key: string): Promise<void> {
    this.cache.delete(key);
    secureLog.debug('Secret deleted', { key: this.hashKey(key) });
  }

  /**
   * Nettoie les secrets expirés
   */
  cleanExpiredSecrets(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if (value.expires < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      secureLog.debug('Expired secrets cleaned', { count: cleaned });
    }
  }

  /**
   * Hash d'une clé pour logging sécurisé
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 8);
  }
}

/**
 * Instance globale du gestionnaire de secrets
 */
export const secretManager = new SecretManager();

/**
 * Nettoyage automatique des secrets expirés
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    secretManager.cleanExpiredSecrets();
  }, 600000); // Toutes les 10 minutes
}

/**
 * Génère un nonce sécurisé pour CSP
 */
export function generateCSPNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Chiffre les données sensibles des utilisateurs
 */
export function encryptUserData(data: any, userId: string): string {
  const dataString = JSON.stringify(data);
  const additionalData = `user:${userId}`;
  return encryptString(dataString, process.env.ENCRYPTION_KEY || '', additionalData);
}

/**
 * Déchiffre les données sensibles des utilisateurs
 */
export function decryptUserData(encryptedData: string, userId: string): any {
  const additionalData = `user:${userId}`;
  const decryptedString = decryptString(encryptedData, process.env.ENCRYPTION_KEY || '', additionalData);
  return JSON.parse(decryptedString);
}

/**
 * Fonctions utilitaires pour la sécurité
 */
export const SecurityUtils = {
  /**
   * Génère un token de session sécurisé
   */
  generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Génère un code de vérification à 6 chiffres
   */
  generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  },

  /**
   * Hashe de manière sécurisée pour comparaisons
   */
  secureHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  },

  /**
   * Comparaison timing-safe
   */
  timingSafeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  },

  /**
   * Génère un salt sécurisé
   */
  generateSalt(length = 32): string {
    return crypto.randomBytes(length).toString('base64');
  },
};