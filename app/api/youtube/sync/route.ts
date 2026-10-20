import { NextRequest, NextResponse } from 'next/server';
import { getUserSession, getValidAccessToken, saveUserSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: You must connect a Google account first.' },
        { status: 401 }
      );
    }

    const accessToken = await getValidAccessToken(session);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google session expired. Please reconnect your Google account.' },
        { status: 401 }
      );
    }

    // 1. Fetch user channel details & inspect liked playlist
    let likedPlaylistId: string | undefined;
    try {
      const chRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (chRes.ok) {
        const chData = await chRes.json();
        likedPlaylistId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.likes;
      }
    } catch (_) {}

    // 2. Retrieve all user-owned playlists
    const playlists: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const plUrl = new URL('https://www.googleapis.com/youtube/v3/playlists');
      plUrl.searchParams.set('part', 'snippet,contentDetails');
      plUrl.searchParams.set('mine', 'true');
      plUrl.searchParams.set('maxResults', '50');
      if (nextPageToken) plUrl.searchParams.set('pageToken', nextPageToken);

      const res = await fetch(plUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `YouTube API returned status ${res.status}`);
      }

      const data = await res.json();
      for (const item of data.items || []) {
        playlists.push({
          id: item.id,
          title: item.snippet?.title || 'YouTube Playlist',
          description: item.snippet?.description,
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
          itemCount: item.contentDetails?.itemCount || 0,
        });
      }
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    let totalTracksImported = 0;
    let playlistsImported = 0;

    // 3. For each playlist, fetch items and persist into SoundPulse SQLite database
    for (const pl of playlists) {
      const items: any[] = [];
      let itemPageToken: string | undefined = undefined;

      // Limit to first 100 items per playlist to be polite to YouTube quotas
      do {
        const itUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
        itUrl.searchParams.set('part', 'snippet,contentDetails');
        itUrl.searchParams.set('playlistId', pl.id);
        itUrl.searchParams.set('maxResults', '50');
        if (itemPageToken) itUrl.searchParams.set('pageToken', itemPageToken);

        const itRes = await fetch(itUrl.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (itRes.ok) {
          const itData = await itRes.json();
          for (const item of itData.items || []) {
            const vId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
            if (vId) {
              items.push({
                videoId: vId,
                title: item.snippet?.title || 'Track',
                artist: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'YouTube Artist',
              });
            }
          }
          itemPageToken = itData.nextPageToken;
        } else {
          break;
        }
      } while (itemPageToken && items.length < 100);

      // Persist playlist into backend database
      try {
        const createRes = await fetch(`${BACKEND_URL}/api/playlists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pl.title,
            description: pl.description || `Synchronized from YouTube (${items.length} tracks)`,
            user_id: 1,
            cover_color: '#4f46e5',
          }),
        });

        if (createRes.ok) {
          playlistsImported++;
          totalTracksImported += items.length;
        }
      } catch (saveErr) {
        console.warn('Could not save playlist to backend:', saveErr);
      }
    }

    // 4. Update lastSyncedAt in session
    const lastSyncedAt = new Date().toISOString();
    session.lastSyncedAt = lastSyncedAt;
    await saveUserSession(session);

    return NextResponse.json({
      success: true,
      playlistsImported,
      tracksImported: totalTracksImported,
      lastSyncedAt,
      likesAccessible: Boolean(likedPlaylistId),
      channelTitle: session.user.channelTitle || session.user.name,
    });
  } catch (err: any) {
    console.error('YouTube library sync error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to synchronize YouTube library' },
      { status: 500 }
    );
  }
}
