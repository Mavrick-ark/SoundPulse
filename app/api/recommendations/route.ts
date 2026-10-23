import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeMusicRecommendations } from '@/lib/ytmusic';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seedArtist = searchParams.get('artist')?.trim() || '';
    const seedTrack = searchParams.get('track')?.trim() || '';
    const mood = searchParams.get('mood')?.toLowerCase().trim() || '';
    const limit = Math.min(25, parseInt(searchParams.get('limit') || '12', 10));

    const seed = seedTrack ? `${seedTrack} ${seedArtist}` : seedArtist || 'top hits';

    // Fetch official songs and authentic play counts directly from YouTube Music catalog
    const tracks = await getYouTubeMusicRecommendations(seed, mood, limit);

    return NextResponse.json({
      success: true,
      query: seed,
      count: tracks.length,
      tracks,
    });
  } catch (error: any) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch recommendations', tracks: [] },
      { status: 500 }
    );
  }
}
