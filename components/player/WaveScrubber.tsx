'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { formatTime } from '@/lib/lyrics';

interface WaveScrubberProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  className?: string;
  height?: number;
  waveAmplitude?: number;
  waveFrequency?: number;
  showTimestamps?: boolean;
  color?: string; // Tailwind or hex
  glow?: boolean;
}

export const WaveScrubber: React.FC<WaveScrubberProps> = ({
  currentTime,
  duration,
  isPlaying,
  onSeek,
  className = '',
  height = 36,
  waveAmplitude = 5,
  waveFrequency = 0.035,
  showTimestamps = true,
  glow = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [phase, setPhase] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  const effectiveDuration = duration > 0 ? duration : 210;
  const activeTime = isDragging && dragTime !== null ? dragTime : currentTime;
  const progressRatio = Math.max(0, Math.min(1, activeTime / effectiveDuration));

  // Continuous undulating wave animation while playing (Samsung style)
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        // Shift wave phase smoothly
        setPhase((prev) => (prev + delta * 4.5) % (Math.PI * 20));
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

  // Compute time from mouse/touch clientX position
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

  // Drag & click interactions
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

  // Generate SVG paths for the undulating Samsung wave
  const viewBoxWidth = 600;
  const viewBoxHeight = height;
  const centerY = viewBoxHeight / 2;
  const currentAmp = isPlaying ? waveAmplitude : waveAmplitude * 0.35;

  const currentX = progressRatio * viewBoxWidth;

  // Build played wave path (undulating sinusoidal wave)
  let playedPath = '';
  const step = 4; // resolution
  for (let x = 0; x <= currentX; x += step) {
    // Dampen amplitude near start and end of played segment for organic aesthetic
    const envelope = Math.sin((x / Math.max(1, currentX)) * Math.PI);
    const amp = currentAmp * (0.4 + 0.6 * envelope);
    const y = centerY + Math.sin(x * waveFrequency - phase) * amp;

    if (x === 0) {
      playedPath += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      playedPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }

  // Ensure path reaches exact currentX
  const endY = centerY + Math.sin(currentX * waveFrequency - phase) * (currentAmp * 0.4);
  playedPath += ` L ${currentX.toFixed(1)} ${endY.toFixed(1)}`;

  // Remaining path: smooth sleek line to end of track
  const remainingPath = `M ${currentX.toFixed(1)} ${endY.toFixed(1)} L ${viewBoxWidth} ${centerY.toFixed(1)}`;

  return (
    <div className={`w-full select-none ${className}`}>
      {/* Interactive Waveform Canvas/SVG Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full cursor-pointer py-2 group touch-none"
        style={{ height: `${height}px` }}
        title="Seek position"
      >
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Liquid neon gradient for the active wave */}
            <linearGradient id="samsungWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            {/* Glowing filter */}
            {glow && (
              <filter id="waveGlow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )}
          </defs>

          {/* Background straight unplayed rail */}
          <line
            x1="0"
            y1={centerY}
            x2={viewBoxWidth}
            y2={centerY}
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Unplayed remaining section */}
          <path
            d={remainingPath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Played Undulating Samsung Wave */}
          {currentX > 0 && (
            <path
              d={playedPath}
              fill="none"
              stroke="url(#samsungWaveGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              filter={glow ? 'url(#waveGlow)' : undefined}
              className="transition-[stroke-width] group-hover:stroke-[5px]"
            />
          )}

          {/* Samsung Wave Handle / Playhead Dot */}
          <circle
            cx={currentX}
            cy={endY}
            r={isDragging ? 7.5 : 5.5}
            fill="#ffffff"
            className="transition-all duration-150 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]"
          />
        </svg>

        {/* Hover / Scrub Floating Time Tooltip */}
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
        <div className="flex justify-between items-center text-[11px] font-mono text-neutral-400 -mt-1 px-0.5">
          <span className="tabular-nums text-neutral-300 font-semibold">{formatTime(activeTime)}</span>
          <span className="tabular-nums text-neutral-500">{formatTime(effectiveDuration)}</span>
        </div>
      )}
    </div>
  );
};
