"use server"; 

import { google } from 'googleapis'; 

// Helper: Spotify fetch wrapper with exponential backoff + Retry-After handling
export async function spotifyFetch(input: RequestInfo, init?: RequestInit, maxRetries = 5) {
    let attempt = 0;
    let lastError: any = null;

    // small helper to delay
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    while (attempt <= maxRetries) {
        try {
            const res = await fetch(input, init);

            if (res.status === 429) {
                // Respect Retry-After header if present
                const ra = res.headers.get('Retry-After');
                const wait = ra ? Number(ra) * 1000 : Math.min(1000 * 2 ** attempt, 30000);
                await delay(wait);
                attempt++;
                continue;
            }

            // Try to parse body for error messages when not ok
            if (!res.ok) {
                let body: any = null;
                try {
                    body = await res.json();
                } catch (_) {
                    body = await res.text().catch(() => null);
                }
                const msg = body?.error?.message || body?.error || body?.message || body || `HTTP ${res.status}`;
                const err: any = new Error(String(msg));
                err.status = res.status;
                err.body = body;
                throw err;
            }

            return res;
        } catch (err: any) {
            lastError = err;
            // For network errors or thrown errors, backoff and retry
            attempt++;
            if (attempt > maxRetries) break;
            const backoff = Math.min(500 * 2 ** (attempt - 1), 30000);
            await delay(backoff + Math.floor(Math.random() * 200));
            continue;
        }
    }

    throw lastError;
}

// --- SPOTIFY HELPER ---
export async function getSpotifyToken() {
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
        }),
    });
    if (!res.ok) {
        let body: any = null;
        try {
            body = await res.json();
        } catch (_) {
            body = await res.text().catch(() => null);
        }
        const msg = body?.error_description || body?.error || body?.message || `Token request failed: ${res.status}`;
        throw new Error(String(msg));
    }

    return res.json();
}

export async function getPlaylists() {
    try {
        // Initialize Auth (reuse same pattern as getLatestSong)
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Read Name + Act1 + Act2 + Act3
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Form Responses 1!B2:E',
        });

        const rows = response.data.values || [];

        const act1: Array<{ title: string; artist: string; submitter: string }> = [];
        const act2: Array<{ title: string; artist: string; submitter: string }> = [];
        const act3: Array<{ title: string; artist: string; submitter: string }> = [];

        for (const row of rows) {
            const submitter = (row[0] || '').toString().trim();
            const col1 = (row[1] || '').toString().trim();
            const col2 = (row[2] || '').toString().trim();
            const col3 = (row[3] || '').toString().trim();

            const parseSong = (cell: string) => {
                if (!cell) return null;
                const parts = cell.split('-');
                const title = parts[0]?.trim().replaceAll('-', '') || cell;
                const artist = parts[1]?.trim().replaceAll('-', '') || '';
                return { title, artist };
            };

            const s1 = parseSong(col1);
            const s2 = parseSong(col2);
            const s3 = parseSong(col3);

            if (s1) act1.push({ title: s1.title, artist: s1.artist, submitter });
            if (s2) act2.push({ title: s2.title, artist: s2.artist, submitter });
            if (s3) act3.push({ title: s3.title, artist: s3.artist, submitter });
        }

        return { act1, act2, act3 };
    } catch (error: any) {
        console.error('GetPlaylists Error:', error?.message ?? error);
        return { act1: [], act2: [], act3: [] };
    }
}

export async function getCurrentSong() {
    try {
        const { access_token } = await getSpotifyToken();
        if (!access_token) {
            console.error('getCurrentSong: missing access token');
            return { song: 'Unavailable', artist: '', submitter: 'System' };
        }

        // Get currently playing track
        const res = await spotifyFetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        // 204 No Content when nothing is playing
        if (res.status === 204) {
            return { song: 'Nothing playing', artist: '', submitter: '' };
        }

        const now = await res.json();
        const item = now?.item;
        if (!item) return { song: 'Unknown', artist: '', submitter: 'System' };

        const songName: string = item.name || '';
        const artistName: string = (item.artists || []).map((a: any) => a.name).join(', ');

        // Try to find submitter in the spreadsheet playlists
        const playlists = await getPlaylists();
        const allSongs = [...playlists.act1, ...playlists.act2, ...playlists.act3];

        const normalize = (s: string) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        const normSong = normalize(songName);
        const normArtist = normalize(artistName);

        let submitter = 'Unknown';
        for (const entry of allSongs) {
            const t = normalize(entry.title);
            const a = normalize(entry.artist);

            // match title and/or artist loosely
            if ((t && normSong.includes(t)) || (t && t.includes(normSong)) || (a && normArtist.includes(a)) || (a && a.includes(normArtist))) {
                submitter = entry.submitter || 'Anonymous';
                break;
            }
        }

        return { song: songName, artist: artistName, submitter };
    } catch (error: any) {
        console.error('getCurrentSong Error:', error?.message ?? error);
        return { song: 'Error', artist: '', submitter: 'System' };
    }
}

// Server action to play a playlist. Accepts FormData when used as a form action.
export async function playPlaylist(formData: FormData): Promise<void> {
    try {
        // If the client submitted an explicit playlist ID use it directly.
        const explicitPlaylistId = formData.get('playlistId');
        if (explicitPlaylistId) {
            const pid = explicitPlaylistId.toString();
            try {
                const { access_token } = await getSpotifyToken();
                if (!access_token) {
                    console.error('Failed to get Spotify token');
                    return;
                }
                const contextUri = `spotify:playlist:${pid}`;
                const playRes = await spotifyFetch('https://api.spotify.com/v1/me/player/play', {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ context_uri: contextUri }),
                });
                if (playRes.ok) {
                    console.log(`Started playback for explicit playlist ${pid}`);
                    return;
                }
                console.error('Failed to start playback for explicit playlist', playRes.status);
                return;
            } catch (err: any) {
                console.error('playPlaylist explicit playlistId error:', err?.message ?? err);
                return;
            }
        }

        const playlistKey = (formData.get('playlist') || 'act1').toString();

        // Prefer explicit playlist IDs from env
        const envMap: Record<string, string | undefined> = {
            act1: process.env.SPOTIFY_PLAYLIST_ACT1_ID,
            act2: process.env.SPOTIFY_PLAYLIST_ACT2_ID,
            act3: process.env.SPOTIFY_PLAYLIST_ACT3_ID,
        };

        const { access_token } = await getSpotifyToken();
        if (!access_token) {
            console.error('Failed to get Spotify token');
            return;
        }

        // Try persisted mapping file first
        let playlistId = envMap[playlistKey];
        try {
            const mappingRaw = await import('fs/promises').then((fs) => fs.readFile(process.cwd() + '/data/playlist-mapping.json', 'utf8').catch(() => '{}'));
            const mapping = JSON.parse(mappingRaw || '{}');
            if (mapping && mapping[playlistKey]) playlistId = mapping[playlistKey];
        } catch (err) {
            // ignore
        }

        if (!playlistId) {
            // Try to find a matching playlist in the user's library
            const listRes = await spotifyFetch('https://api.spotify.com/v1/me/playlists?limit=50', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            const listData = await listRes.json();
            const items = listData?.items || [];

            const normalize = (s: string) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
            const want = normalize(playlistKey.replace(/act/, 'act'));

            for (const p of items) {
                const nameNorm = normalize(p.name || '');
                if (nameNorm.includes(want) || want.includes(nameNorm)) {
                    playlistId = p.id;
                    break;
                }
            }
        }

        if (!playlistId) {
            console.error('No playlist id found for', playlistKey, '- set SPOTIFY_PLAYLIST_ACT1_ID / ACT2 / ACT3 in env or ensure playlist exists in your account');
            return;
        }

        const contextUri = `spotify:playlist:${playlistId}`;
        const playRes = await spotifyFetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ context_uri: contextUri }),
        });

        if (playRes.ok) {
            console.log(`Started playback for playlist ${playlistId}`);
            return;
        }

        console.error('Failed to start playback', playRes.status);
        return;
    } catch (error: any) {
        console.error('PlayPlaylist Error:', error?.message ?? error);
        return;
    }
}