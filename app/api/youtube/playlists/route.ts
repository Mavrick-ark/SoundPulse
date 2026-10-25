import { NextRequest, NextResponse } from 'next/server';
import { getUserSession, getValidAccessToken } from '@/lib/auth/session';
import { fetchAuthenticatedYTMPlaylists } from '@/lib/ytmusic-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: User is not authenticated' }, { status: 401 });
    }

    // 1. If user authenticated via YouTube Music cookies
    if (session.authType === 'ytmusic_cookie' && session.ytmCookies) {
      const playlists = await fetchAuthenticatedYTMPlaylists(session.ytmCookies);
      return NextResponse.json({ playlists });
    }

    // 2. Otherwise Google OAuth token
    const accessToken = await getValidAccessToken(session);
    if (!accessToken) {
      return NextResponse.json({ error: 'OAuth token expired. Please re-authenticate.' }, { status: 401 });
    }

    const playlists: any[] = [];
    let nextPageToken: string | undefined = undefined;

    // Follow nextPageToken to retrieve all user playlists
    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlists');
      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('mine', 'true');
      url.searchParams.set('maxResults', '50');
      if (nextPageToken) {
        url.searchParams.set('pageToken', nextPageToken);
      }

      const res = await fetch(url.toString(), {
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
          title: item.snippet?.title || 'Untitled Playlist',
          description: item.snippet?.description,
          thumbnail:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url,
          itemCount: item.contentDetails?.itemCount || 0,
          publishedAt: item.snippet?.publishedAt,
        });
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return NextResponse.json({ playlists });
  } catch (err: any) {
    console.error('Fetch YouTube playlists error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch playlists' }, { status: 500 });
  }
}
