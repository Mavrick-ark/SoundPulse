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
  Sparkles,
  Radio,
} from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { toggleSongLikeApi } from '@/lib/api';
import { WaveScrubber } from './WaveScrubber';
import { usePosterColor } from '@/lib/colorExtractor';

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
    queue,
  } = usePlayerStore();

  const posterColor = usePosterColor(currentSong?.cover_url, currentSong?.song_name);
  const isLiked = currentSong ? favoriteIds.includes(currentSong.song_id) : false;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleLike = () => {
    if (!currentSong) return;
    toggleFavorite(currentSong.song_id);
    toggleSongLikeApi(currentSong.song_id);
  };

  // When no song is active, show the dock bar ready with music
  if (!currentSong) {
    return (
      <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 bg-[#0d0f17]/95 backdrop-blur-2xl border-t border-white/10 px-3 sm:px-6 py-2.5 pb-safe select-none shadow-[0_-10px_35px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-pink-600/30 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0 shadow-md">
              <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-white truncate flex items-center gap-1.5">
                <span>SoundPulse Player Ready</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </p>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate">
                Tap any track to play with Samsung-style wave timeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => togglePlay()}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition-transform hover:scale-105 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Play Trending</span>
              <span className="sm:hidden">Play</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 bg-[#0d0f17]/95 backdrop-blur-2xl border-t border-white/10 px-3 sm:px-6 py-2 pb-safe select-none shadow-[0_-10px_35px_rgba(0,0,0,0.7)]">
      {/* Top micro wave accent for glance (Colored by poster) */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden">
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: posterColor.primary,
            boxShadow: isPlaying ? `0 0 10px ${posterColor.halo}` : undefined,
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6">
        {/* Track Metadata (Left) */}
        <div className="flex items-center gap-3 min-w-0 max-w-[45%] sm:max-w-[280px]">
          <div
            onClick={() => setFullScreenPlayer(true)}
            className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800 border border-white/10 cursor-pointer group shadow-md"
            title="Open Full Screen Player"
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
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => setFullScreenPlayer(true)}
          >
            <p
              title={currentSong.song_name}
              className="text-xs sm:text-sm font-semibold text-white truncate hover:text-indigo-400 transition-colors"
            >
              {currentSong.song_name}
            </p>
            <p
              title={currentSong.artist_name}
              className="text-[10px] sm:text-xs text-neutral-400 truncate hover:text-neutral-200 transition-colors"
            >
              {currentSong.artist_name}
            </p>
          </div>

          <button
            onClick={handleLike}
            className={`p-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0 ${
              isLiked ? 'text-pink-500' : 'text-neutral-400 hover:text-white'
            }`}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center Playback Controls + Dynamic Wave Scrubber */}
        <div className="flex flex-col items-center flex-1 max-w-xl px-1 sm:px-2 min-w-0">
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

          {/* Samsung Waveform Timeline Scrubber (Desktop/Tablet) */}
          <div className="w-full hidden sm:block -mt-0.5">
            <WaveScrubber
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onSeek={(t) => seekTo(t)}
              height={26}
              coverUrl={currentSong.cover_url}
              seedTitle={currentSong.song_name}
              showTimestamps={true}
            />
          </div>
        </div>

        {/* Right Aux Controls */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Synchronized Lyrics Button */}
          <button
            onClick={toggleLyrics}
            className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 ${
              isLyricsOpen
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            title="Synchronized Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Queue Drawer Button */}
          <button
            onClick={toggleQueue}
            className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 ${
              isQueueOpen
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            title="Queue"
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
            className="p-1.5 sm:p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            title="Expand to Full Screen Wave Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
