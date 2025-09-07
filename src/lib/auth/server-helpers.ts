import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { secureLog } from '@/lib/secure-logger';

export const requireAuth = cache(async (redirectTo?: string) => {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    const redirectUrl = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '';
    redirect(`/auth/signin${redirectUrl}`);
  }
  
  return user;
});

export const getAuthUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
});

export const getAuthUserWithProfile = cache(async () => {
  const user = await getAuthUser();
  if (!user) return null;
  
  const supabase = await createServerSupabaseClient();
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
});