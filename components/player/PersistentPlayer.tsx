'use client';

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Mic2,
  ListMusic,
  Maximize2,
  Heart,
  Disc3,
} from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { formatTime } from '@/lib/lyrics';
import { toggleSongLikeApi } from '@/lib/api';

export const PersistentPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    favoriteIds,
    togglePlay,
    nextSong,
    prevSong,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleLyrics,
    toggleQueue,
    toggleFavorite,
    setFullScreenPlayer,
    isLyricsOpen,
    isQueueOpen,
  } = usePlayerStore();

  if (!currentSong) return null;

  const isLiked = favoriteIds.includes(currentSong.song_id);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleLike = () => {
    toggleFavorite(currentSong.song_id);
    toggleSongLikeApi(currentSong.song_id);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0f17]/95 backdrop-blur-2xl border-t border-white/10 px-3 sm:px-6 py-2.5 pb-safe select-none shadow-[0_-10px_35px_rgba(0,0,0,0.6)]">
      {/* Top micro progress bar for mobile glance */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6">
        {/* Track Metadata (Left) */}
        <div className="flex items-center gap-3 min-w-0 max-w-[40%] sm:max-w-[280px]">
          <div
            onClick={() => setFullScreenPlayer(true)}
            className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800 border border-white/10 cursor-pointer group shadow-md"
          >
            {currentSong.cover_url ? (
              <img
                src={currentSong.cover_url}
                alt={currentSong.song_name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-indigo-400">
                <Disc3 className={`w-6 h-6 ${isPlaying ? 'animate-spin' : ''}`} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <button
              onClick={() => togglePlay()}
              title={currentSong.song_name}
              className="text-left w-full text-xs sm:text-sm font-semibold text-white truncate hover:text-indigo-400 transition-colors block cursor-pointer"
            >
              {currentSong.song_name}
            </button>
            <p
              title={currentSong.artist_name}
              className="text-[11px] sm:text-xs text-neutral-400 truncate hover:text-neutral-200 transition-colors cursor-pointer"
              onClick={() => setFullScreenPlayer(true)}
            >
              {currentSong.artist_name}
            </p>
          </div>

          <button
            onClick={handleLike}
            className={`p-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0 ${
              isLiked ? 'text-pink-500' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center Playback Controls */}
        <div className="flex flex-col items-center flex-1 max-w-xl px-2">
          <div className="flex items-center gap-2 sm:gap-5">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-full transition-colors hidden sm:block ${
                isShuffle ? 'text-indigo-400 bg-indigo-500/10' : 'text-neutral-400 hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={prevSong}
              className="p-1.5 text-neutral-300 hover:text-white transition-colors"
              title="Previous Song"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/20 hover:scale-105 active:scale-95 transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={nextSong}
              className="p-1.5 text-neutral-300 hover:text-white transition-colors"
              title="Next Song"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-1.5 rounded-full transition-colors hidden sm:block ${
                repeatMode !== 'off'
                  ? 'text-indigo-400 bg-indigo-500/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-3.5 h-3.5" />
              ) : (
                <Repeat className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Time Scrubber (Hidden on smallest mobile screens for compactness) */}
          <div className="w-full hidden sm:flex items-center gap-2 mt-1">
            <span className="text-[10px] text-neutral-400 tabular-nums w-8 text-right font-medium">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
            />
            <span className="text-[10px] text-neutral-400 tabular-nums w-8 font-medium">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Aux Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Synchronized Lyrics Button */}
          <button
            onClick={toggleLyrics}
            className={`p-2 rounded-xl transition-all duration-200 ${
              isLyricsOpen
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            title="Lyrics & Offset Calibration"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Queue Drawer Button */}
          <button
            onClick={toggleQueue}
            className={`p-2 rounded-xl transition-all duration-200 ${
              isQueueOpen
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            title="Play Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume Slider (Desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
          </div>

          {/* Expand Fullscreen Player */}
          <button
            onClick={() => setFullScreenPlayer(true)}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            title="Full Screen Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
