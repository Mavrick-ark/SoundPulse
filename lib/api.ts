import { Song, Artist, Album, Playlist, SearchResults, SearchOptions } from '@/types/music';

const API_BASE = '/api';

export async function fetchSongs(): Promise<Song[]> {
  try {
    const res = await fetch(`${API_BASE}/songs`);
    if (!res.ok) throw new Error('Failed to load songs');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching songs:', error);
    return [];
  }
}

export async function fetchArtists(): Promise<Artist[]> {
  try {
    const res = await fetch(`${API_BASE}/artists`);
    if (!res.ok) throw new Error('Failed to load artists');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching artists:', error);
    return [];
  }
}

export async function fetchAlbums(): Promise<Album[]> {
  try {
    const res = await fetch(`${API_BASE}/albums`);
    if (!res.ok) throw new Error('Failed to load albums');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching albums:', error);
    return [];
  }
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  try {
    const res = await fetch(`${API_BASE}/playlists`);
    if (!res.ok) throw new Error('Failed to load playlists');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return [];
  }
}

export async function fetchPlaylistWithSongs(playlistId: number): Promise<{ playlist: Playlist; songs: Song[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/playlists/${playlistId}`);
    if (!res.ok) throw new Error('Failed to load playlist');
    const data = await res.json();
    if (!data) return null;

    if (data.playlist && Array.isArray(data.songs)) {
      return data;
    }

    const { songs = [], ...playlistProps } = data;
    return {
      playlist: {
        playlist_id: playlistProps.playlist_id || playlistId,
        title: playlistProps.title || 'Untitled Playlist',
        description: playlistProps.description || '',
        cover_color: playlistProps.cover_color,
        creator_name: playlistProps.creator_name,
        created_at: playlistProps.created_at,
        total_songs: Array.isArray(songs) ? songs.length : (playlistProps.total_songs || 0),
        total_duration: playlistProps.total_duration,
      },
      songs: Array.isArray(songs) ? songs : [],
    };
  } catch (error) {
    console.error('Error fetching playlist details:', error);
    return null;
  }
}

export async function createPlaylist(title: string, description: string = ''): Promise<any> {
  const res = await fetch(`${API_BASE}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, user_id: 1, cover_color: '#6366f1' }),
  });
  return res.json();
}

export async function addSongToPlaylist(playlistId: number, songId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/playlists/${playlistId}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song_id: songId }),
  });
  return res.json();
}

export async function removeSongFromPlaylist(playlistId: number, songId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/playlists/${playlistId}/songs/${songId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function updateLyricsOffsetApi(songId: number, offset: number): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/songs/${songId}/lyrics-offset`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset }),
    });
    return res.json();
  } catch (e) {
    console.warn('Could not persist lyrics offset:', e);
  }
}

export async function toggleSongLikeApi(songId: number): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/songs/${songId}/like`, { method: 'POST' });
    return res.json();
  } catch (e) {
    console.warn('Could not persist like:', e);
  }
}

export async function uploadDeviceAudio(files: FileList | File[]): Promise<any> {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('audioFiles', files[i]);
  }
  const res = await fetch(`${API_BASE}/upload-multiple`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// Dynamic Keyword Music Discovery API Client
export async function searchMusicApi(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResults> {
  const cleanQ = (query || '').trim();
  if (!cleanQ) {
    return {
      query: '',
      provider: options.provider || 'all',
      tracks: [],
      artists: [],
      albums: [],
      videos: [],
      playlists: [],
    };
  }

  const params = new URLSearchParams();
  params.set('q', cleanQ);
  if (options.provider) params.set('provider', options.provider);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.regionCode) params.set('regionCode', options.regionCode);

  try {
    const res = await fetch(`${API_BASE}/search?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Search failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.error('searchMusicApi fetch error:', err);
    return {
      query: cleanQ,
      provider: options.provider || 'all',
      tracks: [],
      artists: [],
      albums: [],
      videos: [],
      playlists: [],
      error: err.message || 'Network error executing search',
    };
  }
}

// Resolve full YouTube video ID and synced lyrics
export async function resolveTrackDetails(
  title: string,
  artist?: string
): Promise<{ youtube_id: string | null; lyrics: string | null; synced_lyrics: string | null } | null> {
  try {
    const params = new URLSearchParams({ title, artist: artist || '' });
    const res = await fetch(`${API_BASE}/track-resolve?${params.toString()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('resolveTrackDetails error:', err);
    return null;
  }
}
