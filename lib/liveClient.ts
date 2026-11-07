"use client";

import { create } from "zustand";
import { useGame } from "./store";
import { SCOPE, type BoardPost, type LivePlayer } from "./live";
import { sfx } from "./sound";
import { seasonWeek } from "./daily";

interface LiveState {
  configured: boolean | null; // null = not checked yet
  me: string | null;
  players: LivePlayer[];
  board: BoardPost[];
  camps: { camp: string; players: number; pts: number }[];
  lastBeat: number;
  since: string | null;
  seenWaves: number[];
  interval: number;
  pSince: string | null;
  bSince: string | null;
  beats: number;
  sentPts: number;
  checkedWin: boolean;
  beat: (force?: boolean, slow?: number) => Promise<void>;
  wave: (to: string, emoji: string) => Promise<boolean>;
  post: (msg: string) => Promise<boolean>;
  loadCamps: () => Promise<void>;
}

const BASE = 45_000;
const MAX = 300_000;
const TEN_MIN = 600;
type Seen<T> = T & { at: number };

/** Merge changed rows into what we had, refresh their "seconds ago", drop the stale ones. */
function mergeSeen<T extends { ago: number }>(old: Seen<T>[], fresh: T[], key: (x: T) => string | number, full: boolean, keepFor: number, limit: number): Seen<T>[] {
  const now = Date.now();
  const by = new Map<string | number, Seen<T>>();
  if (!full) for (const o of old) by.set(key(o), o);
  for (const f of fresh) by.set(key(f), { ...f, at: now - f.ago * 1000 });
  return [...by.values()]
    .map((x) => ({ ...x, ago: Math.max(0, Math.round((now - x.at) / 1000)) }))
    .filter((x) => x.ago <= keepFor)
    .sort((a, b) => a.ago - b.ago)
    .slice(0, limit);
}

/**
 * Light multiplayer client: one heartbeat about every 45 s while the game is open, visible and in use;
 * slower when the player goes idle, none after 5 idle minutes (LiveBeat decides). Only changes are fetched after the first beat.
 */
export const useLive = create<LiveState>()((set, get) => ({
  configured: null,
  me: null,
  players: [],
  board: [],
  camps: [],
  lastBeat: 0,
  since: null,
  seenWaves: [],
  interval: BASE,
  pSince: null,
  bSince: null,
  beats: 0,
  sentPts: -1,
  checkedWin: false,

  beat: async (force = false, slow = 1) => {
    const g = useGame.getState();
    const p = g.player;
    if (!p || !g.meta.installId || get().configured === false) return;
    const now = Date.now();
    if (!force && now - get().lastBeat < get().interval * slow - 2_000) return;
    set({ lastBeat: now });
    const full = get().beats % 10 === 0;
    const week = seasonWeek(new Date());
    const pts = g.meta.season.week === week ? g.meta.season.pts : 0;
    try {
      const r = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installId: g.meta.installId,
          visible: g.meta.livePresence !== false,
          name: p.name.split(" ")[0],
          label: p.label,
          camp: g.meta.camp,
          place: g.here,
          look: p.look,
          level: p.level,
          since: get().since,
          pSince: full ? null : get().pSince,
          bSince: full ? null : get().bSince,
          week,
          pts: pts !== get().sentPts ? pts : undefined,
          checkWin: !get().checkedWin,
        }),
      });
      if (!r.ok) {
        set({ interval: Math.min(MAX, get().interval * 2) });
        return;
      }
      const d = await r.json();
      if (!d.configured) return set({ configured: false });
      if (d.seasonReward) g.retryPending();
      const fresh = (d.waves as { id: number; name: string; label: string; emoji: string }[]).filter((w) => !get().seenWaves.includes(w.id));
      for (const w of fresh.slice(0, 2)) {
        g.toast({ title: `${w.emoji} ${w.name}${w.label ? ` of ${w.label}` : ""} waved at you`, text: "Find them on the map and wave back.", tone: "good", icon: w.emoji });
        sfx.coin();
      }
      const newestPost = (d.board as BoardPost[]).reduce((m, b) => (b.ago < m ? b.ago : m), Infinity);
      set({
        configured: true,
        me: d.me,
        players: mergeSeen(get().players as Seen<LivePlayer>[], d.players, (x) => x.pid, d.fullPlayers !== false, TEN_MIN, 40),
        board: mergeSeen(get().board as Seen<BoardPost>[], d.board, (x) => x.id, d.fullBoard !== false, Infinity, 20),
        since: d.now,
        pSince: d.now,
        bSince: newestPost === Infinity ? (d.fullBoard === false ? get().bSince : d.now) : new Date(Date.parse(d.now) - newestPost * 1000).toISOString(),
        beats: get().beats + 1,
        sentPts: pts,
        checkedWin: true,
        interval: Math.max(20_000, Math.min(MAX, (Number(d.next) || BASE / 1000) * 1000)),
        seenWaves: [...get().seenWaves, ...fresh.map((w) => w.id)].slice(-50),
      });
    } catch {
      set({ interval: Math.min(MAX, get().interval * 2) });
    }
  },

  wave: async (to, emoji) => {
    const g = useGame.getState();
    const p = g.player;
    if (!p) return false;
    try {
      const r = await fetch("/api/live/wave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ installId: g.meta.installId, name: p.name.split(" ")[0], label: p.label, to, emoji }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) return true;
      g.toast({ title: "Wave not sent", text: r.status === 429 ? "You already waved recently. Try again in a few minutes." : "Check your connection and try again.", tone: "bad", icon: "👋" });
      return false;
    } catch {
      return false;
    }
  },

  post: async (msg) => {
    const g = useGame.getState();
    const p = g.player;
    if (!p) return false;
    try {
      const r = await fetch("/api/live/board", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ installId: g.meta.installId, name: p.name.split(" ")[0], scope: SCOPE, msg }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        get().beat(true);
        return true;
      }
      g.toast({ title: "Not posted", text: r.status === 429 ? "One post every 2 minutes." : "Check your connection and try again.", tone: "bad", icon: "📌" });
      return false;
    } catch {
      return false;
    }
  },

  loadCamps: async () => {
    try {
      const r = await fetch("/api/live/camps");
      const d = await r.json();
      if (d.configured) set({ camps: d.rows ?? [] });
    } catch {
      /* offline */
    }
  },
}));
