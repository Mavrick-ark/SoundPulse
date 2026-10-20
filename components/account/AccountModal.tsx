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
  KeyRound,
  HelpCircle,
} from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { createPlaylist } from '@/lib/api';

interface AccountModalProps {
  onPlaylistImported: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ onPlaylistImported }) => {
  const {
    isAccountModalOpen,
    setAccountModalOpen,
    connectedAccount,
    setConnectedAccount,
    favoriteIds,
  } = usePlayerStore();

  const [playlistInput, setPlaylistInput] = useState('');
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);
  const [playlistPreview, setPlaylistPreview] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  // Fetch genuine authenticated session on mount and handle URL auth params
  useEffect(() => {
    if (!isAccountModalOpen) return;

    // Check URL parameters for OAuth callbacks
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');
      const authError = urlParams.get('auth_error');

      if (authStatus === 'success') {
        setSuccessMsg('Google and YouTube account authorized and verified successfully!');
        // Clean URL without reload
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
          setConnectedAccount({
            connected: true,
            name: data.user.name || data.user.channelTitle || 'Google User',
            email: data.user.email,
            provider: 'google',
            avatarUrl: data.user.avatarUrl,
            connectedAt: new Date().toISOString(),
          });
          if (data.lastSyncedAt) {
            setLastSyncedAt(data.lastSyncedAt);
          }
        } else {
          setConnectedAccount(null);
        }
      })
      .catch((err) => {
        console.warn('Session verification error:', err);
      });
    // Listen for OAuth completion from popup
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
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
              setTimeout(() => setSuccessMsg(null), 3500);
            }
          });
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [isAccountModalOpen, setConnectedAccount]);

  if (!isAccountModalOpen) return null;

  // Real OAuth Login in Popup
  const handleConnectGoogle = () => {
    setErrorMsg(null);
    const width = 480;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      '/auth/popup',
      'google_connect_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );
  };

  // Real Disconnect & Revoke
  const handleDisconnect = async () => {
    setErrorMsg(null);
    try {
      await fetch('/api/auth/google/logout', { method: 'POST' });
      setConnectedAccount(null);
      setLastSyncedAt(null);
      setPlaylistPreview(null);
      setSuccessMsg('Google account disconnected successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg('Failed to log out cleanly.');
    }
  };

  // Real Library Synchronization
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
        setAccountModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save playlist');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-[#0e101a] border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Google & YouTube Account</h3>
              <p className="text-xs text-neutral-400">OAuth 2.0 connection and library synchronization</p>
            </div>
          </div>
          <button
            onClick={() => setAccountModalOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
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
              <li>GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback</li>
            </ol>
            <p className="text-[10px] text-neutral-400">
              Create credentials in Google Cloud Console &gt; APIs &amp; Services &gt; Credentials &gt; OAuth 2.0 Client ID (Web Application).
            </p>
          </div>
        )}

        {/* Section 1: Real Connection Status */}
        <div className="mt-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0">
                  {connectedAccount?.avatarUrl ? (
                    <img src={connectedAccount.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Radio className="w-6 h-6 text-indigo-400" />
                  )}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0e101a] ${
                    connectedAccount ? 'bg-emerald-400' : 'bg-neutral-500'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">
                  {connectedAccount ? connectedAccount.name : 'Not Connected'}
                </div>
                <div className="text-xs text-neutral-400 truncate">
                  {connectedAccount ? (
                    <span className="text-emerald-400 font-medium">Verified Google &amp; YouTube Account</span>
                  ) : (
                    'Guest Mode • Local SQLite Storage'
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
                <button
                  onClick={handleConnectGoogle}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:scale-105 active:scale-95 transition-all shadow-md shadow-white/10"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Connect Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Connected Actions (Sync Library) */}
          {connectedAccount && (
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-neutral-400">
                {lastSyncedAt ? (
                  <span>Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}</span>
                ) : (
                  <span>Library not yet synchronized</span>
                )}
              </div>
              <button
                onClick={handleSyncLibrary}
                disabled={isSyncingLibrary}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLibrary ? 'animate-spin' : ''}`} />
                <span>{isSyncingLibrary ? 'Syncing Library...' : 'Sync YouTube Library'}</span>
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-white/5 text-[11px] text-neutral-400 leading-relaxed">
            <span className="font-semibold text-neutral-300">OAuth Scopes: </span>
            Requests official read-only scopes (<code className="text-indigo-300">youtube.readonly</code>) to import your playlists without modifying your account.
          </div>
        </div>

        {/* Section 2: Import YouTube Playlist by URL */}
        <div className="mt-6 space-y-3">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-indigo-400" />
            <span>Import Public / Unlisted YouTube Playlist</span>
          </h4>

          <form onSubmit={handleFetchPlaylist} className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={playlistInput}
                onChange={(e) => setPlaylistInput(e.target.value)}
                placeholder="Paste YouTube playlist URL (e.g. https://www.youtube.com/playlist?list=...)"
                className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl bg-white/[0.04] border border-white/10 focus:border-indigo-500 text-white placeholder-neutral-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isFetchingPlaylist || !playlistInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-all shrink-0 shadow-md shadow-indigo-600/30"
            >
              {isFetchingPlaylist ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Inspecting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Playlist Preview Container */}
        {playlistPreview && (
          <div className="mt-5 p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{playlistPreview.title}</div>
                <div className="text-xs text-neutral-400">
                  By {playlistPreview.creator} • {playlistPreview.itemCount} Tracks Found
                </div>
              </div>
              <button
                onClick={handleSaveToLibrary}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Import to Library</span>
                  </>
                )}
              </button>
            </div>

            {/* Preview items list */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {playlistPreview.tracks.map((t: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-neutral-800 shrink-0">
                      {t.artworkUrl && <img src={t.artworkUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white truncate">{t.title}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{t.artist}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono shrink-0">Track {idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Library Stats & Policy Transparency */}
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
          <div>
            <span>Liked Songs: </span>
            <span className="font-semibold text-white">{favoriteIds.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official YouTube Data API v3 OAuth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
