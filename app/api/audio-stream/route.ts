import { NextRequest, NextResponse } from 'next/server';
import { Ytdl } from '@distube/ytdl-core';

export const dynamic = 'force-dynamic';

const ytdl = new Ytdl();
const urlCache = new Map<string, { url: string; expires: number }>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return new NextResponse('Video ID is required', { status: 400 });
    }

    let streamUrl: string | null = null;
    const cached = urlCache.get(videoId);
    if (cached && Date.now() < cached.expires) {
      streamUrl = cached.url;
    } else {
      const info = await ytdl.getInfo(videoId);
      const audioFormats = info.formats.filter((f) => f.hasAudio && !f.hasVideo);
      let chosen = audioFormats.find((f) => f.mimeType?.includes('mp4') || f.container === 'm4a');
      if (!chosen && audioFormats.length > 0) {
        chosen = audioFormats[0];
      }
      if (chosen && chosen.url) {
        streamUrl = chosen.url;
        urlCache.set(videoId, {
          url: streamUrl,
          expires: Date.now() + 1000 * 60 * 60 * 4,
        });
      }
    }

    if (!streamUrl) {
      return new NextResponse('Stream URL not found', { status: 404 });
    }

    const rangeHeader = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (rangeHeader) {
      upstreamHeaders['range'] = rangeHeader;
    }

    const upstreamRes = await fetch(streamUrl, {
      headers: upstreamHeaders,
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || 'audio/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=14400');
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    if (upstreamRes.headers.get('content-range')) {
      responseHeaders.set('Content-Range', upstreamRes.headers.get('content-range')!);
    }
    if (upstreamRes.headers.get('content-length')) {
      responseHeaders.set('Content-Length', upstreamRes.headers.get('content-length')!);
    }

    return new NextResponse(upstreamRes.body as any, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.warn('[AudioStream Proxy Error]:', err.message);
    return new NextResponse(err.message || 'Stream proxy failed', { status: 500 });
  }
}
