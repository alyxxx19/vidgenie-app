/**
 * Système de cache intelligent pour les API routes
 * PHASE 4.4 - Optimisation des API routes avec cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { secureLog } from '@/lib/secure-logger';

// Configuration du cache par route
interface CacheConfig {
  ttl: number; // Time to live en secondes
  tags?: string[]; // Tags pour invalidation
  varyBy?: string[]; // Paramètres qui affectent le cache
  skipCache?: (req: NextRequest) => boolean; // Condition pour skip
}

// Store en mémoire simple (en production utiliser Redis)
const cacheStore = new Map<string, {
  data: any;
  expires: number;
  tags: string[];
}>();

// Tags pour invalidation groupée
const tagStore = new Map<string, Set<string>>();

/**
 * Configuration de cache par route
 */
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Assets et contenu (cache long)
  '/api/assets': {
    ttl: 300, // 5 minutes
    tags: ['assets', 'user-content'],
    varyBy: ['userId', 'status', 'page'],
  },
  '/api/content': {
    ttl: 300, // 5 minutes  
    tags: ['content', 'user-content'],
    varyBy: ['userId', 'status', 'type'],
  },
  
  // Dashboard et analytics (cache moyen)
  '/api/analytics': {
    ttl: 180, // 3 minutes
    tags: ['analytics', 'user-data'],
    varyBy: ['userId', 'days'],
  },
  '/api/dashboard': {
    ttl: 60, // 1 minute
    tags: ['dashboard', 'user-data'],
    varyBy: ['userId'],
  },
  
  // Jobs et generation (cache court)
  '/api/jobs': {
    ttl: 30, // 30 secondes
    tags: ['jobs'],
    varyBy: ['userId', 'status'],
    skipCache: (req) => {
      const url = new URL(req.url);
      return url.searchParams.has('live'); // Skip si ?live=true
    }
  },
  '/api/generation': {
    ttl: 10, // 10 secondes seulement
    tags: ['generation', 'jobs'],
    varyBy: ['userId'],
  },
  
  // Crédits et billing (cache très court)
  '/api/credits': {
    ttl: 60, // 1 minute
    tags: ['credits', 'billing'],
    varyBy: ['userId'],
  },
  '/api/stripe': {
    ttl: 300, // 5 minutes pour les infos Stripe
    tags: ['stripe', 'billing'],
    varyBy: ['userId'],
  },
  
  // User data (cache moyen)
  '/api/user': {
    ttl: 300, // 5 minutes
    tags: ['user', 'profile'],
    varyBy: ['userId'],
  },
};

/**
 * Génère une clé de cache unique
 */
function generateCacheKey(
  route: string, 
  req: NextRequest, 
  config: CacheConfig
): string {
  const url = new URL(req.url);
  const userId = req.headers.get('x-user-id') || 'anonymous';
  
  let keyParts = [route, userId];
  
  // Ajoute les paramètres qui varient
  if (config.varyBy) {
    for (const param of config.varyBy) {
      if (param === 'userId') continue; // Déjà ajouté
      const value = url.searchParams.get(param) || req.headers.get(`x-${param}`);
      if (value) keyParts.push(`${param}:${value}`);
    }
  }
  
  return keyParts.join('|');
}

/**
 * Vérifie si une réponse peut être cachée
 */
function canCache(response: NextResponse, config: CacheConfig): boolean {
  // Skip si erreur
  if (!response.ok) return false;
  
  // Skip si réponse vide
  if (response.headers.get('content-length') === '0') return false;
  
  // Skip si cache-control no-cache
  if (response.headers.get('cache-control')?.includes('no-cache')) return false;
  
  return true;
}

/**
 * Middleware de cache pour API routes
 */
export function withCache<T = any>(
  routePath: string,
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const config = CACHE_CONFIGS[routePath];
    
    // Pas de config = pas de cache
    if (!config) {
      return handler(req, ...args);
    }
    
    // Skip cache si condition remplie
    if (config.skipCache && config.skipCache(req)) {
      secureLog.debug('Cache skipped for route:', routePath);
      return handler(req, ...args);
    }
    
    const cacheKey = generateCacheKey(routePath, req, config);
    const now = Date.now();
    
    // Vérifier le cache existant
    const cached = cacheStore.get(cacheKey);
    if (cached && cached.expires > now) {
      secureLog.debug('Cache hit:', { route: routePath, key: cacheKey });
      
      return new NextResponse(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-TTL': Math.floor((cached.expires - now) / 1000).toString()
        }
      });
    }
    
    // Cache miss - exécuter la vraie requête
    const startTime = Date.now();
    const response = await handler(req, ...args);
    const executionTime = Date.now() - startTime;
    
    // Cacher si applicable
    if (canCache(response, config)) {
      try {
        const responseData = await response.json();
        const expiresAt = now + (config.ttl * 1000);
        
        // Stocker en cache
        cacheStore.set(cacheKey, {
          data: responseData,
          expires: expiresAt,
          tags: config.tags || []
        });
        
        // Indexer par tags
        if (config.tags) {
          for (const tag of config.tags) {
            if (!tagStore.has(tag)) tagStore.set(tag, new Set());
            tagStore.get(tag)!.add(cacheKey);
          }
        }
        
        secureLog.debug('Cache stored:', { 
          route: routePath, 
          key: cacheKey, 
          ttl: config.ttl,
          executionTime 
        });
        
        // Retourner réponse avec headers de cache
        return new NextResponse(JSON.stringify(responseData), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'MISS',
            'X-Cache-TTL': config.ttl.toString(),
            'X-Execution-Time': executionTime.toString()
          }
        });
        
      } catch (error) {
        secureLog.error('Cache storage failed:', error);
        return response;
      }
    }
    
    return response;
  };
}

/**
 * Invalide le cache par tag
 */
export function invalidateByTag(tag: string): number {
  const keys = tagStore.get(tag);
  if (!keys) return 0;
  
  let invalidated = 0;
  for (const key of keys) {
    if (cacheStore.delete(key)) {
      invalidated++;
    }
  }
  
  tagStore.delete(tag);
  
  secureLog.info('Cache invalidated by tag:', { tag, count: invalidated });
  return invalidated;
}

/**
 * Invalide le cache par pattern de clé
 */
export function invalidateByPattern(pattern: string): number {
  const regex = new RegExp(pattern);
  let invalidated = 0;
  
  for (const [key] of cacheStore) {
    if (regex.test(key)) {
      cacheStore.delete(key);
      invalidated++;
    }
  }
  
  secureLog.info('Cache invalidated by pattern:', { pattern, count: invalidated });
  return invalidated;
}

/**
 * Nettoie le cache expiré
 */
export function cleanupExpiredCache(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of cacheStore) {
    if (entry.expires <= now) {
      cacheStore.delete(key);
      cleaned++;
    }
  }
  
  // Nettoie aussi les tags orphelins
  for (const [tag, keys] of tagStore) {
    for (const key of keys) {
      if (!cacheStore.has(key)) {
        keys.delete(key);
      }
    }
    if (keys.size === 0) {
      tagStore.delete(tag);
    }
  }
  
  if (cleaned > 0) {
    secureLog.info('Cache cleanup completed:', { cleaned });
  }
  
  return cleaned;
}

/**
 * Stats du cache
 */
export function getCacheStats() {
  const now = Date.now();
  let active = 0;
  let expired = 0;
  
  for (const [, entry] of cacheStore) {
    if (entry.expires > now) {
      active++;
    } else {
      expired++;
    }
  }
  
  return {
    total: cacheStore.size,
    active,
    expired,
    tags: tagStore.size,
    memoryUsage: JSON.stringify([...cacheStore.values()]).length
  };
}

// Cleanup automatique toutes les 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}