import { NextRequest, NextResponse } from 'next/server';
import { googleOAuthService, GoogleOAuthError } from '@/lib/auth/google-oauth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors from Google
    if (error) {
      const errorMessages: Record<string, string> = {
        'access_denied': 'Accès refusé par l\'utilisateur',
        'invalid_request': 'Paramètres OAuth invalides',
        'unauthorized_client': 'Client OAuth non autorisé',
        'unsupported_response_type': 'Type de réponse OAuth non supporté',
        'invalid_scope': 'Scope OAuth invalide',
        'server_error': 'Erreur serveur Google',
        'temporarily_unavailable': 'Service Google temporairement indisponible'
      };

      const errorMessage = errorMessages[error] || 'Authentification Google échouée';
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('error', errorMessage);
      
      return NextResponse.redirect(redirectUrl);
    }

    // Validate required parameters
    if (!code || !state) {
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('error', 'Paramètres OAuth manquants');
      return NextResponse.redirect(redirectUrl);
    }

    try {
      // Exchange authorization code for tokens
      const { tokens, profile, stateData } = await googleOAuthService.exchangeCodeForTokens(code, state);

      // Create or update user in Supabase
      const { user, session, isNewUser } = await googleOAuthService.createOrUpdateUser(profile, tokens);

      // Create redirect URL with success parameters
      const redirectUrl = new URL(stateData.returnTo || '/dashboard', request.url);
      
      if (isNewUser) {
        redirectUrl.searchParams.set('welcome', 'true');
      }

      // Create response with redirect
      const response = NextResponse.redirect(redirectUrl);

      // Set secure session cookies
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

      // Store user info in secure cookie for immediate access
      const userInfo = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || profile.name,
        picture: user.user_metadata?.picture || profile.picture,
        provider: 'google'
      };

      response.cookies.set('user-info', JSON.stringify(userInfo), {
        httpOnly: false, // Accessible via JavaScript for immediate UI updates
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/'
      });

      return response;
    } catch (error) {
      console.error('Google OAuth processing error:', error);
      
      let errorMessage = 'Erreur lors de l\'authentification Google';
      
      if (error instanceof GoogleOAuthError) {
        switch (error.code) {
          case 'STATE_EXPIRED':
            errorMessage = 'Session OAuth expirée, veuillez réessayer';
            break;
          case 'INVALID_STATE':
            errorMessage = 'État OAuth invalide, possible tentative d\'attaque';
            break;
          case 'INVALID_TOKENS':
            errorMessage = 'Tokens Google invalides';
            break;
          case 'USER_CREATE_FAILED':
            errorMessage = 'Échec de création du compte utilisateur';
            break;
          case 'SESSION_CREATE_FAILED':
            errorMessage = 'Échec de création de la session';
            break;
          default:
            errorMessage = error.message;
        }
      }

      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('error', errorMessage);
      
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('error', 'Erreur technique lors de l\'authentification');
    
    return NextResponse.redirect(redirectUrl);
  }
}

// Support for POST requests (if needed for some OAuth flows)
export async function POST(request: NextRequest) {
  return GET(request);
}