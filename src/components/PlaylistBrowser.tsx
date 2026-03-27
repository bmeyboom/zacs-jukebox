"use client";

import React, { useEffect, useState } from 'react';

type Playlist = { id: string; name: string; uri?: string; owner?: string };

export default function PlaylistBrowser() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/spotify-playlists');
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!mounted) return;
        setPlaylists(data.items || []);
        setError(null);
      } catch (err: any) {
        setError(err?.message ?? String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function play(id?: string) {
    if (!id && !selected) return;
    const pid = id || selected!;
    setPlayingId(pid);
    try {
      const res = await fetch('/api/play-by-id', { method: 'POST', body: JSON.stringify({ playlistId: pid }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.body || `HTTP ${res.status}`);
      }
      // success
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setPlayingId(null);
    }
  }

  if (loading) return <div className="p-4">Loading playlists…</div>;
  if (error) return <div className="p-4 text-red-400">Error loading playlists: {error}</div>;

  return (
    <div className="w-full max-w-md bg-zinc-900 rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-zinc-400">Your Spotify Playlists</div>
        <button className="text-xs text-blue-300" onClick={() => { setLoading(true); setError(null); fetch('/api/spotify-playlists').then(r => r.json()).then(d => setPlaylists(d.items || [])).catch(e => setError(String(e))).finally(() => setLoading(false)); }}>Refresh</button>
      </div>

      <ul className="space-y-2 max-h-64 overflow-auto">
        {playlists.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <label className="flex-1">
              <input type="radio" name="playlist" value={p.id} checked={selected === p.id} onChange={() => setSelected(p.id)} />
              <span className="ml-2">{p.name}</span>
            </label>
            <div className="flex items-center gap-2">
              <button className="btn btn-sm" onClick={() => play(p.id)} disabled={playingId === p.id}>{playingId === p.id ? 'Playing…' : 'Play'}</button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-2">
        <button className="btn" onClick={() => play()} disabled={!selected || !!playingId}>{playingId ? 'Playing…' : 'Play Selected'}</button>
        <div className="text-sm text-zinc-400">{selected ? `Selected: ${playlists.find(p => p.id === selected)?.name}` : 'No playlist selected'}</div>
      </div>
    </div>
  );
}
