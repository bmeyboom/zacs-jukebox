import { getLatestSong } from "./actions";

export default async function JukeboxPage() {
  const latest = await getLatestSong();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-6">
      <div className="border border-zinc-800 p-10 rounded-2xl bg-zinc-900 shadow-2xl text-center">
        <h1 className="text-sm font-bold tracking-widest text-zinc-500 uppercase mb-4">
          Now Playing (From Spreadsheet)
        </h1>
        <p className="text-4xl font-extrabold mb-2 text-blue-400">
          {latest.song}
        </p>
        <p className="text-zinc-400">
          Added by: <span className="text-zinc-200 font-medium">{latest.user}</span>
        </p>
      </div>
    </main>
  ); 
}