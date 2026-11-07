"use client";

import { useState } from "react";
import { useGame, type Sheet as SheetId } from "@/lib/store";
import { pickEvent } from "@/lib/game/events";
import { LEVELS } from "@/lib/game/data";
import { CHILL_NORMAL, CHILL_NOUNS } from "@/lib/game/kit.config";
import { softDelta } from "@/lib/kit/chill";
import { chillOn } from "@/lib/game/select";
import { naira } from "@/lib/game/util";
import { SHOP, type ItemSlot } from "@/lib/products";
import Figure, { toFigLook } from "@/components/world/Figure";
import { useSmooth } from "@/components/world/useEnv";
import { Section, Sheet, toneText } from "./ui";
import AdSheet from "./AdSheet";

export const GAME_VERSION = "0.3.0";

export default function Sheets({ which }: { which: Exclude<SheetId, null> }) {
  const close = useGame((s) => s.openSheet);
  const onClose = () => close(null);
  switch (which) {
    case "help":
      return <HelpSheet onClose={onClose} />;
    case "recap":
      return <RecapSheet onClose={onClose} />;
    case "event":
      return <EventSheet onClose={onClose} />;
    case "settings":
      return <SettingsSheet onClose={onClose} />;
    case "report":
      return <ReportSheet onClose={onClose} />;
    case "wardrobe":
      return <WardrobeSheet onClose={onClose} />;
    case "ad":
      return <AdSheet onClose={onClose} />;
    case "newgame":
      return <NewGameSheet onClose={onClose} />;
    default:
      return null;
  }
}

function HelpSheet({ onClose }: { onClose: () => void }) {
  const replay = useGame((s) => s.replayTour);
  const open = useGame((s) => s.openSheet);
  const p = useGame((s) => s.player);
  return (
    <Sheet title="How to play" icon="❓" onClose={onClose}>
      <div className="grid gap-4 pb-4 text-[14px] leading-relaxed">
        <div>
          <h3 className="font-display text-[15px] font-bold text-danfo">The goal</h3>
          <p className="text-paper/90">
            Grow your label from a Bedroom studio to a Continental powerhouse in three years. Each level ({LEVELS.map((l) => l.name).join(", ")}) needs chart hits, artists and money.
          </p>
        </div>
        <div>
          <h3 className="font-display text-[15px] font-bold text-danfo">How a week works</h3>
          <ol className="mt-1 grid gap-1 text-paper/90">
            <li>1. Read the yellow bar under your stats. It always shows the next thing to do. Tap it to go there.</li>
            <li>2. Tap a place on the map and pick an activity. Each one uses ⚡ energy, and studio work uses 📅 days (5 a week).</li>
            <li>3. Record 3 sessions, mix &amp; master, then release on Friday. Push it on radio and ClipTok.</li>
            <li>4. Tap 🌙 End week. Streams pay out, the chart moves, bills come due and something may happen.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-display text-[15px] font-bold text-danfo">Your stats</h3>
          <ul className="mt-1 grid gap-1 text-paper/90">
            <li>💰 Cash pays for sessions, advances and rent. Below ₦0 for 4 weeks and the label folds.</li>
            <li>⚡ Energy refills every week. 🔥 Hype is your buzz: it fades fast. ⭐ Rep is respect: slow to earn.</li>
            <li>🎧 Ear (your skill) makes better songs and beats. 🪙 Gold is for looks and small extras, never for streams.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-[15px] font-bold text-danfo">Bills with deadlines</h3>
          <p className="text-paper/90">Advance balances (Law office), studio rent (Surulere Sound), loans (Bank) and show balances (The Sanctuary). Late means angry artists, fees or lost deposits.</p>
        </div>
        {p && chillOn(p) && <p className="rounded-2xl bg-lagoon/15 px-3 py-2 text-lagoon">🌿 Chill mode is on: no game-over, no late fees, fewer setbacks.</p>}
        <div className="flex gap-2">
          <button
            className="btn btn-ghost flex-1"
            onClick={() => {
              onClose();
              replay();
            }}
          >
            Replay tutorial
          </button>
          <button className="btn btn-ghost flex-1" onClick={() => open("report")}>
            Report a problem
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function RecapSheet({ onClose }: { onClose: () => void }) {
  const p = useGame((s) => s.player)!;
  const open = useGame((s) => s.openSheet);
  const quit = useGame((s) => s.quitGame);
  const r = p.recap;
  const chill = chillOn(p);
  const next = () => (p.pendingEvent ? open("event") : onClose());
  if (p.ended)
    return (
      <Sheet title={p.ended.title} onClose={onClose}>
        <div className="grid gap-3 pb-4 text-center">
          <p className="text-[15px]">{p.ended.text}</p>
          <div className="font-display text-[34px] font-black text-danfo">{p.ended.score.toLocaleString()}</div>
          <p className="text-[13px] text-lilac">Final score{p.flags.chillEver ? " · 🌿 Chill life (not on the leaderboard)" : ""}</p>
          <button className="btn btn-danfo" onClick={quit}>
            Start a new label
          </button>
        </div>
      </Sheet>
    );
  return (
    <Sheet title={`Week ${r?.week ?? p.week - 1} recap`} icon="🌙" onClose={next}>
      <ul className="grid gap-1.5 pb-3">
        {(r?.lines ?? []).map((l, i) => (
          <li key={i} className="flex items-start gap-2 rounded-xl bg-night-3 px-3 py-2 text-[13.5px] leading-snug">
            <span>{l.icon}</span>
            <span className={l.tone === "bad" ? "text-okada" : l.tone === "good" ? "text-paper" : "text-paper/85"}>{l.text}</span>
          </li>
        ))}
      </ul>
      {r && (
        <div className="flex justify-between rounded-2xl bg-night px-3 py-2 text-[14px] font-bold">
          <span className="text-lagoon">In: {chill ? softDelta("cash", r.income, CHILL_NORMAL, CHILL_NOUNS) ?? "nothing" : naira(r.income)}</span>
          <span className="text-okada">Out: {chill ? softDelta("cash", -r.expenses, CHILL_NORMAL, CHILL_NOUNS) ?? "nothing" : naira(r.expenses)}</span>
        </div>
      )}
      <button className="btn btn-danfo mb-4 mt-3 w-full" onClick={next} autoFocus>
        {p.pendingEvent ? "Something happened…" : `Start week ${p.week}`}
      </button>
    </Sheet>
  );
}

function EventSheet({ onClose }: { onClose: () => void }) {
  const p = useGame((s) => s.player)!;
  const choose = useGame((s) => s.choose);
  const ev = p.pendingEvent ? pickEvent(p.pendingEvent) : undefined;
  if (!ev)
    return (
      <Sheet title="All clear" onClose={onClose}>
        <p className="pb-4 text-lilac">Nothing needs your decision right now.</p>
      </Sheet>
    );
  return (
    <Sheet title={ev.title} icon={ev.icon}>
      <p className="text-[15px] leading-relaxed">{ev.text(p)}</p>
      <div className="grid gap-2 py-4">
        {ev.choices.map((c, i) => {
          const ok = !c.can || c.can(p);
          return (
            <button key={i} className={`btn ${i === 0 ? "btn-danfo" : "btn-ghost"} min-h-[50px] text-[14.5px]`} disabled={!ok} onClick={() => choose(i)}>
              {c.label}
              {!ok && " (can't afford)"}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function SettingsSheet({ onClose }: { onClose: () => void }) {
  const meta = useGame((s) => s.meta);
  const p = useGame((s) => s.player);
  const set = useGame((s) => s.setSetting);
  const setChill = useGame((s) => s.setChill);
  const replay = useGame((s) => s.replayTour);
  const open = useGame((s) => s.openSheet);
  const smoothNow = useSmooth();
  const [deleted, setDeleted] = useState<string | null>(null);
  const row = (label: string, sub: string, on: boolean, flip: () => void) => (
    <button className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl bg-night-3 px-3 py-2 text-left" onClick={flip} role="switch" aria-checked={on}>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold">{label}</span>
        <span className="block text-[12.5px] text-lilac">{sub}</span>
      </span>
      <span className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${on ? "bg-lagoon" : "bg-night"}`}>
        <span className={`block h-5 w-5 rounded-full bg-paper transition ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
  const del = async () => {
    try {
      const r = await fetch("/api/privacy/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ installId: meta.installId }) });
      const d = await r.json();
      setDeleted(d.ok ? "Your online data is deleted. Your save on this phone is untouched." : "Couldn't delete everything. Try again in a minute.");
    } catch {
      setDeleted("No connection. Try again when you're online.");
    }
  };
  return (
    <Sheet title="Settings" icon="⚙️" onClose={onClose}>
      <div className="grid gap-2 pb-4">
        {row("Smooth mode", meta.smooth === null ? `Automatic: ${smoothNow ? "on for this phone" : "off"}` : "Fewer moving people and cars on the map", smoothNow, () => set("smooth", !smoothNow))}
        {meta.smooth !== null && (
          <button className="text-left text-[12.5px] text-lilac underline" onClick={() => set("smooth", null)}>
            Let the game decide for this phone
          </button>
        )}
        {row("Sound", "Small generated sounds. Off by default to save data and battery.", meta.sound, () => set("sound", !meta.sound))}
        {row("Show me to other players", "Your first name, label and look on the live map", meta.livePresence, () => set("livePresence", !meta.livePresence))}
        {p && row("🌿 Chill mode", "No game-over, no late fees, fewer setbacks. Chill labels don't go on the leaderboard.", !!p.chill, () => setChill(!p.chill))}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => {
              onClose();
              replay();
            }}
          >
            Replay tutorial
          </button>
          <button className="btn btn-ghost" onClick={() => open("report")}>
            Report a problem
          </button>
        </div>
        <Section title="Your data">
          <p className="text-[13px] text-lilac">Your game is saved on this phone. If you used the live map, invites or reports, some of that is stored online.</p>
          <button className="btn btn-ghost mt-2 w-full" onClick={del}>
            Delete my online data
          </button>
          {deleted && <p className="mt-2 text-[13px] text-lagoon">{deleted}</p>}
          <div className="mt-3 flex flex-wrap gap-3 text-[13px] text-lilac underline">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/advertise">Advertise</a>
          </div>
          <p className="mt-2 text-[12px] text-lilac">Version {GAME_VERSION}</p>
        </Section>
      </div>
    </Sheet>
  );
}

const KINDS = [
  { id: "bug", label: "Something broke" },
  { id: "stuck", label: "I'm stuck" },
  { id: "slow", label: "It's slow" },
  { id: "money", label: "Payment problem" },
  { id: "idea", label: "Idea" },
  { id: "other", label: "Other" },
];

function ReportSheet({ onClose }: { onClose: () => void }) {
  const meta = useGame((s) => s.meta);
  const p = useGame((s) => s.player);
  const here = useGame((s) => s.here);
  const [kind, setKind] = useState("bug");
  const [msg, setMsg] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | string>("idle");
  const send = async () => {
    setState("sending");
    const n = navigator as Navigator & { deviceMemory?: number };
    const details = {
      version: GAME_VERSION,
      device: `${window.innerWidth}x${window.innerHeight} · ${n.deviceMemory ?? "?"}GB · ${navigator.userAgent.slice(0, 120)}`,
      player: p ? { week: p.week, level: p.level, place: here, cash: Math.round(p.cash), chill: !!p.chill, pending: p.pendingEvent ?? null } : null,
      errors: meta.errors,
    };
    try {
      const r = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ installId: meta.installId, kind, message: msg, contact, details }) });
      const d = await r.json().catch(() => ({}));
      setState(d.ok ? "sent" : d.reason ?? (d.configured === false ? "Reports aren't switched on yet." : "Couldn't send. Try again in a minute."));
    } catch {
      setState("No connection. Try again when you're online.");
    }
  };
  return (
    <Sheet title="Report a problem" icon="🛠️" onClose={onClose}>
      {state === "sent" ? (
        <div className="grid gap-3 pb-4">
          <p className="text-[15px]">Thank you. We read every report.</p>
          <button className="btn btn-danfo" onClick={onClose}>
            Back to the game
          </button>
        </div>
      ) : (
        <div className="grid gap-3 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button key={k.id} className={`min-h-[40px] rounded-full px-3 text-[13px] font-bold ${kind === k.id ? "bg-danfo text-danfo-ink" : "bg-night-3"}`} onClick={() => setKind(k.id)}>
                {k.label}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-[13px] font-bold">
            What happened?
            <textarea className="min-h-[110px] rounded-2xl bg-night-3 p-3 text-[14px] font-normal outline-none" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={1500} placeholder="For example: I tapped End week and nothing happened." />
          </label>
          <label className="grid gap-1 text-[13px] font-bold">
            Phone or email (optional, if you want a reply)
            <input className="min-h-[44px] rounded-2xl bg-night-3 px-3 text-[14px] font-normal outline-none" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={80} />
          </label>
          <p className="text-[12px] text-lilac">We also send your week, level, phone size and the last few errors. Not your name or save.</p>
          {state !== "idle" && state !== "sending" && <p className="text-[13px] text-okada">{state}</p>}
          <button className="btn btn-danfo" disabled={msg.trim().length < 5 || state === "sending"} onClick={send}>
            {state === "sending" ? "Sending…" : "Send report"}
          </button>
        </div>
      )}
    </Sheet>
  );
}

const SLOTS: { id: ItemSlot; name: string }[] = [
  { id: "outfit", name: "Outfits" },
  { id: "extra", name: "Extras" },
  { id: "studio", name: "Studio looks" },
  { id: "ride", name: "Rides (parked at your base)" },
];

function WardrobeSheet({ onClose }: { onClose: () => void }) {
  const p = useGame((s) => s.player)!;
  const meta = useGame((s) => s.meta);
  const buy = useGame((s) => s.buyItem);
  const equip = useGame((s) => s.equip);
  const setLook = useGame((s) => s.setLook);
  const on = (id: string, slot: ItemSlot) => (slot === "outfit" ? p.look.outfit === id : slot === "extra" ? p.look.extra === id : !!p.flags[`${slot}:${id}`]);
  return (
    <Sheet title="Wardrobe" icon="🧥" onClose={onClose} tall>
      <div className="flex items-center gap-4">
        <svg viewBox="-40 -112 80 118" className="h-36 w-24" aria-label="Your look">
          <Figure look={toFigLook(p.look)} pose="idle" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-lilac">Looks only. They show on the map, in every scene and to other players.</p>
          <p className="mt-1 text-[14px] font-bold text-danfo">🪙 {meta.gold} gold</p>
          <div className="mt-2 flex gap-1.5">
            {["#4a2f1d", "#5a3a24", "#6e452b", "#7d4f30", "#8d5a37", "#a06a42"].map((c) => (
              <button key={c} className={`h-8 w-8 rounded-full border-2 ${p.look.skin === c ? "border-danfo" : "border-transparent"}`} style={{ background: c }} onClick={() => setLook({ skin: c })} aria-label="Skin tone" />
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((h) => (
              <button key={h} className={`h-8 min-w-8 rounded-lg px-1 text-[11px] font-bold ${p.look.hair === h ? "bg-danfo text-danfo-ink" : "bg-night-3"}`} onClick={() => setLook({ hair: h })}>
                {["Low", "Top", "Locs", "Puff", "Bun", "Gele"][h]}
              </button>
            ))}
          </div>
        </div>
      </div>
      {SLOTS.map((sl) => (
        <Section key={sl.id} title={sl.name}>
          <div className="grid grid-cols-2 gap-2">
            {SHOP.filter((i) => i.slot === sl.id).map((it) => {
              const owned = meta.owned.includes(it.id);
              const worn = on(it.id, sl.id);
              return (
                <button key={it.id} className={`flex min-h-[64px] flex-col items-start justify-center rounded-2xl border px-3 py-2 text-left ${worn ? "border-danfo bg-danfo/10" : "border-line bg-night-3"}`} onClick={() => (owned ? equip(it.id) : buy(it.id))}>
                  <span className="text-[14px] font-bold">
                    {it.icon} {it.name}
                  </span>
                  <span className={`text-[12px] ${toneText[owned ? "good" : "neutral"]}`}>{worn ? "Wearing" : owned ? "Owned · tap to use" : it.gold ? `🪙 ${it.gold}` : "From packs or awards"}</span>
                </button>
              );
            })}
          </div>
        </Section>
      ))}
      <div className="h-4" />
    </Sheet>
  );
}

function NewGameSheet({ onClose }: { onClose: () => void }) {
  const quit = useGame((s) => s.quitGame);
  return (
    <Sheet title="Start a new label?" onClose={onClose}>
      <p className="text-[14px]">Your current label ends here. Gold, looks, passes and achievements stay with you.</p>
      <div className="grid grid-cols-2 gap-2 py-4">
        <button className="btn btn-ghost" onClick={onClose}>
          Keep playing
        </button>
        <button className="btn btn-stage" onClick={quit}>
          Start new
        </button>
      </div>
    </Sheet>
  );
}
