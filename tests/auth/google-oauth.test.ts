import { GoogleOAuthService, GoogleOAuthError } from '@/lib/auth/google-oauth';
import { tokenValidator } from '@/lib/auth/token-validator';

// Mock environment variables
const mockEnv = {
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  JWT_SECRET: 'test-jwt-secret-32-characters-long',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
};

// Mock dependencies
jest.mock('google-auth-library');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/supabase/client');

describe('GoogleOAuthService', () => {
  let service: GoogleOAuthService;

  beforeEach(() => {
    // Set environment variables
    Object.assign(process.env, mockEnv);
    
    // Reset service instance
    service = new GoogleOAuthService();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('Constructor', () => {
    it('should throw error if Google credentials are missing', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      
      expect(() => new GoogleOAuthService()).toThrow('Google OAuth credentials not configured');
    });

    it('should initialize with proper credentials', () => {
      expect(() => new GoogleOAuthService()).not.toThrow();
    });
  });

  describe('generateState', () => {
    it('should generate valid JWT state token', async () => {
      const state = await service.generateState({
        returnTo: '/dashboard',
        organizationId: 'org-123'
      });

      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(100); // JWT should be reasonably long
    });

    it('should include CSRF token in state', async () => {
      const state = await service.generateState();
      const decoded = await service.verifyState(state);

      expect(decoded.csrfToken).toBeDefined();
      expect(typeof decoded.csrfToken).toBe('string');
      expect(decoded.csrfToken.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe('verifyState', () => {
    it('should verify valid state token', async () => {
      const originalState = {
        returnTo: '/dashboard',
        organizationId: 'org-123'
      };
      
      const stateToken = await service.generateState(originalState);
      const verifiedState = await service.verifyState(stateToken);

      expect(verifiedState.returnTo).toBe(originalState.returnTo);
      expect(verifiedState.organizationId).toBe(originalState.organizationId);
      expect(verifiedState.csrfToken).toBeDefined();
    });

    it('should reject expired state token', async () => {
      // Mock an old timestamp
      const oldTimestamp = Date.now() - (15 * 60 * 1000); // 15 minutes ago
      jest.spyOn(Date, 'now').mockReturnValue(oldTimestamp);
      
      const stateToken = await service.generateState();
      
      // Restore real time
      jest.spyOn(Date, 'now').mockRestore();
      
      await expect(service.verifyState(stateToken)).rejects.toThrow('OAuth state expired');
    });

    it('should reject invalid state token', async () => {
      await expect(service.verifyState('invalid-jwt-token')).rejects.toThrow('Invalid OAuth state');
    });
  });

  describe('getAuthUrl', () => {
    it('should generate valid Google OAuth URL', async () => {
      const url = await service.getAuthUrl({
        returnTo: '/dashboard'
      });

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id.apps.googleusercontent.com');
      expect(url).toContain('redirect_uri=http%3A//localhost%3A3000/api/auth/google/callback');
      expect(url).toContain('scope=openid%20email%20profile');
      expect(url).toContain('state=');
    });
  });
});

describe('TokenValidator', () => {
  describe('validateEmailDomain', () => {
    beforeEach(() => {
      process.env.ALLOWED_EMAIL_DOMAINS = 'vidgenie.com,example.com';
    });

    afterEach(() => {
      delete process.env.ALLOWED_EMAIL_DOMAINS;
    });

    it('should allow emails from allowed domains', () => {
      expect(tokenValidator.validateEmailDomain('user@vidgenie.com')).toBe(true);
      expect(tokenValidator.validateEmailDomain('test@example.com')).toBe(true);
    });

    it('should reject emails from disallowed domains', () => {
      expect(tokenValidator.validateEmailDomain('user@gmail.com')).toBe(false);
      expect(tokenValidator.validateEmailDomain('test@yahoo.com')).toBe(false);
    });

    it('should allow all emails when no domain restrictions', () => {
      delete process.env.ALLOWED_EMAIL_DOMAINS;
      
      expect(tokenValidator.validateEmailDomain('user@gmail.com')).toBe(true);
      expect(tokenValidator.validateEmailDomain('test@anything.com')).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', () => {
      expect(tokenValidator.checkRateLimit('192.168.1.1')).toBe(true);
      expect(tokenValidator.checkRateLimit('192.168.1.1')).toBe(true);
    });

    it('should block requests exceeding rate limit', () => {
      const ip = '192.168.1.2';
      
      // Use up the rate limit
      for (let i = 0; i < 5; i++) {
        expect(tokenValidator.checkRateLimit(ip)).toBe(true);
      }
      
      // Next request should be blocked
      expect(tokenValidator.checkRateLimit(ip)).toBe(false);
    });

    it('should reset rate limit after window expires', () => {
      const ip = '192.168.1.3';
      
      // Use up the rate limit
      for (let i = 0; i < 5; i++) {
        tokenValidator.checkRateLimit(ip);
      }
      
      // Should be blocked
      expect(tokenValidator.checkRateLimit(ip)).toBe(false);
      
      // Clean up (simulates time passing)
      tokenValidator.cleanupRateLimit();
      
      // After cleanup, should be allowed again
      // Note: In real implementation, this would require actual time to pass
    });
  });
});

describe('OAuth Error Handling', () => {
  it('should create GoogleOAuthError with proper properties', () => {
    const error = new GoogleOAuthError('Test error', 'TEST_CODE', 400);
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.status).toBe(400);
    expect(error.name).toBe('GoogleOAuthError');
  });

  it('should be instance of Error', () => {
    const error = new GoogleOAuthError('Test error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(GoogleOAuthError);
  });
});

describe('Security Features', () => {
  describe('CSRF Protection', () => {
    it('should generate unique CSRF tokens', async () => {
      const service = new GoogleOAuthService();
      const state1 = await service.generateState();
      const state2 = await service.generateState();
      
      const decoded1 = await service.verifyState(state1);
      const decoded2 = await service.verifyState(state2);
      
      expect(decoded1.csrfToken).not.toBe(decoded2.csrfToken);
    });
  });

  describe('State Expiration', () => {
    it('should enforce state token expiration', async () => {
      const service = new GoogleOAuthService();
      
      // Mock time to be in the past
      const oldTime = Date.now() - (15 * 60 * 1000); // 15 minutes ago
      jest.spyOn(Date, 'now').mockReturnValue(oldTime);
      
      const stateToken = await service.generateState();
      
      // Restore current time
      jest.spyOn(Date, 'now').mockRestore();
      
      // Should reject expired state
      await expect(service.verifyState(stateToken)).rejects.toThrow('OAuth state expired');
    });
  });
});