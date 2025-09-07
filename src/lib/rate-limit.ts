import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { secureLog } from '@/lib/secure-logger';

// Configuration Redis avec initialisation lazy
let _redis: Redis | null = null;

function getRedisClient(): Redis {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Redis credentials not found. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
  }

  secureLog.info('✅ Redis client initialized');
  _redis = new Redis({ url, token });
  return _redis;
}

// Rate limiters avec lazy initialization
let _rateLimiters: {
  auth?: Ratelimit;
  apiKey?: Ratelimit;
  generation?: Ratelimit;
  upload?: Ratelimit;
  general?: Ratelimit;
} = {};

export const authRateLimit = new Proxy({} as Ratelimit, {
  get(target, prop) {
    if (!_rateLimiters.auth) {
      _rateLimiters.auth = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        analytics: true,
        prefix: 'auth',
      });
    }
    return (_rateLimiters.auth as any)[prop];
  }
});

export const apiKeyRateLimit = new Proxy({} as Ratelimit, {
  get(target, prop) {
    if (!_rateLimiters.apiKey) {
      _rateLimiters.apiKey = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        analytics: true,
        prefix: 'api_key',
      });
    }
    return (_rateLimiters.apiKey as any)[prop];
  }
});

export const generationRateLimit = new Proxy({} as Ratelimit, {
  get(target, prop) {
    if (!_rateLimiters.generation) {
      _rateLimiters.generation = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(20, '1 h'),
        analytics: true,
        prefix: 'generation',
      });
    }
    return (_rateLimiters.generation as any)[prop];
  }
});

export const uploadRateLimit = new Proxy({} as Ratelimit, {
  get(target, prop) {
    if (!_rateLimiters.upload) {
      _rateLimiters.upload = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(30, '1 h'),
        analytics: true,
        prefix: 'upload',
      });
    }
    return (_rateLimiters.upload as any)[prop];
  }
});

export const generalRateLimit = new Proxy({} as Ratelimit, {
  get(target, prop) {
    if (!_rateLimiters.general) {
      _rateLimiters.general = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(100, '15 m'),
        analytics: true,
        prefix: 'api',
      });
    }
    return (_rateLimiters.general as any)[prop];
  }
});

/**
 * Utilitaire pour appliquer le rate limiting dans les API routes
 */
export async function applyRateLimit(
  rateLimit: Ratelimit,
  identifier: string,
  errorMessage?: string
) {
  const { success, limit, reset, remaining } = await rateLimit.limit(identifier);

  if (!success) {
    throw new Error(
      errorMessage || 
      `Trop de requêtes. Limite: ${limit}. Réessayez dans ${Math.ceil((reset - Date.now()) / 1000)} secondes.`
    );
  }

  return {
    success: true,
    limit,
    remaining,
    reset,
  };
}

/**
 * Générer un identifiant unique pour le rate limiting
 * Utilise l'IP ou l'ID utilisateur selon la disponibilité
 */
export function getRateLimitIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user_${userId}`;
  }

  // Récupérer l'IP depuis les headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `ip_${ip}`;
}

/**
 * Middleware pour les API routes Next.js
 */
export function withRateLimit(
  rateLimit: Ratelimit,
  options?: {
    errorMessage?: string;
    skipCondition?: (request: Request) => boolean;
  }
) {
  return async function rateLimitMiddleware(
    request: Request,
    userId?: string
  ) {
    // Permettre de skip le rate limiting dans certaines conditions
    if (options?.skipCondition && options.skipCondition(request)) {
      return { success: true, limit: Infinity, remaining: Infinity, reset: 0 };
    }

    const identifier = getRateLimitIdentifier(request, userId);
    return applyRateLimit(rateLimit, identifier, options?.errorMessage);
  };
}

/**
 * Types pour TypeScript
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimitError extends Error {
  rateLimitExceeded: boolean;
  retryAfter: number;
}