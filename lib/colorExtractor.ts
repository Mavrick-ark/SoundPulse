'use client';

import { useState, useEffect } from 'react';

// In-memory cache for extracted colors
const colorCache = new Map<string, ExtractedColors>();

export interface ExtractedColors {
  primary: string;    // Hex dominant vibrant color
  secondary: string;  // Hex secondary vibrant color
  accent: string;     // Hex tertiary accent color
  rgb: [number, number, number];
  secondaryRgb: [number, number, number];
  accentRgb: [number, number, number];
  halo: string;       // rgba(r, g, b, 0.35)
  glow: string;       // rgba(r, g, b, 0.6)
  dim: string;        // rgba(r, g, b, 0.15)
  gradient: string;   // Multi-color linear gradient
}

// Convert HSL (h: 0-360, s: 0-1, l: 0-1) to RGB [r, g, b]
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function buildPalette(
  primaryRgb: [number, number, number],
  secondaryRgb?: [number, number, number],
  accentRgb?: [number, number, number]
): ExtractedColors {
  const [pr, pg, pb] = primaryRgb;
  const [ph, ps, pl] = rgbToHsl(pr, pg, pb);

  // If secondary color wasn't found in poster, shift hue by +38 degrees
  const secRgb: [number, number, number] = secondaryRgb || hslToRgb((ph + 38) % 360, Math.max(ps, 0.7), Math.min(Math.max(pl, 0.45), 0.65));
  // If accent wasn't found, shift hue by -42 degrees or triadic complement
  const accRgb: [number, number, number] = accentRgb || hslToRgb((ph + 210) % 360, Math.max(ps, 0.65), 0.55);

  const primaryHex = rgbToHex(pr, pg, pb);
  const secondaryHex = rgbToHex(secRgb[0], secRgb[1], secRgb[2]);
  const accentHex = rgbToHex(accRgb[0], accRgb[1], accRgb[2]);

  return {
    primary: primaryHex,
    secondary: secondaryHex,
    accent: accentHex,
    rgb: [pr, pg, pb],
    secondaryRgb: secRgb,
    accentRgb: accRgb,
    halo: `rgba(${pr}, ${pg}, ${pb}, 0.35)`,
    glow: `rgba(${pr}, ${pg}, ${pb}, 0.65)`,
    dim: `rgba(${pr}, ${pg}, ${pb}, 0.15)`,
    gradient: `linear-gradient(90deg, ${primaryHex} 0%, ${secondaryHex} 50%, ${accentHex} 100%)`,
  };
}

// Fallback curated multi-color palettes
const VIBRANT_PALETTES: ExtractedColors[] = [
  buildPalette([225, 29, 72], [245, 158, 11], [139, 92, 246]),  // Crimson + Amber + Violet
  buildPalette([244, 63, 94], [6, 182, 212], [249, 115, 22]),   // Rose + Cyan + Orange
  buildPalette([236, 72, 153], [99, 102, 241], [16, 185, 129]), // Pink + Indigo + Emerald
  buildPalette([217, 70, 239], [59, 130, 246], [245, 158, 11]), // Fuchsia + Blue + Amber
  buildPalette([139, 92, 246], [236, 72, 153], [6, 182, 212]),  // Purple + Pink + Cyan
  buildPalette([99, 102, 241], [244, 63, 94], [16, 185, 129]),  // Indigo + Rose + Emerald
  buildPalette([59, 130, 246], [16, 185, 129], [245, 158, 11]),  // Blue + Emerald + Amber
  buildPalette([6, 182, 212], [236, 72, 153], [249, 115, 22]),  // Cyan + Pink + Orange
  buildPalette([16, 185, 129], [59, 130, 246], [234, 179, 8]),  // Emerald + Blue + Yellow
  buildPalette([245, 158, 11], [225, 29, 72], [99, 102, 241]),  // Amber + Crimson + Indigo
  buildPalette([249, 115, 22], [139, 92, 246], [6, 182, 212]),  // Orange + Purple + Cyan
];

function getFallbackColor(seed: string): ExtractedColors {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % VIBRANT_PALETTES.length;
  return VIBRANT_PALETTES[idx];
}

/**
 * Extracts multiple distinct vibrant colors (primary, secondary, accent) from an album cover.
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

  if (typeof window !== 'undefined') {
    try {
      const colors = await new Promise<ExtractedColors>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No canvas context');

            ctx.drawImage(img, 0, 0, 48, 48);
            const imgData = ctx.getImageData(0, 0, 48, 48).data;

            // Collect distinct candidate pixels
            interface CandidateColor {
              rgb: [number, number, number];
              hsl: [number, number, number];
              score: number;
            }

            const candidates: CandidateColor[] = [];

            for (let i = 0; i < imgData.length; i += 4) {
              const r = imgData[i];
              const g = imgData[i + 1];
              const b = imgData[i + 2];
              const a = imgData[i + 3];

              if (a < 140) continue;

              const [h, s, l] = rgbToHsl(r, g, b);

              // Vibrant tones with saturated color and mid-luminance
              if (s > 0.28 && l > 0.22 && l < 0.82) {
                const score = s * 2.0 + (1 - Math.abs(l - 0.5) * 1.5);
                candidates.push({ rgb: [r, g, b], hsl: [h, s, l], score });
              }
            }

            candidates.sort((a, b) => b.score - a.score);

            if (candidates.length === 0) {
              return resolve(getFallbackColor(seedText + imageUrl));
            }

            const primary = candidates[0];

            // Find secondary color with at least 32 degree hue difference
            let secondary: CandidateColor | null = null;
            for (let i = 1; i < candidates.length; i++) {
              const hueDiff = Math.abs(candidates[i].hsl[0] - primary.hsl[0]);
              const shortestDiff = Math.min(hueDiff, 360 - hueDiff);
              if (shortestDiff > 32) {
                secondary = candidates[i];
                break;
              }
            }

            // Find accent color with distinct hue from both primary and secondary
            let accent: CandidateColor | null = null;
            if (secondary) {
              for (let i = 1; i < candidates.length; i++) {
                const diffP = Math.abs(candidates[i].hsl[0] - primary.hsl[0]);
                const shortestP = Math.min(diffP, 360 - diffP);
                const diffS = Math.abs(candidates[i].hsl[0] - secondary.hsl[0]);
                const shortestS = Math.min(diffS, 360 - diffS);
                if (shortestP > 30 && shortestS > 30) {
                  accent = candidates[i];
                  break;
                }
              }
            }

            const result = buildPalette(
              primary.rgb,
              secondary?.rgb,
              accent?.rgb
            );

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
      // Fallback
    }
  }

  const fallback = getFallbackColor(seedText + imageUrl);
  colorCache.set(imageUrl, fallback);
  return fallback;
}

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
