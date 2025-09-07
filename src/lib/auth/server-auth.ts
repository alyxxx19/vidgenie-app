import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { secureLog } from '@/lib/secure-logger';
import type { Database } from '@/lib/supabase/types';

// Server-side Supabase client for API routes
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient<Database>(supabaseUrl, supabaseKey);
}

// Server-side auth verification
export async function getServerUser(request: Request) {
  try {
    secureLog.info('[SERVER-AUTH] Starting auth verification');
    
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    
    // Log des cookies pour debug (sans valeurs sensibles)
    secureLog.info('[SERVER-AUTH] Available cookies:', allCookies.map(c => c.name));
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      secureLog.security('[SERVER-AUTH] Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      });
      return null;
    }
    
    // Create Supabase client for server-side auth
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return allCookies.map(({ name, value }) => ({ name, value }));
        },
      },
    });
    
    secureLog.info('[SERVER-AUTH] Calling supabase.auth.getUser()');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      secureLog.security('[SERVER-AUTH] Supabase auth error:', {
        message: error.message,
        name: error.name,
        status: error.status
      });
      return null;
    }
    
    if (!user) {
      secureLog.info('[SERVER-AUTH] No user found in session');
      return null;
    }
    
    secureLog.info('[SERVER-AUTH] User authenticated:', {
      id: user.id,
      email: user.email,
      hasSession: true
    });
    
    return user;
  } catch (error) {
    secureLog.security('[SERVER-AUTH] Unexpected error during auth verification:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}