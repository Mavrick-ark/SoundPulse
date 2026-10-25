'use client';

import React from 'react';
import { 
  Home, 
  Search, 
  Library, 
  Heart, 
  ListMusic, 
  UploadCloud, 
  Radio, 
  Sparkles,
  UserCheck,
  User
} from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { ActiveTab, Playlist } from '@/types/music';

interface SidebarProps {
  playlists: Playlist[];
}

export const Sidebar: React.FC<SidebarProps> = ({ playlists }) => {
  const {
    activeTab,
    setActiveTab,
    setImportModalOpen,
    setSelectedPlaylistId,
    setAccountModalOpen,
    setGoogleModalOpen,
    connectedAccount,
  } = usePlayerStore();

  const navItems = [
    { id: 'home' as ActiveTab, label: 'Home', icon: Home },
    { id: 'search' as ActiveTab, label: 'Search', icon: Search },
    { id: 'library' as ActiveTab, label: 'Your Library', icon: Library },
    { id: 'favorites' as ActiveTab, label: 'Liked Music', icon: Heart },
    { id: 'playlists' as ActiveTab, label: 'Playlists & Albums', icon: ListMusic },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#0d0f17]/90 backdrop-blur-2xl border-r border-white/5 select-none p-5 shrink-0 z-30">
      {/* Brand Header */}
      <div 
        onClick={() => setActiveTab('home')}
        className="flex items-center gap-3 px-2 py-2 mb-6 cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-indigo-300 bg-clip-text text-transparent">
            SoundPulse
          </h1>
          <p className="text-[10px] tracking-wider uppercase text-neutral-400 font-medium">
            Lossless & YouTube Client
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          Discover
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'playlists') setSelectedPlaylistId(null);
              }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600/20 text-white border border-indigo-500/30 shadow-inner shadow-indigo-500/10'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-neutral-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Device Audio Import Only */}
      <div className="mt-5 pt-4 border-t border-white/5">
        <p className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          Local Storage
        </p>
        <button
          onClick={() => setImportModalOpen(true)}
          className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 hover:border-indigo-500/40 text-neutral-200 hover:text-white transition-all duration-200"
        >
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-xs font-semibold text-white">Import from Device</div>
            <div className="text-[10px] text-neutral-400 truncate">FLAC, MP3, M4A, WAV</div>
          </div>
        </button>
      </div>

      {/* Playlists Quick List */}
      <div className="mt-5 pt-4 border-t border-white/5 flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Playlists ({playlists.length})
          </p>
          <Sparkles className="w-3.5 h-3.5 text-indigo-400/60" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 text-sm">
          {playlists.slice(0, 10).map((playlist) => (
            <button
              key={playlist.playlist_id}
              onClick={() => {
                setSelectedPlaylistId(playlist.playlist_id);
                setActiveTab('playlists');
              }}
              className="w-full text-left px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 truncate transition-colors text-xs font-medium"
            >
              {playlist.title}
            </button>
          ))}
          {playlists.length === 0 && (
            <p className="px-3 py-2 text-xs text-neutral-400 italic">No playlists yet</p>
          )}
        </div>
      </div>

      {/* Bottom Account Connection Status */}
      <div className="pt-3 border-t border-white/5">
        <button
          onClick={() => {
            setAccountModalOpen(true);
          }}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-left transition-colors cursor-pointer"
          title={connectedAccount ? 'Manage Account' : 'Connect Account'}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
              {connectedAccount ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <User className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {connectedAccount ? connectedAccount.name : 'Google Account'}
              </div>
              <div className="text-[10px] text-neutral-400 truncate">
                {connectedAccount ? 'Connected' : 'Connect Google Account'}
              </div>
            </div>
          </div>
          <span className={`w-2 h-2 rounded-full ${connectedAccount ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
        </button>

        <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-neutral-500">
          <a href="/privacy" className="hover:text-neutral-300 transition-colors">Privacy</a>
          <span>•</span>
          <a href="/terms" className="hover:text-neutral-300 transition-colors">Terms</a>
        </div>
      </div>
    </aside>
  );
};
