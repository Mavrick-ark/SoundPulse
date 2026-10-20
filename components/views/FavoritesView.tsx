'use client';

import React, { useState, useMemo } from 'react';
import {
  Heart,
  Play,
  Shuffle,
  Search,
  ArrowUpDown,
  Download,
  ExternalLink,
  Disc3,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Song } from '@/types/music';
import { usePlayerStore } from '@/lib/store';
import { formatTime } from '@/lib/lyrics';
import { toggleSongLikeApi } from '@/lib/api';

interface FavoritesViewProps {
  songs: Song[];
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ songs }) => {
  const {
    favoriteIds,
    toggleFavorite,
    playSong,
    currentSong,
    toggleShuffle,
  } = usePlayerStore();

  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'artist' | 'duration'>('recent');

  // Filter only favorited tracks
  const likedSongs = useMemo(() => {
    return songs.filter((s) => favoriteIds.includes(s.song_id));
  }, [songs, favoriteIds]);

  // Filter and sort within liked tracks
  const filteredLiked = useMemo(() => {
    let list = [...likedSongs];

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.song_name.toLowerCase().includes(q) ||
          s.artist_name.toLowerCase().includes(q) ||
          (s.album_name && s.album_name.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'title') {
      list.sort((a, b) => a.song_name.localeCompare(b.song_name));
    } else if (sortBy === 'artist') {
      list.sort((a, b) => a.artist_name.localeCompare(b.artist_name));
    } else if (sortBy === 'duration') {
      list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }

    return list;
  }, [likedSongs, searchFilter, sortBy]);

  const handleLike = (e: React.MouseEvent, songId: number) => {
    e.stopPropagation();
    toggleFavorite(songId);
    toggleSongLikeApi(songId);
  };

  const handlePlayAll = () => {
    if (filteredLiked.length > 0) {
      playSong(filteredLiked[0], filteredLiked);
    }
  };

  const handleShufflePlay = () => {
    if (filteredLiked.length > 0) {
      toggleShuffle();
      const randomIndex = Math.floor(Math.random() * filteredLiked.length);
      playSong(filteredLiked[randomIndex], filteredLiked);
    }
  };

  const totalDurationSeconds = likedSongs.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <div className="space-y-6 pb-28">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-pink-950/40 via-purple-950/20 to-neutral-900 border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 shadow-2xl flex items-center justify-center shrink-0">
            <Heart className="w-16 h-16 sm:w-20 sm:h-20 text-white fill-current animate-pulse" />
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <span className="text-[11px] font-semibold text-pink-400 uppercase tracking-wider">
              Auto Playlist
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mt-1">
              Liked Music
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2">
              Your personal SoundPulse library collection of favorited tracks.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-neutral-400 font-medium">
              <span>{likedSongs.length} Tracks</span>
              <span>•</span>
              <span>{Math.round(totalDurationSeconds / 60)} Minutes</span>

              {likedSongs.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayAll}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    <span>Play All</span>
                  </button>
                  <button
                    onClick={handleShufflePlay}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold transition-all"
                    title="Shuffle Liked Music"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Shuffle</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Sort Filter Bar */}
      {likedSongs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter within liked tracks..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/[0.04] border border-white/10 focus:border-indigo-500 text-white placeholder-neutral-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-neutral-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-neutral-300 outline-none focus:border-indigo-500"
            >
              <option value="recent">Recently Added</option>
              <option value="title">Title A-Z</option>
              <option value="artist">Artist A-Z</option>
              <option value="duration">Longest Duration</option>
            </select>
          </div>
        </div>
      )}

      {/* Songs List */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
        {filteredLiked.length === 0 ? (
          <div className="p-16 text-center text-neutral-400 space-y-3">
            <Heart className="w-12 h-12 mx-auto text-neutral-600" />
            <p className="text-sm font-medium text-white">
              {searchFilter ? 'No matching liked tracks found.' : 'Songs you like will appear here'}
            </p>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Click the heart icon on any song while listening or browsing to add it to your Liked Music.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {filteredLiked.map((song, idx) => {
              const isCurrent = currentSong?.song_id === song.song_id;
              const isLocal = Boolean(song.audio_url && song.audio_url.startsWith('/uploads'));

              return (
                <div
                  key={song.song_id}
                  onClick={() => playSong(song, filteredLiked)}
                  className={`grid grid-cols-12 items-center px-4 py-3 text-xs cursor-pointer group transition-colors ${
                    isCurrent
                      ? 'bg-indigo-600/15 text-white'
                      : 'hover:bg-white/[0.05] text-neutral-300'
                  }`}
                >
                  <div className="col-span-1 text-neutral-500 font-mono">
                    <span className="group-hover:hidden">{idx + 1}</span>
                    <Play className="w-3.5 h-3.5 hidden group-hover:block text-indigo-400 fill-current" />
                  </div>

                  <div className="col-span-7 sm:col-span-5 flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
                      {song.cover_url ? (
                        <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          <Disc3 className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                        {song.song_name}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {song.artist_name}
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:block sm:col-span-3 text-neutral-400 truncate">
                    {song.album_name || 'SoundPulse Single'}
                  </div>

                  {/* Actions & Duration */}
                  <div className="col-span-4 sm:col-span-3 flex items-center justify-end gap-3 text-neutral-400 tabular-nums">
                    {/* Legitimate Download for user-authorized local files */}
                    {isLocal && (
                      <a
                        href={song.audio_url!}
                        download={`${song.artist_name} - ${song.song_name}.mp3`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-neutral-400 hover:text-emerald-400 transition-colors"
                        title="Download authorized local audio file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* YouTube stream indicator */}
                    {song.youtube_id && (
                      <a
                        href={`https://www.youtube.com/watch?v=${song.youtube_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-neutral-400 hover:text-red-400 transition-colors"
                        title="View on YouTube"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      onClick={(e) => handleLike(e, song.song_id)}
                      className="p-1 rounded text-pink-500 hover:scale-110 transition-transform"
                      title="Remove from Liked Music"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                    <span>{formatTime(song.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
