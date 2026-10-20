'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Play,
  Heart,
  Disc3,
  Radio,
  Sparkles,
  ExternalLink,
  Users,
  Disc,
  Video,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import {
  Song,
  MusicTrack,
  MusicArtist,
  MusicAlbum,
  MusicVideo,
  SearchProviderType,
} from '@/types/music';
import { usePlayerStore } from '@/lib/store';
import { formatTime } from '@/lib/lyrics';
import { searchMusicApi, toggleSongLikeApi, resolveTrackDetails } from '@/lib/api';

interface SearchViewProps {
  songs: Song[];
}

export const SearchView: React.FC<SearchViewProps> = ({ songs: localInitialSongs }) => {
  const { searchQuery, setSearchQuery, playSong, currentSong, favoriteIds, toggleFavorite } =
    usePlayerStore();

  const [providerFilter, setProviderFilter] = useState<SearchProviderType>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [artists, setArtists] = useState<MusicArtist[]>([]);
  const [albums, setAlbums] = useState<MusicAlbum[]>([]);
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchTimeoutRef = useRef<any>(null);

  // Suggested keywords matching user requirements
  const popularKeywords = [
    'Arijit Singh',
    'Kesariya',
    'Arijit Singh Kesariya',
    'Taylor Swift',
    'lofi chill music',
    'romantic Hindi songs',
    'Interstellar soundtrack',
  ];

  // Helper to convert MusicTrack to player Song
  const toPlayableSong = (t: MusicTrack): Song => {
    // Generate stable numeric ID from string ID
    let numericId = 0;
    for (let i = 0; i < t.id.length; i++) {
      numericId = (numericId << 5) - numericId + t.id.charCodeAt(i);
      numericId |= 0;
    }

    return {
      song_id: Math.abs(numericId) || Date.now(),
      song_name: t.title,
      artist_name: t.artist,
      album_name: t.album || (t.source === 'youtube' ? 'YouTube Music' : 'SoundPulse Catalog'),
      duration: t.duration || 210,
      likes: 0,
      play_count: 0,
      cover_url: t.artworkUrl || null,
      audio_url: t.source === 'local' ? (t.sourceUrl || null) : null,
      youtube_id: t.source === 'youtube' ? t.providerId : null,
    };
  };

  // Convert MusicVideo to player Song
  const videoToPlayableSong = (v: MusicVideo): Song => {
    return {
      song_id: Date.now() + Math.floor(Math.random() * 1000),
      song_name: v.title,
      artist_name: v.channelTitle,
      album_name: 'YouTube Video',
      duration: v.duration || 240,
      likes: 0,
      play_count: 0,
      cover_url: v.artworkUrl || null,
      audio_url: null,
      youtube_id: v.providerId,
    };
  };

  // Debounced Dynamic Search
  useEffect(() => {
    const q = searchQuery.trim();

    if (!q) {
      setTracks([]);
      setArtists([]);
      setAlbums([]);
      setVideos([]);
      setHasSearched(false);
      setErrorMsg(null);
      setWarningMsg(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchMusicApi(q, {
          provider: providerFilter,
          limit: 25,
        });

        setTracks(res.tracks || []);
        setArtists(res.artists || []);
        setAlbums(res.albums || []);
        setVideos(res.videos || []);
        setHasSearched(true);

        if (res.error) {
          setErrorMsg(res.error);
        }
        if (res.warning) {
          setWarningMsg(res.warning);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error occurred while querying search providers.');
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, providerFilter]);

  const handleLike = (e: React.MouseEvent, track: MusicTrack) => {
    e.stopPropagation();
    const song = toPlayableSong(track);
    toggleFavorite(song.song_id);
    toggleSongLikeApi(song.song_id);
  };

  const handleTrackClick = async (track: MusicTrack) => {
    const song = toPlayableSong(track);
    const queueList = tracks.map(toPlayableSong);
    playSong(song, queueList);

    // If online track lacks YouTube video ID or lyrics, resolve immediately
    if (!song.youtube_id && track.source !== 'local') {
      try {
        const res = await resolveTrackDetails(track.title, track.artist);
        if (res?.youtube_id) {
          usePlayerStore.getState().updateCurrentSong({
            youtube_id: res.youtube_id,
            synced_lyrics: res.synced_lyrics,
            lyrics: res.lyrics,
          });
        }
      } catch (_) {}
    }
  };

  const handleVideoClick = (video: MusicVideo) => {
    const song = videoToPlayableSong(video);
    playSong(song);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Search Bar */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any artist, song, album, movie soundtrack, or genre..."
            className="w-full pl-12 pr-12 py-3.5 text-sm sm:text-base rounded-2xl bg-white/[0.04] focus:bg-white/[0.08] border border-white/10 focus:border-indigo-500/50 text-white placeholder-neutral-400 outline-none transition-all shadow-lg"
          />
          {isLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Source Provider Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-neutral-400 font-medium shrink-0 mr-1">Provider:</span>
          {(
            [
              { id: 'all', label: 'All Sources' },
              { id: 'youtube', label: 'YouTube Music' },
              { id: 'itunes', label: 'Lossless Catalog' },
              { id: 'local', label: 'Local Storage' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setProviderFilter(p.id)}
              className={`px-3.5 py-1.5 rounded-full shrink-0 font-medium transition-colors ${
                providerFilter === p.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Popular Suggested Keywords Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-neutral-400 font-medium shrink-0 mr-1">Trending:</span>
          {popularKeywords.map((kw) => (
            <button
              key={kw}
              onClick={() => setSearchQuery(kw)}
              className="px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-neutral-300 hover:text-white transition-colors shrink-0"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* Warning or Quota Banner */}
      {warningMsg && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold text-amber-300">Provider Status: </span>
            {warningMsg}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* When Empty State / No Query */}
      {!hasSearched && !isLoading && (
        <div className="p-12 text-center text-neutral-400 rounded-3xl border border-white/5 bg-white/[0.01] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center">
            <Search className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Search Anything in Music</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
              Enter any artist, song name, Hindi or international track, or movie score to fetch live results dynamically.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {popularKeywords.slice(0, 4).map((kw) => (
              <button
                key={kw}
                onClick={() => setSearchQuery(kw)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-indigo-300 transition-colors"
              >
                Try "{kw}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse flex items-center px-4 gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className="w-1/3 h-3.5 bg-white/5 rounded" />
                <div className="w-1/4 h-2.5 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results When Available */}
      {hasSearched && !isLoading && (
        <div className="space-y-8">
          {/* Tracks Section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <span>Songs & Tracks</span>
                <span className="text-indigo-400 font-mono">({tracks.length})</span>
              </h3>
            </div>

            {tracks.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-xs rounded-2xl border border-white/5 bg-white/[0.01]">
                No tracks found matching "{searchQuery}". Try selecting another provider above or checking spelling.
              </div>
            ) : (
              <div className="space-y-1.5">
                {tracks.map((track) => {
                  const song = toPlayableSong(track);
                  const isCurrent = currentSong?.song_id === song.song_id;
                  const isLiked = favoriteIds.includes(song.song_id);

                  return (
                    <div
                      key={track.id}
                      onClick={() => handleTrackClick(track)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all duration-200 ${
                        isCurrent
                          ? 'bg-indigo-600/20 border-indigo-500/40 shadow-sm'
                          : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-neutral-800 border border-white/5">
                          {track.artworkUrl ? (
                            <img
                              src={track.artworkUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400">
                              <Disc3 className="w-5 h-5" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                              {track.title}
                            </span>
                            {track.source === 'youtube' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600/20 text-red-400 border border-red-500/30 shrink-0">
                                YouTube
                              </span>
                            )}
                            {track.source === 'local' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                Lossless
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {track.artist} {track.album ? `• ${track.album}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={(e) => handleLike(e, track)}
                          className={`p-1.5 rounded-full transition-colors ${
                            isLiked
                              ? 'text-pink-500'
                              : 'text-neutral-500 group-hover:text-neutral-300'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        </button>
                        {track.duration && (
                          <span className="text-xs text-neutral-400 tabular-nums font-mono w-10 text-right">
                            {formatTime(track.duration)}
                          </span>
                        )}
                        {track.sourceUrl && (
                          <a
                            href={track.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-neutral-500 hover:text-white transition-colors"
                            title="Open original source"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Artists Section */}
          {artists.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Artists ({artists.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {artists.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => setSearchQuery(artist.name)}
                    className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 text-center transition-all cursor-pointer group"
                  >
                    <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-neutral-800 border border-white/10 shadow-md group-hover:scale-105 transition-transform mb-2 flex items-center justify-center">
                      {artist.artworkUrl ? (
                        <img
                          src={artist.artworkUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-950 text-indigo-300 font-bold text-lg">
                          {artist.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-xs text-white truncate">
                      {artist.name}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {artist.genre || 'Artist'}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums Section */}
          {albums.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Disc className="w-4 h-4 text-indigo-400" />
                <span>Albums ({albums.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => setSearchQuery(`${album.artist} ${album.title}`)}
                    className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-neutral-800 border border-white/10 shadow-md group-hover:scale-102 transition-transform mb-2">
                      {album.artworkUrl ? (
                        <img
                          src={album.artworkUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-500">
                          <Disc className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-xs text-white truncate">
                      {album.title}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {album.artist} {album.releaseYear ? `• ${album.releaseYear}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Music Videos Section */}
          {videos.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Video className="w-4 h-4 text-red-400" />
                <span>YouTube Music Videos ({videos.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {videos.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => handleVideoClick(vid)}
                    className="group p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 transition-all cursor-pointer flex gap-3"
                  >
                    <div className="relative w-32 aspect-video rounded-xl overflow-hidden bg-neutral-800 shrink-0">
                      {vid.artworkUrl ? (
                        <img
                          src={vid.artworkUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-500">
                          <Radio className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-6 h-6 text-white fill-current" />
                      </div>
                      {vid.duration && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono">
                          {formatTime(vid.duration)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden flex flex-col justify-center">
                      <div className="font-medium text-xs text-white line-clamp-2 group-hover:text-indigo-400 transition-colors">
                        {vid.title}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate mt-1">
                        {vid.channelTitle}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
