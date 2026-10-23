'use client';

import React, { useState, useMemo } from 'react';
import {
  Play,
  Heart,
  TrendingUp,
  Sparkles,
  Music,
  Disc3,
  Clock,
  Radio,
  History,
  ListMusic,
  Check,
  Plus,
  Compass,
  Zap,
  Coffee,
  Activity,
  Flame,
  ArrowRight,
  X,
} from 'lucide-react';
import { Song, Artist, Album } from '@/types/music';
import { usePlayerStore } from '@/lib/store';
import { formatTime } from '@/lib/lyrics';
import { toggleSongLikeApi, createPlaylist, addSongToPlaylist } from '@/lib/api';
import {
  generateSmartRecommendations,
  SmartPlaylist,
} from '@/lib/recommendations';

interface HomeViewProps {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  onRefreshPlaylists?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  songs,
  artists,
  albums,
  onRefreshPlaylists,
}) => {
  const {
    playSong,
    currentSong,
    favoriteIds,
    toggleFavorite,
    history,
    clearHistory,
    setSelectedPlaylistId,
    setActiveTab,
  } = usePlayerStore();

  const [quickPickCategory, setQuickPickCategory] = useState<
    'All' | 'Relax' | 'Workout' | 'Focus' | 'Energize'
  >('All');
  const [selectedSmartMix, setSelectedSmartMix] = useState<SmartPlaylist | null>(
    null
  );
  const [savingMixId, setSavingMixId] = useState<string | null>(null);
  const [savedMixIds, setSavedMixIds] = useState<string[]>([]);

  // Algorithmic recommendations engine
  const recData = useMemo(() => {
    return generateSmartRecommendations(songs, history, favoriteIds);
  }, [songs, history, favoriteIds]);

  const activeQuickPicks =
    recData.filteredQuickPicks[quickPickCategory] || recData.quickPicks;
  const trendingSongs = songs.slice(0, 12);

  const handleLike = (e: React.MouseEvent, songId: number) => {
    e.stopPropagation();
    toggleFavorite(songId);
    toggleSongLikeApi(songId);
  };

  const handleSaveSmartMix = async (mix: SmartPlaylist) => {
    try {
      setSavingMixId(mix.id);
      const res = await createPlaylist(mix.title, mix.description);
      const newPlaylistId = res?.playlist_id;

      if (newPlaylistId && mix.songs.length > 0) {
        // Add songs sequentially to preserve order
        for (const s of mix.songs) {
          await addSongToPlaylist(newPlaylistId, s.song_id);
        }
      }

      setSavedMixIds((prev) => [...prev, mix.id]);
      if (onRefreshPlaylists) {
        onRefreshPlaylists();
      }
    } catch (e) {
      console.error('Failed to save smart playlist:', e);
    } finally {
      setSavingMixId(null);
    }
  };

  return (
    <div className="space-y-12 pb-32">
      {/* 1. Contextual Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-neutral-900 border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            <span>{recData.greeting} • {recData.timeContext}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Immerse in{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              SoundPulse
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 font-normal leading-relaxed">
            Personalized music discovery, self-curated smart mixes, lossless audio playback, and seamless YouTube sync.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {recData.quickPicks[0] && (
              <button
                onClick={() => playSong(recData.quickPicks[0], recData.quickPicks)}
                className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:scale-105 active:scale-95 shadow-xl shadow-white/20 transition-all duration-200"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Quick Picks Mix</span>
              </button>
            )}

            {recData.smartPlaylists[0] && (
              <button
                onClick={() =>
                  playSong(
                    recData.smartPlaylists[0].songs[0],
                    recData.smartPlaylists[0].songs
                  )
                }
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Play Supermix</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Self-Generated Smart Playlists (Algorithmic Mixes) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Self-Generated Mixes
            </h2>
          </div>
          <span className="text-xs text-neutral-400">Algorithmic Playlists</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {recData.smartPlaylists.map((mix) => {
            const isSaved = savedMixIds.includes(mix.id);
            const isSaving = savingMixId === mix.id;

            return (
              <div
                key={mix.id}
                onClick={() => setSelectedSmartMix(mix)}
                className="group relative p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`aspect-video w-full rounded-xl bg-gradient-to-tr ${mix.gradient} shadow-lg relative overflow-hidden flex items-end p-3 mb-3 group-hover:scale-[1.02] transition-transform`}
                  >
                    <div className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                    </div>
                    <div className="text-[11px] font-bold text-white/90 drop-shadow">
                      {mix.subtitle}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-white truncate group-hover:text-indigo-300 transition-colors">
                    {mix.title}
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                    {mix.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{mix.total_songs} tracks</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSaved) handleSaveSmartMix(mix);
                    }}
                    disabled={isSaving || isSaved}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Saved</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Contextual Quick Picks with Mood Filters */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Quick Picks
            </h2>
          </div>

          {/* Quick Pick Mood Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(['All', 'Relax', 'Workout', 'Focus', 'Energize'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setQuickPickCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    quickPickCategory === cat
                      ? 'bg-white text-black shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>

        {/* 2x4 Quick Picks Interactive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeQuickPicks.map((song) => {
            const isCurrent = currentSong?.song_id === song.song_id;
            return (
              <div
                key={song.song_id}
                onClick={() => playSong(song, activeQuickPicks)}
                className={`group flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer border transition-all duration-200 ${
                  isCurrent
                    ? 'bg-indigo-600/20 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800">
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (song.youtube_id && !target.src.includes('ytimg')) {
                          target.src = `https://i.ytimg.com/vi/${song.youtube_id}/hqdefault.jpg`;
                        } else {
                          target.style.display = 'none';
                        }
                      }}
                    />
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
                  <Heart
                    className={`w-4 h-4 ${
                      favoriteIds.includes(song.song_id) ? 'fill-current' : ''
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Recently Played History (if available) */}
      {history.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <History className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Recently Played
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => playSong(history[0], history)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Play Recent
              </button>
              <span className="text-neutral-600">•</span>
              <button
                onClick={clearHistory}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {history.slice(0, 6).map((song) => {
              const isCurrent = currentSong?.song_id === song.song_id;
              return (
                <div
                  key={`rec-${song.song_id}`}
                  onClick={() => playSong(song, history)}
                  className="group p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-800 mb-2.5">
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (song.youtube_id && !target.src.includes('ytimg')) {
                            target.src = `https://i.ytimg.com/vi/${song.youtube_id}/hqdefault.jpg`;
                          } else {
                            target.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-500">
                        <Disc3 className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-white truncate group-hover:text-indigo-300">
                    {song.song_name}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {song.artist_name}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Recommended For You (with algorithmic reasons) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Recommended For You
            </h2>
          </div>
          <span className="text-xs text-neutral-400">Based on your activity</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recData.recommendedForYou.slice(0, 6).map(({ song, reason }) => {
            const isCurrent = currentSong?.song_id === song.song_id;
            return (
              <div
                key={`rec-item-${song.song_id}`}
                onClick={() =>
                  playSong(
                    song,
                    recData.recommendedForYou.map((r) => r.song)
                  )
                }
                className="group flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all cursor-pointer"
              >
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800">
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (song.youtube_id && !target.src.includes('ytimg')) {
                          target.src = `https://i.ytimg.com/vi/${song.youtube_id}/hqdefault.jpg`;
                        } else {
                          target.style.display = 'none';
                        }
                      }}
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
                  <div className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {song.song_name}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {song.artist_name}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-indigo-400 font-medium truncate">
                    <Sparkles className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{reason}</span>
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
                  <Heart
                    className={`w-4 h-4 ${
                      favoriteIds.includes(song.song_id) ? 'fill-current' : ''
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Trending Tracks Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
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
                  onClick={() => playSong(song, trendingSongs)}
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

                  <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
                      {song.cover_url ? (
                        <img
                          src={song.cover_url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (song.youtube_id && !target.src.includes('ytimg')) {
                              target.src = `https://i.ytimg.com/vi/${song.youtube_id}/hqdefault.jpg`;
                            } else {
                              target.style.display = 'none';
                            }
                          }}
                        />
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

                  <div className="hidden sm:block sm:col-span-3 text-neutral-400 truncate pr-2">
                    {song.album_name || 'SoundPulse Single'}
                  </div>

                  <div className="col-span-3 sm:col-span-2 text-right text-neutral-400 tabular-nums">
                    {(song.play_count || 1200 + idx * 85).toLocaleString()}
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-2 text-neutral-400 tabular-nums">
                    <button
                      onClick={(e) => handleLike(e, song.song_id)}
                      className={`p-1 rounded hover:text-white transition-colors ${
                        isLiked
                          ? 'text-pink-500'
                          : 'opacity-0 group-hover:opacity-100 text-neutral-500'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isLiked ? 'fill-current' : ''
                        }`}
                      />
                    </button>
                    <span>{formatTime(song.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Smart Playlist Detail Modal */}
      {selectedSmartMix && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0e101a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header with gradient */}
            <div
              className={`p-6 sm:p-8 bg-gradient-to-r ${selectedSmartMix.gradient} relative`}
            >
              <button
                onClick={() => setSelectedSmartMix(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">
                {selectedSmartMix.subtitle}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {selectedSmartMix.title}
              </h2>
              <p className="text-xs sm:text-sm text-white/90 mt-2 line-clamp-2 max-w-lg">
                {selectedSmartMix.description}
              </p>

              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={() => {
                    playSong(selectedSmartMix.songs[0], selectedSmartMix.songs);
                    setSelectedSmartMix(null);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span>Play Mix</span>
                </button>

                <button
                  onClick={() => handleSaveSmartMix(selectedSmartMix)}
                  disabled={
                    savedMixIds.includes(selectedSmartMix.id) ||
                    savingMixId === selectedSmartMix.id
                  }
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/30 hover:bg-black/40 border border-white/20 text-white text-xs font-medium transition-colors"
                >
                  {savedMixIds.includes(selectedSmartMix.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved in Your Playlists</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {savingMixId === selectedSmartMix.id
                          ? 'Saving...'
                          : 'Save to My Playlists'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Song list in mix */}
            <div className="p-4 sm:p-6 overflow-y-auto divide-y divide-white/[0.04]">
              {selectedSmartMix.songs.map((song, i) => (
                <div
                  key={`${song.song_id}-mix-${i}`}
                  onClick={() => {
                    playSong(song, selectedSmartMix.songs);
                    setSelectedSmartMix(null);
                  }}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors"
                >
                  <span className="w-5 text-neutral-500 font-mono text-xs">
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (song.youtube_id && !target.src.includes('ytimg')) {
                            target.src = `https://i.ytimg.com/vi/${song.youtube_id}/hqdefault.jpg`;
                          } else {
                            target.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <Disc3 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                      {song.song_name}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">
                      {song.artist_name}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 tabular-nums">
                    {formatTime(song.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
