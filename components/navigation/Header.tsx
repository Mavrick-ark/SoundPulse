'use client';

import React from 'react';
import { Search, UploadCloud, Radio, User, ShieldCheck } from 'lucide-react';
import { usePlayerStore } from '@/lib/store';

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    setActiveTab,
    setImportModalOpen,
    setAccountModalOpen,
    connectedAccount,
  } = usePlayerStore();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      setActiveTab('search');
    }
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-[#08090d]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Mobile Branding */}
      <div 
        onClick={() => setActiveTab('home')}
        className="flex md:hidden items-center gap-2.5 cursor-pointer shrink-0"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
          <Radio className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg text-white tracking-tight">SoundPulse</span>
      </div>

      {/* Global Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search songs, artists, albums, or YouTube..."
          className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/10 focus:border-indigo-500/50 text-white placeholder-neutral-400 outline-none transition-all duration-200"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-semibold tracking-wide transition-all duration-200 shadow-sm shadow-indigo-500/10"
        >
          <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Import from Device</span>
          <span className="sm:hidden">Import</span>
        </button>

        {/* Connect Account Button */}
        <button
          onClick={() => {
            setAccountModalOpen(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
          title={connectedAccount ? 'YouTube Music Account' : 'Sign in to YouTube Music'}
        >
          {connectedAccount ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">{connectedAccount.name}</span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden md:inline">Sign In</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
