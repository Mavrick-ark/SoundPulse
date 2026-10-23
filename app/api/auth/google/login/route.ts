import { NextRequest, NextResponse } from 'next/server';
import { createOAuthState } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  
  // Dynamically resolve redirect URI to match current environment (Vercel vs Localhost)
  const configuredUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const currentOrigin = `${proto}://${host}`;

  const redirectUri =
    configuredUri && !configuredUri.includes('localhost')
      ? configuredUri
      : currentOrigin.includes('localhost')
      ? configuredUri || `${currentOrigin}/api/auth/google/callback`
      : `${currentOrigin}/api/auth/google/callback`;

  // Verify credentials configuration
  if (!clientId || clientId === 'your_google_client_id_here') {
    return NextResponse.redirect(
      new URL('/?auth_error=missing_google_credentials', req.url)
    );
  }

  // Create cryptographic state to prevent CSRF
  const state = await createOAuthState();

  // Official Google OAuth 2.0 authorization URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set(
    'scope',
    'openid email profile https://www.googleapis.com/auth/youtube.readonly'
  );
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
