/**
 * Système de cache pour tRPC procedures
 * PHASE 4.4 - Optimisation des API routes avec cache
 */

import { experimental_standaloneMiddleware } from '@trpc/server';
import { secureLog } from '@/lib/secure-logger';

// Cache store simple (en production utiliser Redis)
const procedureCache = new Map<string, {
  data: any;
  expires: number;
  tags: string[];
}>();

const tagStore = new Map<string, Set<string>>();

interface CacheOptions {
  ttl: number; // Time to live en secondes
  tags?: string[]; // Tags pour invalidation
  keyFn?: (input: any, ctx: any) => string; // Fonction custom pour la clé
  skipCache?: (input: any, ctx: any) => boolean; // Condition pour skip
}

/**
 * Génère une clé de cache pour une procedure
 */
function generateProcedureKey(
  procedure: string,
  input: any,
  ctx: any,
  keyFn?: (input: any, ctx: any) => string
): string {
  if (keyFn) {
    return `${procedure}:${keyFn(input, ctx)}`;
  }
  
  // Clé par défaut avec userId et input sérialisé
  const userId = ctx.user?.id || ctx.userId || 'anonymous';
  const inputHash = JSON.stringify(input || {});
  
  return `${procedure}:${userId}:${Buffer.from(inputHash).toString('base64')}`;
}

/**
 * Middleware de cache pour procedures tRPC
 */
export function withProcedureCache(options: CacheOptions) {
  return experimental_standaloneMiddleware<{
    ctx?: {
      user?: { id: string };
      userId?: string;
    };
  }>().create(async ({ next, path, input, ctx }) => {
    
    // Skip cache si condition remplie
    if (options.skipCache && options.skipCache(input, ctx)) {
      secureLog.debug('Procedure cache skipped:', path);
      return next();
    }
    
    const cacheKey = generateProcedureKey(path, input, ctx, options.keyFn);
    const now = Date.now();
    
    // Vérifier le cache existant
    const cached = procedureCache.get(cacheKey);
    if (cached && cached.expires > now) {
      secureLog.debug('Procedure cache hit:', { 
        procedure: path, 
        key: cacheKey.substring(0, 50) + '...',
        ttl: Math.floor((cached.expires - now) / 1000)
      });
      
      return cached.data;
    }
    
    // Cache miss - exécuter la vraie procedure
    const startTime = Date.now();
    const result = await next();
    const executionTime = Date.now() - startTime;
    
    // Cacher le résultat si pas d'erreur
    if (result && typeof result === 'object' && !('error' in result)) {
      const expiresAt = now + (options.ttl * 1000);
      
      // Stocker en cache
      procedureCache.set(cacheKey, {
        data: result,
        expires: expiresAt,
        tags: options.tags || []
      });
      
      // Indexer par tags
      if (options.tags) {
        for (const tag of options.tags) {
          if (!tagStore.has(tag)) tagStore.set(tag, new Set());
          tagStore.get(tag)!.add(cacheKey);
        }
      }
      
      secureLog.debug('Procedure cache stored:', { 
        procedure: path,
        key: cacheKey.substring(0, 50) + '...',
        ttl: options.ttl,
        executionTime 
      });
    }
    
    return result;
  });
}

/**
 * Configurations de cache par procedure
 */
export const PROCEDURE_CACHE_CONFIGS = {
  // Assets - cache moyen
  'assets.getAll': {
    ttl: 300, // 5 minutes
    tags: ['assets', 'user-content'],
    keyFn: (input: any, ctx: any) => `${ctx.user?.id || ctx.userId}:${JSON.stringify(input || {})}`,
  },
  
  'assets.list': {
    ttl: 180, // 3 minutes
    tags: ['assets', 'user-content'],
    keyFn: (input: any, ctx: any) => `${ctx.user?.id || ctx.userId}:${input?.cursor || 'first'}:${input?.status || 'all'}`,
  },
  
  'assets.get': {
    ttl: 600, // 10 minutes - les détails changent moins
    tags: ['assets'],
    keyFn: (input: any, ctx: any) => `${input.id}:${ctx.user?.id || ctx.userId}`,
  },
  
  'assets.getStats': {
    ttl: 300, // 5 minutes
    tags: ['assets', 'analytics'],
    keyFn: (input: any, ctx: any) => `${ctx.user?.id || ctx.userId}:stats:${input?.days || 30}`,
  },
  
  // User data - cache long
  'user.getProfile': {
    ttl: 600, // 10 minutes
    tags: ['user', 'profile'],
  },
  
  'user.getSettings': {
    ttl: 900, // 15 minutes
    tags: ['user', 'settings'],
  },
  
  // Credits - cache court
  'credits.getBalance': {
    ttl: 60, // 1 minute
    tags: ['credits', 'billing'],
    skipCache: (input: any, ctx: any) => {
      // Skip cache si demandé explicitement
      return input?.fresh === true;
    }
  },
  
  'credits.getHistory': {
    ttl: 180, // 3 minutes
    tags: ['credits', 'transactions'],
  },
  
  // Analytics - cache moyen
  'analytics.getDashboard': {
    ttl: 120, // 2 minutes
    tags: ['analytics', 'dashboard'],
    keyFn: (input: any, ctx: any) => `${ctx.user?.id || ctx.userId}:dashboard:${input?.period || 30}`,
  },
  
  // Jobs - cache très court
  'jobs.getActive': {
    ttl: 30, // 30 secondes
    tags: ['jobs'],
    skipCache: (input: any, ctx: any) => {
      // Skip si mode temps réel
      return input?.realtime === true;
    }
  },
};

/**
 * Helper pour créer un middleware de cache avec config
 */
export function createCachedProcedure(procedure: string) {
  const config = PROCEDURE_CACHE_CONFIGS[procedure as keyof typeof PROCEDURE_CACHE_CONFIGS];
  
  if (!config) {
    secureLog.warn('No cache config for procedure:', procedure);
    return experimental_standaloneMiddleware().create(async ({ next }) => next());
  }
  
  return withProcedureCache(config);
}

/**
 * Invalide le cache par tag
 */
export function invalidateProcedureByTag(tag: string): number {
  const keys = tagStore.get(tag);
  if (!keys) return 0;
  
  let invalidated = 0;
  for (const key of keys) {
    if (procedureCache.delete(key)) {
      invalidated++;
    }
  }
  
  tagStore.delete(tag);
  
  secureLog.info('Procedure cache invalidated by tag:', { tag, count: invalidated });
  return invalidated;
}

/**
 * Invalide le cache par utilisateur
 */
export function invalidateProcedureByUser(userId: string): number {
  let invalidated = 0;
  
  for (const [key] of procedureCache) {
    if (key.includes(`:${userId}:`)) {
      procedureCache.delete(key);
      invalidated++;
    }
  }
  
  // Nettoie les tags
  for (const [tag, keys] of tagStore) {
    for (const key of keys) {
      if (!procedureCache.has(key)) {
        keys.delete(key);
      }
    }
    if (keys.size === 0) {
      tagStore.delete(tag);
    }
  }
  
  secureLog.info('Procedure cache invalidated by user:', { userId, count: invalidated });
  return invalidated;
}

/**
 * Nettoie le cache expiré
 */
export function cleanupExpiredProcedureCache(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of procedureCache) {
    if (entry.expires <= now) {
      procedureCache.delete(key);
      cleaned++;
    }
  }
  
  // Nettoie aussi les tags orphelins
  for (const [tag, keys] of tagStore) {
    for (const key of keys) {
      if (!procedureCache.has(key)) {
        keys.delete(key);
      }
    }
    if (keys.size === 0) {
      tagStore.delete(tag);
    }
  }
  
  if (cleaned > 0) {
    secureLog.info('Procedure cache cleanup completed:', { cleaned });
  }
  
  return cleaned;
}

/**
 * Stats du cache procedures
 */
export function getProcedureCacheStats() {
  const now = Date.now();
  let active = 0;
  let expired = 0;
  
  for (const [, entry] of procedureCache) {
    if (entry.expires > now) {
      active++;
    } else {
      expired++;
    }
  }
  
  return {
    total: procedureCache.size,
    active,
    expired,
    tags: tagStore.size,
    memoryUsage: JSON.stringify([...procedureCache.values()]).length
  };
}

// Cleanup automatique toutes les 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredProcedureCache, 10 * 60 * 1000);
}