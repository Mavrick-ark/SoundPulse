import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeMusicHomeShelves } from '@/lib/ytmusic';
import { getUserSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    const cookies = session?.ytmCookies;

    const shelves = await getYouTubeMusicHomeShelves(cookies);

    return NextResponse.json({
      success: true,
      count: shelves.length,
      shelves,
    });
  } catch (err: any) {
    console.error('YTM Home API error:', err);
    return NextResponse.json({ success: false, error: err.message, shelves: [] }, { status: 500 });
  }
}
