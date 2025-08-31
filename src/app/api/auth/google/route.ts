import { NextRequest, NextResponse } from 'next/server';
import { googleOAuthService } from '@/lib/auth/google-oauth';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get('returnTo') || '/dashboard';
    const organizationId = searchParams.get('organizationId') || undefined;

    // Generate secure OAuth URL with state
    const authUrl = await googleOAuthService.getAuthUrl({
      returnTo,
      organizationId
    });

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    
    return NextResponse.json(
      { 
        error: 'OAuth initiation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL;

    // Parse request body
    const body = await request.json();
    const { code, state, error: oauthError } = body;

    // Handle OAuth errors
    if (oauthError) {
      const errorMessages: Record<string, string> = {
        'access_denied': 'User denied access to Google account',
        'invalid_request': 'Invalid OAuth request parameters',
        'unauthorized_client': 'Unauthorized OAuth client',
        'unsupported_response_type': 'Unsupported OAuth response type',
        'invalid_scope': 'Invalid OAuth scope',
        'server_error': 'Google OAuth server error',
        'temporarily_unavailable': 'Google OAuth temporarily unavailable'
      };

      return NextResponse.json(
        { 
          error: 'oauth_error',
          message: errorMessages[oauthError] || 'OAuth authentication failed'
        },
        { status: 400 }
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing required OAuth parameters' },
        { status: 400 }
      );
    }

    // Exchange code for tokens and profile
    const { tokens, profile, stateData } = await googleOAuthService.exchangeCodeForTokens(code, state);

    // Create or update user in Supabase
    const { user, session, isNewUser } = await googleOAuthService.createOrUpdateUser(profile, tokens);

    // Prepare response data
    const responseData = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || profile.name,
        picture: user.user_metadata?.picture || profile.picture
      },
      isNewUser,
      returnTo: stateData.returnTo || '/dashboard'
    };

    // Set session cookies
    const response = NextResponse.json(responseData);
    
    if (session.access_token) {
      response.cookies.set('sb-access-token', session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: session.expires_in || 3600,
        path: '/'
      });
    }

    if (session.refresh_token) {
      response.cookies.set('sb-refresh-token', session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/'
      });
    }

    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    
    return NextResponse.json(
      { 
        error: 'oauth_callback_failed',
        message: error instanceof Error ? error.message : 'OAuth callback processing failed'
      },
      { status: 500 }
    );
  }
}