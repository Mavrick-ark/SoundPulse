import { NextRequest, NextResponse } from 'next/server';
import { searchMusic } from '@/lib/search/provider';
import { SearchProviderType } from '@/types/music';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const provider = (searchParams.get('provider') || 'all') as SearchProviderType;
    const limitParam = searchParams.get('limit');
    const regionCode = searchParams.get('regionCode') || 'IN';
    const relevanceLanguage = searchParams.get('relevanceLanguage') || undefined;

    const limit = limitParam ? parseInt(limitParam, 10) : 25;

    if (!query.trim()) {
      return NextResponse.json({
        query: '',
        provider,
        tracks: [],
        artists: [],
        albums: [],
        videos: [],
        playlists: [],
      });
    }

    const results = await searchMusic(query, {
      provider,
      limit,
      regionCode,
      relevanceLanguage,
    });

    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('API /api/search error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error while searching music',
        tracks: [],
        artists: [],
        albums: [],
        videos: [],
        playlists: [],
      },
      { status: 500 }
    );
  }
}
