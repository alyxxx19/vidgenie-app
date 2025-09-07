import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const returnTo = searchParams.get('returnTo');
  const organizationId = searchParams.get('organizationId');

  try {
    const supabase = createClient();

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
  } catch (error) {
    console.error('Google OAuth endpoint error:', error);
    return redirect('/auth/signin?error=oauth_server_error');
  }
}