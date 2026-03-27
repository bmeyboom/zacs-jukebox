import { playPlaylist } from './actions';
import NowPlayingClient from '../components/NowPlayingClient';
import PlaylistBrowser from '../components/PlaylistBrowser';

export default function JukeboxPage() {
  return (
    <main className="flex min-h-screen items-start bg-zinc-950 text-white p-6">
      <div className="w-full max-w-6xl mx-auto flex gap-8">
        {/* Left: buttons (stacked) */}
        <div className="flex flex-col items-start gap-4">
          <PlaylistBrowser />
          <h1 className="text-2xl font-bold mb-2">Zac's Jukebox</h1>
          <form action={playPlaylist} className="inline-block">
            <input type="hidden" name="playlist" value="act1" />
            <button type="submit" className="btn">Play Act I</button>
          </form>

          <form action={playPlaylist} className="inline-block">
            <input type="hidden" name="playlist" value="act2" />
            <button type="submit" className="btn">Play Act II</button>
          </form>

          <form action={playPlaylist} className="inline-block">
            <input type="hidden" name="playlist" value="act3" />
            <button type="submit" className="btn">Play Act III</button>
          </form>
        </div>

        {/* Right: now playing info (client-side polling) */}
        <div className="flex-1 flex flex-col items-end">
          <NowPlayingClient />
        </div>
      </div>
    </main>
  );
}