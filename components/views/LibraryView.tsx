'use client';

import React, { useState, useMemo } from 'react';
import {
  Music,
  Users,
  Disc,
  Play,
  Heart,
  Disc3,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { Song, Artist, Album } from '@/types/music';
import { usePlayerStore } from '@/lib/store';
import { formatTime } from '@/lib/lyrics';
import { toggleSongLikeApi } from '@/lib/api';

interface LibraryViewProps {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
}

export const LibraryView: React.FC<LibraryViewProps> = ({ songs, artists, albums }) => {
  const [activeSubTab, setActiveSubTab] = useState<'songs' | 'artists' | 'albums'>('songs');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'artist' | 'plays'>('recent');

  const { playSong, currentSong, favoriteIds, toggleFavorite } = usePlayerStore();

  const sortedSongs = useMemo(() => {
    const list = [...songs];
    if (sortBy === 'title') {
      return list.sort((a, b) => a.song_name.localeCompare(b.song_name));
    }
    if (sortBy === 'artist') {
      return list.sort((a, b) => a.artist_name.localeCompare(b.artist_name));
    }
    if (sortBy === 'plays') {
      return list.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
    }
    return list; // default recent / id desc
  }, [songs, sortBy]);

  const handleLike = (e: React.MouseEvent, songId: number) => {
    e.stopPropagation();
    toggleFavorite(songId);
    toggleSongLikeApi(songId);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Top Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Your Library
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Complete collection of lossless local files and synced music
          </p>
        </div>

        {/* Subtabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('songs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'songs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Songs ({songs.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('artists')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'artists'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Artists ({artists.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('albums')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'albums'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Albums ({albums.length})</span>
          </button>
        </div>
      </div>

      {/* Subtab Content */}
      {activeSubTab === 'songs' && (
        <div className="space-y-4">
          {/* Sorting filter */}
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Showing {sortedSongs.length} tracks</span>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border border-white/10 rounded-lg px-2.5 py-1 text-xs text-neutral-300 outline-none focus:border-indigo-500"
              >
                <option value="recent" className="bg-neutral-900 text-white">Recently Added</option>
                <option value="title" className="bg-neutral-900 text-white">Title A-Z</option>
                <option value="artist" className="bg-neutral-900 text-white">Artist A-Z</option>
                <option value="plays" className="bg-neutral-900 text-white">Most Played</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-semibold text-neutral-400 border-b border-white/5 uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-7 sm:col-span-5">Title</div>
              <div className="hidden sm:block sm:col-span-3">Album</div>
              <div className="hidden sm:block sm:col-span-2 text-right">Genre</div>
              <div className="col-span-4 sm:col-span-1 text-right flex justify-end">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="divide-y divide-white/[0.03]">
              {sortedSongs.map((song, idx) => {
                const isCurrent = currentSong?.song_id === song.song_id;
                const isLiked = favoriteIds.includes(song.song_id);
                return (
                  <div
                    key={song.song_id}
                    onClick={() => playSong(song, sortedSongs)}
                    className={`grid grid-cols-12 items-center px-4 py-3 text-xs cursor-pointer group transition-colors ${
                      isCurrent
                        ? 'bg-indigo-600/15 text-white'
                        : 'hover:bg-white/[0.05] text-neutral-300'
                    }`}
                  >
                    <div className="col-span-1 text-neutral-500 group-hover:text-white font-mono">
                      <span className="group-hover:hidden">{idx + 1}</span>
                      <Play className="w-3.5 h-3.5 hidden group-hover:block text-indigo-400 fill-current" />
                    </div>

                    <div className="col-span-7 sm:col-span-5 flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
                        {song.cover_url ? (
                          <img
                            src={song.cover_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
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

                    <div className="hidden sm:block sm:col-span-3 text-neutral-400 truncate pr-2">
                      {song.album_name || 'SoundPulse Single'}
                    </div>

                    <div className="hidden sm:block sm:col-span-2 text-right text-neutral-400 truncate">
                      {song.genre_name || 'General'}
                    </div>

                    <div className="col-span-4 sm:col-span-1 flex items-center justify-end gap-2 text-neutral-400 tabular-nums">
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
        </div>
      )}

      {activeSubTab === 'artists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {artists.map((artist) => (
            <div
              key={artist.artist_id}
              className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-center transition-all duration-200 group cursor-pointer"
            >
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-neutral-800 border border-white/10 shadow-lg group-hover:scale-105 transition-transform duration-300 mb-3 flex items-center justify-center">
                {artist.cover_url ? (
                  <img src={artist.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-950 text-indigo-300 font-bold text-2xl">
                    {artist.artist_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="font-semibold text-sm text-white truncate">
                {artist.artist_name}
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                {artist.total_songs || 0} Tracks
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'albums' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {albums.map((album) => (
            <div
              key={album.album_id}
              className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all duration-200 group cursor-pointer"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-neutral-800 border border-white/10 shadow-lg group-hover:scale-102 transition-transform duration-300 mb-3">
                {album.cover_url ? (
                  <img src={album.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500">
                    <Disc className="w-12 h-12" />
                  </div>
                )}
              </div>
              <div className="font-semibold text-xs sm:text-sm text-white truncate">
                {album.album_name}
              </div>
              <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                {album.artist_name} {album.release_year ? `• ${album.release_year}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
