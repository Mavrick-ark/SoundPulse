# SoundPulse 🎵

A premium music streaming web application with keyword-based search, HTML5 persistent audio player, synced lyrics, custom playlist management, local SQLite backend integration, and genuine Google OAuth 2.0 / YouTube sync.

---

## Features

- **Full-Featured Audio Player**: Persistent playback, track seeking, queue management, volume/mute control, repeat & shuffle modes, and full-screen view.
- **Dynamic Music Search**: Provider-agnostic music search with real keyword lookup across songs, albums, and artists.
- **Synced Lyrics Engine**: Automatic timestamped LRC parsing with synchronized karaoke-style highlighting and auto-scrolling.
- **Google OAuth 2.0 & YouTube Library**: Modal-based Google authorization code flow with secure HTTP-only cookies and YouTube playlist import.
- **Custom Playlists & Device Library**: Local audio file import, playlist creation, and custom album management.
- **Full-Stack Architecture**: Next.js 16 App Router frontend + Express / SQLite backend with fast query caching.

---

## Tech Stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, Lucide React, Zustand
- **Backend**: Node.js, Express, SQLite3, Multer, CORS
- **Authentication**: Google OAuth 2.0 (Authorization Code Flow) + AES-256-GCM encrypted session cookies

---

## Getting Started

### 1. Clone the repository
```bash
git clone <YOUR_REPO_URL>
cd soundpulse-web
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback`
- `APP_BASE_URL=http://localhost:3000`
- `BACKEND_URL=http://127.0.0.1:5000`

### 3. Start Backend Server
```bash
cd backend
npm install
node server.js
```
The backend server runs on `http://localhost:5000`.

### 4. Start Next.js Frontend
In a new terminal:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License
MIT
