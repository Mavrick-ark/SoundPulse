import {
  MusicTrack,
  MusicArtist,
  MusicAlbum,
  MusicVideo,
  MusicPlaylist,
  SearchResults,
  SearchOptions,
} from '@/types/music';
import { proxiedFetch } from '@/lib/proxy';

// Parse ISO 8601 duration (e.g., PT3M45S, PT1H2M10S, PT54S)
export function parseYouTubeDuration(isoDuration?: string): number {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Clean YouTube video titles: removes [Official Video], (Audio), etc.
export function cleanTrackTitle(rawTitle: string): { title: string; artist?: string } {
  if (!rawTitle) return { title: 'Unknown Title' };

  let title = rawTitle
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s*\[\s*(?:official\s*)?(?:music\s*)?(?:video|audio|lyrics|hd|4k|visualizer).*?\]\s*/gi, '')
    .replace(/\s*\(\s*(?:official\s*)?(?:music\s*)?(?:video|audio|lyric|lyrics|directed by|soundtrack|prod\.|remix).*?\)\s*/gi, '')
    .replace(/\b(?:official\s*video|official\s*music\s*video|official\s*audio|lyric\s*video|full\s*song)\b/gi, '')
    .trim();

  let artist: string | undefined;
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  return { title, artist };
}

// 1. YouTube Data API v3 Search Provider
export async function searchYouTubeProvider(
  query: string,
  apiKey: string,
  options: SearchOptions = {}
): Promise<{ tracks: MusicTrack[]; videos: MusicVideo[]; error?: string; quotaExceeded?: boolean }> {
  try {
    const limit = options.limit || 15;
    const regionCode = options.regionCode || 'IN';

    // Step 1: Search videos in Music Category (10)
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('maxResults', limit.toString());
    searchUrl.searchParams.set('videoCategoryId', '10'); // Music category
    searchUrl.searchParams.set('regionCode', regionCode);
    if (options.relevanceLanguage) {
      searchUrl.searchParams.set('relevanceLanguage', options.relevanceLanguage);
    }
    searchUrl.searchParams.set('key', apiKey);

    let searchRes = await proxiedFetch(searchUrl.toString(), { timeoutMs: 7000 });

    // Fallback: If 0 results with category 10, try general search
    if (searchRes.ok) {
      const data = (await searchRes.json()) as any;
      if (!data.items || data.items.length === 0) {
        searchUrl.searchParams.delete('videoCategoryId');
        searchRes = await proxiedFetch(searchUrl.toString(), { timeoutMs: 7000 });
      }
    }

    if (!searchRes.ok) {
      const errJson = await searchRes.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `YouTube API returned status ${searchRes.status}`;
      const isQuota = errJson?.error?.errors?.[0]?.reason === 'quotaExceeded' || searchRes.status === 403;
      return { tracks: [], videos: [], error: errMsg, quotaExceeded: isQuota };
    }

    const searchData = await searchRes.json();
    const items = searchData.items || [];
    const videoIds = items.map((it: any) => it.id?.videoId).filter(Boolean);

    if (videoIds.length === 0) {
      return { tracks: [], videos: [] };
    }

    // Step 2: Fetch detailed duration, snippet & statistics (views) metadata via videos.list
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'contentDetails,snippet,statistics');
    detailsUrl.searchParams.set('id', videoIds.join(','));
    detailsUrl.searchParams.set('key', apiKey);

    const detailsRes = await proxiedFetch(detailsUrl.toString(), { timeoutMs: 7000 });
    const detailsMap: Record<string, any> = {};

    if (detailsRes.ok) {
      const detailsData = await detailsRes.json();
      (detailsData.items || []).forEach((item: any) => {
        detailsMap[item.id] = item;
      });
    }

    const tracks: MusicTrack[] = [];
    const videos: MusicVideo[] = [];

    for (const item of items) {
      const vId = item.id?.videoId;
      if (!vId) continue;

      const details = detailsMap[vId] || item;
      const rawTitle = item.snippet?.title || 'Unknown Title';
      const channel = item.snippet?.channelTitle || 'YouTube Artist';
      const parsed = cleanTrackTitle(rawTitle);
      const thumbnail =
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url;

      const isoDur = details.contentDetails?.duration;
      const durationSeconds = parseYouTubeDuration(isoDur);

      const track: MusicTrack = {
        id: `yt:${vId}`,
        title: parsed.title,
        artist: parsed.artist || channel,
        duration: durationSeconds || 210,
        play_count: details.statistics?.viewCount ? parseInt(details.statistics.viewCount, 10) : undefined,
        artworkUrl: thumbnail,
        source: 'youtube',
        sourceUrl: `https://www.youtube.com/watch?v=${vId}`,
        providerId: vId,
        channelTitle: channel,
        description: item.snippet?.description,
        isPlayable: true,
      };
      tracks.push(track);

      videos.push({
        id: `yt-vid:${vId}`,
        title: rawTitle,
        channelTitle: channel,
        artworkUrl: thumbnail,
        duration: durationSeconds,
        publishedAt: item.snippet?.publishedAt,
        sourceUrl: `https://www.youtube.com/watch?v=${vId}`,
        providerId: vId,
      });
    }

    return { tracks, videos };
  } catch (err: any) {
    return { tracks: [], videos: [], error: err.message || 'Network error connecting to YouTube' };
  }
}

// 2. iTunes Music Provider (Official Public Music Catalog, No Key Required, High Quality Art)
export async function searchITunesProvider(
  query: string,
  options: SearchOptions = {}
): Promise<{ tracks: MusicTrack[]; artists: MusicArtist[]; albums: MusicAlbum[] }> {
  try {
    const limit = options.limit || 25;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=${limit}`;

    const res = await proxiedFetch(url, {
      headers: { 'User-Agent': 'SoundPulse/1.0' },
      timeoutMs: 6000,
    });

    if (!res.ok) {
      return { tracks: [], artists: [], albums: [] };
    }

    const data = (await res.json()) as any;
    const results = data.results || [];

    const tracks: MusicTrack[] = [];
    const artists: MusicArtist[] = [];
    const albums: MusicAlbum[] = [];
    const seenArtists = new Set<string>();
    const seenAlbums = new Set<string>();

    for (const item of results) {
      if (item.wrapperType === 'track' && item.kind === 'song') {
        const cover = item.artworkUrl100
          ? item.artworkUrl100.replace('100x100bb', '600x600bb')
          : undefined;

        tracks.push({
          id: `itunes:${item.trackId}`,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName,
          duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : undefined,
          artworkUrl: cover,
          source: 'itunes',
          sourceUrl: item.trackViewUrl,
          previewUrl: item.previewUrl,
          providerId: String(item.trackId),
          isPlayable: true,
        });

        // Collect unique album
        if (item.collectionId && !seenAlbums.has(String(item.collectionId))) {
          seenAlbums.add(String(item.collectionId));
          albums.push({
            id: `itunes-album:${item.collectionId}`,
            title: item.collectionName,
            artist: item.artistName,
            artworkUrl: cover,
            releaseYear: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
            trackCount: item.trackCount,
            sourceUrl: item.collectionViewUrl,
            providerId: String(item.collectionId),
          });
        }

        // Collect unique artist
        if (item.artistId && !seenArtists.has(String(item.artistId))) {
          seenArtists.add(String(item.artistId));
          artists.push({
            id: `itunes-artist:${item.artistId}`,
            name: item.artistName,
            genre: item.primaryGenreName,
            artworkUrl: cover,
            sourceUrl: item.artistViewUrl,
            providerId: String(item.artistId),
          });
        }
      }
    }

    return { tracks, artists, albums };
  } catch (err) {
    console.warn('iTunes provider search error:', err);
    return { tracks: [], artists: [], albums: [] };
  }
}

// 3. Local DBMS Provider (SQLite / Local Audio Uploads)
export async function searchLocalProvider(
  query: string,
  baseUrl: string = 'http://127.0.0.1:3000'
): Promise<MusicTrack[]> {
  try {
    const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const songs = await res.json();
    if (!Array.isArray(songs)) return [];

    return songs.map((s: any) => ({
      id: `local:${s.song_id}`,
      title: s.song_name,
      artist: s.artist_name,
      album: s.album_name,
      duration: s.duration,
      artworkUrl: s.cover_url || undefined,
      source: 'local',
      sourceUrl: s.audio_url || undefined,
      providerId: String(s.song_id),
      isPlayable: true,
    }));
  } catch {
    return [];
  }
}

// 4. Unified Search Orchestrator
export async function searchMusic(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResults> {
  const cleanQuery = (query || '').trim();
  const provider = options.provider || 'all';

  if (!cleanQuery) {
    return {
      query: '',
      provider,
      tracks: [],
      artists: [],
      albums: [],
      videos: [],
      playlists: [],
    };
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim() || '';
  const hasYouTubeKey = Boolean(apiKey && apiKey !== 'your_youtube_api_key_here');

  let tracks: MusicTrack[] = [];
  let videos: MusicVideo[] = [];
  let artists: MusicArtist[] = [];
  let albums: MusicAlbum[] = [];
  let playlists: MusicPlaylist[] = [];
  let errorMsg: string | undefined;
  let warningMsg: string | undefined;

  // Search YouTube if requested or in 'all' mode
  if (provider === 'all' || provider === 'youtube') {
    if (hasYouTubeKey) {
      const ytRes = await searchYouTubeProvider(cleanQuery, apiKey, options);
      if (ytRes.error) {
        if (ytRes.quotaExceeded) {
          warningMsg = 'YouTube Data API daily quota reached. Falling back to lossless music catalog.';
        } else {
          warningMsg = `YouTube notice: ${ytRes.error}`;
        }
      } else {
        tracks.push(...ytRes.tracks);
        videos.push(...ytRes.videos);
      }
    } else {
      if (provider === 'youtube') {
        warningMsg = 'YOUTUBE_API_KEY is not configured in .env.local. Configure a key from Google Cloud Console to enable direct YouTube Data API searches.';
      }
    }
  }

  // Search iTunes / Global Music Catalog
  if (provider === 'all' || provider === 'itunes' || (provider === 'youtube' && tracks.length === 0)) {
    const itunesRes = await searchITunesProvider(cleanQuery, options);
    // Combine tracks (preferring YouTube if already present, but supplementing)
    if (tracks.length === 0) {
      tracks.push(...itunesRes.tracks);
    } else {
      // Append iTunes tracks with distinct titles
      const existingTitles = new Set(tracks.map((t) => t.title.toLowerCase()));
      for (const t of itunesRes.tracks) {
        if (!existingTitles.has(t.title.toLowerCase())) {
          tracks.push(t);
        }
      }
    }
    artists.push(...itunesRes.artists);
    albums.push(...itunesRes.albums);
  }

  // Search Local Library
  if (provider === 'all' || provider === 'local') {
    const localTracks = await searchLocalProvider(cleanQuery);
    // Prepend local tracks for high visibility
    tracks = [...localTracks, ...tracks];
  }

  return {
    query: cleanQuery,
    provider,
    tracks,
    artists,
    albums,
    videos,
    playlists,
    error: errorMsg,
    warning: warningMsg,
    hasYouTubeKey,
  };
}
