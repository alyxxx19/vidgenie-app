import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/supabase/types';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(`${origin}/auth/signin?error=${encodeURIComponent(error_description || error)}`);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    try {
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) {
        return NextResponse.redirect(`${origin}/auth/signin?error=${encodeURIComponent(sessionError.message)}`);
      }

      if (data.session) {
        // Redirect immediately - trigger runs async in background
        const response = NextResponse.redirect(`${origin}${next}`);
        return response;
      }
    } catch (err) {
      return NextResponse.redirect(`${origin}/auth/signin?error=callback_failed`);
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/auth/signin?error=no_code`);
}