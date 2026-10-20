'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Mic2,
  ListMusic,
  Disc3,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { formatTime, parseLrc } from '@/lib/lyrics';
import { toggleSongLikeApi } from '@/lib/api';

export const FullScreenPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    favoriteIds,
    lyricsOffset,
    isFullScreenPlayer,
    setFullScreenPlayer,
    togglePlay,
    nextSong,
    prevSong,
    seekTo,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'cover' | 'lyrics'>('cover');

  if (!isFullScreenPlayer || !currentSong) return null;

  const isLiked = favoriteIds.includes(currentSong.song_id);
  const parsedLyrics = parseLrc(currentSong.synced_lyrics);

  const activeLyricIdx = parsedLyrics.findIndex((l, i) => {
    const nextTime = parsedLyrics[i + 1]?.time ?? Infinity;
    const adjusted = currentTime + lyricsOffset;
    return adjusted >= l.time && adjusted < nextTime;
  });

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.target.value));
  };

  const handleLike = () => {
    toggleFavorite(currentSong.song_id);
    toggleSongLikeApi(currentSong.song_id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#08090d]/95 backdrop-blur-3xl flex flex-col justify-between p-6 md:p-12 overflow-y-auto animate-in fade-in duration-300">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <button
          onClick={() => setFullScreenPlayer(false)}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
          title="Minimize"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-neutral-300">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            {currentSong.audio_url ? 'Lossless Local Stream' : 'YouTube Music High-Res'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'lyrics' ? 'cover' : 'lyrics')}
            className={`p-2.5 rounded-full transition-colors ${
              activeTab === 'lyrics'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/5 text-neutral-400 hover:text-white'
            }`}
            title="Toggle Lyrics"
          >
            <Mic2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Artwork or Synced Lyrics */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-6 max-w-xl mx-auto w-full">
        {activeTab === 'cover' ? (
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-neutral-900 group">
            {currentSong.cover_url ? (
              <img
                src={currentSong.cover_url}
                alt={currentSong.song_name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-indigo-400 gap-3">
                <Disc3 className={`w-24 h-24 ${isPlaying ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium text-neutral-400">SoundPulse Audio</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-80 sm:h-96 overflow-y-auto px-4 py-6 text-center space-y-5 select-none">
            {parsedLyrics.length > 0 ? (
              parsedLyrics.map((line, idx) => {
                const isActive = idx === activeLyricIdx;
                return (
                  <div
                    key={idx}
                    onClick={() => seekTo(line.time - lyricsOffset)}
                    className={`cursor-pointer transition-all duration-300 py-1 px-3 rounded-xl ${
                      isActive
                        ? 'text-white font-bold text-2xl scale-105 text-indigo-300'
                        : 'text-neutral-400 hover:text-neutral-200 text-lg'
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })
            ) : (
              <div className="text-neutral-400 py-20 text-sm">
                No synced lyrics available for this song.
              </div>
            )}
          </div>
        )}

        {/* Title, Artist & Like */}
        <div className="w-full mt-8 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
              {currentSong.song_name}
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 truncate mt-1">
              {currentSong.artist_name} {currentSong.album_name ? `• ${currentSong.album_name}` : ''}
            </p>
          </div>
          <button
            onClick={handleLike}
            className={`p-3 rounded-full hover:bg-white/10 transition-colors ml-4 ${
              isLiked ? 'text-pink-500' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 max-w-xl mx-auto w-full space-y-4">
        {/* Scrubber */}
        <div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
          />
          <div className="flex justify-between text-xs text-neutral-400 font-medium mt-1.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Buttons */}
        <div className="flex items-center justify-between px-4">
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${
              isShuffle ? 'text-indigo-400' : 'text-neutral-400 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={prevSong}
            className="p-2 text-white hover:text-indigo-300 transition-colors"
            title="Previous"
          >
            <SkipBack className="w-7 h-7" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-xl shadow-white/20 hover:scale-105 active:scale-95 transition-transform"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={nextSong}
            className="p-2 text-white hover:text-indigo-300 transition-colors"
            title="Next"
          >
            <SkipForward className="w-7 h-7" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-2 transition-colors ${
              repeatMode !== 'off' ? 'text-indigo-400' : 'text-neutral-400 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
