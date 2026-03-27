import { NextResponse } from 'next/server';
import { getSpotifyToken, spotifyFetch } from '../../actions';

export async function GET() {
  try {
    const { access_token } = await getSpotifyToken();
    if (!access_token) return NextResponse.json({ error: 'no_token' }, { status: 500 });

    const res = await spotifyFetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const data = await res.json();
    // return a simplified playlist list
    const items = (data?.items || []).map((p: any) => ({ id: p.id, name: p.name, uri: p.uri, owner: p.owner?.display_name }));
    return NextResponse.json({ items });
  } catch (err: any) {
    console.error('spotify-playlists route error:', err?.message ?? err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
