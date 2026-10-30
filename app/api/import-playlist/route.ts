import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';
import { generateSapisidHash } from '@/lib/ytmusic-auth';
import { proxiedFetch } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

function extractPlaylistId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (trimmed === 'LM' || trimmed === 'FEmusic_liked_videos' || /^[a-zA-Z0-9_-]{2,}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { urlOrId } = body;

    if (!urlOrId) {
      return NextResponse.json({ error: 'Playlist URL or ID is required' }, { status: 400 });
    }

    const playlistId = extractPlaylistId(urlOrId);
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Invalid playlist URL or ID. Please provide a valid YouTube playlist link.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.YOUTUBE_API_KEY?.trim();
    const tracks: any[] = [];
    let title = 'Imported YouTube Playlist';
    let creator = 'YouTube Creator';

    const session = await getUserSession();

    // Special handling for Liked Music ("LM") or logged in session
    if (session?.ytmCookies) {
      try {
        const authHeader = generateSapisidHash(session.ytmCookies);
        if (authHeader) {
          const browseId = playlistId.startsWith('VL') ? playlistId : (playlistId === 'LM' ? 'FEmusic_liked_videos' : `VL${playlistId}`);
          const postBody = {
            context: {
              client: {
                clientName: 'WEB_REMIX',
                clientVersion: '1.20240101.01.00',
                hl: 'en',
                gl: 'US',
              },
            },
            browseId,
          };

          const ytmRes = await proxiedFetch('https://music.youtube.com/youtubei/v1/browse', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Authorization: authHeader,
              Cookie: session.ytmCookies,
              'X-Origin': 'https://music.youtube.com',
            },
            body: JSON.stringify(postBody),
            timeoutMs: 9000,
          });

          if (ytmRes.ok) {
            const ytmData = (await ytmRes.json()) as any;
            const tabs = ytmData?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
            const header = ytmData?.header?.musicDetailHeaderRenderer || ytmData?.header?.musicResponsiveHeaderRenderer;
            if (header) {
              title = header.title?.runs?.[0]?.text || (playlistId === 'LM' ? 'Liked Music' : title);
              creator = header.subtitle?.runs?.[0]?.text || session.user.name || creator;
            } else if (playlistId === 'LM') {
              title = 'Liked Music';
              creator = session.user.name || 'You';
            }

            const sections = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
            for (const sec of sections) {
              const shelf = sec?.musicShelfRenderer || sec?.musicPlaylistShelfRenderer;
              const contents = shelf?.contents || [];
              for (const c of contents) {
                const r = c?.musicResponsiveListItemRenderer;
                if (!r) continue;
                const vId = r.playlistItemData?.videoId || r.navigationEndpoint?.watchEndpoint?.videoId;
                if (!vId) continue;
                const vTitle = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 'Track';
                const vArtist = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || creator;
                const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
                const vThumb = thumbs[thumbs.length - 1]?.url;

                tracks.push({
                  id: `yt:${vId}`,
                  title: vTitle,
                  artist: vArtist,
                  artworkUrl: vThumb,
                  providerId: vId,
                  source: 'youtube',
                  duration: 210,
                  isPlayable: true,
                });
              }
            }
          }
        }
      } catch (authFetchErr) {
        console.warn('InnerTube authenticated playlist fetch error:', authFetchErr);
      }
    }

    // 1. Try YouTube Data API if key is present
    if (apiKey && apiKey !== 'your_youtube_api_key_here') {
      try {
        // Fetch playlist metadata
        const plUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;
        const plRes = await fetch(plUrl);
        if (plRes.ok) {
          const plData = await plRes.json();
          if (plData.items?.[0]) {
            title = plData.items[0].snippet.title;
            creator = plData.items[0].snippet.channelTitle;
          }
        }

        // Fetch playlist items
        const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;
        const itemsRes = await fetch(itemsUrl);
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          for (const item of itemsData.items || []) {
            const vId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
            if (!vId) continue;
            const snippet = item.snippet;
            tracks.push({
              id: `yt:${vId}`,
              title: snippet.title,
              artist: snippet.videoOwnerChannelTitle || snippet.channelTitle || creator,
              artworkUrl:
                snippet.thumbnails?.high?.url ||
                snippet.thumbnails?.medium?.url ||
                snippet.thumbnails?.default?.url,
              providerId: vId,
              source: 'youtube',
              duration: 210,
              isPlayable: true,
            });
          }
        }
      } catch (e) {
        console.warn('YouTube API playlist fetch error:', e);
      }
    }

    // 2. Fallback: If no API key or API call failed, scrape public playlist HTML
    if (tracks.length === 0) {
      try {
        const scrapeUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
        const res = await fetch(scrapeUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        });

        if (res.ok) {
          const html = await res.text();
          // Extract playlist title
          const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/);
          if (titleMatch) title = titleMatch[1];

          // Extract video data JSON from ytInitialData
          const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/);
          if (dataMatch) {
            try {
              const ytData = JSON.parse(dataMatch[1]);
              const section =
                ytData.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
                  ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]
                  ?.playlistVideoListRenderer?.contents;

              if (Array.isArray(section)) {
                for (const item of section) {
                  const v = item.playlistVideoRenderer;
                  if (!v || !v.videoId) continue;
                  const vTitle = v.title?.runs?.[0]?.text || 'Track';
                  const vArtist = v.shortBylineText?.runs?.[0]?.text || creator;
                  const vThumb = v.thumbnail?.thumbnails?.slice(-1)[0]?.url;
                  const vSecs = v.lengthSeconds ? parseInt(v.lengthSeconds, 10) : 210;

                  tracks.push({
                    id: `yt:${v.videoId}`,
                    title: vTitle,
                    artist: vArtist,
                    artworkUrl: vThumb,
                    providerId: v.videoId,
                    source: 'youtube',
                    duration: vSecs,
                    isPlayable: true,
                  });
                }
              }
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('Scraping fallback error:', err);
      }
    }

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: 'Could not find or access this playlist. Ensure the playlist is public or unlisted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      playlistId,
      title,
      creator,
      itemCount: tracks.length,
      tracks,
    });
  } catch (error: any) {
    console.error('Import playlist error:', error);
    return NextResponse.json({ error: error.message || 'Failed to import playlist' }, { status: 500 });
  }
}
