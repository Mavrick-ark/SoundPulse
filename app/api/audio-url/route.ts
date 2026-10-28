import { NextRequest, NextResponse } from 'next/server';
import { Client, Ytdl } from '@distube/ytdl-core';

export const dynamic = 'force-dynamic';

const ytdl = new Ytdl({ clients: [Client.VisionOS] });
const cache = new Map<string, { url: string; expires: number; duration: number }>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Check cache
    const cached = cache.get(videoId);
    if (cached && Date.now() < cached.expires) {
      return NextResponse.json({ url: cached.url, duration: cached.duration });
    }

    const info = await ytdl.getInfo(videoId);
    const audioFormats = info.formats.filter((f) => f.hasAudio && !f.hasVideo);

    // Prefer mp4/m4a (aac) for universal mobile and browser hardware decoding
    let chosen = audioFormats.find((f) => f.mimeType?.includes('mp4') || f.container === 'm4a');
    if (!chosen && audioFormats.length > 0) {
      chosen = audioFormats[0];
    }

    if (!chosen || !chosen.url) {
      return NextResponse.json({ error: 'No direct audio format found' }, { status: 404 });
    }

    const duration = typeof info.videoDetails.lengthSeconds === 'number'
      ? info.videoDetails.lengthSeconds
      : parseInt(String(info.videoDetails.lengthSeconds || '0'), 10);
    // Cache for 4 hours
    cache.set(videoId, {
      url: chosen.url,
      expires: Date.now() + 1000 * 60 * 60 * 4,
      duration,
    });

    return NextResponse.json({
      url: chosen.url,
      duration,
      mimeType: chosen.mimeType,
      title: info.videoDetails.title,
    });
  } catch (err: any) {
    console.warn('[AudioUrl Resolver Warning]:', err.message);
    return NextResponse.json({ error: err.message || 'Extraction failed' }, { status: 500 });
  }
}
