import { NextResponse } from 'next/server';
import { getSpotifyToken, spotifyFetch } from '../../actions';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const playlistId = body?.playlistId;
    if (!playlistId) return NextResponse.json({ error: 'missing_playlistId' }, { status: 400 });

    const { access_token } = await getSpotifyToken();
    if (!access_token) return NextResponse.json({ error: 'no_token' }, { status: 500 });

    const contextUri = `spotify:playlist:${playlistId}`;
    const res = await spotifyFetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context_uri: contextUri }),
    });

    if (res.ok) return NextResponse.json({ ok: true });
    const txt = await res.text().catch(() => null);
    return NextResponse.json({ ok: false, status: res.status, body: txt }, { status: 500 });
  } catch (err: any) {
    console.error('play-by-id error:', err?.message ?? err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
