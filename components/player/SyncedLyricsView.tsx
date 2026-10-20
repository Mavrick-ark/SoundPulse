'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { X, Clock, RotateCcw, Sparkles, MicOff } from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { parseLrc } from '@/lib/lyrics';
import { updateLyricsOffsetApi } from '@/lib/api';

export const SyncedLyricsView: React.FC = () => {
  const {
    currentSong,
    currentTime,
    lyricsOffset,
    adjustLyricsOffset,
    setLyricsOffset,
    toggleLyrics,
    seekTo,
  } = usePlayerStore();

  const linesContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Parse LRC synced lyrics
  const parsedLyrics = useMemo(() => {
    if (!currentSong?.synced_lyrics) return [];
    return parseLrc(currentSong.synced_lyrics);
  }, [currentSong?.synced_lyrics]);

  // Determine active lyric index
  const activeIndex = useMemo(() => {
    if (parsedLyrics.length === 0) return -1;
    const adjustedTime = currentTime + lyricsOffset;
    let idx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (adjustedTime >= parsedLyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [parsedLyrics, currentTime, lyricsOffset]);

  // Auto-scroll active line smoothly into center
  useEffect(() => {
    if (activeLineRef.current && linesContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  const handleAdjustOffset = (delta: number) => {
    adjustLyricsOffset(delta);
    const updated = Number((lyricsOffset + delta).toFixed(2));
    if (currentSong?.song_id) {
      updateLyricsOffsetApi(currentSong.song_id, updated);
    }
  };

  const handleResetOffset = () => {
    setLyricsOffset(0);
    if (currentSong?.song_id) {
      updateLyricsOffsetApi(currentSong.song_id, 0);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#0c0e18]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="text-base font-semibold text-white tracking-wide">
            Live Synchronized Lyrics
          </h3>
        </div>
        <button
          onClick={toggleLyrics}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Timing Offset Calibration Bar */}
      <div className="px-6 py-2.5 bg-white/[0.03] border-b border-white/5 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-1.5 text-neutral-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Offset:</span>
          <span className="font-semibold text-white tabular-nums">
            {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(2)}s` : `${lyricsOffset.toFixed(2)}s`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleAdjustOffset(-1.0)}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors"
            title="Delay lyrics by 1 second"
          >
            -1.0s
          </button>
          <button
            onClick={() => handleAdjustOffset(-0.5)}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors"
            title="Delay lyrics by 0.5 second"
          >
            -0.5s
          </button>
          <button
            onClick={() => handleAdjustOffset(0.5)}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors"
            title="Advance lyrics by 0.5 second"
          >
            +0.5s
          </button>
          <button
            onClick={() => handleAdjustOffset(1.0)}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors"
            title="Advance lyrics by 1 second"
          >
            +1.0s
          </button>
          <button
            onClick={handleResetOffset}
            className="p-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white transition-colors ml-1"
            title="Reset offset to 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lyrics Body */}
      <div
        ref={linesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-8 space-y-6 text-center select-none"
      >
        {parsedLyrics.length > 0 ? (
          parsedLyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => seekTo(line.time - lyricsOffset)}
                className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-xl ${
                  isActive
                    ? 'text-white font-bold text-xl sm:text-2xl scale-105 bg-indigo-500/15 text-shadow-glow'
                    : 'text-neutral-400 hover:text-neutral-200 text-base sm:text-lg hover:scale-102'
                }`}
              >
                {line.text}
              </div>
            );
          })
        ) : currentSong?.lyrics ? (
          <div className="text-left text-neutral-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base font-medium">
            {currentSong.lyrics}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-3 py-16">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-neutral-400">
              <MicOff className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">No lyrics available for this track.</p>
            <p className="text-xs text-neutral-400 text-center max-w-xs">
              SoundPulse automatically syncs verified lyrics from LRCLIB for recognized tracks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
