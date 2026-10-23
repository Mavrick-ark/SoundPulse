import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, Shield, Mail } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — SoundPulse',
  description: 'SoundPulse Terms of Service and Usage Agreement.',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'October 23, 2026';

  return (
    <div className="min-h-screen bg-[#08090d] text-[#f3f4f6] selection:bg-indigo-500/30 selection:text-white py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Navigation back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to SoundPulse</span>
        </Link>

        {/* Header */}
        <div className="space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-neutral-400">
            Last updated: <span className="text-white font-medium">{lastUpdated}</span>
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-neutral-300 text-sm leading-relaxed">
          <section className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-white font-semibold text-base">
              <CheckCircle className="w-4 h-4 text-indigo-400" />
              <h2>1. Acceptance of Terms</h2>
            </div>
            <p>
              By accessing and using <strong>SoundPulse</strong> (located at{' '}
              <a href="https://soundpulse-three.vercel.app" className="text-indigo-400 hover:underline">
                https://soundpulse-three.vercel.app
              </a>), you agree to be bound by these Terms of Service. If you do not agree to these terms, please discontinue using the service.
            </p>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-white font-semibold text-base">
              <Shield className="w-4 h-4 text-indigo-400" />
              <h2>2. Permitted Use & YouTube Terms</h2>
            </div>
            <p>
              SoundPulse is a web application designed for personal music discovery, playlist curation, and audio playback.
            </p>
            <p>
              Our service integrates with YouTube API Services to allow you to stream and organize your YouTube Music playlists. By using SoundPulse, you acknowledge and agree that you are also bound by the{' '}
              <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                YouTube Terms of Service
              </a>.
            </p>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-white font-semibold text-base">
              <AlertTriangle className="w-4 h-4 text-indigo-400" />
              <h2>3. User Responsibilities & Disclaimer</h2>
            </div>
            <p>
              You agree not to misuse SoundPulse, attempt to bypass access restrictions, or engage in unauthorized scraping or reverse engineering. SoundPulse is provided &quot;as is&quot; without warranties of any kind.
            </p>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-white font-semibold text-base">
              <Mail className="w-4 h-4 text-indigo-400" />
              <h2>4. Contact Us</h2>
            </div>
            <p>
              If you have any questions regarding these Terms, please contact us at:
            </p>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs inline-block">
              Email: yagyanshtiwari1@gmail.com
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
          <p>© {new Date().getFullYear()} SoundPulse. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-neutral-400 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-indigo-400 hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
