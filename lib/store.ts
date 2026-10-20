import { create } from 'zustand';
import { Song, ActiveTab } from '@/types/music';

interface ConnectedAccount {
  connected: boolean;
  name?: string;
  email?: string;
  provider?: 'google' | 'youtube' | 'local';
  avatarUrl?: string;
  connectedAt?: string;
}

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Song[];
  queueIndex: number;
  history: Song[];
  favoriteIds: number[];
  lyricsOffset: number;
  seekTarget: number | null;
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
  isFullScreenPlayer: boolean;
  isImportModalOpen: boolean;
  isAccountModalOpen: boolean;
  isGoogleModalOpen: boolean;
  activeTab: ActiveTab;
  searchQuery: string;
  selectedPlaylistId: number | null;
  connectedAccount: ConnectedAccount | null;
  
  // Audio playback controls
  playSong: (song: Song, customQueue?: Song[]) => void;
  updateCurrentSong: (updates: Partial<Song>) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekTo: (time: number) => void;
  clearSeekTarget: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  
  // Queue controls
  addToQueue: (song: Song) => void;
  playNextInQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  
  // Lyrics, Modals & UI State
  setLyricsOffset: (offset: number) => void;
  adjustLyricsOffset: (delta: number) => void;
  toggleLyrics: () => void;
  toggleQueue: () => void;
  setFullScreenPlayer: (open: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
  setAccountModalOpen: (open: boolean) => void;
  setGoogleModalOpen: (open: boolean) => void;
  setConnectedAccount: (account: ConnectedAccount | null) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setSearchQuery: (query: string) => void;
  setSelectedPlaylistId: (id: number | null) => void;
  toggleFavorite: (songId: number) => void;
  setFavorites: (ids: number[]) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (dur: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  isMuted: false,
  isShuffle: false,
  repeatMode: 'off',
  queue: [],
  queueIndex: -1,
  history: [],
  favoriteIds: [],
  lyricsOffset: 0,
  seekTarget: null,
  isLyricsOpen: false,
  isQueueOpen: false,
  isFullScreenPlayer: false,
  isImportModalOpen: false,
  isAccountModalOpen: false,
  isGoogleModalOpen: false,
  activeTab: 'home',
  searchQuery: '',
  selectedPlaylistId: null,
  connectedAccount: null,

  playSong: (song, customQueue) => {
    const { queue, history } = get();
    let newQueue = customQueue ? [...customQueue] : [...queue];
    let newIndex = newQueue.findIndex((s) => s.song_id === song.song_id);

    if (newIndex === -1) {
      newQueue = [song, ...newQueue];
      newIndex = 0;
    }

    const newHistory = [song, ...history.filter((s) => s.song_id !== song.song_id)].slice(0, 50);

    set({
      currentSong: song,
      isPlaying: true,
      currentTime: 0,
      seekTarget: null,
      duration: song.duration || 0,
      queue: newQueue,
      queueIndex: newIndex,
      history: newHistory,
      lyricsOffset: song.lyrics_offset || 0,
    });
  },

  updateCurrentSong: (updates) => {
    set((state) => {
      if (!state.currentSong) return state;
      const updatedSong = { ...state.currentSong, ...updates };
      const updatedQueue = state.queue.map((s) =>
        s.song_id === updatedSong.song_id ? updatedSong : s
      );
      return { currentSong: updatedSong, queue: updatedQueue };
    });
  },

  togglePlay: () => {
    const { isPlaying, currentSong, queue } = get();
    if (!currentSong && queue.length > 0) {
      get().playSong(queue[0]);
      return;
    }
    set({ isPlaying: !isPlaying });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  nextSong: () => {
    const { queue, queueIndex, isShuffle, repeatMode, currentSong } = get();
    if (queue.length === 0) return;

    if (repeatMode === 'one' && currentSong) {
      set({ currentTime: 0, seekTarget: 0, isPlaying: true });
      return;
    }

    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          set({ isPlaying: false, currentTime: 0 });
          return;
        }
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      get().playSong(nextTrack);
      set({ queueIndex: nextIndex });
    }
  },

  prevSong: () => {
    const { queue, queueIndex, currentTime } = get();
    if (currentTime > 3) {
      set({ currentTime: 0, seekTarget: 0 });
      return;
    }

    if (queue.length === 0) return;
    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      get().playSong(prevTrack);
      set({ queueIndex: prevIndex });
    }
  },

  seekTo: (time) => set({ currentTime: Math.max(0, time), seekTarget: Math.max(0, time) }),

  clearSeekTarget: () => set({ seekTarget: null }),

  setVolume: (vol) => set({ volume: Math.max(0, Math.min(1, vol)), isMuted: false }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

  toggleRepeat: () =>
    set((state) => {
      const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
      const nextIdx = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      return { repeatMode: modes[nextIdx] };
    }),

  addToQueue: (song) =>
    set((state) => {
      if (state.queue.some((s) => s.song_id === song.song_id)) return state;
      return { queue: [...state.queue, song] };
    }),

  playNextInQueue: (song) =>
    set((state) => {
      const filtered = state.queue.filter((s) => s.song_id !== song.song_id);
      const insertAt = state.queueIndex + 1;
      filtered.splice(insertAt, 0, song);
      return { queue: filtered };
    }),

  removeFromQueue: (index) =>
    set((state) => {
      const newQueue = [...state.queue];
      newQueue.splice(index, 1);
      let newIdx = state.queueIndex;
      if (index < state.queueIndex) {
        newIdx--;
      } else if (index === state.queueIndex && newQueue.length > 0) {
        newIdx = Math.min(newIdx, newQueue.length - 1);
      }
      return { queue: newQueue, queueIndex: newIdx };
    }),

  clearQueue: () => set({ queue: [], queueIndex: -1 }),

  reorderQueue: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.queue);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { queue: result };
    }),

  setLyricsOffset: (offset) => set({ lyricsOffset: offset }),

  adjustLyricsOffset: (delta) =>
    set((state) => ({ lyricsOffset: Number((state.lyricsOffset + delta).toFixed(2)) })),

  toggleLyrics: () => set((state) => ({ isLyricsOpen: !state.isLyricsOpen })),

  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),

  setFullScreenPlayer: (open) => set({ isFullScreenPlayer: open }),

  setImportModalOpen: (open) => set({ isImportModalOpen: open }),

  setAccountModalOpen: (open) => set({ isAccountModalOpen: open }),

  setGoogleModalOpen: (open) => set({ isGoogleModalOpen: open }),

  setConnectedAccount: (account) => set({ connectedAccount: account }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedPlaylistId: (id) => set({ selectedPlaylistId: id }),

  toggleFavorite: (songId) =>
    set((state) => {
      const exists = state.favoriteIds.includes(songId);
      const newFavs = exists
        ? state.favoriteIds.filter((id) => id !== songId)
        : [...state.favoriteIds, songId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('soundpulse_favorites', JSON.stringify(newFavs));
      }
      return { favoriteIds: newFavs };
    }),

  setFavorites: (ids) => set({ favoriteIds: ids }),

  setCurrentTime: (time) => set({ currentTime: time }),

  setDuration: (dur) => set({ duration: dur }),
}));
