'use client';

import React from 'react';
import { X, Play, Trash2, ListMusic, Disc3, ArrowUp, ArrowDown } from 'lucide-react';
import { usePlayerStore } from '@/lib/store';

export const QueueDrawer: React.FC = () => {
  const {
    queue,
    queueIndex,
    currentSong,
    isQueueOpen,
    toggleQueue,
    playSong,
    removeFromQueue,
    clearQueue,
    reorderQueue,
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-[#0c0e18]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <ListMusic className="w-4 h-4 text-indigo-400" />
          <h3 className="text-base font-semibold text-white tracking-wide">
            Listening Queue ({queue.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={toggleQueue}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Queue Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Now Playing */}
        {currentSong && (
          <div>
            <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-2">
              Now Playing
            </h4>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
                {currentSong.cover_url ? (
                  <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-400">
                    <Disc3 className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-semibold text-white truncate">
                  {currentSong.song_name}
                </div>
                <div className="text-[11px] text-indigo-300/80 truncate">
                  {currentSong.artist_name}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-3 bg-indigo-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-4 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}

        {/* Next Up */}
        <div>
          <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-2">
            Next Up
          </h4>
          {queue.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 text-xs">
              Your queue is empty. Play any song or album to populate your queue!
            </div>
          ) : (
            <div className="space-y-1">
              {queue.map((song, idx) => {
                const isCurrent = currentSong?.song_id === song.song_id;
                return (
                  <div
                    key={`${song.song_id}-${idx}`}
                    className={`group flex items-center gap-3 p-2 rounded-xl transition-all duration-200 ${
                      isCurrent
                        ? 'bg-white/10 border border-white/15'
                        : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                    }`}
                  >
                    <div
                      onClick={() => playSong(song)}
                      className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-neutral-800 cursor-pointer"
                    >
                      {song.cover_url ? (
                        <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          <Disc3 className="w-4 h-4" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-3.5 h-3.5 text-white fill-current" />
                      </div>
                    </div>

                    <div
                      onClick={() => playSong(song)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="text-xs font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
                        {song.song_name}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">
                        {song.artist_name}
                      </div>
                    </div>

                    {/* Move Up/Down & Remove */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {idx > 0 && (
                        <button
                          onClick={() => reorderQueue(idx, idx - 1)}
                          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                      )}
                      {idx < queue.length - 1 && (
                        <button
                          onClick={() => reorderQueue(idx, idx + 1)}
                          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => removeFromQueue(idx)}
                        className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-white/10"
                        title="Remove from Queue"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
