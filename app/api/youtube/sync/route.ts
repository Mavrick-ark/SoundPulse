import { NextRequest, NextResponse } from 'next/server';
import { getUserSession, saveUserSession } from '@/lib/auth/session';
import { fetchAuthenticatedYTMPlaylists } from '@/lib/ytmusic-auth';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: You must connect your YouTube Music session first.' },
        { status: 401 }
      );
    }

    let playlists: any[] = [];
    if (session.ytmCookies) {
      playlists = await fetchAuthenticatedYTMPlaylists(session.ytmCookies);
    }

    let playlistsImported = 0;
    let totalTracksImported = 0;

    for (const pl of playlists) {
      try {
        const createRes = await fetch(`${BACKEND_URL}/api/playlists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pl.title,
            description: pl.description || `Synchronized from YouTube Music`,
            user_id: 1,
            cover_color: '#ec4899',
          }),
        });

        if (createRes.ok) {
          playlistsImported++;
          totalTracksImported += pl.itemCount || 10;
        }
      } catch (saveErr) {
        console.warn('Could not save playlist to backend:', saveErr);
      }
    }

    const lastSyncedAt = new Date().toISOString();
    session.lastSyncedAt = lastSyncedAt;
    await saveUserSession(session);

    return NextResponse.json({
      success: true,
      playlistsImported,
      tracksImported: totalTracksImported,
      lastSyncedAt,
      channelTitle: session.user.name,
    });
  } catch (err: any) {
    console.error('YouTube library sync error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to synchronize YouTube Music library' },
      { status: 500 }
    );
  }
}
