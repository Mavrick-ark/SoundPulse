import { NextRequest, NextResponse } from 'next/server';
import { verifyOAuthState, saveUserSession, OAuthUser, StoredSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user cancellation or denial
  if (error) {
    console.warn('Google OAuth error from provider:', error);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/?auth_error=missing_code_or_state', req.url)
    );
  }

  // Validate CSRF state
  const isStateValid = await verifyOAuthState(state);
  if (!isStateValid) {
    return NextResponse.redirect(
      new URL('/?auth_error=csrf_validation_failed', req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  
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

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/?auth_error=missing_server_credentials', req.url)
    );
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Google token exchange error:', errBody);
      return NextResponse.redirect(
        new URL('/?auth_error=token_exchange_failed', req.url)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    // 2. Fetch authenticated Google user profile
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let userInfo: any = {};
    if (userinfoRes.ok) {
      userInfo = await userinfoRes.json();
    }

    // 3. Fetch authenticated user's YouTube Channel info
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let channelId: string | undefined;
    let channelTitle: string | undefined;
    let channelAvatar: string | undefined;

    if (channelRes.ok) {
      const channelData = await channelRes.json();
      if (channelData.items?.[0]) {
        const ch = channelData.items[0];
        channelId = ch.id;
        channelTitle = ch.snippet?.title;
        channelAvatar =
          ch.snippet?.thumbnails?.high?.url ||
          ch.snippet?.thumbnails?.medium?.url ||
          ch.snippet?.thumbnails?.default?.url;
      }
    }

    const user: OAuthUser = {
      id: userInfo.sub || channelId || Date.now().toString(),
      email: userInfo.email,
      name: userInfo.name || channelTitle || 'Google User',
      avatarUrl: channelAvatar || userInfo.picture,
      channelId,
      channelTitle,
    };

    const session: StoredSession = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      user,
    };

    // 4. Save encrypted session in httpOnly cookie
    await saveUserSession(session);

    const htmlResponse = `<!DOCTYPE html>
<html>
  <head>
    <title>Google Authentication Successful</title>
    <style>
      body { background: #08090d; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { text-align: center; padding: 2rem; border-radius: 1.5rem; background: #121520; border: 1px solid rgba(255,255,255,0.1); }
      h3 { margin-bottom: 0.5rem; }
      p { color: #9ca3af; font-size: 0.875rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <h3>Connected with Google!</h3>
      <p>Closing window...</p>
    </div>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', user: ${JSON.stringify(user)} }, '*');
        setTimeout(() => window.close(), 600);
      } else {
        window.location.href = '/?auth=success';
      }
    </script>
  </body>
</html>`;

    return new NextResponse(htmlResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('OAuth callback execution exception:', err);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(err.message || 'unknown')}`, req.url)
    );
  }
}
