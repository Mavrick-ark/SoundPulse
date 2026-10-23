/**
 * SoundPulse Free Cloudflare Worker Proxy
 * 100% Free Forever (100,000 requests / day free tier)
 * Runs on Cloudflare's global edge network so your personal IP never gets banned.
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    if (!targetUrl) {
      return new Response('Usage: /?url=https://example.com/api', { status: 400 });
    }

    try {
      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      forwardHeaders.delete('host');

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: request.body,
        redirect: 'follow',
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Headers', '*');

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response('Proxy Error: ' + err.message, { status: 502 });
    }
  },
};
