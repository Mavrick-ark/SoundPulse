'use client';

import React, { useState, useEffect } from 'react';
import {
  ListMusic,
  Plus,
  Play,
  Trash2,
  Sparkles,
  ArrowLeft,
  Clock,
  Disc3,
} from 'lucide-react';
import { Playlist, Song } from '@/types/music';
import { usePlayerStore } from '@/lib/store';
import { fetchPlaylistWithSongs, createPlaylist, removeSongFromPlaylist } from '@/lib/api';
import { formatTime } from '@/lib/lyrics';

interface PlaylistsViewProps {
  playlists: Playlist[];
  onRefreshPlaylists: () => void;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  playlists,
  onRefreshPlaylists,
}) => {
  const { selectedPlaylistId, setSelectedPlaylistId, playSong, currentSong } =
    usePlayerStore();

  const [playlistDetail, setPlaylistDetail] = useState<{
    playlist: Playlist;
    songs: Song[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Load details when selected playlist changes
  useEffect(() => {
    if (selectedPlaylistId) {
      setLoadingDetail(true);
      fetchPlaylistWithSongs(selectedPlaylistId).then((res) => {
        setPlaylistDetail(res);
        setLoadingDetail(false);
      });
    } else {
      setPlaylistDetail(null);
    }
  }, [selectedPlaylistId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createPlaylist(newTitle.trim(), newDesc.trim());
    setNewTitle('');
    setNewDesc('');
    setShowCreateModal(false);
    onRefreshPlaylists();
  };

  const handleRemoveSong = async (songId: number) => {
    if (!selectedPlaylistId) return;
    await removeSongFromPlaylist(selectedPlaylistId, songId);
    // Refresh detail
    const res = await fetchPlaylistWithSongs(selectedPlaylistId);
    setPlaylistDetail(res);
    onRefreshPlaylists();
  };

  const handlePlayAll = () => {
    if (playlistDetail && playlistDetail.songs.length > 0) {
      playSong(playlistDetail.songs[0], playlistDetail.songs);
    }
  };

  // Loading detail state
  if (selectedPlaylistId && loadingDetail) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center gap-3 text-neutral-400">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-xs font-medium">Loading playlist...</span>
      </div>
    );
  }

  // If viewing a single playlist detail
  if (selectedPlaylistId && playlistDetail) {
    const playlist = playlistDetail.playlist || (playlistDetail as any) || {};
    const songs = Array.isArray(playlistDetail.songs) ? playlistDetail.songs : [];
    const totalSecs = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

    return (
      <div className="space-y-6 pb-28">
        <button
          onClick={() => setSelectedPlaylistId(null)}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Playlists</span>
        </button>

        {/* Playlist Banner */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-neutral-900 border border-white/10">
          <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-2xl flex items-center justify-center shrink-0">
            <ListMusic className="w-16 h-16 text-white" />
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
              Playlist
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight truncate mt-1">
              {playlist.title || 'Untitled Playlist'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2 line-clamp-2">
              {playlist.description || 'Curated SoundPulse collection.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-neutral-400 font-medium">
              <span>{songs.length} Tracks</span>
              <span>•</span>
              <span>{Math.round(totalSecs / 60)} Minutes</span>
              {songs.length > 0 && (
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black font-semibold hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span>Play All</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Songs List */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
          {songs.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 text-xs">
              This playlist is currently empty. Add tracks from Home, Search or your Library!
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {songs.map((song, idx) => {
                const isCurrent = currentSong?.song_id === song.song_id;
                return (
                  <div
                    key={`${song.song_id}-${idx}`}
                    onClick={() => playSong(song, songs)}
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

                    <div className="col-span-8 sm:col-span-7 flex items-center gap-3 min-w-0 pr-2">
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

                    <div className="hidden sm:block sm:col-span-2 text-neutral-400 truncate">
                      {song.album_name || 'SoundPulse Single'}
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-3 text-neutral-400 tabular-nums">
                      <span>{formatTime(song.duration)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSong(song.song_id);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all"
                        title="Remove from playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // If a playlist was clicked but couldn't be loaded
  if (selectedPlaylistId && !playlistDetail) {
    return (
      <div className="space-y-6 pb-28">
        <button
          onClick={() => setSelectedPlaylistId(null)}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Playlists</span>
        </button>
        <div className="p-12 text-center text-neutral-400 text-xs rounded-2xl border border-white/5 bg-white/[0.02]">
          Playlist details could not be loaded or the playlist is empty.
        </div>
      </div>
    );
  }

  // All Playlists Grid
  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Your Playlists
          </h2>
          <p className="text-xs text-neutral-400 mt-1">Organize and listen to your custom collections</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {playlists.map((playlist) => (
          <div
            key={playlist.playlist_id}
            onClick={() => setSelectedPlaylistId(playlist.playlist_id)}
            className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all duration-200 group cursor-pointer"
          >
            <div className="aspect-square rounded-xl bg-gradient-to-tr from-indigo-600/30 via-purple-600/30 to-pink-600/30 border border-white/10 flex items-center justify-center mb-3 group-hover:scale-102 transition-transform shadow-md">
              <ListMusic className="w-10 h-10 text-white/80" />
            </div>
            <div className="font-semibold text-xs sm:text-sm text-white truncate">
              {playlist.title}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {playlist.total_songs} {playlist.total_songs === 1 ? 'Track' : 'Tracks'}
            </div>
          </div>
        ))}
      </div>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-sm bg-[#0e101a] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-semibold text-white">Create New Playlist</h3>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Playlist Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Late Night Vibes"
                className="w-full px-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Description (Optional)</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Describe your playlist..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
