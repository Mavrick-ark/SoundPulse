import { NextRequest, NextResponse } from 'next/server';
import { proxiedFetch } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Only allow HTTP/HTTPS
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
    }

    // Forward relevant incoming headers (Range is vital for audio scrubbing)
    const forwardHeaders: Record<string, string> = {
      'User-Agent':
        req.headers.get('user-agent') ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };

    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      forwardHeaders['Range'] = rangeHeader;
    }

    // Fetch upstream using proxiedFetch
    const upstreamRes = await proxiedFetch(targetUrl, {
      headers: forwardHeaders,
      timeoutMs: 15000,
      maxRetries: 2,
    });

    // Prepare response headers
    const responseHeaders = new Headers();
    const allowedHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'last-modified',
      'etag',
    ];

    allowedHeaders.forEach((h) => {
      const val = upstreamRes.headers.get(h);
      if (val) responseHeaders.set(h, val);
    });

    // Ensure audio streaming support
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    if (!responseHeaders.has('accept-ranges')) {
      responseHeaders.set('accept-ranges', 'bytes');
    }

    return new Response(upstreamRes.body as any, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('[Proxy Error]:', err.message);
    return NextResponse.json(
      { error: 'Proxy request failed', details: err.message },
      { status: 502 }
    );
  }
}
