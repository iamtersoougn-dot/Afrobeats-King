import { ACTIONS, actionLock, createPlayer, doAction, endWeek, payObligation, resolveEvent, signArtist, signLock, dropArtist, slots } from "../lib/game/engine";
import { pickEvent } from "../lib/game/events";
import { currentGoal } from "../lib/game/goals";
import { LEVELS } from "../lib/game/data";
import type { Player, ProfileId } from "../lib/game/types";

type Style = "careful" | "grinder" | "slacker" | "crammer" | "hustler";
const RUNS = Number(process.env.RUNS ?? 150);
const MUSIC = ["release", "pro_mix", "mix", "pro_session", "record", "book_show", "shoot_video", "cliptok", "radio", "interview"];
const HUSTLE = ["sell_beat", "mix_others", "dj"];
const EXTRA = ["gist", "eat", "beat", "plugins", "network"];
const act = (p: Player, id: string) => { const a = ACTIONS.find((x) => x.id === id)!; if (actionLock(p, a)) return false; return doAction(p, id).ok; };

function week(p: Player, s: Style, w: number, earn: { music: number; hustle: number }) {
  const play = s === "slacker" ? 2 : s === "crammer" ? (w % 4 === 3 ? 40 : 0) : 40;
  let n = 0;
  // pay what's due, sign if room (all styles that act)
  if (play) {
    for (const o of [...p.obligations].sort((a, b) => a.dueWeek - b.dueWeek)) if (o.amount > 0 && o.dueWeek <= p.week + 1) payObligation(p, o.id);
    if (s !== "hustler") {
      const best = [...p.candidates].sort((a, b) => b.talent + b.star - (a.talent + a.star))[0];
      const weakest = [...p.artists].sort((a, b) => a.talent + a.star - (b.talent + b.star))[0];
      if (best && weakest && p.artists.length >= slots(p) && best.talent + best.star > weakest.talent + weakest.star + 35) dropArtist(p, weakest.id);
      for (const c of [...p.candidates].sort((a, b) => b.talent + b.star - (a.talent + a.star))) if (!signLock(p, c)) signArtist(p, c.id);
    }
  }
  for (let g = 0; g < 40 && n < play; g++) {
    let id: string | undefined;
    if (s === "careful" || s === "slacker" || s === "crammer") id = currentGoal(p).action;
    if (!id || !ACTIONS.find((x) => x.id === id) || actionLock(p, ACTIONS.find((x) => x.id === id)!)) {
      const order = s === "hustler" ? [...HUSTLE, "eat", "beat"] : [...MUSIC, ...HUSTLE, ...EXTRA];
      id = order.find((x) => {
        const a = ACTIONS.find((y) => y.id === x)!;
        if (actionLock(p, a)) return false;
        const cost = typeof a.cost === "number" ? a.cost : 0;
        const buffer = s === "careful" ? 60_000 + (LEVELS[p.level + 1]?.netWorth ?? 0) * 0.35 : 60_000;
        return cost === 0 || p.cash - cost > buffer;
      });
    }
    if (!id) break;
    const c0 = p.cash;
    if (!act(p, id)) break;
    n++;
    if (HUSTLE.includes(id) && p.cash > c0) earn.hustle += p.cash - c0;
  }
  if (p.pendingEvent) { const ev = pickEvent(p.pendingEvent)!; resolveEvent(p, Math.max(0, ev.choices.findIndex((c) => !c.can || c.can(p)))); }
  const r = endWeek(p, { events: true });
  for (const l of r.lines) { const m = /₦([\d.,]+)(k|m)?/.exec(l.text); if (!m) continue; const v = parseFloat(m[1].replace(/,/g, "")) * (m[2] === "m" ? 1e6 : m[2] === "k" ? 1e3 : 1); if (["🎧", "🎤", "🏟️"].includes(l.icon)) earn.music += v; }
}

const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);
const f = (n: number) => (Number.isNaN(n) ? "—" : Math.abs(n) >= 1e6 ? `₦${(n / 1e6).toFixed(1)}m` : `₦${Math.round(n / 1000)}k`);
const evCount: Record<string, number[]> = {};
console.log("profile  style    | cash wk10  wk26   wk52   wk104 | ever broke | folds | stuck | Studio/Indie/Major wk | music ₦ vs hustle ₦ (median, whole run)");
for (const profile of (process.env.PROFILES ?? "producer,dj,richkid").split(",") as ProfileId[]) for (const s of (process.env.STYLES ?? "careful,grinder,slacker,crammer,hustler").split(",") as Style[]) {
  const at: Record<number, number[]> = { 10: [], 26: [], 52: [], 104: [] };
  let broke = 0, folds = 0, stuck = 0;
  const lv: number[][] = [[], [], [], []];
  const mus: number[] = [], hus: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const p = createPlayer({ name: "S", label: "S", profile, seed: `sim-${profile}-${s}-${i}` });
    const earn = { music: 0, hustle: 0 };
    let wasBroke = false;
    const seen: Record<string, number> = {};
    for (let w = 0; w < 160 && !p.ended; w++) {
      const before = p.week, lvl = p.level;
      week(p, s, w, earn);
      if (p.week !== before + 1 && !p.ended) { stuck++; break; }
      if (p.cash < 0) wasBroke = true;
      if (p.level > lvl) lv[p.level - 1].push(p.week);
      if (at[p.week] !== undefined) at[p.week].push(p.cash);
      for (const [id, wk] of Object.entries(p.eventsSeen)) if (wk === p.week) seen[id] = (seen[id] ?? 0) + 1;
    }
    if (!p.ended) stuck++;
    if (wasBroke) broke++;
    if (p.ended?.kind === "fold") folds++;
    mus.push(earn.music); hus.push(earn.hustle);
    if (s === "careful") for (const [id, n] of Object.entries(seen)) (evCount[id] ??= []).push(n);
  }
  console.log(`${profile.padEnd(8)} ${s.padEnd(8)} | ${f(med(at[10]))} ${f(med(at[26]))} ${f(med(at[52]))} ${f(med(at[104]))} | ${Math.round((broke / RUNS) * 100)}% | ${folds} | ${stuck} | ${lv.slice(0, 3).map((x) => (x.length ? `${med(x)}(${Math.round((x.length / RUNS) * 100)}%)` : "—")).join(" / ")} | ${f(med(mus))} vs ${f(med(hus))}`);
}
console.log("\nEvents per 156-week game (careful style, median / max):");
console.log(Object.entries(evCount).map(([id, xs]) => `${id} ${med(xs)}/${Math.max(...xs)}`).join(", "));
