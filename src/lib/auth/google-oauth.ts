import { OAuth2Client } from 'google-auth-library';
import { jwtVerify, SignJWT } from 'jose';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface OAuthState {
  returnTo?: string;
  organizationId?: string;
  csrfToken: string;
  timestamp: number;
}

export class GoogleOAuthError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
    this.name = 'GoogleOAuthError';
  }
}

class GoogleOAuthService {
  private client: OAuth2Client;
  private readonly redirectUri: string;
  private readonly scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  constructor() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new GoogleOAuthError('Google OAuth credentials not configured');
    }

    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      this.getRedirectUri()
    );

    this.redirectUri = this.getRedirectUri();
  }

  private getRedirectUri(): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/auth/google/callback`;
  }

  // Generate secure OAuth state with CSRF protection
  async generateState(options: Partial<OAuthState> = {}): Promise<string> {
    const state: OAuthState = {
      returnTo: options.returnTo || '/dashboard',
      organizationId: options.organizationId,
      csrfToken: this.generateCSRFToken(),
      timestamp: Date.now()
    };

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    
    const jwt = await new SignJWT(state)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m') // Short-lived state token
      .sign(secret);

    return jwt;
  }

  // Verify and decode OAuth state
  async verifyState(stateToken: string): Promise<OAuthState> {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      
      const { payload } = await jwtVerify(stateToken, secret);
      
      const state = payload as unknown as OAuthState;
      
      // Check if state is not too old (10 minutes max)
      if (Date.now() - state.timestamp > 10 * 60 * 1000) {
        throw new GoogleOAuthError('OAuth state expired', 'STATE_EXPIRED');
      }

      return state;
    } catch (error) {
      throw new GoogleOAuthError('Invalid OAuth state', 'INVALID_STATE');
    }
  }

  // Generate authorization URL
  async getAuthUrl(options: Partial<OAuthState> = {}): Promise<string> {
    const state = await this.generateState(options);

    const authUrl = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state,
      prompt: 'consent',
      include_granted_scopes: true,
      // Add additional security parameters
      response_type: 'code',
      redirect_uri: this.redirectUri
    });

    return authUrl;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, state: string): Promise<{
    tokens: GoogleTokens;
    profile: GoogleProfile;
    stateData: OAuthState;
  }> {
    try {
      // Verify state first
      const stateData = await this.verifyState(state);

      // Exchange code for tokens
      const { tokens } = await this.client.getAccessToken(code);
      
      if (!tokens.access_token || !tokens.id_token) {
        throw new GoogleOAuthError('Invalid tokens received', 'INVALID_TOKENS');
      }

      // Verify and decode ID token
      const profile = await this.verifyIdToken(tokens.id_token);

      return {
        tokens: tokens as GoogleTokens,
        profile,
        stateData
      };
    } catch (error) {
      if (error instanceof GoogleOAuthError) throw error;
      throw new GoogleOAuthError('Token exchange failed', 'EXCHANGE_FAILED');
    }
  }

  // Verify Google ID token and extract profile
  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new GoogleOAuthError('Invalid ID token payload', 'INVALID_PAYLOAD');
      }

      // Validate required fields
      if (!payload.sub || !payload.email) {
        throw new GoogleOAuthError('Missing required profile data', 'INCOMPLETE_PROFILE');
      }

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
        email_verified: Boolean(payload.email_verified),
        given_name: payload.given_name,
        family_name: payload.family_name,
        locale: payload.locale
      };
    } catch (error) {
      if (error instanceof GoogleOAuthError) throw error;
      throw new GoogleOAuthError('ID token verification failed', 'TOKEN_VERIFICATION_FAILED');
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    try {
      this.client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.client.refreshAccessToken();

      return credentials as GoogleTokens;
    } catch (error) {
      throw new GoogleOAuthError('Token refresh failed', 'REFRESH_FAILED');
    }
  }

  // Get user info from Google API via fetch
  async getUserInfo(accessToken: string): Promise<GoogleProfile> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new GoogleOAuthError(`Google API error: ${response.status}`, 'API_ERROR');
      }

      const data = await response.json();

      if (!data.id || !data.email) {
        throw new GoogleOAuthError('Incomplete user data from Google', 'INCOMPLETE_USER_DATA');
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name || data.email.split('@')[0],
        picture: data.picture,
        email_verified: Boolean(data.verified_email),
        given_name: data.given_name,
        family_name: data.family_name,
        locale: data.locale
      };
    } catch (error) {
      if (error instanceof GoogleOAuthError) throw error;
      throw new GoogleOAuthError('Failed to fetch user info', 'USER_INFO_FAILED');
    }
  }

  // Create or update user in Supabase after OAuth
  async createOrUpdateUser(profile: GoogleProfile, tokens: GoogleTokens): Promise<{
    user: any;
    session: any;
    isNewUser: boolean;
  }> {
    try {
      // Check if user exists in Supabase Auth
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(u => u.email === profile.email);

      let authUser;
      let isNewUser = false;

      if (existingUser) {
        // Update existing user metadata
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
              name: profile.name,
              picture: profile.picture,
              google_id: profile.id,
              email_verified: profile.email_verified,
              provider: 'google'
            }
          }
        );

        if (updateError) throw new GoogleOAuthError(updateError.message, 'USER_UPDATE_FAILED');
        authUser = updatedUser.user;
      } else {
        // Create new user in Supabase Auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: profile.email,
          email_confirm: profile.email_verified,
          user_metadata: {
            name: profile.name,
            picture: profile.picture,
            google_id: profile.id,
            email_verified: profile.email_verified,
            provider: 'google'
          }
        });

        if (createError) throw new GoogleOAuthError(createError.message, 'USER_CREATE_FAILED');
        if (!newUser.user) throw new GoogleOAuthError('User creation failed', 'USER_CREATE_FAILED');
        
        authUser = newUser.user;
        isNewUser = true;
      }

      // Create session for the user
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        }
      });

      if (sessionError) throw new GoogleOAuthError(sessionError.message, 'SESSION_CREATE_FAILED');

      return {
        user: authUser,
        session: sessionData,
        isNewUser
      };
    } catch (error) {
      if (error instanceof GoogleOAuthError) throw error;
      throw new GoogleOAuthError('User creation/update failed', 'USER_PERSISTENCE_FAILED');
    }
  }

  // Revoke Google OAuth tokens
  async revokeTokens(accessToken: string): Promise<void> {
    try {
      await this.client.revokeToken(accessToken);
    } catch (error) {
      // Log but don't throw - revocation might fail if token already expired
      console.warn('Token revocation failed:', error);
    }
  }

  private generateCSRFToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// Create singleton instance
export const googleOAuthService = new GoogleOAuthService();

// Export for testing
export { GoogleOAuthService };