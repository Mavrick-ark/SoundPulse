'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePlayerStore } from '@/lib/store';
import { Song, Artist, Album, Playlist } from '@/types/music';
import { fetchSongs, fetchArtists, fetchAlbums, fetchPlaylists } from '@/lib/api';

import { Sidebar } from '@/components/navigation/Sidebar';
import { Header } from '@/components/navigation/Header';
import { MobileNav } from '@/components/navigation/MobileNav';

import { HomeView } from '@/components/views/HomeView';
import { SearchView } from '@/components/views/SearchView';
import { LibraryView } from '@/components/views/LibraryView';
import { PlaylistsView } from '@/components/views/PlaylistsView';
import { FavoritesView } from '@/components/views/FavoritesView';

import { AudioEngine } from '@/components/player/AudioEngine';
import { PersistentPlayer } from '@/components/player/PersistentPlayer';
import { SyncedLyricsView } from '@/components/player/SyncedLyricsView';
import { QueueDrawer } from '@/components/player/QueueDrawer';
import { FullScreenPlayer } from '@/components/player/FullScreenPlayer';
import { DeviceImportModal } from '@/components/modals/DeviceImportModal';
import { AccountModal } from '@/components/account/AccountModal';
import { GoogleConnectModal } from '@/components/modals/GoogleConnectModal';

export default function SoundPulsePage() {
  const { activeTab, isLyricsOpen, setFavorites, setHistory, setConnectedAccount } = usePlayerStore();

  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [sData, aData, alData, pData] = await Promise.all([
        fetchSongs(),
        fetchArtists(),
        fetchAlbums(),
        fetchPlaylists(),
      ]);
      setSongs(sData);
      setArtists(aData);
      setAlbums(alData);
      setPlaylists(pData);
    } catch (err) {
      console.error('Failed to load initial SoundPulse data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Hydrate favorites & history from localStorage
    try {
      const savedFavs = localStorage.getItem('soundpulse_favorites');
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
    } catch (_) {}

    try {
      const savedHist = localStorage.getItem('soundpulse_recent_history');
      if (savedHist) {
        setHistory(JSON.parse(savedHist));
      }
    } catch (_) {}

    // Verify authentic YouTube Music session
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setConnectedAccount({
            connected: true,
            name: data.user.name || 'YouTube Music User',
            email: data.user.handle || data.user.email || 'YouTube Music Session',
            handle: data.user.handle,
            provider: 'ytmusic_cookie',
            avatarUrl: data.user.avatarUrl,
            connectedAt: new Date().toISOString(),
          });
        } else {
          setConnectedAccount(null);
        }
      })
      .catch(() => setConnectedAccount(null));
  }, [loadData, setFavorites, setConnectedAccount]);

  return (
    <div className="min-h-screen bg-[#08090d] text-[#f3f4f6] flex flex-col font-sans relative selection:bg-indigo-500/30 selection:text-white">
      {/* Background Animated Gradient Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] animate-pulse-slow [animation-delay:3s]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-pink-600/10 rounded-full blur-[140px] animate-pulse-slow [animation-delay:6s]" />
      </div>

      {/* Audio Engine (Hidden Playback Manager) */}
      <AudioEngine />

      <div className="flex flex-1 relative z-10 min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar playlists={playlists} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-36 md:pb-28">
          <Header />

          <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
            {loading ? (
              <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-neutral-400">
                <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-xs font-medium tracking-wide">
                  Loading SoundPulse lossless engine...
                </span>
              </div>
            ) : (
              <>
                {activeTab === 'home' && (
                  <HomeView songs={songs} artists={artists} albums={albums} onRefreshPlaylists={loadData} />
                )}
                {activeTab === 'search' && <SearchView songs={songs} />}
                {activeTab === 'library' && (
                  <LibraryView songs={songs} artists={artists} albums={albums} />
                )}
                {activeTab === 'playlists' && (
                  <PlaylistsView playlists={playlists} onRefreshPlaylists={loadData} />
                )}
                {activeTab === 'favorites' && <FavoritesView songs={songs} />}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Docked Persistent Audio Player */}
      <PersistentPlayer />

      {/* Mobile Navigation Bar */}
      <MobileNav />

      {/* Overlays & Drawers */}
      {isLyricsOpen && <SyncedLyricsView />}
      <QueueDrawer />
      <FullScreenPlayer />
      <DeviceImportModal onUploadSuccess={loadData} />
      <AccountModal onPlaylistImported={loadData} />
      <GoogleConnectModal />
    </div>
  );
}
