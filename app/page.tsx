import { PROFILES, LEVELS } from "@/lib/game/data";

/** Placeholder until slice 1 ships the playable game. */
export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-neon">Coming soon</p>
        <h1 className="mt-1 text-4xl font-extrabold leading-tight">
          Afrobeats <span className="text-gold">King</span> 👑
        </h1>
        <p className="mt-3 text-muted">Run a record label in Lagos. Sign artists, drop singles, chase the ClipTok trend and grow from a bedroom studio to a continental label.</p>
      </div>
      <ul className="grid gap-3">
        {PROFILES.map((p) => (
          <li key={p.id} className="rounded-2xl border border-white/10 bg-plum p-4">
            <div className="text-lg font-bold">
              {p.icon} {p.name}
            </div>
            <div className="mt-1 text-sm text-muted">{p.tagline}</div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">{LEVELS.map((l) => `${l.icon} ${l.name}`).join("  →  ")}</p>
    </main>
  );
}
