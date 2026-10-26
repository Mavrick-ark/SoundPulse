'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/lib/store';
import { resolveTrackDetails } from '@/lib/api';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Silent 1-second WAV audio loop for mobile background playback keep-alive
const SILENT_AUDIO_URI =
  'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==';

export const AudioEngine: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    seekTarget,
    volume,
    isMuted,
    nextSong,
    prevSong,
    pause,
    resume,
    seekTo,
    setCurrentTime,
    setDuration,
    clearSeekTarget,
    updateCurrentSong,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgKeepAliveAudioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const intervalRef = useRef<any>(null);
  const lastSongIdRef = useRef<number | null>(null);
  const resolvingRef = useRef<boolean>(false);

  // Web Audio API background audio session keeper
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const webAudioOscRef = useRef<OscillatorNode | null>(null);

  const startAudioKeepAlive = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!webAudioCtxRef.current) {
        webAudioCtxRef.current = new AudioCtx();
      }
      if (webAudioCtxRef.current.state === 'suspended') {
        webAudioCtxRef.current.resume();
      }
      if (!webAudioOscRef.current && webAudioCtxRef.current) {
        const ctx = webAudioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        // Inaudible 20Hz tone at 0.0001 gain keeps Android OS AudioServer channel open in background
        osc.frequency.setValueAtTime(20, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        webAudioOscRef.current = osc;
      }
    } catch (_) {}
  }, []);

  const stopAudioKeepAlive = useCallback(() => {
    try {
      if (webAudioOscRef.current) {
        webAudioOscRef.current.stop();
        webAudioOscRef.current.disconnect();
        webAudioOscRef.current = null;
      }
      if (webAudioCtxRef.current && webAudioCtxRef.current.state === 'running') {
        webAudioCtxRef.current.suspend();
      }
    } catch (_) {}
  }, []);

  // Auto-recover YouTube background playback on visibility change or app blur
  useEffect(() => {
    const handleVisibilityChange = () => {
      const playerState = usePlayerStore.getState();
      if (playerState.isPlaying && ytPlayerRef.current?.playVideo) {
        setTimeout(() => {
          try {
            ytPlayerRef.current?.playVideo?.();
          } catch (_) {}
        }, 100);
        setTimeout(() => {
          try {
            ytPlayerRef.current?.playVideo?.();
          } catch (_) {}
        }, 400);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('pagehide', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, []);

  // Initialize YouTube Iframe API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initYTPlayer();
      };
    } else if (window.YT && window.YT.Player) {
      initYTPlayer();
    }

    function initYTPlayer() {
      try {
        ytPlayerRef.current = new window.YT.Player('soundpulse-persistent-yt-iframe', {
          height: '10',
          width: '10',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          },
          events: {
            onReady: () => {
              isYtReadyRef.current = true;
              if (currentSong && currentSong.youtube_id && !currentSong.audio_url) {
                ytPlayerRef.current.loadVideoById(currentSong.youtube_id);
              }
            },
            onStateChange: (event: any) => {
              // 0 = ENDED (natural end of full-length video)
              if (event.data === 0) {
                // Immediately stop video to block YouTube from autoplaying unrelated videos
                try {
                  ytPlayerRef.current?.stopVideo?.();
                } catch (_) {}
                nextSong();
              } else if (event.data === 1) {
                // If player is playing but app state says paused/stopped, halt unauthorized video autoplay
                const playerState = usePlayerStore.getState();
                if (!playerState.isPlaying) {
                  try {
                    ytPlayerRef.current?.stopVideo?.();
                  } catch (_) {}
                }
              } else if (event.data === 2) {
                // 2 = PAUSED. If user wants playing but browser auto-paused due to backgrounding, auto-resume!
                const playerState = usePlayerStore.getState();
                if (playerState.isPlaying && (document.hidden || !document.hasFocus())) {
                  setTimeout(() => {
                    try {
                      ytPlayerRef.current?.playVideo?.();
                    } catch (_) {}
                  }, 100);
                }
              }
            },
            onError: (err: any) => {
              console.warn('YouTube Player Event Warning:', err);
            },
          },
        });
      } catch (err) {
        console.warn('Could not init YouTube player instance:', err);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Handle Seek Target (Scrubbing / Click to Seek)
  useEffect(() => {
    if (seekTarget === null) return;

    if (currentSong?.audio_url && audioRef.current) {
      audioRef.current.currentTime = seekTarget;
    } else if (currentSong?.youtube_id && ytPlayerRef.current?.seekTo) {
      try {
        ytPlayerRef.current.seekTo(seekTarget, true);
      } catch (_) {}
    }

    clearSeekTarget();
  }, [seekTarget, currentSong, clearSeekTarget]);

  // 1. Android & Web Notification Player: Register MediaSession Metadata (Title, Artist, Album, Artwork)
  useEffect(() => {
    if (!currentSong || typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const art =
        currentSong.cover_url ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.song_name,
        artist: currentSong.artist_name,
        album: currentSong.album_name || 'SoundPulse Music',
        artwork: [
          { src: art, sizes: '96x96', type: 'image/jpeg' },
          { src: art, sizes: '128x128', type: 'image/jpeg' },
          { src: art, sizes: '192x192', type: 'image/jpeg' },
          { src: art, sizes: '256x256', type: 'image/jpeg' },
          { src: art, sizes: '384x384', type: 'image/jpeg' },
          { src: art, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch (err) {
      console.warn('Could not update MediaSession metadata:', err);
    }
  }, [currentSong]);

  // 2. Android Notification & Lock Screen Player Controls (Play, Pause, Skip, Seek)
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;

    const setAction = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch (_) {}
    };

    setAction('play', () => resume());
    setAction('pause', () => pause());
    setAction('previoustrack', () => prevSong());
    setAction('nexttrack', () => nextSong());
    setAction('stop', () => pause());

    setAction('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        seekTo(details.seekTime);
      }
    });

    setAction('seekbackward', (details) => {
      const skip = details.seekOffset || 10;
      seekTo(Math.max(0, currentTime - skip));
    });

    setAction('seekforward', (details) => {
      const skip = details.seekOffset || 10;
      const dur = usePlayerStore.getState().duration || 210;
      seekTo(Math.min(dur, currentTime + skip));
    });

    return () => {
      const allActions: MediaSessionAction[] = [
        'play',
        'pause',
        'previoustrack',
        'nexttrack',
        'stop',
        'seekto',
        'seekbackward',
        'seekforward',
      ];
      allActions.forEach((a) => setAction(a, null));
    };
  }, [resume, pause, prevSong, nextSong, seekTo, currentTime]);

  // 3. Sync Notification Player Playback State (playing / paused)
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (_) {}
  }, [isPlaying]);

  // 4. Sync Notification Timeline Position State
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('mediaSession' in navigator) ||
      !('setPositionState' in navigator.mediaSession)
    ) {
      return;
    }

    if (duration > 0 && typeof currentTime === 'number' && !isNaN(currentTime)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, duration),
          playbackRate: 1,
          position: Math.max(0, Math.min(currentTime, duration)),
        });
      } catch (_) {}
    }
  }, [currentTime, duration]);

  // 5. Native Android Foreground Service Bridge (Lock Screen Notification Controls & WakeLock)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    (window as any).__soundpulse_media_action = (action: string) => {
      try {
        if (action === 'play') {
          resume();
        } else if (action === 'pause') {
          pause();
        } else if (action === 'next') {
          nextSong();
        } else if (action === 'prev') {
          prevSong();
        }
      } catch (err) {
        console.warn('Native media action failed:', err);
      }
    };

    const nativeBridge = (window as any).NativeAudioBridge;
    if (nativeBridge) {
      if (currentSong) {
        nativeBridge.notifyPlayback(
          currentSong.song_name || 'SoundPulse Music',
          currentSong.artist_name || 'SoundPulse',
          isPlaying
        );
      } else {
        nativeBridge.stopPlayback();
      }
    }
  }, [currentSong, isPlaying, resume, pause, nextSong, prevSong]);

  // Handle Song Change & Auto-Resolve Full Tracks and Lyrics
  useEffect(() => {
    if (!currentSong) return;

    const isNewSong = lastSongIdRef.current !== currentSong.song_id;
    lastSongIdRef.current = currentSong.song_id;

    if (!isNewSong) return;

    if (currentSong.duration) {
      setDuration(currentSong.duration);
    }

    const isLocalTrack = Boolean(
      currentSong.audio_url &&
        (currentSong.audio_url.startsWith('/uploads') ||
          currentSong.audio_url.startsWith('blob:') ||
          currentSong.audio_url.includes('127.0.0.1'))
    );

    // 1. Play local lossless track via HTML5 Audio
    if (isLocalTrack && currentSong.audio_url) {
      if (ytPlayerRef.current?.stopVideo) {
        try { ytPlayerRef.current.stopVideo(); } catch (_) {}
      }
      if (audioRef.current) {
        audioRef.current.src = currentSong.audio_url;
        audioRef.current.currentTime = 0;
        if (isPlaying) {
          audioRef.current.play().catch((e) => console.warn('Audio play prevented:', e));
        }
      }
      return;
    }

    // 2. Play existing YouTube Track
    if (currentSong.youtube_id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (isYtReadyRef.current && ytPlayerRef.current?.loadVideoById) {
        try {
          ytPlayerRef.current.loadVideoById(currentSong.youtube_id);
          if (!isPlaying) {
            ytPlayerRef.current.pauseVideo();
          }
        } catch (e) {
          console.warn('YT loadVideoById error:', e);
        }
      }
      // If missing synced lyrics, fetch them in background
      if (!currentSong.synced_lyrics) {
        resolveTrackDetails(currentSong.song_name, currentSong.artist_name).then((res) => {
          if (res?.synced_lyrics || res?.lyrics) {
            updateCurrentSong({
              synced_lyrics: res.synced_lyrics,
              lyrics: res.lyrics,
            });
          }
        });
      }
      return;
    }

    // 3. Track does NOT have local audio or YouTube ID -> Resolve Full Track & Lyrics dynamically!
    if (!resolvingRef.current) {
      resolvingRef.current = true;
      if (ytPlayerRef.current?.stopVideo) {
        try { ytPlayerRef.current.stopVideo(); } catch (_) {}
      }
      resolveTrackDetails(currentSong.song_name, currentSong.artist_name)
        .then((res) => {
          resolvingRef.current = false;
          if (res?.youtube_id) {
            updateCurrentSong({
              youtube_id: res.youtube_id,
              synced_lyrics: res.synced_lyrics,
              lyrics: res.lyrics,
            });

            if (audioRef.current) {
              audioRef.current.pause();
            }

            if (isYtReadyRef.current && ytPlayerRef.current?.loadVideoById) {
              ytPlayerRef.current.loadVideoById(res.youtube_id);
              if (!isPlaying) {
                ytPlayerRef.current.pauseVideo();
              }
            }
          }
        })
        .catch(() => {
          resolvingRef.current = false;
        });
    }
  }, [currentSong, updateCurrentSong, isPlaying, setDuration]);

  // Handle Play/Pause
  useEffect(() => {
    if (!currentSong) return;

    const isLocalTrack = Boolean(
      currentSong.audio_url &&
        (currentSong.audio_url.startsWith('/uploads') ||
          currentSong.audio_url.startsWith('blob:') ||
          currentSong.audio_url.includes('127.0.0.1'))
    );

    // Background Keep-Alive Audio: maintains active audio session in mobile OS when minimized
    if (isPlaying) {
      startAudioKeepAlive();
    } else {
      stopAudioKeepAlive();
    }

    if (bgKeepAliveAudioRef.current) {
      if (isPlaying) {
        bgKeepAliveAudioRef.current.play().catch(() => {});
      } else {
        bgKeepAliveAudioRef.current.pause();
      }
    }

    if (isLocalTrack && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => console.warn('Audio play failed:', e));
      } else {
        audioRef.current.pause();
      }
    } else if (currentSong.youtube_id && ytPlayerRef.current) {
      try {
        if (isPlaying && ytPlayerRef.current.playVideo) {
          ytPlayerRef.current.playVideo();
        } else if (!isPlaying && ytPlayerRef.current.pauseVideo) {
          ytPlayerRef.current.pauseVideo();
        }
      } catch (e) {
        console.warn('YT play/pause error:', e);
      }
    }
  }, [isPlaying, currentSong]);

  // Volume & Mute Control
  useEffect(() => {
    const effectiveVol = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = effectiveVol;
    }
    if (ytPlayerRef.current?.setVolume) {
      try {
        if (isMuted) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(Math.round(volume * 100));
        }
      } catch (e) {
        console.warn('YT volume change error:', e);
      }
    }
  }, [volume, isMuted]);

  // Real-time Playback Time Polling for lyrics sync & progress scrubber
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const isLocalTrack = Boolean(
          currentSong?.audio_url &&
            (currentSong.audio_url.startsWith('/uploads') ||
              currentSong.audio_url.startsWith('blob:') ||
              currentSong.audio_url.includes('127.0.0.1'))
        );

        if (isLocalTrack && audioRef.current) {
          const t = audioRef.current.currentTime;
          setCurrentTime(t);
          if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        } else if (currentSong?.youtube_id && ytPlayerRef.current?.getCurrentTime) {
          try {
            const t = ytPlayerRef.current.getCurrentTime();
            if (typeof t === 'number' && !isNaN(t)) {
              setCurrentTime(t);
            }
            const d = ytPlayerRef.current.getDuration();
            if (typeof d === 'number' && !isNaN(d) && d > 0) {
              setDuration(d);
            }
          } catch (_) {}
        }
      }, 250);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentSong, setCurrentTime, setDuration]);

  // Handle Natural Audio Ending (Guarding Against 30s Previews)
  const handleAudioEnded = () => {
    if (!currentSong) return;

    // Check if the audio ended prematurely because it was an external 30s preview
    const audioDur = audioRef.current?.duration || 0;
    const expectedDur = currentSong.duration || 0;

    if (audioDur <= 35 && expectedDur > 40 && !currentSong.audio_url?.startsWith('/uploads')) {
      // 30s preview ended -> switch seamlessly to full original YouTube track!
      resolveTrackDetails(currentSong.song_name, currentSong.artist_name).then((res) => {
        if (res?.youtube_id) {
          updateCurrentSong({
            youtube_id: res.youtube_id,
            synced_lyrics: res.synced_lyrics,
            audio_url: null, // clear preview
          });
          if (audioRef.current) audioRef.current.pause();
          if (ytPlayerRef.current?.loadVideoById) {
            ytPlayerRef.current.loadVideoById(res.youtube_id);
          }
        } else {
          nextSong();
        }
      });
      return;
    }

    // Natural full track completion
    nextSong();
  };

  return (
    <>
      {/* HTML5 Audio for Full-Length Authorized Local Tracks */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        preload="auto"
      />

      {/* Background Audio Keep-Alive Loop: keeps Android/iOS audio session active in background & lock screen */}
      <audio
        ref={bgKeepAliveAudioRef}
        src={SILENT_AUDIO_URI}
        loop
        playsInline
        preload="auto"
        className="hidden pointer-events-none"
      />

      {/* Persistent YouTube Player Container: kept on-screen inside viewport to prevent mobile browser throttling */}
      <div
        id="soundpulse-persistent-yt-iframe"
        className="pointer-events-none fixed bottom-0 right-0 w-[2px] h-[2px] opacity-[0.002] z-[-1] overflow-hidden"
      />
    </>
  );
};
