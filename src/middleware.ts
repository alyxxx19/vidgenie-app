import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { 
  getRateLimiterForRoute, 
  getRateLimitIdentifier, 
  getRateLimitErrorResponse, 
  getRateLimitHeaders,
  isWhitelisted,
  RateLimitType
} from '@/lib/rate-limit-config';
import { secureLog } from '@/lib/secure-logger';

// Routes protégées qui nécessitent une authentification
const PROTECTED_ROUTES = [
  '/dashboard',
  '/projects',
  '/assets',
  '/settings',
  '/account',
  '/billing',
  '/analytics',
  '/library',
];

// Routes publiques d'authentification
const AUTH_ROUTES = [
  '/auth/signin',
  '/auth/signup', 
  '/auth/reset-password',
  '/auth/callback',
];

// Routes publiques générales
const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/about',
  '/contact',
];

/**
 * Applique le rate limiting selon la route
 */
async function applyRateLimit(
  request: NextRequest, 
  pathname: string, 
  identifier: string
) {
  try {
    // Obtenir le rate limiter approprié pour cette route
    const rateLimiter = getRateLimiterForRoute(pathname);
    
    // Appliquer le rate limiting
    const result = await rateLimiter.limit(identifier);
    
    if (!result.success) {
      // Déterminer le type de rate limit pour la réponse d'erreur
      const rateLimitType = getRateLimitTypeForRoute(pathname);
      const errorResponse = getRateLimitErrorResponse(rateLimitType, result.reset);
      
      const headers = getRateLimitHeaders(
        result.limit,
        result.remaining,
        result.reset
      );
      
      const response = NextResponse.json(
        {
          error: errorResponse.error,
          retryAfter: errorResponse.retryAfter,
          resetTime: errorResponse.resetTime
        },
        { status: errorResponse.status }
      );
      
      // Ajouter les headers de rate limiting
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      // Ajouter les headers de sécurité
      applySecurityHeaders(response, request);
      
      return {
        success: false,
        response,
        remaining: result.remaining,
        resetTime: result.reset
      };
    }

    return {
      success: true,
      remaining: result.remaining,
      resetTime: result.reset
    };

  } catch (error) {
    secureLog.error('Rate limiting error', { pathname, identifier, error });
    
    // En cas d'erreur du rate limiter, laisser passer
    return {
      success: true,
      remaining: -1,
      resetTime: Date.now() + 60000
    };
  }
}

/**
 * Détermine le type de rate limit selon la route
 */
function getRateLimitTypeForRoute(pathname: string): RateLimitType {
  const rateLimitRoutes: Record<string, RateLimitType> = {
    '/api/auth/signin': 'auth',
    '/api/auth/signup': 'auth',
    '/api/auth/dev-login': 'auth',
    '/api/auth/create-user': 'auth',
    '/api/generate': 'generation',
    '/api/upload': 'upload',
    '/api/webhooks/stripe': 'webhook',
    '/api/user/profile': 'profile',
    '/api/*': 'general'
  };
  
  // Recherche exacte
  if (rateLimitRoutes[pathname as keyof typeof rateLimitRoutes]) {
    return rateLimitRoutes[pathname as keyof typeof rateLimitRoutes];
  }
  
  // Recherche par pattern pour /api/*
  if (pathname.startsWith('/api')) {
    return 'general';
  }
  
  return 'general';
}

/**
 * Applique les headers de sécurité HTTP à toutes les réponses
 */
function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const headers = response.headers;
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api');

  // Content Security Policy (CSP) stricte et complète
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://va.vercel-scripts.com https://vercel.live https://www.google.com https://www.gstatic.com", // unsafe-inline/eval pour Next.js dev
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // unsafe-inline nécessaire pour Tailwind
    "img-src 'self' data: https: blob: https://images.unsplash.com https://cdn.openai.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://upstash.com https://*.upstash.io https://api.openai.com https://api.anthropic.com https://api.fal.ai wss://ws-us3.pusher.com https://vercel.live",
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "child-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "prefetch-src 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ];
  
  // CSP moins restrictive en développement
  if (process.env.NODE_ENV === 'development') {
    cspDirectives[1] = "script-src 'self' 'unsafe-eval' 'unsafe-inline'"; // Plus permissif en dev
    cspDirectives.push("connect-src 'self' ws: http: https:"); // WebSocket pour HMR
  }

  headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Headers de sécurité essentiels et avancés
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('X-DNS-Prefetch-Control', 'off');
  headers.set('X-Download-Options', 'noopen');
  headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  headers.set('Expect-CT', 'max-age=86400, enforce');
  headers.set('Origin-Agent-Cluster', '?1');
  headers.set('X-Powered-By', 'VidGenie'); // Masquer Next.js

  // Strict Transport Security (HTTPS uniquement)
  if (request.nextUrl.protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Headers spécifiques aux API
  if (isApiRoute) {
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    headers.set('Pragma', 'no-cache');
  }

  // Permissions Policy pour contrôler l'accès aux API du navigateur
  const permissionsPolicy = [
    'camera=(), microphone=(), geolocation=(), payment=(),',
    'usb=(), bluetooth=(), magnetometer=(), gyroscope=(),',
    'accelerometer=(), ambient-light-sensor=(), autoplay=(),',
    'encrypted-media=(), fullscreen=(self), picture-in-picture=()'
  ].join(' ');
  headers.set('Permissions-Policy', permissionsPolicy);

  // Cross-Origin headers sécurisés
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
}

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;
  const clientIp = getRateLimitIdentifier(request);
  const realIp = clientIp.split('_')[0];

  try {
    // 1. Vérifier rate limiting pour les routes API
    if (pathname.startsWith('/api') && !isWhitelisted(realIp)) {
      const rateLimitResult = await applyRateLimit(request, pathname, clientIp);
      
      if (!rateLimitResult.success) {
        secureLog.security(`Rate limit exceeded for ${clientIp}`, {
          pathname,
          ip: realIp,
          remaining: rateLimitResult.remaining
        });
        
        return rateLimitResult.response;
      }
    }

    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Apply security headers to all responses
    applySecurityHeaders(response, request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const isAuthenticated = !!session?.user;

  // Gestion des routes protégées
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Gestion des routes d'authentification (redirection si déjà connecté)
  if (isAuthRoute(pathname) && isAuthenticated) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

    return response;
  } catch (error) {
    // Log des erreurs de middleware
    secureLog.error('Middleware error', { pathname, ip: realIp, error });
    
    // En cas d'erreur, laisser passer la requête mais logger
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
    applySecurityHeaders(response, request);
    return response;
  } finally {
    // Log des performances
    const duration = Date.now() - start;
    if (duration > 100) { // Log seulement si > 100ms
      secureLog.performance(`Middleware processed ${pathname}`, duration, {
        ip: realIp,
      });
    }
  }
}

// Helpers pour déterminer le type de route
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname.startsWith(route));
}

function _isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route === '/') return pathname === '/';
    return pathname.startsWith(route);
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};