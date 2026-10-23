import { Song, Playlist } from '@/types/music';

export interface SmartPlaylist {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  category: 'mix' | 'mood' | 'artist' | 'tempo';
  songs: Song[];
  total_songs: number;
  total_duration: number;
}

export interface RecommendationEngineResult {
  greeting: string;
  timeContext: string;
  quickPicks: Song[];
  recommendedForYou: {
    song: Song;
    reason: string;
  }[];
  smartPlaylists: SmartPlaylist[];
  filteredQuickPicks: Record<string, Song[]>;
}

// Helper to calculate greeting based on hour
export function getTimeContext(): { greeting: string; context: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { greeting: 'Good morning', context: 'Morning Freshness' };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: 'Good afternoon', context: 'Midday Focus' };
  } else if (hour >= 17 && hour < 22) {
    return { greeting: 'Good evening', context: 'Sunset Chill' };
  } else {
    return { greeting: 'Late night vibes', context: 'Midnight Flow' };
  }
}

/**
 * Generate Smart Self-Curated Playlists & Recommendations
 */
export function generateSmartRecommendations(
  allSongs: Song[],
  history: Song[],
  favoriteIds: number[]
): RecommendationEngineResult {
  const { greeting, context } = getTimeContext();

  if (!allSongs || allSongs.length === 0) {
    return {
      greeting,
      timeContext: context,
      quickPicks: [],
      recommendedForYou: [],
      smartPlaylists: [],
      filteredQuickPicks: { All: [], Relax: [], Workout: [], Focus: [], Energize: [] },
    };
  }

  // 1. Identify favorite and recent artists / genres
  const favoriteSongs = allSongs.filter((s) => favoriteIds.includes(s.song_id));
  const recentArtistNames = new Set(history.map((s) => s.artist_name).filter(Boolean));
  const favoriteArtistNames = new Set(favoriteSongs.map((s) => s.artist_name).filter(Boolean));

  // 2. Score songs for personalized recommendations
  const scored = allSongs.map((song) => {
    let score = 0;
    let reason = 'Curated for you';

    // Boost if artist is recently listened
    if (recentArtistNames.has(song.artist_name)) {
      score += 35;
      reason = `Because you like ${song.artist_name}`;
    }
    // Boost if artist is in favorites
    if (favoriteArtistNames.has(song.artist_name)) {
      score += 45;
      reason = `Matches your favorite artist ${song.artist_name}`;
    }
    // Boost favorites slightly
    if (favoriteIds.includes(song.song_id)) {
      score += 20;
    }
    // Boost based on plays
    score += Math.min(25, (song.play_count || 0) * 2);

    // Minor random jitter so it stays fresh
    score += Math.random() * 8;

    return { song, score, reason };
  });

  scored.sort((a, b) => b.score - a.score);

  const recommendedForYou = scored.slice(0, 12).map((item) => ({
    song: item.song,
    reason: item.reason,
  }));

  // 3. Contextual Quick Picks (top 8 personalized)
  const quickPicks = scored.slice(0, 8).map((it) => it.song);

  // 4. Categorized Quick Picks (Relax, Workout, Focus, Energize)
  const relaxSongs = allSongs
    .filter((s) => (s.bpm && s.bpm < 110) || s.genre_name?.toLowerCase().includes('chill') || s.genre_name?.toLowerCase().includes('acoustic'))
    .slice(0, 8);
  const workoutSongs = allSongs
    .filter((s) => (s.bpm && s.bpm >= 120) || s.genre_name?.toLowerCase().includes('pop') || s.genre_name?.toLowerCase().includes('dance'))
    .slice(0, 8);
  const focusSongs = allSongs
    .filter((s) => s.genre_name?.toLowerCase().includes('instrumental') || s.genre_name?.toLowerCase().includes('classical') || (s.bpm && s.bpm <= 100))
    .slice(0, 8);
  const energizeSongs = allSongs
    .filter((s) => (s.bpm && s.bpm >= 115) || (s.play_count || 0) > 2)
    .slice(0, 8);

  const filteredQuickPicks = {
    All: quickPicks,
    Relax: relaxSongs.length > 0 ? relaxSongs : quickPicks.slice(0, 6),
    Workout: workoutSongs.length > 0 ? workoutSongs : quickPicks.slice(2, 8),
    Focus: focusSongs.length > 0 ? focusSongs : quickPicks.slice(1, 7),
    Energize: energizeSongs.length > 0 ? energizeSongs : quickPicks,
  };

  // 5. Self-Generated Smart Mixes
  const smartPlaylists: SmartPlaylist[] = [];

  // Mix 1: My Supermix
  const supermixSongs = [...scored.slice(0, 15).map((it) => it.song)];
  if (supermixSongs.length > 0) {
    smartPlaylists.push({
      id: 'smart-supermix',
      title: 'My Supermix',
      subtitle: 'Personalized Algorithmic Blend',
      description: 'Your favorite tracks, top artists, and recent listening history fused into one dynamic stream.',
      gradient: 'from-indigo-600 via-purple-600 to-pink-500',
      category: 'mix',
      songs: supermixSongs,
      total_songs: supermixSongs.length,
      total_duration: supermixSongs.reduce((acc, s) => acc + (s.duration || 0), 0),
    });
  }

  // Mix 2: High-Energy Workout Mix (BPM >= 120 or upbeat)
  const highEnergy = allSongs.filter((s) => (s.bpm && s.bpm >= 120) || (s.play_count || 0) > 3).slice(0, 15);
  if (highEnergy.length > 0) {
    smartPlaylists.push({
      id: 'smart-workout',
      title: 'High-Energy Cardio',
      subtitle: '120+ BPM Upbeat Flow',
      description: 'High-octane tracks curated to maintain momentum, workout intensity, and adrenaline.',
      gradient: 'from-amber-500 via-rose-500 to-red-600',
      category: 'tempo',
      songs: highEnergy,
      total_songs: highEnergy.length,
      total_duration: highEnergy.reduce((acc, s) => acc + (s.duration || 0), 0),
    });
  }

  // Mix 3: Deep Focus & Lo-Fi Chill
  const chillFocus = allSongs.filter((s) => !highEnergy.includes(s)).slice(0, 15);
  if (chillFocus.length > 0) {
    smartPlaylists.push({
      id: 'smart-focus',
      title: 'Late Night Chill & Lo-Fi',
      subtitle: 'Mellow Atmosphere',
      description: 'Relaxing ambient tunes and smooth acoustic vibes designed for deep work or evening unwind.',
      gradient: 'from-blue-600 via-teal-500 to-emerald-500',
      category: 'mood',
      songs: chillFocus,
      total_songs: chillFocus.length,
      total_duration: chillFocus.reduce((acc, s) => acc + (s.duration || 0), 0),
    });
  }

  // Mix 4: Heavy Rotation / Most Played
  const mostPlayed = [...allSongs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 15);
  if (mostPlayed.length > 0) {
    smartPlaylists.push({
      id: 'smart-heavy-rotation',
      title: 'Heavy Rotation',
      subtitle: 'Most Played Anthems',
      description: 'The tracks currently on repeat across your SoundPulse sessions.',
      gradient: 'from-fuchsia-600 via-purple-600 to-indigo-700',
      category: 'mix',
      songs: mostPlayed,
      total_songs: mostPlayed.length,
      total_duration: mostPlayed.reduce((acc, s) => acc + (s.duration || 0), 0),
    });
  }

  // Mix 5: Top Artist Spotlight Mix
  if (allSongs.length > 0) {
    // Find most frequent artist
    const counts: Record<string, number> = {};
    allSongs.forEach((s) => {
      counts[s.artist_name] = (counts[s.artist_name] || 0) + 1;
    });
    const topArtist = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

    if (topArtist) {
      const artistTracks = allSongs.filter((s) => s.artist_name === topArtist);
      smartPlaylists.push({
        id: `smart-artist-${encodeURIComponent(topArtist)}`,
        title: `${topArtist} & Similar`,
        subtitle: 'Artist Radio & Discovered Gems',
        description: `Essential signature tracks and soundscapes inspired by ${topArtist}.`,
        gradient: 'from-violet-600 via-pink-600 to-orange-500',
        category: 'artist',
        songs: artistTracks,
        total_songs: artistTracks.length,
        total_duration: artistTracks.reduce((acc, s) => acc + (s.duration || 0), 0),
      });
    }
  }

  return {
    greeting,
    timeContext: context,
    quickPicks,
    recommendedForYou,
    smartPlaylists,
    filteredQuickPicks,
  };
}
