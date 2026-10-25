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
  Radio,
  Loader2,
} from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { formatTime, parseLrc } from '@/lib/lyrics';
import { toggleSongLikeApi } from '@/lib/api';
import { WaveScrubber } from './WaveScrubber';
import { usePosterColor } from '@/lib/colorExtractor';

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
    setQueue,
    toggleQueue,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'cover' | 'lyrics'>('cover');
  const [isLoadingRadio, setIsLoadingRadio] = useState(false);
  const posterColor = usePosterColor(currentSong?.cover_url, currentSong?.song_name);

  if (!isFullScreenPlayer || !currentSong) return null;

  const isLiked = favoriteIds.includes(currentSong.song_id);
  const parsedLyrics = parseLrc(currentSong.synced_lyrics);

  const activeLyricIdx = parsedLyrics.findIndex((l, i) => {
    const nextTime = parsedLyrics[i + 1]?.time ?? Infinity;
    const adjusted = currentTime + lyricsOffset;
    return adjusted >= l.time && adjusted < nextTime;
  });

  const handleLike = () => {
    toggleFavorite(currentSong.song_id);
    toggleSongLikeApi(currentSong.song_id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#08090d]/95 backdrop-blur-3xl flex flex-col justify-between p-6 md:p-12 overflow-y-auto animate-in fade-in duration-300">
      {/* Background Dynamic Poster Ambient Glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full blur-[140px] pointer-events-none transition-all duration-700 opacity-20"
        style={{ backgroundColor: posterColor.primary }}
      />

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
            onClick={async () => {
              if (isLoadingRadio || !currentSong) return;
              setIsLoadingRadio(true);
              try {
                const vid = currentSong.youtube_id || currentSong.song_name;
                const res = await fetch(`/api/ytmusic/radio?videoId=${encodeURIComponent(vid)}&limit=25`);
                if (res.ok) {
                  const data = await res.json();
                  if (data.tracks && data.tracks.length > 0) {
                    setQueue([currentSong, ...data.tracks]);
                    toggleQueue();
                  }
                }
              } catch (err) {
                console.warn('Failed to start radio:', err);
              } finally {
                setIsLoadingRadio(false);
              }
            }}
            disabled={isLoadingRadio}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-pink-400 transition-colors disabled:opacity-50"
            title="Start YouTube Music Automix Radio (PureRadioQueue)"
          >
            {isLoadingRadio ? (
              <Loader2 className="w-5 h-5 animate-spin text-pink-400" />
            ) : (
              <Radio className="w-5 h-5" />
            )}
          </button>

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
        {/* Samsung Undulating Wave Timeline Scrubber (Dynamic Poster Color) */}
        <div className="w-full px-1">
          <WaveScrubber
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onSeek={(time) => seekTo(time)}
            height={46}
            coverUrl={currentSong.cover_url}
            seedTitle={currentSong.song_name}
            showTimestamps={true}
          />
        </div>

        {/* Playback Buttons */}
        <div className="flex items-center justify-between px-4">
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${
              isShuffle ? 'text-white' : 'text-neutral-400 hover:text-white'
            }`}
            style={{ color: isShuffle ? posterColor.primary : undefined }}
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
            style={{
              backgroundColor: posterColor.primary,
              boxShadow: `0 8px 25px ${posterColor.halo}`,
            }}
            className="w-16 h-16 rounded-full text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
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
              repeatMode !== 'off' ? 'text-white' : 'text-neutral-400 hover:text-white'
            }`}
            style={{ color: repeatMode !== 'off' ? posterColor.primary : undefined }}
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
