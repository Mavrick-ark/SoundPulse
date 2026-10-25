'use client';

import { useState, useEffect } from 'react';

// In-memory cache for extracted colors
const colorCache = new Map<string, ExtractedColors>();

export interface ExtractedColors {
  primary: string; // Hex (e.g. #e11d48)
  rgb: [number, number, number];
  halo: string;    // rgba(r, g, b, 0.35)
  glow: string;    // rgba(r, g, b, 0.6)
  dim: string;     // rgba(r, g, b, 0.15)
}

// Fallback dynamic curated palette
const VIBRANT_PALETTE: ExtractedColors[] = [
  hexToColors('#e11d48'), // Crimson Red (like user's screenshot)
  hexToColors('#f43f5e'), // Rose
  hexToColors('#ec4899'), // Pink
  hexToColors('#d946ef'), // Fuchsia
  hexToColors('#8b5cf6'), // Purple
  hexToColors('#6366f1'), // Indigo
  hexToColors('#3b82f6'), // Blue
  hexToColors('#06b6d4'), // Cyan
  hexToColors('#10b981'), // Emerald
  hexToColors('#f59e0b'), // Amber
  hexToColors('#f97316'), // Orange
];

export function hexToColors(hex: string): ExtractedColors {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  return {
    primary: hex,
    rgb: [r, g, b],
    halo: `rgba(${r}, ${g}, ${b}, 0.35)`,
    glow: `rgba(${r}, ${g}, ${b}, 0.6)`,
    dim: `rgba(${r}, ${g}, ${b}, 0.15)`,
  };
}

// Hash string to pick deterministic vibrant fallback
function getFallbackColor(seed: string): ExtractedColors {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % VIBRANT_PALETTE.length;
  return VIBRANT_PALETTE[idx];
}

/**
 * Extracts dominant vibrant color from an image URL using canvas.
 * Falls back to genre/title hash if CORS restricts pixel access.
 */
export async function extractColorFromImage(
  imageUrl?: string | null,
  seedText: string = 'soundpulse'
): Promise<ExtractedColors> {
  if (!imageUrl) {
    return getFallbackColor(seedText);
  }

  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }

  // Attempt client-side canvas sampling
  if (typeof window !== 'undefined') {
    try {
      const colors = await new Promise<ExtractedColors>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No canvas context');

            ctx.drawImage(img, 0, 0, 32, 32);
            const imgData = ctx.getImageData(0, 0, 32, 32).data;

            let bestR = 225, bestG = 29, bestB = 72; // default crimson
            let maxScore = -1;

            // Sample pixels to find the most colorful, vibrant non-dark/non-white tone
            for (let i = 0; i < imgData.length; i += 4) {
              const r = imgData[i];
              const g = imgData[i + 1];
              const b = imgData[i + 2];
              const a = imgData[i + 3];

              if (a < 128) continue;

              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const l = (max + min) / 2;
              const d = max - min;
              const s = l > 128 ? d / (510 - max - min) : d / (max + min || 1);

              // Prioritize vibrant saturated colors with mid luminance (neither black nor white)
              if (s > 0.25 && l > 35 && l < 225) {
                const score = s * 1.5 + (1 - Math.abs(l - 128) / 128);
                if (score > maxScore) {
                  maxScore = score;
                  bestR = r;
                  bestG = g;
                  bestB = b;
                }
              }
            }

            const hex = `#${((1 << 24) + (bestR << 16) + (bestG << 8) + bestB)
              .toString(16)
              .slice(1)}`;

            const result: ExtractedColors = {
              primary: hex,
              rgb: [bestR, bestG, bestB],
              halo: `rgba(${bestR}, ${bestG}, ${bestB}, 0.35)`,
              glow: `rgba(${bestR}, ${bestG}, ${bestB}, 0.65)`,
              dim: `rgba(${bestR}, ${bestG}, ${bestB}, 0.15)`,
            };

            resolve(result);
          } catch (e) {
            reject(e);
          }
        };

        img.onerror = () => reject('Image load failed');
        img.src = imageUrl;
      });

      colorCache.set(imageUrl, colors);
      return colors;
    } catch (_) {
      // CORS or image load blocked -> use deterministic seed color
    }
  }

  const fallback = getFallbackColor(seedText + imageUrl);
  colorCache.set(imageUrl, fallback);
  return fallback;
}

/**
 * React hook to reactively get dominant color from current song's cover.
 */
export function usePosterColor(
  coverUrl?: string | null,
  seed: string = 'soundpulse'
): ExtractedColors {
  const [colors, setColors] = useState<ExtractedColors>(() =>
    coverUrl && colorCache.has(coverUrl)
      ? colorCache.get(coverUrl)!
      : getFallbackColor(seed)
  );

  useEffect(() => {
    let isMounted = true;
    extractColorFromImage(coverUrl, seed).then((res) => {
      if (isMounted) setColors(res);
    });
    return () => {
      isMounted = false;
    };
  }, [coverUrl, seed]);

  return colors;
}
