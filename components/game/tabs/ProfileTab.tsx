"use client";

import { useEffect, useState } from "react";
import { useGame, runScore, vipOn } from "@/lib/store";
import { LEVELS, profileById, GENRES } from "@/lib/game/data";
import { netWorth } from "@/lib/game/engine";
import { naira, weekLabel } from "@/lib/game/util";
import { CAMPS } from "@/lib/daily";
import Figure, { toFigLook } from "@/components/world/Figure";
import { Section } from "../ui";

interface Row {
  name: string;
  label: string | null;
  title: string | null;
  score: number;
}

export default function ProfileTab() {
  const p = useGame((s) => s.player)!;
  const meta = useGame((s) => s.meta);
  const openSheet = useGame((s) => s.openSheet);
  const replay = useGame((s) => s.replayTour);
  const toast = useGame((s) => s.toast);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sent, setSent] = useState(false);
  const L = LEVELS[p.level];
  const pr = profileById(p.profile);
  const camp = meta.camp;
  const chill = !!p.flags.chillEver || !!p.chill;

  useEffect(() => {
    let live = true;
    fetch("/api/leaderboard?limit=20")
      .then((r) => r.json())
      .then((d) => live && setRows(d.configured ? d.rows : []))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [sent]);

  const submit = async () => {
    if (chill) return;
    try {
      const r = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installId: meta.installId, name: p.name, label: p.label, title: `${L.name} label · week ${p.week}`, score: runScore(p), week: p.week, level: p.level }),
      });
      const d = await r.json();
      if (d.ok) setSent(true);
      else toast({ icon: "🏆", title: "Couldn't post your score", text: d.reason, tone: "bad" });
    } catch {
      toast({ icon: "🏆", title: "No connection", tone: "bad" });
    }
  };

  const shareGame = async () => {
    const url = window.location.origin;
    const text = `I'm running ${p.label} (${L.name} label) in Afrobeats King. Can you do better? ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: "Afrobeats King", text, url });
      else {
        await navigator.clipboard.writeText(text);
        toast({ icon: "📋", title: "Copied", text: "Paste it in WhatsApp or X.", tone: "good" });
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="scroll-y h-full px-3 pb-8 pt-3">
      <div className="flex items-center gap-3 rounded-[20px] bg-night-2 p-3">
        <svg viewBox="-40 -112 80 118" className="h-28 w-20 shrink-0" aria-label="Your character">
          <Figure look={toFigLook(p.look)} pose="idle" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="font-display truncate text-[18px] font-bold">{p.name}</div>
          <div className="truncate text-[13px] text-lilac">
            Boss of {p.label} · {L.icon} {L.name}
          </div>
          <div className="text-[12.5px] text-lilac">
            {pr.icon} {pr.name}
          </div>
          {camp && (
            <div className="text-[12.5px] text-lilac">
              {GENRES[camp].icon} {CAMPS[camp].name}
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-1 text-[11.5px]">
            {vipOn(meta) && <span className="rounded-full bg-danfo/20 px-2 py-0.5 font-bold text-danfo">👑 Odogwu</span>}
            {chill && <span className="rounded-full bg-lagoon/20 px-2 py-0.5 font-bold text-lagoon">🌿 Chill life</span>}
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button className="btn btn-ghost min-h-[48px]" onClick={() => openSheet("wardrobe")}>
          🧥 Wardrobe
        </button>
        <button className="btn btn-ghost min-h-[48px]" onClick={() => openSheet("settings")}>
          ⚙️ Settings
        </button>
        <button className="btn btn-ghost min-h-[48px]" onClick={() => openSheet("help")}>
          ❓ How to play
        </button>
        <button className="btn btn-ghost min-h-[48px]" onClick={replay}>
          🎓 Replay tutorial
        </button>
        <button className="btn btn-ghost min-h-[48px]" onClick={shareGame}>
          📤 Share the game
        </button>
        <button className="btn btn-ghost min-h-[48px]" onClick={() => openSheet("report")}>
          🛠️ Report a problem
        </button>
      </div>

      <Section title="Your label so far">
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          {[
            ["📅", weekLabel(p.week)],
            ["💼", `Net worth ${naira(netWorth(p))}`],
            ["🚀", `${p.stats.released} singles`],
            ["📈", `${p.stats.charted} charted`],
            ["🔟", `${p.stats.top10} Top 10s`],
            ["👑", `${p.stats.no1} No. 1s`],
            ["🎤", `${p.stats.shows} shows (${p.stats.sellouts} sold out)`],
            ["🏆", `Score ${runScore(p).toLocaleString()}`],
          ].map(([i, t]) => (
            <div key={t} className="rounded-xl bg-night-3 px-3 py-2">
              {i} {t}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Leaderboard">
        {rows === null ? (
          <p className="text-[13px] text-lilac">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-[13px] text-lilac">No scores yet. Be the first.</p>
        ) : (
          <ol className="grid gap-1">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl bg-night-3 px-3 py-1.5 text-[13px]">
                <span className="w-5 font-bold text-lilac">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  <b>{r.name}</b>
                  {r.label ? ` · ${r.label}` : ""}
                </span>
                <span className="font-bold">{r.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
        <button className="btn btn-danfo mt-2 w-full" disabled={chill || sent} onClick={submit}>
          {chill ? "🌿 Chill labels skip the leaderboard" : sent ? "Score posted" : "Post my score"}
        </button>
      </Section>

      <Section title="Brands and artists">
        <a className="btn btn-ghost w-full" href="/advertise">
          📢 Advertise or promote a song
        </a>
      </Section>

      <button className="mt-6 min-h-[44px] w-full text-[13px] font-bold text-okada underline" onClick={() => openSheet("newgame")}>
        Start a new label
      </button>
    </div>
  );
}
