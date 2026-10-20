export interface Song {
  song_id: number;
  song_name: string;
  duration: number; // in seconds
  likes: number;
  play_count: number;
  bpm?: number;
  audio_url?: string | null;
  youtube_id?: string | null;
  lyrics?: string | null;
  synced_lyrics?: string | null;
  lyrics_offset?: number | null;
  artist_name: string;
  artist_id?: number;
  album_name?: string;
  album_id?: number;
  cover_url?: string | null;
  genre_name?: string;
  genre_id?: number;
}

export interface Artist {
  artist_id: number;
  artist_name: string;
  country?: string;
  debut_year?: number;
  bio?: string;
  total_songs?: number;
  total_plays?: number;
  cover_url?: string;
}

export interface Album {
  album_id: number;
  album_name: string;
  release_year?: number;
  cover_url?: string;
  artist_name: string;
  total_songs?: number;
}

export interface Playlist {
  playlist_id: number;
  title: string;
  description?: string;
  cover_color?: string;
  created_at?: string;
  creator_name?: string;
  total_songs: number;
  total_duration?: number;
}

export interface SyncedLyricLine {
  time: number; // seconds
  text: string;
}

export type ActiveTab = 'home' | 'search' | 'library' | 'playlists' | 'favorites' | 'history';

// ==========================================
// UNIFIED SEARCH PROVIDER MODELS
// ==========================================

export type MusicSource = 'youtube' | 'itunes' | 'local';

export interface MusicTrack {
  id: string; // Unique global ID e.g. "yt:videoId" or "itunes:trackId" or "local:10"
  title: string;
  artist: string;
  album?: string;
  duration?: number; // In seconds
  artworkUrl?: string;
  source: MusicSource;
  sourceUrl?: string;
  providerId: string; // Native ID in provider (e.g. YouTube Video ID)
  channelTitle?: string;
  description?: string;
  previewUrl?: string;
  isPlayable: boolean;
}

export interface MusicArtist {
  id: string;
  name: string;
  artworkUrl?: string;
  genre?: string;
  sourceUrl?: string;
  providerId: string;
}

export interface MusicAlbum {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  releaseYear?: number;
  trackCount?: number;
  sourceUrl?: string;
  providerId: string;
}

export interface MusicPlaylist {
  id: string;
  title: string;
  creator: string;
  artworkUrl?: string;
  trackCount?: number;
  sourceUrl?: string;
  providerId: string;
}

export interface MusicVideo {
  id: string;
  title: string;
  channelTitle: string;
  artworkUrl?: string;
  duration?: number;
  publishedAt?: string;
  sourceUrl: string;
  providerId: string;
}

export type SearchProviderType = 'all' | 'youtube' | 'itunes' | 'local';

export interface SearchOptions {
  provider?: SearchProviderType;
  limit?: number;
  regionCode?: string;
  relevanceLanguage?: string;
}

export interface SearchResults {
  query: string;
  provider: SearchProviderType;
  tracks: MusicTrack[];
  artists: MusicArtist[];
  albums: MusicAlbum[];
  videos: MusicVideo[];
  playlists: MusicPlaylist[];
  error?: string;
  warning?: string;
  hasYouTubeKey?: boolean;
}
