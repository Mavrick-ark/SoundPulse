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

  // Dynamically extract multi-color palette from the song's poster/album art
  const extracted = usePosterColor(coverUrl, seedTitle);
  const primaryColor = customColor || extracted.primary;
  const secondaryColor = extracted.secondary;
  const accentColor = extracted.accent;
  const haloColor = extracted.halo;
  const glowColor = extracted.glow;

  const effectiveDuration = duration > 0 ? duration : 210;
  const activeTime = isDragging && dragTime !== null ? dragTime : currentTime;
  const progressRatio = Math.max(0, Math.min(1, activeTime / effectiveDuration));

  // Unique SVG gradient and filter IDs to prevent DOM collision across players
  const gradId = useMemo(
    () => `multiGrad-${primaryColor.replace('#', '')}-${secondaryColor.replace('#', '')}`,
    [primaryColor, secondaryColor]
  );
  const glowFilterId = useMemo(
    () => `glowFilter-${primaryColor.replace('#', '')}`,
    [primaryColor]
  );

  // 60fps Continuous undulating wave animation while playing
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
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
  const baseY = viewBoxHeight - 10;
  const currentX = progressRatio * viewBoxWidth;

  // Generate multi-strand undulating wave paths
  const { wavePath1, wavePath2, wavePath3 } = useMemo(() => {
    if (currentX <= 4) {
      return { wavePath1: '', wavePath2: '', wavePath3: '' };
    }

    const maxAmp1 = isPlaying ? 9 : 4;
    const maxAmp2 = isPlaying ? 6.5 : 2.5;
    const maxAmp3 = isPlaying ? 4.5 : 1.5;

    let p1 = `M 0 ${baseY}`;
    let p2 = `M 0 ${baseY}`;
    let p3 = `M 0 ${baseY}`;

    const step = 3;
    for (let x = 0; x <= currentX; x += step) {
      const t = x / currentX;
      const envelope = Math.sin(t * Math.PI);

      // Strand 1: Primary undulating crest
      const y1 = baseY - Math.abs(Math.sin(x * 0.038 - phase)) * maxAmp1 * envelope;
      // Strand 2: Secondary offset wave ribbon (different frequency & phase)
      const y2 = baseY - Math.abs(Math.sin(x * 0.046 - phase - 1.4)) * maxAmp2 * envelope;
      // Strand 3: Tertiary accent wave ribbon
      const y3 = baseY - Math.abs(Math.sin(x * 0.031 - phase - 2.8)) * maxAmp3 * envelope;

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
      {/* Interactive Wave Scrubber Container */}
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
        {/* SVG Waves and Track */}
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible pointer-events-none"
        >
          <defs>
            {/* Multi-Color Gradient for Played Track */}
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="55%" stopColor={secondaryColor} />
              <stop offset="100%" stopColor={accentColor} />
            </linearGradient>

            {/* Poster Glow filter */}
            <filter id={glowFilterId} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Background Unplayed Rail (Clean translucent track) */}
          <line
            x1="0"
            y1={baseY}
            x2={viewBoxWidth}
            y2={baseY}
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* 2. Played Base Rail with Multi-Color Gradient */}
          {currentX > 0 && (
            <line
              x1="0"
              y1={baseY}
              x2={currentX}
              y2={baseY}
              stroke={`url(#${gradId})`}
              strokeWidth="4"
              strokeLinecap="round"
            />
          )}

          {/* 3. Multi-Color Dancing Wave Strands */}
          {currentX > 4 && (
            <>
              {/* Strand 3: Accent Color (Luminous subtle ribbon) */}
              <path
                d={wavePath3}
                fill="none"
                stroke={accentColor}
                strokeWidth="1.6"
                strokeOpacity="0.5"
                strokeLinecap="round"
              />
              {/* Strand 2: Secondary Color (Rich middle ribbon) */}
              <path
                d={wavePath2}
                fill="none"
                stroke={secondaryColor}
                strokeWidth="2.0"
                strokeOpacity="0.75"
                strokeLinecap="round"
              />
              {/* Strand 1: Primary Color (Dominant crest ribbon with glow) */}
              <path
                d={wavePath1}
                fill="none"
                stroke={primaryColor}
                strokeWidth="2.4"
                strokeOpacity="0.95"
                strokeLinecap="round"
                filter={`url(#${glowFilterId})`}
              />
            </>
          )}
        </svg>

        {/* 4. Google Material 3 Playhead Dot (Rendered in HTML to GUARANTEE 100% perfect circularity, never oval) */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none transition-transform duration-75 flex items-center justify-center z-20"
          style={{
            left: `${progressRatio * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Outer Translucent Halo Ring (Google-style smooth circular halo) */}
          <div
            className="absolute rounded-full transition-all duration-150"
            style={{
              width: isDragging ? '28px' : '22px',
              height: isDragging ? '28px' : '22px',
              backgroundColor: haloColor,
              opacity: isDragging ? 0.9 : 0.45,
            }}
          />

          {/* Inner Crisp Solid Google Dot (100% Mathematically Circular) */}
          <div
            className="relative rounded-full bg-white transition-all duration-150"
            style={{
              width: isDragging ? '14px' : '11px',
              height: isDragging ? '14px' : '11px',
              border: `2.5px solid ${primaryColor}`,
              boxShadow: `0 0 10px ${glowColor}, 0 2px 6px rgba(0,0,0,0.45)`,
            }}
          />
        </div>
      </div>

      {/* Timestamps */}
      {showTimestamps && (
        <div className="flex justify-between items-center text-[11px] font-medium text-neutral-400 mt-1 px-0.5 tracking-tight">
          <span className="tabular-nums font-mono">
            {formatTime(activeTime)}
          </span>
          <span className="tabular-nums font-mono text-neutral-500">
            {formatTime(effectiveDuration)}
          </span>
        </div>
      )}
    </div>
  );
};
