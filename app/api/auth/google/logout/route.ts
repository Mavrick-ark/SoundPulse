import { NextRequest, NextResponse } from 'next/server';
import { clearUserSession, getUserSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (session?.accessToken) {
      // Best-effort revoke token with Google
      fetch(`https://oauth2.googleapis.com/revoke?token=${session.accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => {});
    }

    await clearUserSession();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Logout error:', err);
    return NextResponse.json({ error: err.message || 'Logout failed' }, { status: 500 });
  }
}
