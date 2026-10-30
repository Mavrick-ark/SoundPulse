import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getUserSession();
    if (session && session.user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: session.user.id,
          name: session.user.name,
          handle: session.user.handle,
          email: session.user.email || session.user.handle,
          avatarUrl: session.user.avatarUrl,
          authType: session.authType || session.user.authType || 'ytmusic_cookie',
        },
        lastSyncedAt: session.lastSyncedAt,
      });
    }
    return NextResponse.json({ authenticated: false });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
