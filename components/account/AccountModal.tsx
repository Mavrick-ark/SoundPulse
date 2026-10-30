'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  UserX,
  Radio,
  ListMusic,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Link2,
  RefreshCw,
  Key,
  Clipboard,
  Check,
  ArrowUpRight,
  Music2,
  Copy,
} from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { createPlaylist } from '@/lib/api';

interface AccountModalProps {
  onPlaylistImported: () => void;
}

interface YouTubePlaylist {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  itemCount: number;
  publishedAt?: string;
}

export const AccountModal: React.FC<AccountModalProps> = ({ onPlaylistImported }) => {
  const {
    isAccountModalOpen,
    setAccountModalOpen,
    connectedAccount,
    setConnectedAccount,
  } = usePlayerStore();

  const [playlistInput, setPlaylistInput] = useState('');
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);
  const [playlistPreview, setPlaylistPreview] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Cookie Login Dialog State (LastWave-Native style)
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const [isVerifyingCookie, setIsVerifyingCookie] = useState(false);
  const [bookmarkletCopied, setBookmarkletCopied] = useState(false);

  const BOOKMARKLET_CODE = `javascript:(function(){try{const c=document.cookie;if(!c){alert("No cookies found!");return;}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(c).then(()=>alert("YouTube Music cookies copied to clipboard! Return to SoundPulse and click 'Connect'")).catch(()=>prompt("Copy your cookies:",c));}else{prompt("Copy your cookies:",c);}}catch(e){alert("Error: "+e);}})();`;

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(BOOKMARKLET_CODE);
    setBookmarkletCopied(true);
    setTimeout(() => setBookmarkletCopied(false), 2500);
  };
  const [cookieModalError, setCookieModalError] = useState<string | null>(null);
  const [pastedClipboardSuccess, setPastedClipboardSuccess] = useState(false);

  // Playlists fetched via InnerTube
  const [userPlaylists, setUserPlaylists] = useState<YouTubePlaylist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [importingPlaylistId, setImportingPlaylistId] = useState<string | null>(null);

  // Fetch session & accessible playlists on mount or modal open
  useEffect(() => {
    // Listen for automatic cookie capture from Android Native Login (YouTubeLoginActivity)
    if (typeof window !== 'undefined') {
      (window as any).__soundpulse_cookie_captured = (cookies: string) => {
        if (cookies && cookies.trim()) {
          connectWithCookies(cookies.trim());
        }
      };
    }

    if (!isAccountModalOpen) return;

    fetch('/api/auth/session', { credentials: 'include' })
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
          if (data.lastSyncedAt) {
            setLastSyncedAt(data.lastSyncedAt);
          }
          fetchAccessiblePlaylists();
        } else {
          setConnectedAccount(null);
          setUserPlaylists([]);
        }
      })
      .catch((err) => {
        console.warn('Session verification error:', err);
      });
  }, [isAccountModalOpen, setConnectedAccount]);

  // Fetch playlists using InnerTube
  const fetchAccessiblePlaylists = async () => {
    setIsLoadingPlaylists(true);
    try {
      const res = await fetch('/api/youtube/playlists', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUserPlaylists(data.playlists || []);
      }
    } catch (err: any) {
      console.warn('Failed to load user playlists:', err.message);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  if (!isAccountModalOpen) return null;

  // Open separate browser popup window to YouTube Music
  const handleOpenYouTubeMusic = () => {
    const width = 600;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const popup = window.open(
      'https://music.youtube.com/',
      'YouTubeMusicLogin',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
    );
    if (popup && !popup.closed) {
      popup.focus();
    }
  };

  // Check Android CookieManager or trigger auto-connect
  const handleAutoConnectAndroid = async () => {
    const nativeBridge = typeof window !== 'undefined' ? (window as any).NativeAudioBridge : null;
    
    // In Android APK, open dedicated YouTube Music Login with automatic cookie extraction
    if (nativeBridge?.openYouTubeLogin) {
      nativeBridge.openYouTubeLogin();
      return;
    }

    if (nativeBridge?.getYouTubeMusicCookies) {
      const cookies = nativeBridge.getYouTubeMusicCookies();
      if (cookies && cookies.trim()) {
        await connectWithCookies(cookies.trim());
        return;
      }
    }

    // In desktop/mobile web browser: open YouTube Music in a popup window & show popup login modal
    handleOpenYouTubeMusic();
    setShowCookieModal(true);
  };

  // Connect with Cookies (LastWave-Native CookieNormalizer + InnerTube verification)
  const connectWithCookies = async (cookiesText: string) => {
    setIsVerifyingCookie(true);
    setCookieModalError(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/ytmusic/cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cookies: cookiesText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate YouTube Music session.');
      }

      setConnectedAccount({
        connected: true,
        name: data.user.name,
        handle: data.user.handle,
        email: data.user.handle || 'YouTube Music Session',
        provider: 'ytmusic_cookie',
        avatarUrl: data.user.avatarUrl,
        connectedAt: new Date().toISOString(),
      });
      setSuccessMsg(`Connected successfully as ${data.user.name}!`);
      setShowCookieModal(false);
      setCookieInput('');
      fetchAccessiblePlaylists();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setCookieModalError(err.message || 'Verification failed. Make sure SAPISID is present.');
      setErrorMsg(err.message || 'Session verification failed.');
    } finally {
      setIsVerifyingCookie(false);
    }
  };

  // Disconnect & Revoke session
  const handleDisconnect = async () => {
    setErrorMsg(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

      // Clean up native Android cookies if available
      const nativeBridge = typeof window !== 'undefined' ? (window as any).NativeAudioBridge : null;
      if (nativeBridge?.clearYouTubeMusicCookies) {
        try {
          nativeBridge.clearYouTubeMusicCookies();
        } catch (_) {}
      }

      setConnectedAccount(null);
      setLastSyncedAt(null);
      setUserPlaylists([]);
      setPlaylistPreview(null);
      setSuccessMsg('Signed out cleanly.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg('Failed to log out cleanly.');
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setCookieInput(text.trim());
        setCookieModalError(null);
        setPastedClipboardSuccess(true);
        setTimeout(() => setPastedClipboardSuccess(false), 2000);
        return text.trim();
      }
    } catch {
      setCookieModalError('Unable to access clipboard. Please grant clipboard permissions or paste manually.');
    }
    return '';
  };

  // 1-Click "I've Signed In — Fetch & Import" Handler
  const handleFetchCookiesFromLogin = async () => {
    setIsVerifyingCookie(true);
    setCookieModalError(null);

    // 1. Check if we're on native Android with CookieManager
    const nativeBridge = typeof window !== 'undefined' ? (window as any).NativeAudioBridge : null;
    if (nativeBridge?.getYouTubeMusicCookies) {
      const cookies = nativeBridge.getYouTubeMusicCookies();
      if (cookies && cookies.trim()) {
        await connectWithCookies(cookies.trim());
        return;
      }
    }

    // 2. If cookieInput is already provided in the text box
    if (cookieInput && cookieInput.trim()) {
      await connectWithCookies(cookieInput.trim());
      return;
    }

    // 3. Otherwise, try reading from clipboard automatically
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setCookieInput(text.trim());
        await connectWithCookies(text.trim());
        return;
      }
    } catch (e) {
      // Clipboard access might be blocked
    }

    setIsVerifyingCookie(false);
    setCookieModalError(
      'No cookies found yet. Make sure you finished signing in on the YouTube Music popup, then copy your cookies or paste them into the box below.'
    );
  };

  // Import specific playlist into library
  const handleImportSpecificPlaylist = async (playlist: YouTubePlaylist) => {
    setImportingPlaylistId(playlist.id);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/import-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ urlOrId: playlist.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to inspect playlist');
      }

      await createPlaylist(
        data.title || playlist.title,
        `Imported from YouTube Music (${playlist.itemCount} songs)`
      );

      setSuccessMsg(`Imported "${playlist.title}" into your library!`);
      onPlaylistImported();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import playlist');
    } finally {
      setImportingPlaylistId(null);
    }
  };

  // Library Synchronization
  const handleSyncLibrary = async () => {
    setIsSyncingLibrary(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/youtube/sync', { method: 'POST', credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Library synchronization failed');
      }

      setLastSyncedAt(data.lastSyncedAt);
      setSuccessMsg(
        `Synchronized ${data.playlistsImported} playlist(s) from YouTube Music!`
      );
      onPlaylistImported();
      fetchAccessiblePlaylists();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to synchronize YouTube Music library');
    } finally {
      setIsSyncingLibrary(false);
    }
  };

  // Import Playlist via Link
  const handleFetchPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistInput.trim()) return;

    setIsFetchingPlaylist(true);
    setErrorMsg(null);
    setPlaylistPreview(null);

    try {
      const res = await fetch('/api/import-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ urlOrId: playlistInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to inspect playlist');
      }

      setPlaylistPreview(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import playlist');
    } finally {
      setIsFetchingPlaylist(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!playlistPreview) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      await createPlaylist(
        playlistPreview.title || 'Imported Playlist',
        `Imported from YouTube (${playlistPreview.creator})`
      );

      setSuccessMsg(`Imported "${playlistPreview.title}" (${playlistPreview.tracks.length} tracks)!`);
      setPlaylistPreview(null);
      setPlaylistInput('');
      onPlaylistImported();
      setTimeout(() => {
        setSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save playlist');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e101a] border border-white/10 rounded-3xl shadow-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Music2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>YouTube Music Account</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300">
                  LastWave
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Direct InnerTube Session • No Google Cloud Project or API Keys Required
              </p>
            </div>
          </div>
          <button
            onClick={() => setAccountModalOpen(false)}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert Notifications */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SECTION 1: YouTube Music Session Connection Card (Matching LastWave) */}
        <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative">
                <div className="w-13 h-13 rounded-full overflow-hidden bg-neutral-800 border-2 border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                  {connectedAccount?.avatarUrl ? (
                    <img src={connectedAccount.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Radio className="w-6 h-6 text-pink-400" />
                  )}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0e101a] ${
                    connectedAccount ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-1.5">
                  <span>{connectedAccount ? connectedAccount.name : 'Not Signed In'}</span>
                  {connectedAccount && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-neutral-400 truncate mt-0.5">
                  {connectedAccount ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <span>YouTube Music Session</span>
                      {connectedAccount.handle && (
                        <span className="text-neutral-400">• {connectedAccount.handle}</span>
                      )}
                    </span>
                  ) : (
                    'Sign in to access your personal library, liked songs & radio automix'
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 ml-3">
              {connectedAccount ? (
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCookieModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-all shadow-md"
                    title="Paste session cookies (LastWave style)"
                  >
                    <Key className="w-3.5 h-3.5 text-pink-400" />
                    <span>Cookie Login</span>
                  </button>
                  <button
                    onClick={handleAutoConnectAndroid}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-pink-500/20"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Explanation for Unauthenticated Users */}
          {!connectedAccount && (
            <div className="p-3 rounded-xl bg-pink-500/5 border border-pink-500/15 text-[11px] text-pink-200/90 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold text-pink-300">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>LastWave InnerTube Authentication</span>
              </div>
              <p>
                LastWave connects directly to YouTube Music via <strong>InnerTube session credentials</strong>. No Google Cloud project setup, API credentials, or daily quota limits are required.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleOpenYouTubeMusic}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-[11px] font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-pink-400" />
                  <span>Open music.youtube.com</span>
                  <ArrowUpRight className="w-2.5 h-2.5 text-neutral-400" />
                </button>
              </div>
            </div>
          )}

          {/* Sync All Button for Authorized Users */}
          {connectedAccount && (
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-neutral-400">
                {lastSyncedAt ? (
                  <span>Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}</span>
                ) : (
                  <span>Ready to synchronize your YouTube Music library</span>
                )}
              </div>
              <button
                onClick={handleSyncLibrary}
                disabled={isSyncingLibrary}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold disabled:opacity-50 transition-all shadow-md shadow-pink-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLibrary ? 'animate-spin' : ''}`} />
                <span>{isSyncingLibrary ? 'Syncing...' : 'Sync YouTube Music Library'}</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 2: Accessible Playlists (InnerTube Browse) */}
        {connectedAccount && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-pink-400" />
                <span>Your YouTube Music Playlists</span>
              </h4>
              <button
                onClick={fetchAccessiblePlaylists}
                disabled={isLoadingPlaylists}
                className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingPlaylists ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingPlaylists ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-pink-400" />
                <span>Retrieving playlists from YouTube Music...</span>
              </div>
            ) : userPlaylists.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {userPlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-white/10">
                        {pl.thumbnail ? (
                          <img src={pl.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500">
                            <ListMusic className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate" title={pl.title}>
                          {pl.title}
                        </p>
                        <p className="text-[10px] text-neutral-400">{pl.itemCount} tracks</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleImportSpecificPlaylist(pl)}
                      disabled={importingPlaylistId === pl.id}
                      className="px-2.5 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 hover:text-white text-[11px] font-medium shrink-0 disabled:opacity-50 transition-colors"
                    >
                      {importingPlaylistId === pl.id ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-neutral-400">
                No playlists found on this YouTube Music account yet.
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: Import Public Playlist by URL / ID */}
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Link2 className="w-4 h-4 text-pink-400" />
            <span>Import Playlist via Direct Link</span>
          </h4>

          <form onSubmit={handleFetchPlaylist} className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={playlistInput}
                onChange={(e) => setPlaylistInput(e.target.value)}
                placeholder="Paste YouTube Music playlist URL (e.g. https://music.youtube.com/playlist?list=...)"
                className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white/[0.04] border border-white/10 focus:border-pink-500 text-white placeholder-neutral-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isFetchingPlaylist || !playlistInput.trim()}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors shrink-0"
            >
              {isFetchingPlaylist ? 'Inspecting...' : 'Inspect'}
            </button>
          </form>

          {/* Playlist Preview Card */}
          {playlistPreview && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-white/10">
                  {playlistPreview.thumbnail ? (
                    <img src={playlistPreview.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ListMusic className="w-6 h-6 text-neutral-500 m-auto" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">{playlistPreview.title}</p>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {playlistPreview.creator} • {playlistPreview.tracks?.length || 0} tracks
                  </p>
                </div>
              </div>
              <button
                onClick={handleSaveToLibrary}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save to Library'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cookie Login Modal Overlay (Ported directly from LastWave-Native CookieLoginDialog) */}
      {showCookieModal && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[#121420] border border-white/15 rounded-3xl shadow-2xl p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-md">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    Sign in to YouTube Music
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Popup Login & Automatic Session Fetching
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isVerifyingCookie) {
                    setShowCookieModal(false);
                    setCookieModalError(null);
                  }
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick 2-Step Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleOpenYouTubeMusic}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 text-center group"
              >
                <ExternalLink className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                <span>1. Open YouTube Music Popup</span>
              </button>

              <button
                type="button"
                onClick={copyBookmarklet}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 text-center group"
              >
                {bookmarkletCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Helper Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                    <span>2. Copy 1-Click Cookie Copier</span>
                  </>
                )}
              </button>
            </div>

            {/* Explanatory Help Card */}
            <div className="text-xs text-neutral-300 space-y-2 leading-relaxed bg-white/[0.03] p-3 rounded-2xl border border-white/5">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>How to extract cookies from the popup:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-neutral-300">
                <li>
                  Click <strong className="text-white">1. Open YouTube Music Popup</strong> and log in.
                </li>
                <li>
                  Click <strong className="text-white">2. Copy 1-Click Cookie Copier</strong> above.
                </li>
                <li>
                  In the YouTube Music popup, press <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/20 text-pink-300 font-mono">F12</kbd> (or right click &rarr; Inspect), open the <strong className="text-white">Console</strong> tab, press <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/20 text-pink-300 font-mono">Ctrl+V</kbd> and hit <strong className="text-white">Enter</strong>.
                </li>
                <li>
                  Return here and click <strong className="text-pink-300">I&apos;m Signed In — Fetch & Connect</strong> below!
                </li>
              </ol>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-neutral-300">
                  Cookie text or JSON (optional manual paste)
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={isVerifyingCookie}
                  className="flex items-center gap-1 text-[11px] font-medium text-pink-400 hover:text-pink-300 transition-colors"
                >
                  {pastedClipboardSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Pasted!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Paste from Clipboard</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={cookieInput}
                onChange={(e) => {
                  setCookieInput(e.target.value);
                  if (cookieModalError) setCookieModalError(null);
                }}
                placeholder="Paste cookies here: SAPISID=...; __Secure-3PAPISID=...; LOGIN_INFO=..."
                rows={2}
                className="w-full bg-black/50 border border-white/15 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none font-mono resize-none transition-colors"
                disabled={isVerifyingCookie}
              />
            </div>

            {cookieModalError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{cookieModalError}</span>
              </div>
            )}

            {/* Security note */}
            <div className="text-[10px] text-neutral-400 leading-normal flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>LastWave never sees your Google password. Session tokens are encrypted with AES-256-GCM.</span>
            </div>

            {/* Prominent Footer Actions - Always fully visible and clickable */}
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowCookieModal(false);
                  setCookieModalError(null);
                }}
                disabled={isVerifyingCookie}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFetchCookiesFromLogin}
                disabled={isVerifyingCookie}
                className="flex-1 max-w-xs flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-pink-600/30 transition-all hover:scale-[1.02] active:scale-95"
              >
                {isVerifyingCookie ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>I&apos;m Signed In — Fetch & Connect</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
