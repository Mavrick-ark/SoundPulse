import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const isConfigured = Boolean(clientId && clientId !== 'your_google_client_id_here');

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        isConfigured,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      lastSyncedAt: session.lastSyncedAt || null,
      isConfigured: true,
    });
  } catch (error: any) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false, isConfigured: false }, { status: 500 });
  }
}
