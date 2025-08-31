import { supabase } from './client';
import { supabaseAdmin } from './server';
import type { Database } from './types';

export type AuthUser = Database['public']['Tables']['users']['Row'];

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
  organizationName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const authService = {
  // Sign up new user
  async signUp(data: SignUpData) {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name || data.email.split('@')[0],
            organizationName: data.organizationName,
          },
        },
      });

      if (error) throw new AuthError(error.message, error.message);
      if (!authData.user) throw new AuthError('User creation failed');

      return {
        user: authData.user,
        session: authData.session,
        needsEmailConfirmation: !authData.session,
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Signup failed');
    }
  },

  // Sign in user
  async signIn(data: SignInData) {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw new AuthError(error.message, error.message);
      if (!authData.user) throw new AuthError('Login failed');

      return {
        user: authData.user,
        session: authData.session,
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Login failed');
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw new AuthError(error.message);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Logout failed');
    }
  },

  // Reset password
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw new AuthError(error.message);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Password reset failed');
    }
  },

  // Update password
  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw new AuthError(error.message);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Password update failed');
    }
  },

  // OAuth sign in
  async signInWithOAuth(provider: 'google' | 'github') {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw new AuthError(error.message);
      return data;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(`${provider} login failed`);
    }
  },

  // Get current session
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw new AuthError(error.message);
      return data.session;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Session retrieval failed');
    }
  },

  // Get current user with profile
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw new AuthError(error.message);
      if (!user) return null;

      // Get user profile from our database
      const { data: profile, error: profileError } = await supabase
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
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return null;
      }

      return { user, profile };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('User retrieval failed');
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Server-side: Get user from session token
  async getServerUser(sessionToken: string) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(sessionToken);
      if (error) throw new AuthError(error.message);
      return user;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Server user retrieval failed');
    }
  },
};