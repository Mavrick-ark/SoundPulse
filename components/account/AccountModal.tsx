'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  KeyRound,
  Globe,
  Lock,
  ArrowUpRight,
  Info,
  Key,
  Clipboard,
  Check,
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
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  // Cookie Login Dialog State (LastWave-Native style)
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const [isVerifyingCookie, setIsVerifyingCookie] = useState(false);
  const [cookieModalError, setCookieModalError] = useState<string | null>(null);
  const [pastedClipboardSuccess, setPastedClipboardSuccess] = useState(false);

  // Playlists fetched via supported YouTube Data API or InnerTube
  const [userPlaylists, setUserPlaylists] = useState<YouTubePlaylist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [importingPlaylistId, setImportingPlaylistId] = useState<string | null>(null);

  // Embedding check state
  const [embeddingState, setEmbeddingState] = useState<'testing' | 'blocked' | 'allowed'>('blocked');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Fetch session & accessible playlists on mount or modal open
  useEffect(() => {
    if (!isAccountModalOpen) return;

    // Check URL parameters for OAuth callbacks
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');
      const authError = urlParams.get('auth_error');

      if (authStatus === 'success') {
        setSuccessMsg('Google and YouTube account authorized and verified successfully!');
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else if (authError) {
        if (authError === 'missing_google_credentials' || authError === 'missing_server_credentials') {
          setErrorMsg('Google OAuth credentials not configured in .env.local.');
          setShowConfigGuide(true);
        } else if (authError === 'access_denied') {
          setErrorMsg('Google permission request was declined.');
        } else {
          setErrorMsg(`Authentication notice: ${authError}`);
        }
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

    // Verify session with server
    fetch('/api/auth/google/session')
      .then((res) => res.json())
      .then((data) => {
        setIsConfigured(data.isConfigured);
        if (data.authenticated && data.user) {
          const isCookieAuth = data.user.authType === 'ytmusic_cookie';
          setConnectedAccount({
            connected: true,
            name: data.user.name || data.user.channelTitle || 'YouTube Music User',
            email: data.user.email || data.user.handle || (isCookieAuth ? 'InnerTube Session' : 'Google Account'),
            handle: data.user.handle,
            provider: isCookieAuth ? 'ytmusic_cookie' : 'google',
            avatarUrl: data.user.avatarUrl,
            connectedAt: new Date().toISOString(),
          });
          if (data.lastSyncedAt) {
            setLastSyncedAt(data.lastSyncedAt);
          }
          // Fetch playlists via supported API
          fetchAccessiblePlaylists();
        } else {
          setConnectedAccount(null);
          setUserPlaylists([]);
        }
      })
      .catch((err) => {
        console.warn('Session verification error:', err);
      });

    // Listen for OAuth completion from popup
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsAuthorizing(false);
        fetch('/api/auth/google/session')
          .then((res) => res.json())
          .then((data) => {
            if (data.authenticated && data.user) {
              setConnectedAccount({
                connected: true,
                name: data.user.name || data.user.channelTitle || 'Google User',
                email: data.user.email,
                provider: 'google',
                avatarUrl: data.user.avatarUrl,
                connectedAt: new Date().toISOString(),
              });
              setSuccessMsg(`Google Account connected as ${data.user.name || 'Google User'}!`);
              fetchAccessiblePlaylists();
              setTimeout(() => setSuccessMsg(null), 3500);
            }
          });
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [isAccountModalOpen, setConnectedAccount]);

  // Fetch playlists using supported YouTube Data API v3
  const fetchAccessiblePlaylists = async () => {
    setIsLoadingPlaylists(true);
    try {
      const res = await fetch('/api/youtube/playlists');
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

  // Open separate browser window to YouTube Music
  const handleOpenYouTubeMusic = () => {
    window.open('https://music.youtube.com/', '_blank', 'noopener,noreferrer');
  };

  // Supported OAuth 2.0 Login in Popup
  const handleConnectGoogle = () => {
    setErrorMsg(null);
    setIsAuthorizing(true);
    const width = 500;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      '/auth/popup',
      'google_connect_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );
  };

  // Disconnect & Revoke session
  const handleDisconnect = async () => {
    setErrorMsg(null);
    try {
      await fetch('/api/auth/google/logout', { method: 'POST' });
      setConnectedAccount(null);
      setLastSyncedAt(null);
      setUserPlaylists([]);
      setPlaylistPreview(null);
      setSuccessMsg('Account disconnected cleanly.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg('Failed to log out cleanly.');
    }
  };

  // Direct YouTube Music Cookie Login (modeled after LastWave-Native CookieLoginDialog)
  const handleConnectCookie = async () => {
    if (!cookieInput.trim()) {
      setCookieModalError('Please enter cookie text.');
      return;
    }
    setIsVerifyingCookie(true);
    setCookieModalError(null);
    try {
      const res = await fetch('/api/auth/ytmusic/cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: cookieInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate YouTube Music cookies.');
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
    } finally {
      setIsVerifyingCookie(false);
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
      }
    } catch {
      setCookieModalError('Unable to access clipboard. Please paste manually into the text box.');
    }
  };

  // Import specific playlist into library
  const handleImportSpecificPlaylist = async (playlist: YouTubePlaylist) => {
    setImportingPlaylistId(playlist.id);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/import-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/youtube/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Library synchronization failed');
      }

      setLastSyncedAt(data.lastSyncedAt);
      setSuccessMsg(
        `Synchronized ${data.playlistsImported} playlist(s) and ${data.tracksImported} track(s) from YouTube!`
      );
      onPlaylistImported();
      fetchAccessiblePlaylists();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to synchronize YouTube library');
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
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Connect Account</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-indigo-300">
                  LastWave
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                YouTube Music &amp; Google account authorization
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

        {/* Google Credentials Setup Guide if not configured */}
        {showConfigGuide && (
          <div className="mt-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs space-y-2 text-neutral-200">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
              <KeyRound className="w-4 h-4" />
              <span>Google Cloud OAuth Setup Instructions</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              To connect real Google accounts and sync YouTube libraries, set your Google OAuth 2.0 credentials in <code className="text-indigo-300 font-mono">.env.local</code>:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-neutral-400 font-mono bg-black/40 p-2.5 rounded-xl border border-white/5">
              <li>GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com</li>
              <li>GOOGLE_CLIENT_SECRET=your_client_secret</li>
              <li>GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback</li>
            </ol>
          </div>
        )}

        {/* SECTION 1: YouTube Music Service Connection & Embedding Fallback */}
        <div className="mt-5 p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Globe className="w-4 h-4 text-pink-400" />
              <span>YouTube Music Web Portal</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/20 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Embedding Restricted by Google</span>
            </span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            Google enforces strict browser security headers (<code className="text-pink-300 font-mono">X-Frame-Options: SAMEORIGIN</code>) that officially prohibit embedding <code className="text-neutral-200">music.youtube.com</code> inside external applications.
          </p>

          {/* Prominent explanation box as required */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Important Authentication Notice</span>
            </div>
            <p>
              Opening and signing into the YouTube Music website in a separate browser window allows you to browse and manage music on YouTube, but <strong>signing in there does not automatically authenticate LastWave</strong>.
            </p>
            <p className="text-amber-300/80">
              To connect your playlists and account with LastWave, use the supported <strong>Authorize YouTube Account</strong> flow below.
            </p>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenYouTubeMusic}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-pink-400" />
              <span>Open YouTube Music (Separate Window)</span>
              <ArrowUpRight className="w-3 h-3 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* SECTION 2: Supported YouTube Authorization Flow (OAuth 2.0) */}
        <div className="mt-5 p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                  {connectedAccount?.avatarUrl ? (
                    <img src={connectedAccount.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Radio className="w-6 h-6 text-indigo-400" />
                  )}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0e101a] ${
                    connectedAccount ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                  <span>{connectedAccount ? connectedAccount.name : 'No Account Authorized'}</span>
                  {connectedAccount && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-neutral-400 truncate">
                  {connectedAccount ? (
                    <span className="text-emerald-400 font-medium">
                      {connectedAccount.provider === 'ytmusic_cookie'
                        ? `YouTube Music InnerTube Session • ${connectedAccount.handle || connectedAccount.name}`
                        : `Verified Google & YouTube Account • ${connectedAccount.email}`}
                    </span>
                  ) : (
                    'Guest Session • Connect via Cookie Login or Google OAuth'
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
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-600/10"
                    title="Connect using YouTube Music session cookies (like LastWave-Native)"
                  >
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cookie Login</span>
                  </button>
                  <button
                    onClick={handleConnectGoogle}
                    disabled={isAuthorizing}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:scale-105 active:scale-95 transition-all shadow-md shadow-white/10 disabled:opacity-50"
                  >
                    {isAuthorizing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-800" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span>Google OAuth</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sync All Button for Authorized Users */}
          {connectedAccount && (
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-neutral-400">
                {lastSyncedAt ? (
                  <span>Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}</span>
                ) : (
                  <span>Library ready for synchronization</span>
                )}
              </div>
              <button
                onClick={handleSyncLibrary}
                disabled={isSyncingLibrary}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLibrary ? 'animate-spin' : ''}`} />
                <span>{isSyncingLibrary ? 'Syncing...' : 'Sync All Playlists'}</span>
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-white/5 text-[11px] text-neutral-400 leading-relaxed">
            <span className="font-semibold text-neutral-300">Supported Authorization: </span>
            Uses official read-only scope (<code className="text-indigo-300">youtube.readonly</code>) to securely retrieve your accessible playlists without accessing passwords or private browser cookies.
          </div>
        </div>

        {/* SECTION 3: Actual Accessible Playlists (Retrieved via Supported API) */}
        {connectedAccount && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-indigo-400" />
                <span>Your Accessible YouTube Playlists</span>
              </h4>
              <button
                onClick={fetchAccessiblePlaylists}
                disabled={isLoadingPlaylists}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingPlaylists ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingPlaylists ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Retrieving playlists via YouTube API...</span>
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
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-[11px] font-medium shrink-0 disabled:opacity-50 transition-colors"
                    >
                      {importingPlaylistId === pl.id ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-neutral-400">
                No accessible playlists found on this YouTube account yet.
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: Import Public Playlist by URL / ID */}
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Link2 className="w-4 h-4 text-indigo-400" />
            <span>Import Playlist via Direct Link</span>
          </h4>

          <form onSubmit={handleFetchPlaylist} className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={playlistInput}
                onChange={(e) => setPlaylistInput(e.target.value)}
                placeholder="Paste YouTube playlist URL (e.g. https://www.youtube.com/playlist?list=...)"
                className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white/[0.04] border border-white/10 focus:border-indigo-500 text-white placeholder-neutral-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isFetchingPlaylist || !playlistInput.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors shrink-0"
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
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    YouTube Music Cookie Login
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Direct InnerTube session authorization (SAPISID)
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

            {/* Instructions */}
            <div className="text-xs text-neutral-300 space-y-1.5 leading-relaxed bg-white/[0.03] p-3 rounded-2xl border border-white/5">
              <p className="font-semibold text-white">How to connect with session cookies:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-neutral-300">
                <li>Sign in to <span className="text-indigo-300 font-mono">music.youtube.com</span> in your browser</li>
                <li>Open DevTools (<kbd className="px-1 py-0.5 rounded bg-black/40 text-[10px] font-mono border border-white/10">F12</kbd>) &rarr; Application &rarr; Cookies</li>
                <li>Or copy from a browser extension (<span className="text-neutral-200">Cookie-Editor</span> or <span className="text-neutral-200">Get cookies.txt</span>)</li>
                <li>Paste the raw Cookie header, JSON, or cookies.txt below</li>
              </ol>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-neutral-300">
                  Cookie text, JSON, or header
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={isVerifyingCookie}
                  className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
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
                placeholder="Paste Cookie header: SAPISID=...; __Secure-3PAPISID=...; LOGIN_INFO=..."
                rows={4}
                className="w-full bg-black/50 border border-white/15 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none font-mono resize-none transition-colors"
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

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowCookieModal(false);
                  setCookieModalError(null);
                }}
                disabled={isVerifyingCookie}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConnectCookie}
                disabled={isVerifyingCookie || !cookieInput.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              >
                {isVerifyingCookie ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connect</span>
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
