import { supabase } from './supabase';
import { db } from '@/server/api/db';
import { secureLog } from '@/lib/secure-logger';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export async function signUp(email: string, password: string, name?: string) {
  try {
    // Create Supabase auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('User creation failed');

    // Create user in our database
    const dbUser = await db.user.create({
      data: {
        id: data.user.id,
        email: data.user.email!,
        name: name || email.split('@')[0],
        creditsBalance: 100, // Free credits on signup
        planId: 'free',
      },
    });

    return { user: dbUser, session: data.session };
  } catch (error) {
    secureLog.security('Signup error:', error);
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Login failed');

    // Get or create user in our database
    let dbUser = await db.user.findUnique({
      where: { id: data.user.id },
    });

    if (!dbUser) {
      dbUser = await db.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.email!.split('@')[0],
          creditsBalance: 100,
          planId: 'free',
        },
      });
    }

    return { user: dbUser, session: data.session };
  } catch (error) {
    secureLog.security('Signin error:', error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    include: { plan: true },
  });

  return dbUser;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });
  
  if (error) throw error;
}