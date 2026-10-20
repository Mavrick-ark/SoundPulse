import { NextRequest, NextResponse } from 'next/server';
import { saveUserSession, StoredSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || 'user@gmail.com';
    const name = body.name || (email.split('@')[0] ? email.split('@')[0].replace(/[._]/g, ' ') : 'Google User');

    const formattedName = name
      .split(' ')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const session: StoredSession = {
      accessToken: 'soundpulse_direct_session_token_' + Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
      user: {
        id: 'google_' + Date.now(),
        email,
        name: formattedName,
        channelTitle: formattedName + ' Channel',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=4f46e5&color=fff&size=128`,
      },
      lastSyncedAt: new Date().toISOString(),
    };

    await saveUserSession(session);

    return NextResponse.json({
      success: true,
      user: session.user,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Quick connect failed' }, { status: 500 });
  }
}
