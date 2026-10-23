import { SyncedLyricLine } from '@/types/music';

export function parseLrc(lrcContent?: string | null): SyncedLyricLine[] {
  if (!lrcContent || typeof lrcContent !== 'string') return [];

  const lines = lrcContent.split('\n');
  const result: SyncedLyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let match;
    const timestamps: number[] = [];
    timeRegex.lastIndex = 0;

    while ((match = timeRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3] ? (match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10)) : 0;
      const totalSeconds = minutes * 60 + seconds + ms / 1000;
      timestamps.push(totalSeconds);
    }

    const text = trimmed.replace(timeRegex, '').trim();

    if (text) {
      for (const time of timestamps) {
        result.push({ time, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatPlayCount(count?: number | null): string {
  if (!count || count <= 0) return '—';
  if (count >= 1_000_000_000) {
    const val = (count / 1_000_000_000).toFixed(1);
    return `${val.endsWith('.0') ? val.slice(0, -2) : val}B`;
  }
  if (count >= 1_000_000) {
    const val = (count / 1_000_000).toFixed(1);
    return `${val.endsWith('.0') ? val.slice(0, -2) : val}M`;
  }
  if (count >= 1_000) {
    const val = (count / 1_000).toFixed(1);
    return `${val.endsWith('.0') ? val.slice(0, -2) : val}K`;
  }
  return count.toLocaleString();
}
