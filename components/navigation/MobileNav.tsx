'use client';

import React from 'react';
import { Home, Search, Library, Heart, UploadCloud } from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { ActiveTab } from '@/types/music';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, setImportModalOpen } = usePlayerStore();

  const tabs = [
    { id: 'home' as ActiveTab, label: 'Home', icon: Home },
    { id: 'search' as ActiveTab, label: 'Search', icon: Search },
    { id: 'library' as ActiveTab, label: 'Library', icon: Library },
    { id: 'favorites' as ActiveTab, label: 'Liked', icon: Heart },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0f17]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-2 flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-indigo-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </button>
        );
      })}

      {/* Quick Device Import on Mobile */}
      <button
        onClick={() => setImportModalOpen(true)}
        className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium text-neutral-400 hover:text-indigo-300 transition-colors"
      >
        <UploadCloud className="w-5 h-5 text-indigo-400" />
        <span>Import</span>
      </button>
    </nav>
  );
};
