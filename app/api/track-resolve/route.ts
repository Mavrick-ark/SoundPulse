import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper to extract YouTube Video ID from search results
async function resolveYouTubeVideoId(query: string, apiKey?: string): Promise<string | null> {
  // If official API key is provided, use YouTube Data API
  if (apiKey && apiKey !== 'your_youtube_api_key_here') {
    try {
      const u = new URL('https://www.googleapis.com/youtube/v3/search');
      u.searchParams.set('part', 'snippet');
      u.searchParams.set('type', 'video');
      u.searchParams.set('q', `${query} official audio`);
      u.searchParams.set('maxResults', '1');
      u.searchParams.set('videoCategoryId', '10');
      u.searchParams.set('key', apiKey);
      const res = await fetch(u.toString());
      if (res.ok) {
        const data = await res.json();
        const vId = data.items?.[0]?.id?.videoId;
        if (vId) return vId;
      }
    } catch (_) {}
  }

  // Resilient fallback: Query YouTube Search endpoint directly
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' audio')}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const html = await res.text();
      // Match first /watch?v=VIDEO_ID
      const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (err) {
    console.warn('YouTube scraping fallback error:', err);
  }

  return null;
}

// Helper to fetch verified synced lyrics from LRCLIB
async function resolveLyrics(title: string, artist?: string): Promise<{ lyrics: string | null; synced_lyrics: string | null }> {
  const cleanTitle = (title || '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*\[.*?\]\s*/g, ' ')
    .trim();
  const cleanArtist = (artist || '').trim();

  try {
    let lrcUrl = '';
    if (cleanArtist && cleanArtist !== 'Custom Artist' && cleanArtist !== 'Unknown Artist') {
      lrcUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
    } else {
      lrcUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`;
    }

    const res = await fetch(lrcUrl, {
      headers: { 'User-Agent': 'SoundPulse/1.0' },
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data = await res.json();
      const item = Array.isArray(data) ? data[0] : data;
      if (item) {
        return {
          lyrics: item.plainLyrics || null,
          synced_lyrics: item.syncedLyrics || null,
        };
      }
    }
  } catch (e) {
    console.warn('LRCLIB resolve error:', e);
  }

  return { lyrics: null, synced_lyrics: null };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || '';
    const artist = searchParams.get('artist') || '';

    if (!title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY?.trim();
    const query = artist ? `${artist} - ${title}` : title;

    // Parallel fetch: YouTube Video ID for full original track + Synced lyrics from LRCLIB
    const [youtube_id, lyricsData] = await Promise.all([
      resolveYouTubeVideoId(query, apiKey),
      resolveLyrics(title, artist),
    ]);

    return NextResponse.json({
      title,
      artist,
      youtube_id,
      lyrics: lyricsData.lyrics,
      synced_lyrics: lyricsData.synced_lyrics,
    });
  } catch (err: any) {
    console.error('Track resolve error:', err);
    return NextResponse.json({ error: err.message || 'Resolve failed' }, { status: 500 });
  }
}
