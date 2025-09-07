// src/lib/rate-limit-config.ts
/**
 * Configuration centralisée pour le rate limiting
 * Utilise Upstash Redis pour la persistence distribuée
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Configuration Redis Upstash
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Configurations de rate limiting par endpoint
export const rateLimitConfigs = {
  // APIs sensibles - très restrictif
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15m'), // 5 tentatives par 15 minutes
    analytics: true,
    prefix: 'vidgenie_auth',
  }),

  // API de génération de contenu - modéré
  generation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1h'), // 10 générations par heure
    analytics: true,
    prefix: 'vidgenie_gen',
  }),

  // APIs générales - permissif
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1m'), // 100 requêtes par minute
    analytics: true,
    prefix: 'vidgenie_api',
  }),

  // Upload de fichiers - très restrictif
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '5m'), // 3 uploads par 5 minutes
    analytics: true,
    prefix: 'vidgenie_upload',
  }),

  // Webhook Stripe - spécial
  webhook: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1m'), // 50 webhooks par minute
    analytics: true,
    prefix: 'vidgenie_webhook',
  }),

  // Recherche/consultation - permissif mais limité
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1m'), // 60 recherches par minute
    analytics: true,
    prefix: 'vidgenie_search',
  }),

  // Profil utilisateur - modéré
  profile: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '5m'), // 30 mises à jour profil par 5min
    analytics: true,
    prefix: 'vidgenie_profile',
  })
}

// Types pour TypeScript
export type RateLimitType = keyof typeof rateLimitConfigs;

/**
 * Mapping des patterns d'URL vers les configurations
 * Utilisé par le middleware pour déterminer quel rate limit appliquer
 */
export const rateLimitRoutes: Record<string, RateLimitType> = {
  // Auth endpoints
  '/api/auth/signin': 'auth',
  '/api/auth/signup': 'auth',
  '/api/auth/dev-login': 'auth',
  '/api/auth/create-user': 'auth',
  '/api/auth/reset-password': 'auth',
  '/api/auth/verify-email': 'auth',

  // Generation endpoints
  '/api/generate': 'generation',
  '/api/generate/video': 'generation',
  '/api/generate/script': 'generation',
  '/api/generate/thumbnail': 'generation',
  '/api/ai/generate': 'generation',

  // Upload endpoints
  '/api/upload': 'upload',
  '/api/upload/avatar': 'upload',
  '/api/upload/media': 'upload',

  // Stripe webhooks
  '/api/webhooks/stripe': 'webhook',

  // Profile endpoints
  '/api/user/profile': 'profile',
  '/api/user/update': 'profile',
  '/api/user/settings': 'profile',

  // Search endpoints
  '/api/search': 'search',
  '/api/templates/search': 'search',
  '/api/projects/search': 'search',

  // Default pour toutes les autres API routes
  '/api/*': 'general'
}

/**
 * Utilitaire pour obtenir le bon rate limiter selon l'URL
 */
export function getRateLimiterForRoute(pathname: string): Ratelimit {
  // Recherche exacte d'abord
  if (rateLimitRoutes[pathname]) {
    return rateLimitConfigs[rateLimitRoutes[pathname]];
  }

  // Recherche par pattern
  for (const [pattern, type] of Object.entries(rateLimitRoutes)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(pathname)) {
        return rateLimitConfigs[type];
      }
    }
  }

  // Fallback sur rate limit général
  return rateLimitConfigs.general;
}

/**
 * Fonction helper pour identifier l'utilisateur (IP + User ID si disponible)
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
           request.headers.get('x-real-ip') || 
           'unknown';
  
  // Si on a un userId, on combine IP + userID pour plus de précision
  return userId ? `${ip}_${userId}` : ip;
}

/**
 * Configuration des erreurs de rate limiting
 */
export const rateLimitErrorResponses = {
  auth: {
    status: 429,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    retryAfter: 900, // 15 minutes
  },
  generation: {
    status: 429,
    message: 'Limite de génération atteinte. Réessayez dans 1 heure.',
    retryAfter: 3600, // 1 heure
  },
  upload: {
    status: 429,
    message: 'Trop de téléchargements. Réessayez dans 5 minutes.',
    retryAfter: 300, // 5 minutes
  },
  general: {
    status: 429,
    message: 'Trop de requêtes. Réessayez dans 1 minute.',
    retryAfter: 60, // 1 minute
  },
  webhook: {
    status: 429,
    message: 'Webhook rate limit exceeded',
    retryAfter: 60, // 1 minute
  },
  search: {
    status: 429,
    message: 'Trop de recherches. Réessayez dans 1 minute.',
    retryAfter: 60, // 1 minute
  },
  profile: {
    status: 429,
    message: 'Trop de modifications. Réessayez dans 5 minutes.',
    retryAfter: 300, // 5 minutes
  }
}

/**
 * Helper pour obtenir la réponse d'erreur appropriée
 */
export function getRateLimitErrorResponse(
  rateLimitType: RateLimitType,
  resetTime?: number
) {
  const config = rateLimitErrorResponses[rateLimitType];
  
  return {
    error: config.message,
    retryAfter: config.retryAfter,
    resetTime,
    status: config.status
  };
}

/**
 * Whitelist d'IPs (pour les services internes, CI/CD, etc.)
 * Ces IPs ne sont pas soumises au rate limiting
 */
export const rateLimitWhitelist = new Set([
  '127.0.0.1',
  '::1',
  // Ajouter ici les IPs des services internes si nécessaire
]);

/**
 * Vérifie si une IP est whitelistée
 */
export function isWhitelisted(ip: string): boolean {
  return rateLimitWhitelist.has(ip);
}

/**
 * Configuration pour les headers de rate limiting
 * Conformément aux standards HTTP
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
  };
}