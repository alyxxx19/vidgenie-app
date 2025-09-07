'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { secureLog } from '@/lib/secure-logger';
import { type User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  creditsBalance: number;
  planId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // DEV MODE: Auto-login for development
    if (process.env.NODE_ENV === 'development') {
      const devUser = {
        id: 'dev-user-1',
        email: 'dev@vidgenie.com',
        name: 'Développeur',
        creditsBalance: 1000,
        planId: 'pro',
      };
      setUser(devUser);
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      // Create a user object from Supabase user
      const userData = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || supabaseUser.email!.split('@')[0],
        creditsBalance: 1000,
        planId: 'pro',
      };
      
      setUser(userData);
      
      // Store in localStorage for persistence
      localStorage.setItem('supabase_user', JSON.stringify(userData));
    } catch (error) {
      secureLog.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear localStorage
      localStorage.removeItem('supabase_user');
      setUser(null);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword 
    }}>
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