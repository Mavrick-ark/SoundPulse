import { proxiedFetch } from '@/lib/proxy';

// Healthy Invidious & Piped API mirrors for privacy-friendly, ban-resistant YouTube lookups
const INVIDIOUS_INSTANCES = [
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de',
  'https://invidious.drgns.space',
  'https://yt.artemislena.eu',
  'https://invidious.flokinet.to',
];

// In-memory cache for resolved track queries to minimize external queries
const resolutionCache = new Map<string, { videoId: string; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function resolveYouTubeVideoId(
  query: string,
  apiKey?: string
): Promise<string | null> {
  const normalizedKey = query.trim().toLowerCase();

  // 1. Check in-memory cache
  const cached = resolutionCache.get(normalizedKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.videoId;
  }

  // 2. Try official YouTube Data API v3 (if configured)
  if (apiKey && apiKey !== 'your_youtube_api_key_here') {
    try {
      const u = new URL('https://www.googleapis.com/youtube/v3/search');
      u.searchParams.set('part', 'snippet');
      u.searchParams.set('type', 'video');
      u.searchParams.set('q', `${query} official audio`);
      u.searchParams.set('maxResults', '1');
      u.searchParams.set('videoCategoryId', '10');
      u.searchParams.set('key', apiKey);

      const res = await proxiedFetch(u.toString(), { timeoutMs: 5000, maxRetries: 1 });
      if (res.ok) {
        const data = (await res.json()) as any;
        const vId = data.items?.[0]?.id?.videoId;
        if (vId) {
          resolutionCache.set(normalizedKey, { videoId: vId, timestamp: Date.now() });
          return vId;
        }
      }
    } catch (e: any) {
      console.warn('[Resolver] YouTube API failed, falling back:', e.message);
    }
  }

  // 3. Try Invidious API instances (ban-proof public mirror layer)
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const invUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query + ' audio')}&type=video`;
      const res = await proxiedFetch(invUrl, { timeoutMs: 4000, maxRetries: 0 });
      if (res.ok) {
        const items = (await res.json()) as any[];
        if (Array.isArray(items) && items.length > 0 && items[0].videoId) {
          const vId = items[0].videoId;
          resolutionCache.set(normalizedKey, { videoId: vId, timestamp: Date.now() });
          return vId;
        }
      }
    } catch (_) {
      // Continue to next mirror instance
    }
  }

  // 4. Fallback: Direct YouTube Search scraping using Proxied Fetch & Desktop User-Agent
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' audio')}`;
    const res = await proxiedFetch(searchUrl, {
      timeoutMs: 8000,
      maxRetries: 2,
    });

    if (res.ok) {
      const html = await res.text();
      // Match first /watch?v=VIDEO_ID
      const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        const vId = match[1];
        resolutionCache.set(normalizedKey, { videoId: vId, timestamp: Date.now() });
        return vId;
      }
    }
  } catch (err: any) {
    console.warn('[Resolver] YouTube direct scraping error:', err.message);
  }

  return null;
}
