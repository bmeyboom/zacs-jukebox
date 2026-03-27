"use client";

import React, { useEffect, useState } from 'react';

type NowPlaying = {
  song: string;
  artist: string;
  submitter: string;
};

export default function NowPlayingClient({ interval = 5000 }: { interval?: number }) {
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function fetchNow() {
      try {
        setLoading(true);
        const res = await fetch('/api/current-song', { signal: controller.signal });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!mounted) return;
        setNow(data);
        setError(null);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err?.message ?? String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchNow();
    const id = setInterval(fetchNow, interval);
    return () => {
      mounted = false;
      controller.abort();
      clearInterval(id);
    };
  }, [interval]);

  if (loading && !now) {
    return (
      <div className="text-right">
        <div className="text-sm text-zinc-400">Now Playing</div>
        <div className="text-lg font-semibold text-blue-400">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-right">
        <div className="text-sm text-zinc-400">Now Playing</div>
        <div className="text-lg font-semibold text-red-400">Error</div>
        <div className="text-zinc-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <div className="text-sm text-zinc-400">Now Playing</div>
      <div className="text-lg font-semibold text-blue-400">{now?.song} {now?.artist ? `by ${now.artist}` : ''}</div>
      <div className="text-zinc-400">Selected by: <span className="text-zinc-200 font-medium">{now?.submitter}</span></div>
    </div>
  );
}
