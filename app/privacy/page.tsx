import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye, RefreshCw, Trash2, Mail, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — SoundPulse',
  description: 'SoundPulse Privacy Policy and Google API Services User Data Disclosure.',
};

export default function PrivacyPolicyPage() {
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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Transparency & Security</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-neutral-400">
            Last updated: <span className="text-white font-medium">{lastUpdated}</span>
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-neutral-300 text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-white font-semibold text-base">
              <Eye className="w-4 h-4 text-indigo-400" />
              <h2>1. Introduction</h2>
            </div>
            <p>
              Welcome to <strong>SoundPulse</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;), available at{' '}
              <a href="https://soundpulse-three.vercel.app" className="text-indigo-400 hover:underline">
                https://soundpulse-three.vercel.app
              </a>. We value your privacy and are committed to protecting any personal data you share with us.
            </p>
            <p>
              This Privacy Policy explains how SoundPulse collects, uses, stores, and protects information when you browse our website, play music, or connect your Google/YouTube account.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-white font-semibold text-base">
              <Lock className="w-4 h-4 text-indigo-400" />
              <h2>2. Information We Collect</h2>
            </div>
            <p>We believe in minimal data collection. We only access data strictly necessary to provide our music player experience:</p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-neutral-300">
              <li>
                <strong>Google Account Information:</strong> When you voluntarily connect your Google Account via Google OAuth, we receive your basic public profile information (Name, Email address, and Avatar profile picture) to identify your session.
              </li>
              <li>
                <strong>YouTube Data:</strong> If you grant permission, we access your public and private YouTube playlists in <em>read-only</em> mode (using the scope <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">https://www.googleapis.com/auth/youtube.readonly</code>) solely so you can import and stream your music playlists within SoundPulse.
              </li>
              <li>
                <strong>Local Music & Preferences:</strong> Custom playlists, favorites, and uploaded audio tracks are stored locally in your browser storage or local database session.
              </li>
            </ul>
          </section>

          {/* Section 3 - Google API Disclosure */}
          <section className="space-y-3 p-6 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-indigo-300 font-semibold text-base">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <h2>3. Google API Services User Data Policy Compliance</h2>
            </div>
            <p>
              SoundPulse&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                Google API Services User Data Policy
                <ExternalLink className="w-3 h-3" />
              </a>, including the <strong>Limited Use</strong> requirements:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div className="font-semibold text-white text-xs mb-1">No Selling of Data</div>
                <div className="text-xs text-neutral-400">We do not sell, rent, or trade your Google user data or YouTube data to any third parties or advertisers.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div className="font-semibold text-white text-xs mb-1">No AI Model Training</div>
                <div className="text-xs text-neutral-400">Your Google or YouTube data is never used to train generalized artificial intelligence or machine learning models.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div className="font-semibold text-white text-xs mb-1">Read-Only Access</div>
                <div className="text-xs text-neutral-400">SoundPulse never modifies, deletes, or writes to your YouTube account, channel, or video subscriptions.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div className="font-semibold text-white text-xs mb-1">Secure Encryption</div>
                <div className="text-xs text-neutral-400">Authentication tokens are stored using military-grade AES-256-GCM encryption in protected HTTP-only cookies.</div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-white font-semibold text-base">
              <Trash2 className="w-4 h-4 text-indigo-400" />
              <h2>4. Data Retention & Revocation (Your Rights)</h2>
            </div>
            <p>You have complete control over your data at any time:</p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-neutral-300">
              <li>
                <strong>Disconnecting in SoundPulse:</strong> You can click on your profile in SoundPulse and choose <em>&quot;Disconnect Account&quot;</em>. This immediately clears your encrypted session and removes tokens.
              </li>
              <li>
                <strong>Revoking Google Access:</strong> You can revoke SoundPulse&apos;s access to your Google account at any time through the official Google Security dashboard at{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  https://myaccount.google.com/permissions
                  <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-white font-semibold text-base">
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              <h2>5. Third-Party Services</h2>
            </div>
            <p>SoundPulse utilizes the following third-party APIs to deliver music playback, lyrics, and metadata:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-neutral-300">
              <li><strong>YouTube API Services:</strong> By using SoundPulse to stream YouTube content, users agree to be bound by the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">YouTube Terms of Service</a> and <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google Privacy Policy</a>.</li>
              <li><strong>LRCLIB API:</strong> For community-contributed synchronized lyrics.</li>
              <li><strong>Apple iTunes Search API:</strong> For official song album artwork.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-white font-semibold text-base">
              <Mail className="w-4 h-4 text-indigo-400" />
              <h2>6. Contact Us</h2>
            </div>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at:
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
            <Link href="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="text-neutral-400 hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
