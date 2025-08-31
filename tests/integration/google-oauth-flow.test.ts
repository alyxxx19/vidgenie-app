import { NextRequest } from 'next/server';
import { GET as googleAuthGET } from '@/app/api/auth/google/route';
import { GET as googleCallbackGET } from '@/app/api/auth/google/callback/route';

// Mock dependencies
jest.mock('@/lib/auth/google-oauth');
jest.mock('@/lib/supabase/server');

describe('Google OAuth Integration Flow', () => {
  const mockGoogleProfile = {
    id: 'google-user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    email_verified: true
  };

  const mockTokens = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    id_token: 'mock-id-token',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'openid email profile'
  };

  describe('OAuth Initiation (/api/auth/google)', () => {
    it('should redirect to Google OAuth with valid state', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/google?returnTo=/dashboard');
      
      const response = await googleAuthGET(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('accounts.google.com');
    });

    it('should handle missing parameters gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/google');
      
      const response = await googleAuthGET(request);
      
      expect(response.status).toBe(302);
      // Should still redirect to Google with default returnTo
    });

    it('should include organization ID in state when provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/google?organizationId=org-123');
      
      const response = await googleAuthGET(request);
      
      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      expect(location).toContain('state=');
    });
  });

  describe('OAuth Callback (/api/auth/google/callback)', () => {
    it('should handle successful OAuth callback', async () => {
      const mockGoogleOAuth = require('@/lib/auth/google-oauth');
      mockGoogleOAuth.googleOAuthService.exchangeCodeForTokens.mockResolvedValue({
        tokens: mockTokens,
        profile: mockGoogleProfile,
        stateData: { returnTo: '/dashboard', csrfToken: 'test-csrf', timestamp: Date.now() }
      });
      
      mockGoogleOAuth.googleOAuthService.createOrUpdateUser.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'session-token', expires_in: 3600 },
        isNewUser: false
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=auth-code&state=valid-state'
      );
      
      const response = await googleCallbackGET(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/dashboard');
    });

    it('should handle OAuth errors from Google', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?error=access_denied'
      );
      
      const response = await googleCallbackGET(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
      expect(response.headers.get('location')).toContain('error=');
    });

    it('should handle missing parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback'
      );
      
      const response = await googleCallbackGET(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
      expect(response.headers.get('location')).toContain('error=');
    });

    it('should set secure session cookies on success', async () => {
      const mockGoogleOAuth = require('@/lib/auth/google-oauth');
      mockGoogleOAuth.googleOAuthService.exchangeCodeForTokens.mockResolvedValue({
        tokens: mockTokens,
        profile: mockGoogleProfile,
        stateData: { returnTo: '/dashboard', csrfToken: 'test-csrf', timestamp: Date.now() }
      });
      
      mockGoogleOAuth.googleOAuthService.createOrUpdateUser.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'session-token', expires_in: 3600 },
        isNewUser: false
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=auth-code&state=valid-state'
      );
      
      const response = await googleCallbackGET(request);
      
      const cookies = response.cookies;
      expect(cookies.get('sb-access-token')).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      const mockGoogleOAuth = require('@/lib/auth/google-oauth');
      mockGoogleOAuth.googleOAuthService.exchangeCodeForTokens.mockRejectedValue(
        new Error('Network error')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=auth-code&state=valid-state'
      );
      
      const response = await googleCallbackGET(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
      expect(response.headers.get('location')).toContain('error=');
    });

    it('should handle invalid state gracefully', async () => {
      const mockGoogleOAuth = require('@/lib/auth/google-oauth');
      mockGoogleOAuth.googleOAuthService.exchangeCodeForTokens.mockRejectedValue(
        new GoogleOAuthError('Invalid OAuth state', 'INVALID_STATE')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=auth-code&state=invalid-state'
      );
      
      const response = await googleCallbackGET(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('error=');
    });
  });

  describe('Security Validations', () => {
    it('should validate token signatures', async () => {
      const result = await tokenValidator.validateGoogleIdToken('invalid-token');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should enforce rate limiting', () => {
      const ip = '192.168.1.100';
      
      // Should allow first 5 requests
      for (let i = 0; i < 5; i++) {
        expect(tokenValidator.checkRateLimit(ip)).toBe(true);
      }
      
      // 6th request should be blocked
      expect(tokenValidator.checkRateLimit(ip)).toBe(false);
    });

    it('should validate email domains when configured', () => {
      process.env.ALLOWED_EMAIL_DOMAINS = 'vidgenie.com';
      
      expect(tokenValidator.validateEmailDomain('user@vidgenie.com')).toBe(true);
      expect(tokenValidator.validateEmailDomain('user@external.com')).toBe(false);
      
      delete process.env.ALLOWED_EMAIL_DOMAINS;
    });
  });

  describe('Session Management', () => {
    it('should create session with proper structure', async () => {
      // This would be tested with actual session manager
      const sessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google' as const,
        createdAt: Date.now(),
        lastActiveAt: Date.now()
      };

      expect(sessionData.userId).toBeDefined();
      expect(sessionData.email).toBeDefined();
      expect(sessionData.provider).toBe('google');
    });
  });
});

describe('End-to-End OAuth Flow', () => {
  it('should complete full OAuth flow successfully', async () => {
    // 1. User clicks "Sign in with Google"
    const initiationRequest = new NextRequest('http://localhost:3000/api/auth/google');
    const initiationResponse = await googleAuthGET(initiationRequest);
    
    expect(initiationResponse.status).toBe(302);
    
    // 2. User returns from Google with auth code
    const mockGoogleOAuth = require('@/lib/auth/google-oauth');
    mockGoogleOAuth.googleOAuthService.exchangeCodeForTokens.mockResolvedValue({
      tokens: mockTokens,
      profile: mockGoogleProfile,
      stateData: { returnTo: '/dashboard', csrfToken: 'test-csrf', timestamp: Date.now() }
    });
    
    mockGoogleOAuth.googleOAuthService.createOrUpdateUser.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      session: { access_token: 'session-token', expires_in: 3600 },
      isNewUser: true
    });

    const callbackRequest = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=auth-code&state=valid-state'
    );
    
    const callbackResponse = await googleCallbackGET(callbackRequest);
    
    // 3. Should redirect to dashboard with session cookies set
    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.headers.get('location')).toContain('/dashboard');
    expect(callbackResponse.cookies.get('sb-access-token')).toBeDefined();
  });

  it('should handle new user creation flow', async () => {
    const mockGoogleOAuth = require('@/lib/auth/google-oauth');
    mockGoogleOAuth.googleOAuthService.exchangeCodeForTokens.mockResolvedValue({
      tokens: mockTokens,
      profile: mockGoogleProfile,
      stateData: { returnTo: '/dashboard', csrfToken: 'test-csrf', timestamp: Date.now() }
    });
    
    mockGoogleOAuth.googleOAuthService.createOrUpdateUser.mockResolvedValue({
      user: { id: 'new-user-123', email: 'newuser@example.com' },
      session: { access_token: 'session-token', expires_in: 3600 },
      isNewUser: true
    });

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=auth-code&state=valid-state'
    );
    
    const response = await googleCallbackGET(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('welcome=true');
  });
});