import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { authRateLimit, getRateLimitIdentifier, applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const returnTo = searchParams.get('returnTo');
  const organizationId = searchParams.get('organizationId');

  try {
    // Apply rate limiting for auth endpoints
    const identifier = getRateLimitIdentifier(request);
    await applyRateLimit(
      authRateLimit,
      identifier,
      'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
    );
    const supabase = await createServerSupabaseClient();

    // Build redirect URL with custom parameters
    const redirectUrl = `${origin}/auth/callback`;
    const params = new URLSearchParams();
    if (returnTo) params.set('returnTo', returnTo);
    if (organizationId) params.set('organizationId', organizationId);
    const finalRedirectUrl = params.toString() ? `${redirectUrl}?${params.toString()}` : redirectUrl;

    // Initiate Google OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: finalRedirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google OAuth initiation error:', error);
      return redirect(`/auth/signin?error=${encodeURIComponent(error.message)}`);
    }

    if (data.url) {
      return redirect(data.url);
    }

    // Fallback redirect
    return redirect('/auth/signin?error=oauth_initiation_failed');
  } catch (error: any) {
    console.error('Google OAuth endpoint error:', error);
    
    // Handle rate limit errors specifically
    if (error.message && error.message.includes('Trop de')) {
      return redirect(`/auth/signin?error=${encodeURIComponent(error.message)}`);
    }
    
    return redirect('/auth/signin?error=oauth_server_error');
  }
}