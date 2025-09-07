'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

type UserProfile = Tables<'users'>;

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Load user profile
  const loadUserProfile = async (currentUser: SupabaseUser | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        // Profile might not exist yet for new OAuth users
        if (error.code === 'PGRST116') {
          // No rows found - profile will be created by database trigger
          // Just set profile to null for now
          setProfile(null);
          return;
        }
        
        // Other database errors
        console.error('Error loading user profile:', error.message || error);
        setProfile(null);
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (!user) return;
    await loadUserProfile(user);
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        await loadUserProfile(session?.user ?? null);
      }
      
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Auth state changed
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error };
      }
      
      if (data.user) {
        // Force a profile reload after signin
        await loadUserProfile(data.user);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Signin catch error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        return { error };
      }
      
      // No delay - trigger runs async in background
      
      return { error: null };
    } catch (error) {
      console.error('Signup catch error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
    }
    
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsLoading(false);
    
    // Redirect to home page after signout
    window.location.href = '/';
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      return { error };
    } catch (error) {
      console.error(`OAuth ${provider} catch error:`, error);
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    profile,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    resetPassword,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}