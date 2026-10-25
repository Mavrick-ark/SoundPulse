import { NextRequest, NextResponse } from 'next/server';
import { verifyYouTubeMusicSession, normalizeCookies } from '@/lib/ytmusic-auth';
import { saveUserSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCookies = body?.cookies;

    if (!rawCookies || typeof rawCookies !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please provide session cookies.' },
        { status: 400 }
      );
    }

    let normalized: string;
    try {
      normalized = normalizeCookies(rawCookies);
    } catch (normErr: any) {
      return NextResponse.json(
        { success: false, error: normErr.message || 'Invalid cookie format.' },
        { status: 400 }
      );
    }

    const verification = await verifyYouTubeMusicSession(normalized);
    if (!verification.success || !verification.user) {
      return NextResponse.json(
        {
          success: false,
          error: verification.error || 'YouTube Music rejected the session credentials.',
        },
        { status: 401 }
      );
    }

    // Save session in encrypted httpOnly cookie
    await saveUserSession({
      user: {
        id: verification.user.id,
        name: verification.user.name,
        handle: verification.user.handle,
        avatarUrl: verification.user.avatarUrl,
        authType: 'ytmusic_cookie',
      },
      ytmCookies: normalized,
      authType: 'ytmusic_cookie',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      lastSyncedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      user: verification.user,
      message: `Connected successfully as ${verification.user.name}!`,
    });
  } catch (error: any) {
    console.error('YouTube Music Cookie auth error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to authenticate YouTube Music cookies.' },
      { status: 500 }
    );
  }
}
