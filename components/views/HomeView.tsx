'use client';

import React from 'react';
import {
  Play,
  Heart,
  TrendingUp,
  Sparkles,
  Music,
  Disc3,
  Clock,
  Radio,
} from 'lucide-react';
import { Song, Artist, Album } from '@/types/music';
import { usePlayerStore } from '@/lib/store';
import { formatTime } from '@/lib/lyrics';
import { toggleSongLikeApi } from '@/lib/api';

interface HomeViewProps {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
}

export const HomeView: React.FC<HomeViewProps> = ({ songs, artists, albums }) => {
  const { playSong, currentSong, isPlaying, favoriteIds, toggleFavorite } = usePlayerStore();

  const quickPicks = songs.slice(0, 8);
  const trendingSongs = songs.slice(8, 20);

  const handleLike = (e: React.MouseEvent, songId: number) => {
    e.stopPropagation();
    toggleFavorite(songId);
    toggleSongLikeApi(songId);
  };

  return (
    <div className="space-y-10 pb-28">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-neutral-900/60 border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            <span>Next-Gen YouTube Music & Lossless Client</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Immerse in <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">SoundPulse</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-neutral-300 font-normal leading-relaxed">
            Experience high-fidelity lossless audio and seamless YouTube Music streaming with liquid glass design, synchronized lyrics, and zero clutter.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {quickPicks[0] && (
              <button
                onClick={() => playSong(quickPicks[0], songs)}
                className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:scale-105 active:scale-95 shadow-xl shadow-white/20 transition-all duration-200"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Quick Picks</span>
              </button>
            )}
            <div className="text-xs text-neutral-400 flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{songs.length} Tracks in Library</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Picks (2x4 interactive grid) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Quick Picks
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickPicks.map((song) => {
            const isCurrent = currentSong?.song_id === song.song_id;
            return (
              <div
                key={song.song_id}
                onClick={() => playSong(song, songs)}
                className={`group flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer border transition-all duration-200 ${
                  isCurrent
                    ? 'bg-indigo-600/20 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <Disc3 className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                  </div>
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {song.song_name}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {song.artist_name}
                  </div>
                </div>

                <button
                  onClick={(e) => handleLike(e, song.song_id)}
                  className={`p-2 rounded-full transition-colors shrink-0 ${
                    favoriteIds.includes(song.song_id)
                      ? 'text-pink-500'
                      : 'text-neutral-500 group-hover:text-neutral-300'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favoriteIds.includes(song.song_id) ? 'fill-current' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trending Tracks Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Trending Tracks
            </h2>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-semibold text-neutral-400 border-b border-white/5 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-6 sm:col-span-5">Title</div>
            <div className="hidden sm:block sm:col-span-3">Album</div>
            <div className="col-span-3 sm:col-span-2 text-right">Plays</div>
            <div className="col-span-2 sm:col-span-1 text-right flex justify-end">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="divide-y divide-white/[0.03]">
            {trendingSongs.map((song, idx) => {
              const isCurrent = currentSong?.song_id === song.song_id;
              const isLiked = favoriteIds.includes(song.song_id);
              return (
                <div
                  key={song.song_id}
                  onClick={() => playSong(song, songs)}
                  className={`grid grid-cols-12 items-center px-4 py-3 text-xs cursor-pointer group transition-colors ${
                    isCurrent ? 'bg-indigo-600/15 text-white' : 'hover:bg-white/[0.05] text-neutral-300'
                  }`}
                >
                  {/* Track Number / Play Icon */}
                  <div className="col-span-1 text-neutral-500 group-hover:text-white font-mono">
                    <span className="group-hover:hidden">{idx + 1}</span>
                    <Play className="w-3.5 h-3.5 hidden group-hover:block text-indigo-400 fill-current" />
                  </div>

                  {/* Title & Artist */}
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0 pr-2">
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
                      <div className="font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
                        {song.song_name}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {song.artist_name}
                      </div>
                    </div>
                  </div>

                  {/* Album Name */}
                  <div className="hidden sm:block sm:col-span-3 text-neutral-400 truncate pr-2">
                    {song.album_name || 'SoundPulse Single'}
                  </div>

                  {/* Plays & Like */}
                  <div className="col-span-3 sm:col-span-2 text-right text-neutral-400 tabular-nums">
                    {(song.play_count || 1200 + idx * 85).toLocaleString()}
                  </div>

                  {/* Duration & Like button */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-2 text-neutral-400 tabular-nums">
                    <button
                      onClick={(e) => handleLike(e, song.song_id)}
                      className={`p-1 rounded hover:text-white transition-colors ${
                        isLiked ? 'text-pink-500' : 'opacity-0 group-hover:opacity-100 text-neutral-500'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                    <span>{formatTime(song.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Artists */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Music className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Featured Artists
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {artists.slice(0, 6).map((artist) => (
            <div
              key={artist.artist_id}
              className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-center transition-all duration-200 group cursor-pointer"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full overflow-hidden bg-neutral-800 border border-white/10 shadow-lg group-hover:scale-105 transition-transform duration-300 mb-3 flex items-center justify-center">
                {artist.cover_url ? (
                  <img src={artist.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-950 to-purple-950 text-indigo-400 font-bold text-xl">
                    {artist.artist_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="font-semibold text-xs sm:text-sm text-white truncate">
                {artist.artist_name}
              </div>
              <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                {artist.total_songs || 0} Songs
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
