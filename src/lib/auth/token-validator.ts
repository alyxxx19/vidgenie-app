import { OAuth2Client } from 'google-auth-library';
import { jwtVerify } from 'jose';
import { GoogleProfile, GoogleOAuthError } from './google-oauth';

export interface TokenValidationResult {
  isValid: boolean;
  profile?: GoogleProfile;
  error?: string;
  expiresAt?: Date;
}

export interface SessionValidationResult {
  isValid: boolean;
  userId?: string;
  profile?: any;
  error?: string;
  needsRefresh?: boolean;
}

class TokenValidatorService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
  }

  // Validate Google ID token with comprehensive checks
  async validateGoogleIdToken(idToken: string): Promise<TokenValidationResult> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return {
          isValid: false,
          error: 'Invalid token payload'
        };
      }

      // Comprehensive validation checks
      const now = Math.floor(Date.now() / 1000);
      
      // Check expiration
      if (payload.exp && payload.exp < now) {
        return {
          isValid: false,
          error: 'Token expired'
        };
      }

      // Check issued at time (not too old)
      if (payload.iat && (now - payload.iat) > 3600) { // 1 hour max
        return {
          isValid: false,
          error: 'Token too old'
        };
      }

      // Check issuer
      if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
        return {
          isValid: false,
          error: 'Invalid token issuer'
        };
      }

      // Check audience
      if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        return {
          isValid: false,
          error: 'Invalid token audience'
        };
      }

      // Validate required claims
      if (!payload.sub || !payload.email) {
        return {
          isValid: false,
          error: 'Missing required claims'
        };
      }

      // Email verification check (optional but recommended)
      if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !payload.email_verified) {
        return {
          isValid: false,
          error: 'Email not verified'
        };
      }

      const profile: GoogleProfile = {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
        email_verified: Boolean(payload.email_verified),
        given_name: payload.given_name,
        family_name: payload.family_name,
        locale: payload.locale
      };

      return {
        isValid: true,
        profile,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined
      };
    } catch (error) {
      console.error('Google ID token validation error:', error);
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Token validation failed'
      };
    }
  }

  // Validate Google access token by calling Google's tokeninfo endpoint
  async validateGoogleAccessToken(accessToken: string): Promise<TokenValidationResult> {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
      
      if (!response.ok) {
        return {
          isValid: false,
          error: `Token validation failed: ${response.status}`
        };
      }

      const tokenInfo = await response.json();

      // Check if token is valid and not expired
      if (tokenInfo.error) {
        return {
          isValid: false,
          error: tokenInfo.error_description || tokenInfo.error
        };
      }

      // Check audience
      if (tokenInfo.audience !== process.env.GOOGLE_CLIENT_ID) {
        return {
          isValid: false,
          error: 'Invalid token audience'
        };
      }

      // Check expiration
      const expiresIn = parseInt(tokenInfo.expires_in);
      if (expiresIn <= 0) {
        return {
          isValid: false,
          error: 'Token expired'
        };
      }

      return {
        isValid: true,
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      };
    } catch (error) {
      console.error('Google access token validation error:', error);
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Access token validation failed'
      };
    }
  }

  // Validate custom JWT session tokens
  async validateSessionToken(sessionToken: string): Promise<SessionValidationResult> {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      
      const { payload } = await jwtVerify(sessionToken, secret, {
        algorithms: ['HS256']
      });

      const session = payload as any;

      // Check token expiration
      if (session.exp && session.exp < Math.floor(Date.now() / 1000)) {
        return {
          isValid: false,
          error: 'Session expired',
          needsRefresh: true
        };
      }

      // Check if token will expire soon (within 5 minutes)
      const needsRefresh = session.exp && (session.exp - Math.floor(Date.now() / 1000)) < 300;

      return {
        isValid: true,
        userId: session.sub,
        profile: session.profile,
        needsRefresh
      };
    } catch (error) {
      console.error('Session token validation error:', error);
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Session validation failed',
        needsRefresh: true
      };
    }
  }

  // Rate limiting for OAuth attempts
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  checkRateLimit(identifier: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const key = `oauth_${identifier}`;
    const record = this.rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  // Clean up expired rate limit records
  cleanupRateLimit(): void {
    const now = Date.now();
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (now > record.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  // Validate domain restrictions (if configured)
  validateEmailDomain(email: string): boolean {
    const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',').map(d => d.trim());
    
    if (!allowedDomains || allowedDomains.length === 0) {
      return true; // No domain restrictions
    }

    const emailDomain = email.split('@')[1]?.toLowerCase();
    return allowedDomains.some(domain => emailDomain === domain.toLowerCase());
  }

  // Security headers for OAuth responses
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' *.supabase.co accounts.google.com;",
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
    };
  }
}

// Singleton instance
export const tokenValidator = new TokenValidatorService();

// Clean up rate limit records every hour
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    tokenValidator.cleanupRateLimit();
  }, 60 * 60 * 1000); // 1 hour
}