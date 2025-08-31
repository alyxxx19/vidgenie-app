import { createClient } from '@/lib/supabase/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
};

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/supabase/client');

describe('Supabase Authentication', () => {
  beforeEach(() => {
    // Set environment variables
    Object.assign(process.env, mockEnv);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('Client Authentication', () => {
    it('should create client with proper configuration', () => {
      const client = createClient();
      
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });

    it('should handle OAuth sign in', async () => {
      const client = createClient();
      const result = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback'
        }
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('should handle sign out', async () => {
      const client = createClient();
      const result = await client.auth.signOut();

      expect(result.error).toBeNull();
    });
  });

  describe('Server Authentication', () => {
    it('should create server client', async () => {
      const supabase = await createServerSupabaseClient();
      
      expect(supabase).toBeDefined();
      expect(supabase.auth).toBeDefined();
    });

    it('should get user from server', async () => {
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      expect(user).toBeNull(); // Default mock returns null
      expect(error).toBeNull();
    });
  });
});

describe('Auth Helpers', () => {
  beforeEach(() => {
    Object.assign(process.env, mockEnv);
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('Server Auth Helpers', () => {
    it('should require authentication and redirect when no user', async () => {
      // Mock redirect to throw an error for testing
      const mockRedirect = jest.fn().mockImplementation(() => {
        throw new Error('NEXT_REDIRECT');
      });
      
      jest.doMock('next/navigation', () => ({
        redirect: mockRedirect,
      }));
      
      const { requireAuth } = require('@/lib/auth/server-helpers');
      
      await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT');
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });

    it('should get authenticated user', async () => {
      const mockSupabase = require('@/lib/supabase/server');
      mockSupabase.createServerSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
      });

      const { getAuthUser } = require('@/lib/auth/server-helpers');
      const user = await getAuthUser();

      expect(user).toBeDefined();
      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
    });

    it('should get user with profile', async () => {
      const mockSupabase = require('@/lib/supabase/server');
      mockSupabase.createServerSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { name: 'Test User', avatar_url: 'test.jpg' },
            error: null,
          }),
        })),
      });

      const { getAuthUserWithProfile } = require('@/lib/auth/server-helpers');
      const userWithProfile = await getAuthUserWithProfile();

      expect(userWithProfile).toBeDefined();
      expect(userWithProfile.profile).toBeDefined();
      expect(userWithProfile.profile.name).toBe('Test User');
    });
  });
});