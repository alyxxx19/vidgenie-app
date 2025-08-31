import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { GoogleProfile, GoogleTokens } from './google-oauth';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google' | 'email' | 'github';
  organizationId?: string;
  role?: string;
  permissions?: string[];
  googleTokens?: {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
  };
  createdAt: number;
  lastActiveAt: number;
}

export interface SessionOptions {
  maxAge?: number; // in seconds
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
}

export class SessionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SessionError';
  }
}

class SessionManagerService {
  private readonly JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '');
  private readonly SESSION_COOKIE_NAME = 'vidgenie-session';
  private readonly REFRESH_COOKIE_NAME = 'vidgenie-refresh';
  
  private readonly defaultOptions: SessionOptions = {
    maxAge: 24 * 60 * 60, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  // Create session from Google OAuth data
  async createSessionFromGoogle(
    profile: GoogleProfile, 
    tokens: GoogleTokens,
    organizationId?: string
  ): Promise<{ sessionToken: string; refreshToken: string }> {
    try {
      // Get or create user in Supabase
      const { user, isNewUser } = await this.getOrCreateSupabaseUser(profile);

      // Prepare session data
      const sessionData: SessionData = {
        userId: user.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        provider: 'google',
        organizationId,
        googleTokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: Date.now() + (tokens.expires_in * 1000)
        },
        createdAt: Date.now(),
        lastActiveAt: Date.now()
      };

      // Create session JWT
      const sessionToken = await new SignJWT(sessionData)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .setSubject(user.id)
        .sign(this.JWT_SECRET);

      // Create refresh token
      const refreshToken = await new SignJWT({ 
        userId: user.id, 
        type: 'refresh',
        provider: 'google' 
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .setSubject(user.id)
        .sign(this.JWT_SECRET);

      return { sessionToken, refreshToken };
    } catch (error) {
      throw new SessionError(
        `Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SESSION_CREATE_FAILED'
      );
    }
  }

  // Get or create user in Supabase from Google profile
  private async getOrCreateSupabaseUser(profile: GoogleProfile): Promise<{
    user: any;
    isNewUser: boolean;
  }> {
    try {
      // Check if user exists by email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(u => u.email === profile.email);

      if (existingUser) {
        // Update existing user with Google data
        const { data: updatedUser, error } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
              ...existingUser.user_metadata,
              name: profile.name,
              picture: profile.picture,
              google_id: profile.id,
              provider: 'google',
              email_verified: profile.email_verified
            }
          }
        );

        if (error) throw new SessionError(error.message, 'USER_UPDATE_FAILED');
        return { user: updatedUser.user!, isNewUser: false };
      } else {
        // Create new user
        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: profile.email,
          email_confirm: profile.email_verified,
          user_metadata: {
            name: profile.name,
            picture: profile.picture,
            google_id: profile.id,
            provider: 'google',
            email_verified: profile.email_verified
          }
        });

        if (error) throw new SessionError(error.message, 'USER_CREATE_FAILED');
        if (!newUser.user) throw new SessionError('User creation failed', 'USER_CREATE_FAILED');
        
        return { user: newUser.user, isNewUser: true };
      }
    } catch (error) {
      if (error instanceof SessionError) throw error;
      throw new SessionError('User persistence failed', 'USER_PERSISTENCE_FAILED');
    }
  }

  // Set session cookies with security headers
  setSessionCookies(
    response: NextResponse,
    sessionToken: string,
    refreshToken: string,
    options: Partial<SessionOptions> = {}
  ): NextResponse {
    const cookieOptions = { ...this.defaultOptions, ...options };

    // Set session cookie
    response.cookies.set(this.SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
      domain: cookieOptions.domain,
      path: '/'
    });

    // Set refresh token cookie (longer lived, more secure)
    response.cookies.set(this.REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true, // Always httpOnly for refresh tokens
      secure: cookieOptions.secure,
      sameSite: 'strict', // Stricter for refresh tokens
      maxAge: 30 * 24 * 60 * 60, // 30 days
      domain: cookieOptions.domain,
      path: '/api/auth' // Restricted path for refresh endpoints
    });

    return response;
  }

  // Get session from cookies
  async getSessionFromCookies(request: NextRequest): Promise<SessionData | null> {
    try {
      const sessionToken = request.cookies.get(this.SESSION_COOKIE_NAME)?.value;
      
      if (!sessionToken) {
        return null;
      }

      const { payload } = await jwtVerify(sessionToken, this.JWT_SECRET);
      return payload as SessionData;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Validate and refresh session
  async validateSession(sessionToken: string): Promise<{
    valid: boolean;
    session?: SessionData;
    needsRefresh?: boolean;
  }> {
    try {
      const { payload } = await jwtVerify(sessionToken, this.JWT_SECRET);
      const session = payload as SessionData;

      // Check if session will expire soon (within 1 hour)
      const expiresAt = (payload.exp || 0) * 1000;
      const needsRefresh = expiresAt - Date.now() < 60 * 60 * 1000;

      // Update last active time
      session.lastActiveAt = Date.now();

      return {
        valid: true,
        session,
        needsRefresh
      };
    } catch (error) {
      return {
        valid: false,
        needsRefresh: true
      };
    }
  }

  // Refresh session using refresh token
  async refreshSession(refreshToken: string): Promise<{
    sessionToken: string;
    session: SessionData;
  }> {
    try {
      const { payload } = await jwtVerify(refreshToken, this.JWT_SECRET);
      
      if (payload.type !== 'refresh') {
        throw new SessionError('Invalid refresh token type', 'INVALID_REFRESH_TOKEN');
      }

      const userId = payload.userId as string;

      // Get current user data from Supabase
      const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error) throw new SessionError(error.message, 'USER_NOT_FOUND');
      if (!user.user) throw new SessionError('User not found', 'USER_NOT_FOUND');

      // Get user profile from database
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          organizations!users_current_organization_id_fkey (
            id,
            name,
            slug,
            plan_id,
            credits_balance
          )
        `)
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error during refresh:', profileError);
      }

      // Create new session data
      const sessionData: SessionData = {
        userId: user.user.id,
        email: user.user.email!,
        name: user.user.user_metadata?.name || user.user.email!.split('@')[0],
        picture: user.user.user_metadata?.picture,
        provider: user.user.user_metadata?.provider || 'email',
        organizationId: profile?.current_organization_id || undefined,
        role: profile?.organizations?.name ? 'member' : undefined,
        createdAt: Date.now(),
        lastActiveAt: Date.now()
      };

      // Generate new session token
      const newSessionToken = await new SignJWT(sessionData)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .setSubject(userId)
        .sign(this.JWT_SECRET);

      return {
        sessionToken: newSessionToken,
        session: sessionData
      };
    } catch (error) {
      if (error instanceof SessionError) throw error;
      throw new SessionError('Session refresh failed', 'REFRESH_FAILED');
    }
  }

  // Clear session cookies
  clearSessionCookies(response: NextResponse): NextResponse {
    response.cookies.delete(this.SESSION_COOKIE_NAME);
    response.cookies.delete(this.REFRESH_COOKIE_NAME);
    
    // Set explicit expiry cookies to ensure cleanup
    response.cookies.set(this.SESSION_COOKIE_NAME, '', {
      expires: new Date(0),
      path: '/'
    });
    
    response.cookies.set(this.REFRESH_COOKIE_NAME, '', {
      expires: new Date(0),
      path: '/api/auth'
    });

    return response;
  }

  // Server-side session validation for middleware
  async validateServerSession(request: NextRequest): Promise<{
    valid: boolean;
    session?: SessionData;
    user?: any;
  }> {
    try {
      const sessionToken = request.cookies.get(this.SESSION_COOKIE_NAME)?.value;
      
      if (!sessionToken) {
        return { valid: false };
      }

      const validation = await this.validateSession(sessionToken);
      
      if (!validation.valid || !validation.session) {
        return { valid: false };
      }

      // Get fresh user data from Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(validation.session.userId);
      
      if (error || !user) {
        return { valid: false };
      }

      return {
        valid: true,
        session: validation.session,
        user
      };
    } catch (error) {
      console.error('Server session validation error:', error);
      return { valid: false };
    }
  }

  // Track session activity for security monitoring
  async trackSessionActivity(sessionData: SessionData, activity: {
    action: string;
    ip?: string;
    userAgent?: string;
    additionalData?: any;
  }): Promise<void> {
    try {
      // Store in Supabase for audit trail
      await supabaseAdmin.from('session_activities').insert({
        user_id: sessionData.userId,
        organization_id: sessionData.organizationId,
        action: activity.action,
        ip_address: activity.ip,
        user_agent: activity.userAgent,
        additional_data: activity.additionalData,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      // Log but don't throw - session tracking shouldn't break auth flow
      console.error('Session activity tracking error:', error);
    }
  }

  // Security: Check for suspicious session activity
  async checkSuspiciousActivity(userId: string, ip: string): Promise<{
    isSuspicious: boolean;
    reason?: string;
    shouldBlock?: boolean;
  }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      // Check for multiple IPs in short time
      const { data: recentActivities } = await supabaseAdmin
        .from('session_activities')
        .select('ip_address, created_at')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      if (recentActivities) {
        const uniqueIPs = new Set(recentActivities.map(a => a.ip_address));
        
        // Flag if more than 3 different IPs in 1 hour
        if (uniqueIPs.size > 3) {
          return {
            isSuspicious: true,
            reason: 'Multiple IP addresses detected',
            shouldBlock: uniqueIPs.size > 5
          };
        }

        // Check for too many login attempts
        const loginAttempts = recentActivities.filter(a => 
          a.created_at > new Date(Date.now() - 15 * 60 * 1000).toISOString()
        ).length;

        if (loginAttempts > 10) {
          return {
            isSuspicious: true,
            reason: 'Too many login attempts',
            shouldBlock: true
          };
        }
      }

      return { isSuspicious: false };
    } catch (error) {
      console.error('Suspicious activity check error:', error);
      return { isSuspicious: false };
    }
  }

  // Generate secure session ID
  generateSessionId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Session cleanup - remove expired sessions
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Delete old session activities (keep 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      await supabaseAdmin
        .from('session_activities')
        .delete()
        .lt('created_at', thirtyDaysAgo);
        
      console.log('Session cleanup completed');
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManagerService();

// Utility functions for Next.js API routes
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  return sessionManager.getSessionFromCookies(request);
}

export async function requireAuth(request: NextRequest): Promise<SessionData> {
  const session = await sessionManager.getSessionFromCookies(request);
  
  if (!session) {
    throw new SessionError('Authentication required', 'AUTH_REQUIRED');
  }

  return session;
}

export function createAuthResponse(data: any, sessionToken: string, refreshToken: string): NextResponse {
  const response = NextResponse.json(data);
  return sessionManager.setSessionCookies(response, sessionToken, refreshToken);
}

// Periodic cleanup (run every hour in production)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  setInterval(() => {
    sessionManager.cleanupExpiredSessions();
  }, 60 * 60 * 1000); // 1 hour
}