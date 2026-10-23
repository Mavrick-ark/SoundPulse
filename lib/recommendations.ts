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
 * Generate 100% Authentic, Deterministic Recommendations (Zero Randomness)
 * Based on listening history, favorite artists, tempo affinity, and verified stream counts.
 */
export function generateSmartRecommendations(
  allSongs: Song[],
  history: Song[] = [],
  favoriteIds: number[] = []
): RecommendationEngineResult {
  const { greeting, context } = getTimeContext();
  const currentHour = new Date().getHours();

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

  // 1. Build deterministic user preference models
  const favoriteSongs = allSongs.filter((s) => favoriteIds.includes(s.song_id));
  const favoriteArtistSet = new Set(favoriteSongs.map((s) => s.artist_name.toLowerCase().trim()));

  // Artist frequency in history (higher count = stronger affinity)
  const artistPlayCount: Record<string, number> = {};
  const genrePlayCount: Record<string, number> = {};

  history.forEach((track, idx) => {
    const art = (track.artist_name || '').toLowerCase().trim();
    if (art) {
      // Recency decay: most recent song gets 10 points, second gets 9, etc.
      const recencyWeight = Math.max(1, 10 - idx);
      artistPlayCount[art] = (artistPlayCount[art] || 0) + recencyWeight;
    }
    const gen = (track.genre_name || '').toLowerCase().trim();
    if (gen) {
      genrePlayCount[gen] = (genrePlayCount[gen] || 0) + 1;
    }
  });

  // Top user artist & genre
  const topArtistEntry = Object.entries(artistPlayCount).sort((a, b) => b[1] - a[1])[0];
  const topArtist = topArtistEntry ? topArtistEntry[0] : null;

  const topGenreEntry = Object.entries(genrePlayCount).sort((a, b) => b[1] - a[1])[0];
  const topGenre = topGenreEntry ? topGenreEntry[0] : null;

  // Most recently played artist
  const lastPlayedTrack = history[0];
  const lastPlayedArtist = lastPlayedTrack?.artist_name?.toLowerCase().trim();

  // 2. Score every song deterministically (Zero Math.random)
  const scored = allSongs.map((song) => {
    let score = 0;
    let reason = 'Trending on SoundPulse';
    const songArtistLower = (song.artist_name || '').toLowerCase().trim();
    const songGenreLower = (song.genre_name || '').toLowerCase().trim();

    // Reason 1: Direct match with last played artist (highest temporal relevance)
    if (lastPlayedArtist && songArtistLower === lastPlayedArtist) {
      score += 70;
      reason = `Because you listened to ${song.artist_name}`;
    }
    // Reason 2: Match with frequently listened artist
    else if (artistPlayCount[songArtistLower]) {
      const affinity = artistPlayCount[songArtistLower];
      score += 45 + Math.min(30, affinity * 4);
      reason = `Frequent artist in your rotation • ${song.artist_name}`;
    }
    // Reason 3: Match with user's favorited artist
    else if (favoriteArtistSet.has(songArtistLower)) {
      score += 55;
      reason = `From your favorite artist ${song.artist_name}`;
    }

    // Liked song bonus
    if (favoriteIds.includes(song.song_id)) {
      score += 30;
      if (reason === 'Trending on SoundPulse') {
        reason = 'Liked in your favorites';
      }
    }

    // Genre affinity bonus
    if (topGenre && songGenreLower && (songGenreLower.includes(topGenre) || topGenre.includes(songGenreLower))) {
      score += 25;
      if (reason === 'Trending on SoundPulse') {
        reason = `Matches your listening taste • ${song.genre_name || 'Music'}`;
      }
    }

    // Authentic stream count velocity bonus (logarithmic scale)
    if (song.play_count && song.play_count > 0) {
      const popularityBonus = Math.min(30, Math.round(Math.log10(song.play_count) * 3));
      score += popularityBonus;
      if (reason === 'Trending on SoundPulse' && song.play_count >= 1000000000) {
        reason = 'Global 1B+ streaming hit';
      }
    }

    // Deterministic time-of-day alignment
    if (currentHour >= 22 || currentHour < 5) {
      // Late night: prefer mellow tracks
      if (song.bpm && song.bpm <= 105) score += 18;
    } else if (currentHour >= 17 && currentHour < 22) {
      // Evening: prefer soul / pop / chill
      if (songGenreLower.includes('soul') || songGenreLower.includes('romantic') || songGenreLower.includes('pop')) {
        score += 15;
      }
    } else if (currentHour >= 12 && currentHour < 17) {
      // Afternoon: focus & upbeat
      if (song.bpm && song.bpm >= 100 && song.bpm <= 135) score += 12;
    }

    return { song, score, reason };
  });

  // Sort descending by deterministic score
  scored.sort((a, b) => b.score - a.score);

  // 3. Recommended For You (Top 12 personal recommendations)
  const recommendedForYou = scored.slice(0, 12).map((item) => ({
    song: item.song,
    reason: item.reason,
  }));

  // 4. Contextual Quick Picks (Top 8 personalized tracks)
  const quickPicks = scored.slice(0, 8).map((it) => it.song);

  // 5. Authentic Categorized Quick Picks
  const relaxSongs = allSongs
    .filter((s) => {
      const g = (s.genre_name || '').toLowerCase();
      return (s.bpm && s.bpm <= 105) || g.includes('acoustic') || g.includes('chill') || g.includes('romantic') || g.includes('soul') || g.includes('retro');
    })
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, 8);

  const workoutSongs = allSongs
    .filter((s) => {
      const g = (s.genre_name || '').toLowerCase();
      return (s.bpm && s.bpm >= 120) || g.includes('dance') || g.includes('edm') || g.includes('house') || g.includes('rock') || g.includes('hip-hop');
    })
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, 8);

  const focusSongs = allSongs
    .filter((s) => {
      const g = (s.genre_name || '').toLowerCase();
      return (s.bpm && s.bpm <= 100) || g.includes('instrumental') || g.includes('classical') || g.includes('ambient') || g.includes('lo-fi') || g.includes('piano');
    })
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, 8);

  const energizeSongs = allSongs
    .filter((s) => {
      const g = (s.genre_name || '').toLowerCase();
      return (s.bpm && s.bpm >= 115) || g.includes('pop') || g.includes('synthpop') || g.includes('dance') || (s.play_count || 0) >= 1500000000;
    })
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, 8);

  const filteredQuickPicks: Record<string, Song[]> = {
    All: quickPicks,
    Relax: relaxSongs.length >= 4 ? relaxSongs : quickPicks.slice(0, 8),
    Workout: workoutSongs.length >= 4 ? workoutSongs : quickPicks.slice(0, 8),
    Focus: focusSongs.length >= 4 ? focusSongs : quickPicks.slice(0, 8),
    Energize: energizeSongs.length >= 4 ? energizeSongs : quickPicks,
  };

  // 6. Self-Generated Smart Playlists (Algorithmic Mixes)
  const smartPlaylists: SmartPlaylist[] = [];

  // Mix 1: My Supermix (Algorithmic Blend of User Preferences)
  const supermixSongs = [...scored.slice(0, 16).map((it) => it.song)];
  if (supermixSongs.length > 0) {
    smartPlaylists.push({
      id: 'smart-supermix',
      title: 'My Supermix',
      subtitle: 'Personalized Algorithmic Blend',
      description: 'Your favorite artists, recently played sounds, and deterministic affinity tracks woven together.',
      gradient: 'from-indigo-600 via-purple-600 to-pink-500',
      category: 'mix',
      songs: supermixSongs,
      total_songs: supermixSongs.length,
      total_duration: supermixSongs.reduce((acc, s) => acc + (s.duration || 0), 0),
    });
  }

  // Mix 2: High-Energy Cardio Mix (120+ BPM Upbeat Flow)
  const highEnergyList = workoutSongs.length >= 4 ? workoutSongs : allSongs.filter((s) => (s.bpm && s.bpm >= 120)).slice(0, 12);
  if (highEnergyList.length > 0) {
    smartPlaylists.push({
      id: 'smart-workout',
      title: 'High-Energy Cardio',
      subtitle: '120+ BPM Upbeat Flow',
      description: 'High-octane tracks curated to maintain workout momentum, athletic intensity, and adrenaline.',
      gradient: 'from-amber-500 via-rose-500 to-red-600',
      category: 'tempo',
      songs: highEnergyList,
      total_songs: highEnergyList.length,
      total_duration: highEnergyList.reduce((acc, s) => acc + (s.duration || 0), 0),
    });
  }

  // Mix 3: Late Night Chill & Lo-Fi
  const chillList = relaxSongs.length >= 4 ? relaxSongs : allSongs.filter((s) => (s.bpm && s.bpm <= 105)).slice(0, 12);
  if (chillList.length > 0) {
    smartPlaylists.push({
      id: 'smart-focus',
      title: 'Late Night Chill & Lo-Fi',
      subtitle: 'Mellow Atmosphere',
      description: 'Relaxing ambient tunes and smooth acoustic vibes designed for deep work or evening unwind.',
      gradient: 'from-blue-600 via-teal-500 to-emerald-500',
      category: 'mood',
      songs: chillList,
      total_songs: chillList.length,
      total_duration: chillList.reduce((acc, s) => acc + (s.duration || 0), 0),
    });
  }

  // Mix 4: Heavy Rotation / Most Streamed Hits
  const mostPlayed = [...allSongs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 15);
  if (mostPlayed.length > 0) {
    smartPlaylists.push({
      id: 'smart-heavy-rotation',
      title: 'Heavy Rotation',
      subtitle: 'Verified Billion+ Club',
      description: 'The highest-streamed global anthems and undisputed radio favorites.',
      gradient: 'from-fuchsia-600 via-purple-600 to-indigo-700',
      category: 'mix',
      songs: mostPlayed,
      total_songs: mostPlayed.length,
      total_duration: mostPlayed.reduce((acc, s) => acc + (s.duration || 0), 0),
    });
  }

  // Mix 5: Artist Spotlight / Radio
  const spotlightArtistName =
    (topArtist && allSongs.find((s) => s.artist_name.toLowerCase().trim() === topArtist)?.artist_name) ||
    (lastPlayedTrack && lastPlayedTrack.artist_name) ||
    'Arijit Singh';

  const artistTracks = allSongs.filter(
    (s) => s.artist_name.toLowerCase().includes(spotlightArtistName.toLowerCase()) ||
           spotlightArtistName.toLowerCase().includes(s.artist_name.toLowerCase())
  );

  const radioPool = artistTracks.length >= 3 ? artistTracks : [
    ...artistTracks,
    ...allSongs.filter((s) => s.genre_name === artistTracks[0]?.genre_name),
  ].slice(0, 12);

  if (radioPool.length > 0) {
    smartPlaylists.push({
      id: `smart-artist-${encodeURIComponent(spotlightArtistName)}`,
      title: `${spotlightArtistName} Radio`,
      subtitle: 'Signature Tracks & Similar Vibe',
      description: `Essential signature tracks, collaborations, and kindred soundscapes inspired by ${spotlightArtistName}.`,
      gradient: 'from-violet-600 via-pink-600 to-orange-500',
      category: 'artist',
      songs: radioPool,
      total_songs: radioPool.length,
      total_duration: radioPool.reduce((acc, s) => acc + (s.duration || 0), 0),
    });
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
