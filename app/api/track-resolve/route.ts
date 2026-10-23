import { NextRequest, NextResponse } from 'next/server';
import { resolveYouTubeVideoId } from '@/lib/search/youtube-resolver';
import { proxiedFetch } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

// Helper to fetch verified synced lyrics from LRCLIB using proxied fetch
async function resolveLyrics(
  title: string,
  artist?: string
): Promise<{ lyrics: string | null; synced_lyrics: string | null }> {
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

    const res = await proxiedFetch(lrcUrl, {
      timeoutMs: 6000,
      headers: { 'User-Agent': 'SoundPulse/1.0' },
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      const item = Array.isArray(data) ? data[0] : data;
      if (item) {
        return {
          lyrics: item.plainLyrics || null,
          synced_lyrics: item.syncedLyrics || null,
        };
      }
    }
  } catch (e: any) {
    console.warn('LRCLIB resolve error:', e.message);
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

    // Parallel fetch: Ban-proof YouTube Video ID resolver + Synced lyrics from LRCLIB
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
