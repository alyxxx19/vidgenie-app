// src/lib/secure-logger.ts
/**
 * Service de logging sécurisé qui masque automatiquement les données sensibles
 * Utilisé pour remplacer tous les console.log/error/warn dans l'application
 */

interface LogLevel {
  ERROR: 0;
  WARN: 1;
  INFO: 2;
  DEBUG: 3;
}

const LOG_LEVEL: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class SecureLogger {
  private static instance: SecureLogger;
  private sensitiveFields = [
    'password', 'token', 'apiKey', 'secret', 'key', 'authorization',
    'bearer', 'jwt', 'cookie', 'session', 'credential', 'auth',
    'privateKey', 'publicKey', 'signature', 'hash', 'salt'
  ];
  private currentLevel: number;
  
  constructor() {
    this.currentLevel = process.env.NODE_ENV === 'production' ? LOG_LEVEL.WARN : LOG_LEVEL.DEBUG;
  }
  
  static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }
  
  /**
   * Sanitise les données en masquant automatiquement les champs sensibles
   */
  private sanitize(data: any, depth: number = 0, visited: WeakSet<object> = new WeakSet()): any {
    // Prevent infinite recursion
    if (depth > 10) {
      return '[MAX_DEPTH_REACHED]';
    }
    
    if (typeof data === 'string') {
      // Masquer les patterns de clés API courantes
      return data
        .replace(/sk-[a-zA-Z0-9]{48,}/g, 'sk-***...***')
        .replace(/Bearer\s+[a-zA-Z0-9._-]+/g, 'Bearer ***...***')
        .replace(/eyJ[a-zA-Z0-9._-]+/g, 'jwt-***...***') // JWT tokens
        .replace(/[A-Za-z0-9+/]{40,}={0,2}/g, 'encoded-***...***') // Base64 patterns
        .replace(/\b[A-Za-z0-9]{32,}\b/g, 'hash-***...***') // Long hex strings
        .replace(/postgres:\/\/[^@]+@/g, 'postgres://***:***@') // DB URLs
        .replace(/https?:\/\/[^@]+@/g, 'https://***:***@') // Auth URLs
        .replace(/password[=:]\s*[^\s,}]+/gi, 'password=***'); // Password fields
    }
    
    if (typeof data === 'object' && data !== null) {
      // Check if it's a Promise or Next.js dynamic API object
      if (data instanceof Promise || 
          (data.constructor && data.constructor.name === 'DynamicServerError') ||
          (typeof data.then === 'function')) {
        return '[PROMISE_OR_ASYNC_VALUE]';
      }
      
      // Check for Next.js params/searchParams that need React.use()
      // These objects throw errors when trying to enumerate them directly
      try {
        // Try to access keys to see if it throws
        const testKeys = Object.keys(data);
        // If we get here, it's a normal object
      } catch (error: any) {
        if (error?.message?.includes('params') || 
            error?.message?.includes('searchParams') ||
            error?.message?.includes('React.use()')) {
          return '[NEXT_DYNAMIC_API_OBJECT]';
        }
        return '[UNENUMERABLE_OBJECT]';
      }
      
      // Check for circular references
      if (visited.has(data)) {
        return '[CIRCULAR_REFERENCE]';
      }
      visited.add(data);
      
      const sanitized: any = Array.isArray(data) ? [] : {};
      
      try {
        for (const [key, value] of Object.entries(data)) {
          const keyLower = key.toLowerCase();
          
          // Vérifier si la clé contient un mot sensible
          if (this.sensitiveFields.some(field => keyLower.includes(field))) {
            sanitized[key] = this.maskValue(String(value));
          } else {
            sanitized[key] = this.sanitize(value, depth + 1, visited);
          }
        }
      } catch (error: any) {
        // Additional check for Next.js dynamic API errors
        if (error?.message?.includes('params') || 
            error?.message?.includes('searchParams') ||
            error?.message?.includes('React.use()')) {
          return '[NEXT_DYNAMIC_API_OBJECT]';
        }
        return '[SANITIZATION_ERROR]';
      }
      
      return sanitized;
    }
    
    return data;
  }
  
  /**
   * Masque une valeur en gardant seulement le début et la fin
   */
  private maskValue(value: string): string {
    if (!value || value.length <= 8) return '***';
    return `${value.substring(0, 3)}***${value.substring(value.length - 3)}`;
  }
  
  /**
   * Ajoute du contexte utile aux logs (timestamp, etc.)
   */
  private addContext(message: string, level: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }
  
  /**
   * Log niveau ERROR - Toujours visible
   */
  error(message: string, data?: any): void {
    if (this.currentLevel >= LOG_LEVEL.ERROR) {
      const contextMessage = this.addContext(message, 'ERROR');
      console.error(contextMessage, data ? this.sanitize(data) : '');
    }
  }
  
  /**
   * Log niveau WARN - Visible en dev et prod
   */
  warn(message: string, data?: any): void {
    if (this.currentLevel >= LOG_LEVEL.WARN) {
      const contextMessage = this.addContext(message, 'WARN');
      console.warn(contextMessage, data ? this.sanitize(data) : '');
    }
  }
  
  /**
   * Log niveau INFO - Visible en dev uniquement
   */
  info(message: string, data?: any): void {
    if (this.currentLevel >= LOG_LEVEL.INFO) {
      const contextMessage = this.addContext(message, 'INFO');
      console.info(contextMessage, data ? this.sanitize(data) : '');
    }
  }
  
  /**
   * Log niveau DEBUG - Visible en dev uniquement
   */
  debug(message: string, data?: any): void {
    if (this.currentLevel >= LOG_LEVEL.DEBUG) {
      const contextMessage = this.addContext(message, 'DEBUG');
      console.debug(contextMessage, data ? this.sanitize(data) : '');
    }
  }
  
  /**
   * Log pour les événements de sécurité (toujours visibles)
   */
  security(message: string, data?: any): void {
    const contextMessage = this.addContext(`SECURITY: ${message}`, 'SECURITY');
    console.warn(contextMessage, data ? this.sanitize(data) : '');
  }
  
  /**
   * Log pour les métriques de performance
   */
  performance(message: string, duration?: number, data?: any): void {
    if (this.currentLevel >= LOG_LEVEL.INFO) {
      const durationStr = duration ? ` (${duration}ms)` : '';
      const contextMessage = this.addContext(`PERF: ${message}${durationStr}`, 'PERF');
      console.info(contextMessage, data ? this.sanitize(data) : '');
    }
  }
}

// Instance singleton
export const logger = SecureLogger.getInstance();

// Export d'une API simplifiée pour remplacer console.*
export const secureLog = {
  error: (msg: string, data?: any) => logger.error(msg, data),
  warn: (msg: string, data?: any) => logger.warn(msg, data),
  info: (msg: string, data?: any) => logger.info(msg, data),
  debug: (msg: string, data?: any) => logger.debug(msg, data),
  security: (msg: string, data?: any) => logger.security(msg, data),
  performance: (msg: string, duration?: number, data?: any) => logger.performance(msg, duration, data)
};

// Helper pour mesurer les performances
export function withPerformanceLogging<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return fn()
    .then(result => {
      const duration = Date.now() - start;
      logger.performance(`${name} completed`, duration);
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      logger.error(`${name} failed after ${duration}ms`, error);
      throw error;
    });
}

// Types pour TypeScript
export type LogLevel = keyof typeof LOG_LEVEL;
export type LogData = Record<string, any>;