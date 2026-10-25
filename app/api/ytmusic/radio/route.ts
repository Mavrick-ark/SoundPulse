import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeMusicRadioQueue } from '@/lib/ytmusic';
import { getUserSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '25', 10));

    if (!videoId) {
      return NextResponse.json({ error: 'videoId parameter is required' }, { status: 400 });
    }

    const session = await getUserSession();
    const cookies = session?.ytmCookies;

    const tracks = await getYouTubeMusicRadioQueue(videoId, {
      limit,
      cookies,
    });

    return NextResponse.json({
      success: true,
      seedVideoId: videoId,
      count: tracks.length,
      tracks,
    });
  } catch (err: any) {
    console.error('YTM Radio API error:', err);
    return NextResponse.json({ success: false, error: err.message, tracks: [] }, { status: 500 });
  }
}
