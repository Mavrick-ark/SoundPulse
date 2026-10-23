import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#08090d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SoundPulse — Premium Music & YouTube Client",
  description: "Next-gen lossless music player and YouTube Music client with liquid glass design, synchronized lyrics, and device audio import.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
  verification: {
    google: "1e3wKE6Rcd3Tbu6rqaj59vd8Yx-dIlaZoBGPSHzK5gw",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#08090d] text-[#f3f4f6]">
        {children}
      </body>
    </html>
  );
}
