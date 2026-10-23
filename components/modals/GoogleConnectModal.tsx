'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { usePlayerStore } from '@/lib/store';

export const GoogleConnectModal: React.FC = () => {
  const {
    isGoogleModalOpen,
    setGoogleModalOpen,
    connectedAccount,
    setConnectedAccount,
  } = usePlayerStore();

  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if Google Sign-In is configured on the server
  useEffect(() => {
    if (!isGoogleModalOpen) return;

    setErrorMessage(null);
    fetch('/api/auth/google/session')
      .then((res) => res.json())
      .then((data) => {
        setIsConfigured(Boolean(data.isConfigured));
        if (data.authenticated && data.user) {
          setConnectedAccount({
            connected: true,
            name: data.user.name || 'Google User',
            email: data.user.email,
            avatarUrl: data.user.avatarUrl,
            provider: 'google',
          });
        }
      })
      .catch(() => {
        setIsConfigured(false);
      });
  }, [isGoogleModalOpen, setConnectedAccount]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGoogleModalOpen) {
        setGoogleModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGoogleModalOpen, setGoogleModalOpen]);

  if (!isGoogleModalOpen) return null;

  const handleContinueWithGoogle = () => {
    setErrorMessage(null);

    // If Google OAuth is not configured on the server
    if (isConfigured === false) {
      setErrorMessage(
        'Google sign-in is not yet configured. Please set your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local to enable real sign-in.'
      );
      return;
    }

    setLoading(true);

    // Center coordinates for popup window
    const width = 500;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      '/api/auth/google/login',
      'google_signin_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    // Listen for authentication message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        fetch('/api/auth/google/session')
          .then((res) => res.json())
          .then((data) => {
            if (data.authenticated && data.user) {
              setConnectedAccount({
                connected: true,
                name: data.user.name || 'Google User',
                email: data.user.email,
                avatarUrl: data.user.avatarUrl,
                provider: 'google',
              });
              setGoogleModalOpen(false);
            }
          });
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback timer if popup closed
    const timer = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(timer);
        setLoading(false);
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  };

  return (
    <div
      onClick={() => setGoogleModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in"
    >
      {/* Modal Dialog Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#0f111a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center select-none overflow-hidden scale-100 transition-all"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close (×) Button */}
        <button
          onClick={() => setGoogleModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google Logo */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-white p-3 shadow-lg shadow-black/40 flex items-center justify-center mb-5 mt-2">
          <svg className="w-full h-full" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Connect your Google Account
        </h2>

        {/* Description */}
        <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed max-w-xs mx-auto">
          Connect your account to manage your music library.
        </p>

        {/* Configuration Notice if not set */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Action Button: Continue with Google */}
        <div className="mt-6">
          <button
            onClick={handleContinueWithGoogle}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-neutral-100 text-black font-semibold text-sm flex items-center justify-center gap-3 shadow-xl shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Opening Google Sign-In...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-5 text-[11px] text-neutral-500 space-y-1.5">
          <div>Secure authentication using Google Identity Services</div>
          <div className="flex items-center justify-center gap-3 text-neutral-400">
            <a href="/privacy" target="_blank" className="hover:text-indigo-400 hover:underline">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="/terms" target="_blank" className="hover:text-indigo-400 hover:underline">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
