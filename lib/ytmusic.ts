import { Song } from '@/types/music';
import { proxiedFetch } from '@/lib/proxy';
import { generateSapisidHash } from '@/lib/ytmusic-auth';

export interface YTMTrack {
  song_id: number;
  song_name: string;
  artist_name: string;
  album_name: string;
  duration: number;
  likes: number;
  play_count: number;
  cover_url: string;
  youtube_id: string;
  reason?: string;
  category?: string;
}

// Convert "1.2B plays", "450M plays", "23K plays" into a number
export function parsePlayCountString(playStr?: string): number {
  if (!playStr) return 15000000;
  const match = playStr.match(/([\d.]+)\s*([KkMmBb])?/);
  if (!match) return 15000000;
  const num = parseFloat(match[1]);
  const unit = match[2]?.toUpperCase();
  if (unit === 'B') return Math.round(num * 1000000000);
  if (unit === 'M') return Math.round(num * 1000000);
  if (unit === 'K') return Math.round(num * 1000);
  return Math.round(num);
}

// Turn YouTube Music thumbnail into high-res 600x600 square cover
export function upgradeYTMThumbnail(url?: string): string {
  if (!url) {
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop';
  }
  return url.replace(/=w\d+-h\d+[^/]*$/, '=w600-h600-l90-rj');
}

/**
 * Searches exclusively within YouTube Music ('WEB_REMIX' client).
 * Only returns official Song tracks, strictly excluding general YouTube videos.
 */
export async function searchYouTubeMusic(query: string, limit: number = 15): Promise<YTMTrack[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const postBody = {
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20240101.01.00',
        hl: 'en',
        gl: 'US',
      },
    },
    query: cleanQuery,
  };

  try {
    const res = await proxiedFetch('https://music.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(postBody),
      timeoutMs: 8000,
      maxRetries: 1,
    });

    if (!res.ok) {
      console.warn('[YTM] Search failed with status:', res.status);
      return [];
    }

    const data = (await res.json()) as any;
    const sections =
      data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.sectionListRenderer?.contents || [];

    const tracks: YTMTrack[] = [];
    const seenIds = new Set<string>();

    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const renderer = item?.musicResponsiveListItemRenderer;
        if (!renderer) continue;

        const flex = renderer.flexColumns || [];
        if (flex.length === 0) continue;

        const titleRuns =
          flex[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const songName = titleRuns[0]?.text?.trim();

        const runs1 =
          flex[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        // YouTube Music labels official songs as "Song" in the first run
        const isOfficialSong = runs1[0]?.text === 'Song';
        if (!isOfficialSong) continue;

        // Extract artist
        const artist =
          runs1.find(
            (r: any) =>
              r.text !== 'Song' &&
              r.text !== ' • ' &&
              r.navigationEndpoint?.browseEndpoint
          )?.text ||
          runs1.find((r: any) => r.text !== 'Song' && r.text !== ' • ')?.text ||
          'Unknown Artist';

        // Extract video ID strictly from official music play or item data
        const videoId =
          renderer.playlistItemData?.videoId ||
          renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
            ?.playNavigationEndpoint?.watchEndpoint?.videoId;

        if (!videoId || seenIds.has(videoId) || !songName) continue;
        seenIds.add(videoId);

        // Extract real YouTube Music stream count if available
        const playsRun =
          flex[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        const playCount = parsePlayCountString(playsRun);

        // Cover artwork
        const thumbs =
          renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        const rawThumb = thumbs[thumbs.length - 1]?.url;
        const coverUrl = upgradeYTMThumbnail(rawThumb);

        // Generate deterministic numeric ID from videoId
        let numId = 0;
        for (let i = 0; i < videoId.length; i++) {
          numId = (numId * 31 + videoId.charCodeAt(i)) % 2147483647;
        }

        tracks.push({
          song_id: Math.abs(numId),
          song_name: songName,
          artist_name: artist,
          album_name: 'YouTube Music',
          duration: 210, // Defaults to standard track duration until AudioEngine loads
          likes: Math.min(9999, Math.round(playCount / 100000) + 120),
          play_count: playCount,
          cover_url: coverUrl,
          youtube_id: videoId,
        });

        if (tracks.length >= limit) break;
      }
      if (tracks.length >= limit) break;
    }

    return tracks;
  } catch (err: any) {
    console.error('[YTM] Search error:', err.message);
    return [];
  }
}

/**
 * Resolves an exact official YouTube Music track videoId by title and artist.
 * Guaranteed to return an official song ID from music.youtube.com, never a random YouTube video.
 */
export async function resolveOfficialYTMTrack(
  title: string,
  artist?: string
): Promise<{ videoId: string; coverUrl?: string; artist?: string; songName?: string } | null> {
  const query = artist ? `${title} ${artist}` : title;
  const results = await searchYouTubeMusic(query, 5);

  if (results.length > 0) {
    // Exact or best match
    const best = results[0];
    return {
      videoId: best.youtube_id,
      coverUrl: best.cover_url,
      artist: best.artist_name,
      songName: best.song_name,
    };
  }

  return null;
}

/**
 * Fetch genuine YouTube Music recommendations for a given seed track or artist.
 * 100% sourced from YouTube Music catalog.
 */
export async function getYouTubeMusicRecommendations(
  seedArtistOrTrack: string,
  mood?: string,
  limit: number = 12
): Promise<YTMTrack[]> {
  const moodQueryMap: Record<string, string> = {
    relax: 'acoustic chill relaxing peaceful music',
    workout: 'high energy gym workout motivation music',
    focus: 'deep focus lofi study instrumental beats',
    energize: 'popular dance pop party hits',
    trending: 'top hits music trending global',
  };

  let query = seedArtistOrTrack;
  let reason = `Recommended by YouTube Music based on ${seedArtistOrTrack}`;

  if (mood && moodQueryMap[mood.toLowerCase()]) {
    query = moodQueryMap[mood.toLowerCase()];
    reason = `Curated for ${mood} from YouTube Music`;
  } else if (seedArtistOrTrack) {
    query = `${seedArtistOrTrack} songs`;
    reason = `Because you listened to ${seedArtistOrTrack}`;
  } else {
    query = 'top hits 2026';
    reason = 'Trending on YouTube Music';
  }

  const tracks = await searchYouTubeMusic(query, limit);

  return tracks.map((t) => ({
    ...t,
    reason,
    category: mood ? mood.toUpperCase() : 'RECOMMENDED',
  }));
}

export function parseDurationString(str?: string): number {
  if (!str) return 210;
  const parts = str.split(':').map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 210;
}

export interface YTMShelf {
  title: string;
  subtitle?: string;
  tracks: YTMTrack[];
}

/**
 * Pure YouTube Music Radio queue implementation matching LastWave-Native's PureRadioQueue.
 * Queries /youtubei/v1/next with the RDAMVM playlist to retrieve YouTube Music's authentic automix radio.
 */
export async function getYouTubeMusicRadioQueue(
  seedVideoId: string,
  options?: {
    existingVideoIds?: string[];
    limit?: number;
    cookies?: string;
  }
): Promise<YTMTrack[]> {
  if (!seedVideoId) return [];

  const limit = options?.limit || 25;
  const existingSet = new Set<string>(options?.existingVideoIds || []);
  existingSet.add(seedVideoId);

  const postBody = {
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20240101.01.00',
        hl: 'en',
        gl: 'US',
      },
    },
    videoId: seedVideoId,
    playlistId: `RDAMVM${seedVideoId}`,
    isAudioOnly: true,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  if (options?.cookies) {
    const authHeader = generateSapisidHash(options.cookies);
    if (authHeader) {
      headers['Authorization'] = authHeader;
      headers['Cookie'] = options.cookies;
      headers['X-Origin'] = 'https://music.youtube.com';
    }
  }

  try {
    const res = await proxiedFetch('https://music.youtube.com/youtubei/v1/next', {
      method: 'POST',
      headers,
      body: JSON.stringify(postBody),
      timeoutMs: 9000,
      maxRetries: 1,
    });

    if (!res.ok) {
      console.warn('[YTM Radio] next endpoint failed with status:', res.status);
      return [];
    }

    const data = (await res.json()) as any;
    const contents =
      data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer
        ?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents || [];

    const tracks: YTMTrack[] = [];
    const seenBatch = new Set<string>();

    for (const item of contents) {
      const r = item?.playlistPanelVideoRenderer;
      if (!r || !r.videoId) continue;

      const videoId = r.videoId;
      if (existingSet.has(videoId) || seenBatch.has(videoId)) continue;
      seenBatch.add(videoId);

      const title = r.title?.runs?.[0]?.text?.trim() || 'Unknown Track';
      const bylineFull =
        r.longBylineText?.runs?.map((x: any) => x.text).join('') || '';
      // Artist is typically before the first bullet " • "
      const artist = bylineFull.split('•')[0]?.trim() || 'YouTube Music';
      const lengthStr = r.lengthText?.runs?.[0]?.text;
      const duration = parseDurationString(lengthStr);

      const thumbs = r.thumbnail?.thumbnails || [];
      const rawThumb = thumbs[thumbs.length - 1]?.url;
      const coverUrl = upgradeYTMThumbnail(rawThumb);

      let numId = 0;
      for (let i = 0; i < videoId.length; i++) {
        numId = (numId * 31 + videoId.charCodeAt(i)) % 2147483647;
      }

      tracks.push({
        song_id: Math.abs(numId),
        song_name: title,
        artist_name: artist,
        album_name: 'YouTube Music Radio',
        duration,
        likes: Math.min(9999, Math.round(duration * 25) + 300),
        play_count: 5000000,
        cover_url: coverUrl,
        youtube_id: videoId,
        reason: 'YouTube Music Automix Radio',
        category: 'RADIO',
      });

      if (tracks.length >= limit) break;
    }

    return tracks;
  } catch (err: any) {
    console.error('[YTM Radio] Error fetching queue:', err.message);
    return [];
  }
}

/**
 * Fetches real YouTube Music Home sections ('Quick picks', 'Trending', etc.).
 * If user cookies are supplied, returns personalized shelves ('Listen again', 'Mixed for you').
 */
export async function getYouTubeMusicHomeShelves(cookies?: string): Promise<YTMShelf[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  if (cookies) {
    const authHeader = generateSapisidHash(cookies);
    if (authHeader) {
      headers['Authorization'] = authHeader;
      headers['Cookie'] = cookies;
      headers['X-Origin'] = 'https://music.youtube.com';
    }
  }

  try {
    const res = await proxiedFetch('https://music.youtube.com/youtubei/v1/browse', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20240101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        browseId: 'FEmusic_home',
      }),
      timeoutMs: 9000,
    });

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as any;
    const tabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
    const sections =
      tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    const shelves: YTMShelf[] = [];

    for (const section of sections) {
      const shelf =
        section?.musicCarouselShelfRenderer ||
        section?.musicImmersiveCarouselShelfRenderer;
      if (!shelf) continue;

      const title =
        shelf?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs
          ?.map((r: any) => r.text)
          .join('') || 'Featured on YouTube Music';
      const subtitle =
        shelf?.header?.musicCarouselShelfBasicHeaderRenderer?.strapline?.runs
          ?.map((r: any) => r.text)
          .join('') || undefined;

      const contents = shelf?.contents || [];
      const tracks: YTMTrack[] = [];

      for (const item of contents) {
        const r =
          item?.musicResponsiveListItemRenderer || item?.musicTwoRowItemRenderer;
        if (!r) continue;

        const videoId =
          r?.playlistItemData?.videoId ||
          r?.overlay?.musicItemThumbnailOverlayRenderer?.content
            ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint
            ?.videoId ||
          r?.navigationEndpoint?.watchEndpoint?.videoId;

        if (!videoId) continue;

        let songName = '';
        let artist = 'YouTube Music';

        if (r.flexColumns) {
          songName =
            r.flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text
              ?.runs?.[0]?.text?.trim() || '';
          artist =
            r.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text
              ?.runs?.[0]?.text?.trim() || 'YouTube Music';
        } else if (r.title) {
          songName = r.title?.runs?.[0]?.text?.trim() || '';
          artist = r.subtitle?.runs?.[0]?.text?.trim() || 'YouTube Music';
        }

        if (!songName) continue;

        const thumbs =
          r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
          r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
          [];
        const rawThumb = thumbs[thumbs.length - 1]?.url;
        const coverUrl = upgradeYTMThumbnail(rawThumb);

        let numId = 0;
        for (let i = 0; i < videoId.length; i++) {
          numId = (numId * 31 + videoId.charCodeAt(i)) % 2147483647;
        }

        tracks.push({
          song_id: Math.abs(numId),
          song_name: songName,
          artist_name: artist,
          album_name: title,
          duration: 210,
          likes: 850,
          play_count: 5000000,
          cover_url: coverUrl,
          youtube_id: videoId,
          reason: title,
          category: 'HOME',
        });

        if (tracks.length >= 10) break;
      }

      if (tracks.length > 0) {
        shelves.push({
          title,
          subtitle,
          tracks,
        });
      }
    }

    return shelves;
  } catch (err: any) {
    console.warn('[YTM Home] Error fetching home shelves:', err.message);
    return [];
  }
}
