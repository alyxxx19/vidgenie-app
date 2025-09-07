import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { secureLog } from '@/lib/secure-logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Server-side client with service role (admin access)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Server-side client for user context (respects RLS)
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// Cached user retrieval for server components
export const getUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    secureLog.error('Error getting user:', error);
    return null;
  }
});

// Cached user profile retrieval
export const getUserProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  
  const supabase = await createServerSupabaseClient();
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      secureLog.error('Error getting user profile:', error);
      return { ...user, profile: null };
    }
    
    return { ...user, profile };
  } catch (error) {
    secureLog.error('Error getting user profile:', error);
    return { ...user, profile: null };
  }
});