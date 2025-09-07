import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

export async function middleware(request: NextRequest) {
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
  const pathname = request.nextUrl.pathname;
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
}

/**
 * Applique les headers de sécurité HTTP à toutes les réponses
 */
function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const headers = response.headers;
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api');

  // Content Security Policy (CSP) stricte
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com", // unsafe-inline/eval pour Next.js dev
    "style-src 'self' 'unsafe-inline'", // unsafe-inline nécessaire pour Tailwind
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://upstash.com https://*.upstash.io",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];
  
  // CSP moins restrictive en développement
  if (process.env.NODE_ENV === 'development') {
    cspDirectives[1] = "script-src 'self' 'unsafe-eval' 'unsafe-inline'"; // Plus permissif en dev
    cspDirectives.push("connect-src 'self' ws: http: https:"); // WebSocket pour HMR
  }

  headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Headers de sécurité essentiels
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-XSS-Protection', '1; mode=block');

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