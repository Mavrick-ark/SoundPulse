'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { formatTime } from '@/lib/lyrics';
import { usePosterColor, ExtractedColors } from '@/lib/colorExtractor';

interface WaveScrubberProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  className?: string;
  height?: number;
  coverUrl?: string | null;
  seedTitle?: string;
  customColor?: string;
  showTimestamps?: boolean;
}

export const WaveScrubber: React.FC<WaveScrubberProps> = ({
  currentTime,
  duration,
  isPlaying,
  onSeek,
  className = '',
  height = 36,
  coverUrl,
  seedTitle = 'SoundPulse',
  customColor,
  showTimestamps = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [phase, setPhase] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  // Dynamically extract color from the song's poster/album art
  const extracted = usePosterColor(coverUrl, seedTitle);
  const primaryColor = customColor || extracted.primary;
  const haloColor = extracted.halo;
  const glowColor = extracted.glow;

  const effectiveDuration = duration > 0 ? duration : 210;
  const activeTime = isDragging && dragTime !== null ? dragTime : currentTime;
  const progressRatio = Math.max(0, Math.min(1, activeTime / effectiveDuration));

  // 60fps Continuous undulating wave animation while playing (Samsung One UI style)
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        // Shift wave phase smoothly
        setPhase((prev) => (prev + delta * 3.8) % (Math.PI * 20));
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying]);

  // Compute time from clientX position
  const calculateTimeFromX = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = clickX / rect.width;
      return ratio * effectiveDuration;
    },
    [effectiveDuration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    const time = calculateTimeFromX(e.clientX);
    setDragTime(time);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const time = calculateTimeFromX(e.clientX);
    setDragTime(time);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    const finalTime = calculateTimeFromX(e.clientX);
    onSeek(finalTime);
    setDragTime(null);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  };

  const viewBoxWidth = 600;
  const viewBoxHeight = height;
  const baseY = viewBoxHeight - 10; // Baseline near bottom of SVG
  const currentX = progressRatio * viewBoxWidth;

  // Generate the overlapping dancing waves matching Samsung One UI seekbar
  const { wavePath1, wavePath2, wavePath3 } = useMemo(() => {
    if (currentX <= 4) {
      return { wavePath1: '', wavePath2: '', wavePath3: '' };
    }

    const maxAmp1 = isPlaying ? 9 : 4;
    const maxAmp2 = isPlaying ? 6 : 2.5;
    const maxAmp3 = isPlaying ? 4 : 1.5;

    let p1 = `M 0 ${baseY}`;
    let p2 = `M 0 ${baseY}`;
    let p3 = `M 0 ${baseY}`;

    const step = 3;
    for (let x = 0; x <= currentX; x += step) {
      // Bell envelope so wave rises from baseline at x=0 and lands back at currentX
      const t = x / currentX;
      const envelope = Math.sin(t * Math.PI);

      // Strand 1: Primary undulating crest
      const y1 = baseY - Math.abs(Math.sin(x * 0.038 - phase)) * maxAmp1 * envelope;
      // Strand 2: Secondary offset wave ribbon
      const y2 = baseY - Math.abs(Math.sin(x * 0.045 - phase - 1.4)) * maxAmp2 * envelope;
      // Strand 3: Tertiary subtle wave
      const y3 = baseY - Math.abs(Math.sin(x * 0.032 - phase - 2.8)) * maxAmp3 * envelope;

      p1 += ` L ${x.toFixed(1)} ${y1.toFixed(1)}`;
      p2 += ` L ${x.toFixed(1)} ${y2.toFixed(1)}`;
      p3 += ` L ${x.toFixed(1)} ${y3.toFixed(1)}`;
    }

    p1 += ` L ${currentX.toFixed(1)} ${baseY}`;
    p2 += ` L ${currentX.toFixed(1)} ${baseY}`;
    p3 += ` L ${currentX.toFixed(1)} ${baseY}`;

    return { wavePath1: p1, wavePath2: p2, wavePath3: p3 };
  }, [currentX, baseY, isPlaying, phase]);

  return (
    <div className={`w-full select-none ${className}`}>
      {/* Interactive Wave Scrubber SVG */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full cursor-pointer py-1.5 group touch-none"
        style={{ height: `${height}px` }}
        title="Seek position"
      >
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Dynamic Poster Glow filter */}
            <filter id={`posterGlow-${primaryColor.replace('#', '')}`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Background Unplayed Rail (Straight subtle track) */}
          <line
            x1="0"
            y1={baseY}
            x2={viewBoxWidth}
            y2={baseY}
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* 2. Played Base Rail (Solid colored line up to currentX) */}
          {currentX > 0 && (
            <line
              x1="0"
              y1={baseY}
              x2={currentX}
              y2={baseY}
              stroke={primaryColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
          )}

          {/* 3. Samsung Dancing Wave Strands (Rising above baseline) */}
          {currentX > 4 && (
            <>
              {/* Strand 3 (Soft background ribbon) */}
              <path
                d={wavePath3}
                fill="none"
                stroke={primaryColor}
                strokeWidth="1.5"
                strokeOpacity="0.4"
                strokeLinecap="round"
              />
              {/* Strand 2 (Middle ribbon) */}
              <path
                d={wavePath2}
                fill="none"
                stroke={primaryColor}
                strokeWidth="1.8"
                strokeOpacity="0.65"
                strokeLinecap="round"
              />
              {/* Strand 1 (Primary crest ribbon with glow) */}
              <path
                d={wavePath1}
                fill="none"
                stroke={primaryColor}
                strokeWidth="2.2"
                strokeOpacity="0.9"
                strokeLinecap="round"
                filter={`url(#posterGlow-${primaryColor.replace('#', '')})`}
              />
            </>
          )}

          {/* 4. Playhead Thumb (Outer translucent halo + Inner solid dot like Samsung screenshot) */}
          <g transform={`translate(${currentX}, ${baseY})`}>
            {/* Outer Translucent Halo Ring */}
            <circle
              cx="0"
              cy="0"
              r={isDragging ? 12 : 9.5}
              fill={haloColor}
              className="transition-all duration-150"
            />
            {/* Inner Solid Playhead Dot */}
            <circle
              cx="0"
              cy="0"
              r={isDragging ? 6.5 : 5}
              fill={primaryColor}
              className="transition-all duration-150 drop-shadow-[0_0_6px_rgba(0,0,0,0.5)]"
            />
          </g>
        </svg>

        {/* Hover / Drag Floating Time Tooltip */}
        {isDragging && dragTime !== null && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-neutral-900 border border-white/20 text-[10px] font-mono text-white shadow-xl pointer-events-none"
            style={{ left: `${progressRatio * 100}%` }}
          >
            {formatTime(dragTime)}
          </div>
        )}
      </div>

      {/* Timestamps */}
      {showTimestamps && (
        <div className="flex justify-between items-center text-[11px] font-mono text-neutral-400 mt-0.5 px-0.5">
          <span
            className="tabular-nums font-semibold transition-colors"
            style={{ color: primaryColor }}
          >
            {formatTime(activeTime)}
          </span>
          <span className="tabular-nums text-neutral-500">
            {formatTime(effectiveDuration)}
          </span>
        </div>
      )}
    </div>
  );
};
