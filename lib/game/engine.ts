/**
 * Game rules. Pure functions that work on a cloned Player (structuredClone) and return results.
 * No React, no Date.now/Math.random: every roll is seeded (rng.ts) so runs replay and the balance bot is fair.
 */
import { candidatesFor } from "./artists";
import { ALLOWANCE, CHART_SIZE, DAYS_PER_WEEK, HUSTLE, SPIN_PAY, LEVELS, LIVING_COST, LOAN, MAX_WEEKS, PLACES, SESSIONS_PER_SONG, SHOW, STUDIO_LEASE, VIDEO, profileById } from "./data";
import { CALENDAR, DAYS_PER_TURN, NO_ROUTINE, ROUTINES, START_DAY } from "./kit.config";
import { festivalsIn, seasonsOn } from "../kit/calendar";
import { scaleGains } from "../kit/routines";
import { songTitle } from "./names";
import { NAIRA_PER_1K, buildChart, makeTrend, seedChart, songStreams, tickNpc } from "./music";
import { rng, type Rng } from "./rng";
import { pickEvent, rollEvent } from "./events";
import { artistById, calDay, chillOn, effectsNow, latestRelease, netWorth, releasedSongs, slots, songInProgress } from "./select";
import type { ActionResult, Artist, BossLook, Deltas, Obligation, PlaceId, Player, ProfileId, Tone, WeekRecap } from "./types";
import { aOrAn, applyDeltas, clamp, naira, streamsText } from "./util";

export const SAVE_VERSION = 2;
export const clone = <T,>(x: T): T => structuredClone(x);

// ───────── Create ─────────

export interface NewGameOpts {
  name: string;
  label: string;
  profile: ProfileId;
  seed: string;
  look?: BossLook;
  chill?: boolean;
}

export const DEFAULT_LOOK: BossLook = { skin: "#7d4f30", hair: 1, hue: 285, outfit: "basic" };


export function createPlayer(o: NewGameOpts): Player {
  const pr = profileById(o.profile);
  const trend = makeTrend(o.seed, 1);
  const p: Player = {
    v: SAVE_VERSION,
    id: o.seed,
    seed: o.seed,
    name: o.name.trim().slice(0, 20) || "Boss",
    label: o.label.trim().slice(0, 24) || "Bedroom Records",
    profile: o.profile,
    week: 1,
    cash: pr.cash,
    gold: 20,
    energy: 100,
    days: DAYS_PER_WEEK,
    hype: pr.hype,
    rep: pr.rep,
    ear: pr.ear,
    cred: pr.cred,
    heat: 0,
    level: 0,
    studio: pr.studio,
    leased: false,
    artists: [],
    songs: [],
    npc: seedChart(o.seed, trend.genre),
    candidates: [],
    obligations: [],
    trend,
    nextTrend: makeTrend(o.seed, trend.until + 1, trend.genre),
    used: {},
    earned: {},
    eventsSeen: {},
    flags: {},
    log: [],
    stats: { earnedTotal: 0, spentTotal: 0, charted: 0, top10: 0, no1: 0, released: 0, bestRank: 0, sapaWeeks: 0, shows: 0, sellouts: 0, videos: 0 },
    loan: 0,
    look: o.look ?? DEFAULT_LOOK,
    shows: [],
    chill: !!o.chill,
    calDay: START_DAY,
    uses: {},
    routines: [],
  };
  tickNpc(p, 1);
  p.candidates = candidatesFor(p, 1);
  log(p, "🎬", `${p.label} is born. ${pr.tagline}`, "neutral");
  return p;
}

export function log(p: Player, icon: string, text: string, tone: Tone = "neutral") {
  p.log.unshift({ week: p.week, icon, text, tone });
  if (p.log.length > 60) p.log.length = 60;
}

export { netWorth, artistById, songInProgress, releasedSongs, latestRelease, slots, chillOn, calDay, effectsNow };

// ───────── Actions ─────────

export interface ActionDef {
  id: string;
  place: PlaceId;
  icon: string;
  label: string;
  desc: string;
  energy: number; // cost (negative = gives energy)
  days?: number;
  cost?: number | ((p: Player) => number);
  max?: number; // per week
  check?: (p: Player) => string | null; // reason it can't be done
  run: (p: Player, r: Rng) => { text: string; tone?: Tone; deltas: Deltas; toast?: ActionResult["toast"] };
}

const used = (p: Player, id: string) => p.used[id] ?? 0;
/** Hustle limits grow a little with the label, so side jobs stay a safety net and music stays the main money. */
const hustleCap = (p: Player, base: number) => Math.round(base * (1 + p.level * 0.5));
/** Diminishing returns for doing the same paid thing again in one week. */
const dim = (p: Player, id: string, steps = [1, 0.7, 0.4, 0.2]) => steps[Math.min(used(p, id), steps.length - 1)];
/** Weekly earnings cap per source. */
const capEarn = (p: Player, src: string, amount: number, cap: number) => {
  const sofar = p.earned[src] ?? 0;
  // seasons change how much people pay (Detty December up, Long January down); the cap moves with them
  const demand = effectsNow(p).demand;
  const pay = Math.max(0, Math.min(amount * demand, cap * demand - sofar));
  p.earned[src] = sofar + pay;
  return Math.round(pay / 100) * 100;
};

function sessionArtist(p: Player): Artist | undefined {
  const cur = songInProgress(p);
  if (cur) return artistById(p, cur.artistId);
  return [...p.artists].filter((a) => !a.lastReleaseWeek || p.week - a.lastReleaseWeek >= RELEASE_GAP).sort((a, b) => (a.lastReleaseWeek || a.signedWeek) - (b.lastReleaseWeek || b.signedWeek))[0];
}

function record(p: Player, r: Rng, pro: boolean) {
  let s = p.songs.find((x) => x.stage === "recording");
  const a = sessionArtist(p)!;
  if (!s) {
    s = { id: `s${p.week}_${p.songs.length}`, title: songTitle(rng(p.seed, "title", p.songs.length)), artistId: a.id, artistName: a.name, genre: a.genre, quality: 0, sessions: 0, stage: "recording", promo: 0, weekly: 0, total: 0, peak: 0, rank: 0, viral: false, pulled: 0, farmed: 0 };
    p.songs.push(s);
  }
  // each session adds less as the song nears what this artist and your ear can reach
  const ceiling = 30 + a.talent * 0.45 + p.ear * 0.25 + p.studio * 3 + (pro ? 6 : 0);
  const gain = (pro ? 9 : 5) + p.ear * 0.07 + a.talent * 0.08 + p.studio * 1.5 + r.range(0, 3) - (a.mood < 30 ? 4 : 0);
  s.quality = clamp(Math.round(Math.min(ceiling, s.quality + gain)));
  s.sessions++;
  if (s.sessions >= SESSIONS_PER_SONG) s.stage = "mixing";
  const done = s.stage === "mixing";
  return {
    text: done ? `"${s.title}" by ${a.name} is recorded (quality ${s.quality}). Now mix & master it.` : `Session ${s.sessions}/${SESSIONS_PER_SONG} of "${s.title}" with ${a.name}. Quality ${s.quality}.`,
    tone: "good" as Tone,
    deltas: { ear: 1 },
  };
}

const needArtist = (p: Player) => (p.artists.length ? null : "Sign an artist first (Open-mic bar)");
/** Artists need a few weeks between singles (promo run, shows, rest). */
export const RELEASE_GAP = 3;
const readyArtist = (p: Player) => p.artists.find((a) => !a.lastReleaseWeek || p.week - a.lastReleaseWeek >= RELEASE_GAP);
const needRecording = (p: Player) => {
  const s = songInProgress(p);
  if (s && s.stage !== "recording") return s.stage === "mixing" ? `Mix & master "${s.title}" first` : `Release "${s.title}" first`;
  if (!s && p.artists.length && !readyArtist(p)) {
    const next = Math.min(...p.artists.map((a) => a.lastReleaseWeek + RELEASE_GAP));
    return `Your artists are promoting their singles. Next session from week ${next}`;
  }
  return needArtist(p);
};
const needMixing = (p: Player) => (songInProgress(p)?.stage === "mixing" ? null : "Record a song first (3 sessions)");
const needReleased = (p: Player) => (latestRelease(p) ? null : "Release a song first");

function promote(p: Player, amount: number) {
  const s = latestRelease(p)!;
  s.promo = Math.min(200, s.promo + amount);
  return s;
}

export const ACTIONS: ActionDef[] = [
  // Your base
  {
    id: "beat", place: "base", icon: "🎹", label: "Make beats", desc: "Sharpen your ear. Better ear = better songs and beat sales.", energy: 15, max: 3,
    run: (p) => ({ text: "You cooked up some beats. Your ear is getting sharper.", deltas: { ear: 3 * dim(p, "beat", [1, 0.6, 0.3]) } }),
  },
  {
    id: "record", place: "base", icon: "🎙️", label: "Record a session", desc: "Free. Laptop sessions are rough; a home studio sounds better.", energy: 20, days: 1,
    check: needRecording,
    run: (p, r) => record(p, r, false),
  },
  {
    id: "mix", place: "base", icon: "🎛️", label: "Mix & master yourself", desc: "Free. Quality depends on your 🎧 Ear.", energy: 20, days: 1,
    check: needMixing,
    run: (p) => {
      const s = songInProgress(p)!;
      s.quality = clamp(Math.round(s.quality + p.ear * 0.06 - 2));
      s.stage = "mastered";
      return { text: `"${s.title}" is mastered (quality ${s.quality}). Release it this Friday!`, tone: "good", deltas: { ear: 1 } };
    },
  },
  {
    id: "release", place: "base", icon: "🚀", label: "Release this Friday", desc: "Send the master to Tunely. Streams start when the week ends.", energy: 10,
    check: (p) => (songInProgress(p)?.stage === "mastered" ? null : "Master a song first"),
    run: (p) => {
      const s = songInProgress(p)!;
      s.stage = "released";
      s.releaseWeek = p.week;
      s.promo += 20;
      const a = artistById(p, s.artistId);
      if (a) {
        a.lastReleaseWeek = p.week;
        a.mood = clamp(a.mood + 10);
      }
      p.stats.released++;
      p.obligations = p.obligations.filter((o) => !(o.kind === "release" && o.ref === s.artistId));
      log(p, "🚀", `Released "${s.title}" by ${s.artistName}.`, "good");
      return { text: `"${s.title}" drops on Friday! Push it on radio to climb the chart.`, tone: "good", deltas: { hype: 3 }, toast: { icon: "🚀", title: "Single out Friday", text: s.title, tone: "good" } };
    },
  },
  {
    id: "rest", place: "base", icon: "😴", label: "Rest a day", desc: "Get energy back.", energy: -30, days: 1, max: 1,
    run: () => ({ text: "You slept like a baby. Back to work.", deltas: {} }),
  },
  // Surulere Sound
  {
    id: "pro_session", place: "studio", icon: "🎙️", label: "Book a pro session", desc: "Better sound than a laptop. Engineer included.", energy: 20, days: 1, cost: 25_000,
    check: needRecording,
    run: (p, r) => record(p, r, true),
  },
  {
    id: "pro_mix", place: "studio", icon: "🎚️", label: "Pro mix & master", desc: "Their engineer polishes it: +8 quality.", energy: 10, cost: 20_000,
    check: needMixing,
    run: (p) => {
      const s = songInProgress(p)!;
      s.quality = clamp(s.quality + 6);
      s.stage = "mastered";
      return { text: `"${s.title}" sounds expensive now (quality ${s.quality}). Release it!`, tone: "good", deltas: {} };
    },
  },
  {
    id: "lease", place: "studio", icon: "🔑", label: "Lease a studio room", desc: `₦150k deposit, then ₦100k rent every 4 weeks. Free sessions at your base sound pro.`, energy: 5, cost: STUDIO_LEASE.deposit,
    check: (p) => (p.studio >= 2 ? "You already have a studio" : null),
    run: (p) => {
      p.studio = 2;
      p.leased = true;
      addObligation(p, { kind: "rent", title: "Studio rent", amount: STUDIO_LEASE.rent, dueWeek: p.week + STUDIO_LEASE.every, place: "studio" });
      log(p, "🔑", "Leased a room at Surulere Sound.", "good");
      return { text: "You have a real studio now! Rent is due every 4 weeks here.", tone: "good", deltas: { rep: 2 }, toast: { icon: "🔑", title: "Studio leased", text: `Rent ${naira(STUDIO_LEASE.rent)} every 4 weeks`, tone: "good" } };
    },
  },
  // Yaba Hub
  {
    id: "sell_beat", place: "hub", icon: "💿", label: "Sell a beat", desc: "Upcoming artists pay for beats. Better ear, better price.", energy: 20, max: 3,
    run: (p) => {
      const pay = capEarn(p, "beats", (HUSTLE.beat + p.ear * HUSTLE.beatPerEar) * dim(p, "sell_beat"), hustleCap(p, HUSTLE.beatCap));
      return { text: pay ? `Sold a beat for ${naira(pay)}.` : "Nobody's buying more beats this week.", tone: pay ? "good" : "neutral", deltas: { cash: pay, ear: 0.5 } };
    },
  },
  {
    id: "mix_others", place: "hub", icon: "🎧", label: "Mix for other artists", desc: "Needs 🎧 30+ Ear. Pays well, takes a day.", energy: 30, days: 1, max: 2,
    check: (p) => (p.ear >= 30 ? null : "Needs 30 Ear (make beats)"),
    run: (p) => {
      const pay = capEarn(p, "mixing", (HUSTLE.mix + p.ear * HUSTLE.mixPerEar) * dim(p, "mix_others", [1, 0.6]), hustleCap(p, HUSTLE.mixCap));
      return { text: `Mixed a client's song: ${naira(pay)}.`, tone: "good", deltas: { cash: pay, ear: 1 } };
    },
  },
  {
    id: "plugins", place: "hub", icon: "🧠", label: "Learn new plugins", desc: "A paid masterclass. Big ear boost.", energy: 15, cost: 15_000, max: 1,
    run: () => ({ text: "New tricks unlocked. Your mixes will thank you.", deltas: { ear: 4 } }),
  },
  // Open-mic bar
  {
    id: "dj", place: "bar", icon: "🪩", label: "DJ the night", desc: "Pays more with 🧢 street cred.", energy: 30, max: 1,
    run: (p) => {
      const pay = capEarn(p, "dj", HUSTLE.dj + p.cred * HUSTLE.djPerCred, hustleCap(p, HUSTLE.djCap));
      return { text: `The crowd went wild. ${naira(pay)} in your pocket.`, tone: "good", deltas: { cash: pay, cred: 2, hype: 1 } };
    },
  },
  {
    id: "network", place: "bar", icon: "🤝🏾", label: "Network", desc: "Meet bloggers, promoters and other artists.", energy: 10, max: 2,
    run: (p) => ({ text: "You swapped numbers with a promoter and two bloggers.", deltas: { rep: 1 * dim(p, "network", [1, 0.5]), hype: 1 } }),
  },
  // Lagoon FM
  {
    id: "radio", place: "radio", icon: "📻", label: "Radio push", desc: "Plug your latest single on Lagoon FM. More streams.", energy: 15, cost: 30_000, max: 2,
    check: needReleased,
    run: (p) => {
      const s = promote(p, 30 * dim(p, "radio", [1, 0.5]));
      return { text: `"${s.title}" is on rotation this week.`, tone: "good", deltas: { hype: 2 } };
    },
  },
  {
    id: "interview", place: "radio", icon: "🗣️", label: "Morning-show interview", desc: "Free. Talk up your label.", energy: 15, max: 1,
    check: needReleased,
    run: () => ({ text: "The OAPs loved your story. Phones are buzzing.", deltas: { hype: 4, rep: 1 } }),
  },
  {
    id: "payola", place: "radio", icon: "💸", label: "Dash the OAP (payola)", desc: "Big spins, no questions… for now. Risky.", energy: 5, cost: 80_000, max: 1,
    check: needReleased,
    run: (p) => {
      const s = promote(p, 70);
      return { text: `"${s.title}" is suddenly on every hour. People are talking… some too much.`, tone: "neutral", deltas: { heat: 25, hype: 3 } };
    },
  },
  // Mama Put
  {
    id: "eat", place: "mamaput", icon: "🍛", label: "Eat rice and stew", desc: "Cheap energy.", energy: -20, cost: 3_000, max: 2,
    run: () => ({ text: "Belle full. Energy back.", deltas: {} }),
  },
  {
    id: "gist", place: "mamaput", icon: "👂🏾", label: "Hear the gist", desc: "Find out the next ClipTok trend before everyone.", energy: 5, cost: 1_000, max: 1,
    run: (p) => {
      p.flags.gist = p.week;
      return { text: `Mama's daughter says ${p.nextTrend.tag} (${p.nextTrend.genre}) is coming next. Plan your release!`, deltas: {} };
    },
  },
  // Bank
  {
    id: "loan", place: "bank", icon: "🏦", label: "Take a loan", desc: `${naira(LOAN.amount)} now, ${naira(LOAN.weekly)} every week for ${LOAN.weeks} weeks.`, energy: 5,
    check: (p) => (p.loan > 0 ? "Repay your current loan first" : null),
    run: (p) => {
      p.loan = LOAN.weekly * LOAN.weeks;
      addObligation(p, { kind: "loan", title: "Loan repayment", amount: LOAN.weekly, dueWeek: p.week + 1, place: "bank" });
      log(p, "🏦", `Took a ${naira(LOAN.amount)} loan.`, "neutral");
      return { text: `${naira(LOAN.amount)} credited. First repayment due next week at the bank.`, deltas: { cash: LOAN.amount } };
    },
  },
  // Creator house (Studio level)
  {
    id: "shoot_video", place: "creator", icon: "🎬", label: "Shoot a music video", desc: `${naira(VIDEO.cost)}. +20% streams for your latest single, and a hype bump.`, energy: 25, days: 2, cost: VIDEO.cost, max: 1,
    check: (p) => {
      const s = latestRelease(p);
      if (!s) return "Release a song first";
      return s.video ? `"${s.title}" already has a video` : null;
    },
    run: (p) => {
      const s = latestRelease(p)!;
      s.video = true;
      s.promo = Math.min(200, s.promo + 20);
      p.stats.videos++;
      log(p, "🎬", `Shot the video for "${s.title}".`, "good");
      return { text: `The "${s.title}" video is out. Dancers, a G-Wagon and a lot of smoke.`, tone: "good", deltas: { hype: 4 }, toast: { icon: "🎬", title: "Video out", text: s.title, tone: "good" } };
    },
  },
  // The Sanctuary (Indie level)
  {
    id: "book_show", place: "sanctuary", icon: "🎟️", label: "Book a show", desc: `${naira(SHOW.deposit)} deposit now, ${naira(SHOW.balance)} balance due by show week. Your most popular artist headlines.`, energy: 15, cost: SHOW.deposit,
    check: (p) => {
      const a = headliner(p);
      if (!a) return `Needs an artist with ⭐ ${SHOW.minStar}+ fans`;
      const last = p.shows.length ? Math.max(...p.shows.map((x) => x.week)) : p.flags.lastShow ?? -99;
      if (p.shows.length) return "You already have a show booked";
      if (p.week + SHOW.weeksAhead - last < SHOW.gap) return `Fans need a break: next show from week ${last + SHOW.gap - SHOW.weeksAhead}`;
      return null;
    },
    run: (p) => {
      const a = headliner(p)!;
      const week = p.week + SHOW.weeksAhead;
      p.shows.push({ id: `show${p.week}`, artistId: a.id, artistName: a.name, week, venue: "sanctuary" });
      addObligation(p, { kind: "show", title: `Show balance: ${a.name} at The Sanctuary`, amount: SHOW.balance, dueWeek: week, place: "sanctuary", ref: a.id });
      log(p, "🎟️", `Booked ${a.name} at The Sanctuary for week ${week}.`, "good");
      return { text: `${a.name} headlines The Sanctuary in week ${week}. Pay the ${naira(SHOW.balance)} balance here before then.`, tone: "good", deltas: { hype: 3 }, toast: { icon: "🎟️", title: "Show booked", text: `Week ${week}`, tone: "good" } };
    },
  },
  {
    id: "cliptok", place: "creator", icon: "📱", label: "ClipTok challenge", desc: "Influencers dance to your latest single. Huge if it fits the trend.", energy: 20, cost: 60_000, max: 1,
    check: needReleased,
    run: (p) => {
      const last = latestRelease(p)!;
      const fit = last.genre === p.trend.genre;
      const s = promote(p, fit ? 70 : 40);
      return { text: fit ? `"${s.title}" fits ${p.trend.tag}! The challenge is everywhere.` : `"${s.title}" got some dances, but it's not the trend.`, tone: fit ? "good" : "neutral", deltas: { hype: fit ? 6 : 3 } };
    },
  },
];

/** Your most popular artist who can sell tickets. */
export function headliner(p: Player) {
  return [...p.artists].filter((a) => a.star >= SHOW.minStar).sort((a, b) => b.star - a.star)[0];
}

export const actionById = (id: string) => ACTIONS.find((a) => a.id === id);
export const canRoutine = (id: string) => !NO_ROUTINE.includes(id);
export const actionCost = (p: Player, a: ActionDef) => (typeof a.cost === "function" ? a.cost(p) : a.cost ?? 0);

/** Why an action can't be done right now, or null if it can. */
export function actionLock(p: Player, a: ActionDef): string | null {
  const place = PLACES.find((x) => x.id === a.place)!;
  if (p.level < place.minLevel) return "Locked";
  if (a.max && used(p, a.id) >= a.max) return "Done for this week";
  const why = a.check?.(p);
  if (why) return why;
  if (a.energy > 0 && p.energy < a.energy) return "Not enough energy: end the week";
  if (a.days && p.days < a.days) return "No days left this week";
  const cost = actionCost(p, a);
  if (cost > 0 && p.cash < cost) return `Need ${naira(cost)}`;
  return null;
}

export function doAction(p: Player, id: string, scale = 1): ActionResult {
  const a = actionById(id);
  if (!a) return { ok: false, text: "Unknown action", tone: "bad", deltas: {} };
  const why = actionLock(p, a);
  if (why) return { ok: false, text: why, tone: "bad", deltas: {} };
  const r = rng(p.seed, "act", p.week, id, used(p, id));
  const out = a.run(p, r);
  if (scale !== 1) out.deltas = scaleGains(out.deltas, scale);
  p.used[id] = used(p, id) + 1;
  p.uses = { ...(p.uses ?? {}), [id]: (p.uses?.[id] ?? 0) + 1 };
  const costs: Deltas = { energy: -a.energy, cash: -actionCost(p, a) };
  if (a.days) costs.days = -a.days;
  const applied = applyDeltas(p, mergeDeltas(costs, out.deltas));
  return { ok: true, text: out.text, tone: out.tone ?? "good", deltas: applied, icon: a.icon, toast: out.toast };
}

export function mergeDeltas(a: Deltas, b: Deltas): Deltas {
  const out: Deltas = { ...a };
  for (const [k, v] of Object.entries(b) as [keyof Deltas, number][]) out[k] = (out[k] ?? 0) + v;
  return out;
}

// ───────── Artists ─────────

export function signLock(p: Player, a: Artist): string | null {
  if (p.artists.length >= slots(p)) return `Your ${LEVELS[p.level].name} label has ${slots(p)} slot${slots(p) > 1 ? "s" : ""}. Grow to sign more.`;
  if (p.energy < 10) return "Not enough energy";
  if (p.cash < Math.ceil(a.advance / 2)) return `Need ${naira(Math.ceil(a.advance / 2))} (half the advance)`;
  return null;
}

export function signArtist(p: Player, id: string): ActionResult {
  const c = p.candidates.find((x) => x.id === id);
  if (!c) return { ok: false, text: "That act has left.", tone: "bad", deltas: {} };
  const why = signLock(p, c);
  if (why) return { ok: false, text: why, tone: "bad", deltas: {} };
  const first = Math.ceil(c.advance / 2);
  const a: Artist = { ...c, signedWeek: p.week, lastReleaseWeek: 0 };
  p.artists.push(a);
  p.candidates = p.candidates.filter((x) => x.id !== id);
  addObligation(p, { kind: "advance", title: `Advance balance: ${a.name}`, amount: c.advance - first, dueWeek: p.week + 3, place: "law", ref: a.id });
  addObligation(p, { kind: "release", title: `Release a single with ${a.name}`, amount: 0, dueWeek: p.week + 8, place: "base", ref: a.id });
  log(p, "✍🏾", `Signed ${a.name} (${naira(c.advance)} advance).`, "good");
  const d = applyDeltas(p, { cash: -first, energy: -10, hype: 2 });
  return { ok: true, text: `${a.name} signed! Half the advance paid now; the rest is due at the Law office by week ${p.week + 3}. Release a single with them by week ${p.week + 8}.`, tone: "good", deltas: d, icon: "✍🏾", toast: { icon: "✍🏾", title: `${a.name} signed`, text: "Now record their first single", tone: "good" } };
}

/** Let an artist go: their unpaid advance is forgiven, unreleased songs are shelved. */
export function dropArtist(p: Player, id: string): ActionResult {
  const a = artistById(p, id);
  if (!a) return { ok: false, text: "Not on your roster", tone: "bad", deltas: {} };
  p.artists = p.artists.filter((x) => x.id !== id);
  p.obligations = p.obligations.filter((o) => o.ref !== id);
  p.songs = p.songs.filter((s) => s.artistId !== id || s.stage === "released");
  p.shows = p.shows.filter((s) => s.artistId !== id);
  log(p, "👋🏾", `Released ${a.name} from their contract.`, "neutral");
  const d = applyDeltas(p, chillOn(p) ? {} : { rep: -2 });
  return { ok: true, text: `${a.name} is no longer on ${p.label}. The slot is free.`, tone: "neutral", deltas: d, icon: "👋🏾" };
}

// ───────── Obligations ─────────

export function addObligation(p: Player, o: Omit<Obligation, "id" | "overdue">) {
  p.obligations.push({ ...o, id: `o${p.week}_${o.kind}_${p.obligations.length}_${o.ref ?? ""}`, overdue: 0 });
}

export function payLock(p: Player, o: Obligation): string | null {
  if (o.amount <= 0) return "Not a payment";
  if (p.cash < o.amount) return `Need ${naira(o.amount)}`;
  return null;
}

export function payObligation(p: Player, id: string): ActionResult {
  const o = p.obligations.find((x) => x.id === id);
  if (!o) return { ok: false, text: "Already settled", tone: "neutral", deltas: {} };
  const why = payLock(p, o);
  if (why) return { ok: false, text: why, tone: "bad", deltas: {} };
  p.obligations = p.obligations.filter((x) => x.id !== id);
  let extra: Deltas = {};
  let text = `${o.title}: paid ${naira(o.amount)}.`;
  if (o.kind === "rent") addObligation(p, { kind: "rent", title: "Studio rent", amount: STUDIO_LEASE.rent, dueWeek: Math.max(o.dueWeek, p.week) + STUDIO_LEASE.every, place: "studio" });
  if (o.kind === "loan") {
    p.loan = Math.max(0, p.loan - o.amount);
    if (p.loan > 0) addObligation(p, { kind: "loan", title: "Loan repayment", amount: Math.min(LOAN.weekly, p.loan), dueWeek: Math.max(o.dueWeek, p.week) + 1, place: "bank" });
    else text += " Loan cleared! 🎉";
  }
  if (o.kind === "advance") {
    const a = o.ref ? artistById(p, o.ref) : undefined;
    if (a) {
      a.loyalty = clamp(a.loyalty + 8);
      a.mood = clamp(a.mood + 5);
    }
    extra = { rep: 1 };
  }
  log(p, "🧾", text, "good");
  const d = applyDeltas(p, mergeDeltas({ cash: -o.amount }, extra));
  return { ok: true, text, tone: "good", deltas: d, icon: "🧾", toast: { icon: "🧾", title: "Paid", text: o.title, tone: "good" } };
}

export const dueText = (p: Player, o: Obligation) => (o.overdue > 0 || o.dueWeek < p.week ? "Overdue" : o.dueWeek === p.week ? "This week" : o.dueWeek === p.week + 1 ? "Next week" : `By week ${o.dueWeek}`);

// ───────── Events ─────────

export function resolveEvent(p: Player, choice: number): ActionResult {
  const ev = p.pendingEvent ? pickEvent(p.pendingEvent) : undefined;
  if (!ev) {
    p.pendingEvent = undefined;
    return { ok: false, text: "", tone: "neutral", deltas: {} };
  }
  const c = ev.choices[choice];
  if (!c || (c.can && !c.can(p))) return { ok: false, text: "You can't do that", tone: "bad", deltas: {} };
  const r = rng(p.seed, "evr", ev.id, p.week);
  const out = c.run(p, r);
  p.pendingEvent = undefined;
  const d = applyDeltas(p, out.deltas);
  log(p, ev.icon, `${ev.title}: ${out.text}`, out.tone ?? "neutral");
  return { ok: true, text: out.text, tone: out.tone ?? "neutral", deltas: d, icon: ev.icon };
}

/** What the end of this week will cost before any income: food, transport, data and studio diesel. */
export function weeklyCost(p: Player) {
  return Math.round((LIVING_COST * effectsNow(p).prices) / 100) * 100 + (p.studio >= 2 ? 10_000 : 0);
}

// ───────── Level ─────────

export interface LevelReq {
  label: string;
  done: boolean;
  progress: number;
}

export function levelReqs(p: Player, lvl = p.level + 1): LevelReq[] {
  const L = LEVELS[lvl];
  if (!L) return [];
  const nw = netWorth(p);
  const reqs: LevelReq[] = [];
  if (L.needArtists) reqs.push({ label: `${L.needArtists} artist${L.needArtists > 1 ? "s" : ""} signed`, done: p.artists.length >= L.needArtists, progress: Math.min(1, p.artists.length / L.needArtists) });
  if (L.needRank) reqs.push({ label: L.needRank === 1 ? "A No. 1 song" : `A Top ${L.needRank} song`, done: p.stats.bestRank > 0 && p.stats.bestRank <= L.needRank, progress: p.stats.bestRank ? Math.min(1, L.needRank / p.stats.bestRank) : 0 });
  if (L.needNo1s > 1) reqs.push({ label: `${L.needNo1s} No. 1 songs`, done: p.stats.no1 >= L.needNo1s, progress: Math.min(1, p.stats.no1 / L.needNo1s) });
  reqs.push({ label: `${naira(L.netWorth)} net worth`, done: nw >= L.netWorth, progress: clamp(nw / L.netWorth, 0, 1) });
  return reqs;
}

// ───────── End week ─────────

export interface EndWeekOpts {
  events: boolean;
}

export function endWeek(p: Player, opts: EndWeekOpts): WeekRecap {
  const lines: WeekRecap["lines"] = [];
  const week = p.week;
  const chill = chillOn(p);
  const fx = effectsNow(p);
  let income = 0;
  let expenses = 0;
  const earn = (n: number) => {
    income += n;
    p.cash += n;
    p.stats.earnedTotal += n;
  };
  const spend = (n: number) => {
    expenses += n;
    p.cash -= n;
    p.stats.spentTotal += n;
  };

  // 0. Routines run first, with what's left of the week (90% of the reward, never below the energy floor)
  for (const id of p.routines ?? []) {
    const a = actionById(id);
    if (!a || !canRoutine(id) || actionLock(p, a)) continue;
    if (p.energy - a.energy < ROUTINES.energyFloor) continue;
    const r = doAction(p, id, ROUTINES.rewardScale);
    if (r.ok) lines.push({ icon: "🔁", text: `Routine: ${a.label}. ${r.text}`, tone: "neutral" });
  }

  // 1. Allowance
  if (p.profile === "richkid" && week <= ALLOWANCE.weeks) {
    earn(ALLOWANCE.amount);
    lines.push({ icon: "👨🏾‍💼", text: week === ALLOWANCE.weeks ? `Last ${naira(ALLOWANCE.amount)} from Daddy. You're on your own now!` : `${naira(ALLOWANCE.amount)} allowance from Daddy`, tone: "good" });
  }

  // 2. Streams
  let streamPay = 0;
  for (const s of p.songs) {
    if (s.stage !== "released") continue;
    const a = artistById(p, s.artistId);
    const { streams, viral } = songStreams(p, s, a, week);
    s.weekly = streams;
    s.total += streams;
    if (viral) {
      s.viral = true;
      lines.push({ icon: "🌋", text: `"${s.title}" went VIRAL on ClipTok!`, tone: "good" });
      applyDeltas(p, { hype: 8 });
    }
    const royalty = a ? a.royalty : 0.4;
    const pay = Math.round(((streams / 1000) * NAIRA_PER_1K * (1 - royalty)) / 100) * 100;
    if (pay > 0) {
      earn(pay);
      streamPay += pay;
    }
  }
  if (streamPay > 0) lines.push({ icon: "🎧", text: `Streaming income: ${naira(streamPay)}`, tone: "good" });

  // 3. Chart
  tickNpc(p, week);
  const chart = buildChart(p);
  const ranks = new Map(chart.map((r, i) => [r.id, i + 1]));
  for (const n of p.npc) n.rank = ranks.get(n.id) ?? 0;
  const starGain = new Map<string, number>();
  for (const s of p.songs) {
    if (s.stage !== "released") continue;
    const rank = ranks.get(s.id) ?? 0;
    const prevPeak = s.peak;
    s.rank = rank;
    if (rank && (!s.peak || rank < s.peak)) s.peak = rank;
    if (rank && (!p.stats.bestRank || rank < p.stats.bestRank)) p.stats.bestRank = rank;
    if (rank) {
      const a = artistById(p, s.artistId);
      if (!prevPeak) {
        p.stats.charted++;
        lines.push({ icon: "📈", text: `"${s.title}" entered the Top 50 at No. ${rank}!`, tone: "good" });
        applyDeltas(p, { hype: 3, rep: 1 });
      }
      if (rank <= 10 && (!prevPeak || prevPeak > 10)) {
        p.stats.top10++;
        lines.push({ icon: "🔟", text: `"${s.title}" is Top 10!`, tone: "good" });
        applyDeltas(p, { hype: 5, rep: 3 });
        if (a) a.star = clamp(a.star + 4);
      }
      if (rank === 1 && prevPeak !== 1) {
        p.stats.no1++;
        lines.push({ icon: "👑", text: `"${s.title}" is No. 1 in Nigeria!`, tone: "good" });
        applyDeltas(p, { hype: 10, rep: 8, gold: 25 });
        if (a) a.star = clamp(a.star + 6);
      }
      if (a) {
        starGain.set(a.id, Math.max(starGain.get(a.id) ?? 0, rank <= 10 ? 1.2 : rank <= 25 ? 0.7 : 0.3));
        a.mood = clamp(a.mood + 1);
      }
    }
    // streaming-farm detection
    if (s.farmed > 0) {
      const r = rng(p.seed, "farm", s.id, week);
      if (r.chance(0.45)) {
        s.pulled = 8;
        s.rank = 0;
        lines.push({ icon: "🚨", text: `Tunely caught fake streams on "${s.title}". Pulled from the chart for 8 weeks!`, tone: "bad" });
        applyDeltas(p, { rep: -15, hype: -10, heat: 20 });
        log(p, "🚨", `"${s.title}" pulled for fake streams.`, "bad");
      }
      s.farmed = 0;
    } else if (s.pulled > 0) s.pulled--;
    s.promo = Math.round(s.promo * 0.6);
  }

  // radio spins: every charting song earns airplay money, more the higher it sits
  let spins = 0;
  for (const s of p.songs) if (s.stage === "released" && s.rank > 0) spins += (CHART_SIZE + 1 - s.rank) * SPIN_PAY;
  if (spins > 0) {
    earn(spins);
    lines.push({ icon: "📻", text: `Radio spins for your charting songs: ${naira(spins)}`, tone: "good" });
  }

  // fans: a little growth from the best-charting song each week, a slow fade otherwise
  for (const a of p.artists) a.star = clamp(Math.round((a.star * 0.985 + (starGain.get(a.id) ?? 0)) * 10) / 10);

  // 4. Shows this week
  for (const sh of [...p.shows]) {
    if (sh.week !== week) continue;
    p.shows = p.shows.filter((x) => x.id !== sh.id);
    p.flags.lastShow = week;
    const owed = p.obligations.find((o) => o.kind === "show" && o.ref === sh.artistId);
    const a = artistById(p, sh.artistId);
    if (owed || !a) {
      p.obligations = p.obligations.filter((o) => o !== owed);
      lines.push({ icon: "🚫", text: `The Sanctuary cancelled ${sh.artistName}'s show: the balance wasn't paid. Deposit lost.`, tone: "bad" });
      applyDeltas(p, { rep: chill ? -2 : -8, hype: -4 });
      if (a) a.mood = clamp(a.mood - 12);
      log(p, "🚫", `Show cancelled (unpaid balance).`, "bad");
      continue;
    }
    const fill = Math.min(1, 0.08 + a.star * 0.006 + p.hype * 0.003 + (p.stats.top10 ? 0.05 : 0));
    const tickets = Math.round(SHOW.capacity * fill);
    const take = Math.round((tickets * SHOW.ticket * SHOW.share * fx.demand) / 1000) * 1000;
    earn(take);
    p.stats.shows++;
    a.star = clamp(a.star + 2);
    a.mood = clamp(a.mood + 15);
    if (fill >= 0.98) {
      p.stats.sellouts++;
      applyDeltas(p, { rep: 5, hype: 6 });
      lines.push({ icon: "🏟️", text: `SOLD OUT! ${a.name} filled The Sanctuary. Your share: ${naira(take)}`, tone: "good" });
    } else {
      applyDeltas(p, { rep: 2, hype: 3 });
      lines.push({ icon: "🎤", text: `${a.name} played The Sanctuary to ${tickets.toLocaleString("en-NG")} fans. Your share: ${naira(take)}`, tone: "good" });
    }
    log(p, "🎤", `${a.name} at The Sanctuary: ${tickets} fans.`, "good");
  }

  // 5. Bills (season prices: Detty December costs more)
  const living = Math.round((LIVING_COST * fx.prices) / 100) * 100;
  spend(living);
  lines.push({ icon: "🍞", text: `Food, transport and data: ${naira(living)}`, tone: "neutral" });
  if (p.studio >= 2) {
    spend(10_000);
    lines.push({ icon: "⛽", text: "Diesel for the studio gen: ₦10,000", tone: "neutral" });
  }

  // 6. Obligations due this week (or earlier) and not done. Chill mode keeps reminders but drops the penalties.
  for (const o of [...p.obligations]) {
    if (o.dueWeek > week || o.kind === "show") continue;
    o.overdue++;
    const a = o.ref ? artistById(p, o.ref) : undefined;
    if (o.kind === "advance" && a) {
      if (chill) {
        lines.push({ icon: "🧾", text: `Reminder: ${a.name}'s advance balance is still unpaid (Law office).`, tone: "neutral" });
        continue;
      }
      a.loyalty = clamp(a.loyalty - 15);
      a.mood = clamp(a.mood - 10);
      lines.push({ icon: "😠", text: `${a.name} is angry: advance balance unpaid.`, tone: "bad" });
      if (o.overdue >= 2) removeArtist(p, a, "walked out over the unpaid advance", lines);
    } else if (o.kind === "release" && a) {
      p.obligations = p.obligations.filter((x) => x.id !== o.id);
      addObligation(p, { kind: "release", title: `Release a single with ${a.name}`, amount: 0, dueWeek: week + 4, place: "base", ref: a.id });
      if (chill) {
        lines.push({ icon: "📅", text: `${a.name} is still waiting for a single. New target: week ${week + 4}.`, tone: "neutral" });
        continue;
      }
      a.mood = clamp(a.mood - 20);
      a.loyalty = clamp(a.loyalty - 15);
      applyDeltas(p, { hype: -3 });
      lines.push({ icon: "📅", text: `Missed ${a.name}'s release date. They feel neglected.`, tone: "bad" });
    } else if (o.kind === "rent") {
      if (chill) {
        lines.push({ icon: "🏚️", text: "Reminder: studio rent is due at Surulere Sound.", tone: "neutral" });
        continue;
      }
      if (o.overdue === 1) {
        o.amount = Math.round(o.amount * 1.1);
        lines.push({ icon: "🏚️", text: "Studio rent is late: 10% late fee added.", tone: "bad" });
      } else {
        p.obligations = p.obligations.filter((x) => x.id !== o.id);
        p.leased = false;
        p.studio = profileById(p.profile).studio;
        lines.push({ icon: "🔒", text: "Locked out of your leased studio for unpaid rent.", tone: "bad" });
        applyDeltas(p, { rep: -4 });
      }
    } else if (o.kind === "loan") {
      if (chill) {
        lines.push({ icon: "🏦", text: "Reminder: your loan repayment is due at the bank.", tone: "neutral" });
        continue;
      }
      o.amount = Math.round(o.amount * 1.05);
      p.loan = Math.round(p.loan * 1.03);
      applyDeltas(p, { rep: -2 });
      lines.push({ icon: "📞", text: "Loan payment missed: interest added and the bank keeps calling.", tone: "bad" });
    }
  }

  // 7. Artists (season mood; in Chill mode nobody walks out)
  for (const a of [...p.artists]) {
    const since = week - (a.lastReleaseWeek || a.signedWeek);
    if (since > 8) a.mood = clamp(a.mood - (chill ? 2 : 4));
    a.mood = clamp(a.mood + (60 - a.mood) * 0.08 + fx.mood);
    if (!chill && a.mood < 15 && a.loyalty < 35) removeArtist(p, a, "left for a rival label", lines);
  }

  // 8. Hype, heat, exposé
  p.hype = clamp(Math.round(p.hype * 0.9 * 10) / 10);
  if (p.heat >= 50 && rng(p.seed, "expose", week).chance(p.heat / 220)) {
    lines.push({ icon: "📰", text: "A blog exposed your payola deals. Ouch.", tone: "bad" });
    applyDeltas(p, { rep: chill ? -4 : -10, hype: -5 });
    p.heat = clamp(p.heat - 35);
    log(p, "📰", "Payola exposé.", "bad");
  }
  p.heat = clamp(p.heat - 3);

  // 9. Trend
  if (week >= p.trend.until) {
    p.trend = p.nextTrend;
    p.nextTrend = makeTrend(p.seed, p.trend.until + 1, p.trend.genre);
    lines.push({ icon: "📱", text: `New ClipTok trend: ${p.trend.tag} (${p.trend.genre})`, tone: "neutral" });
  }

  // 10. Next week: calendar moves on, new seasons and festivals greet you
  const before = calDay(p);
  p.week = week + 1;
  p.calDay = before + DAYS_PER_TURN;
  const was = new Set(seasonsOn(CALENDAR, before).map((x) => x.id));
  for (const s of seasonsOn(CALENDAR, p.calDay)) if (!was.has(s.id)) lines.push({ icon: s.emoji, text: `${s.name}: ${s.blurb}`, tone: "neutral" });
  for (const h of festivalsIn(CALENDAR, p.calDay, p.calDay + DAYS_PER_TURN)) lines.push({ icon: h.f.emoji, text: h.f.greeting, tone: "good" });
  p.energy = 100;
  p.days = DAYS_PER_WEEK;
  p.used = {};
  p.earned = {};
  p.candidates = candidatesFor(p, p.week);

  // 11. Level up
  const reqs = levelReqs(p);
  if (reqs.length && reqs.every((r) => r.done)) {
    p.level++;
    const L = LEVELS[p.level];
    lines.unshift({ icon: L.icon, text: `LEVEL UP! You are now ${aOrAn(L.name)} ${L.name} label. ${L.slots} artist slots.`, tone: "good" });
    log(p, L.icon, `Became ${aOrAn(L.name)} ${L.name} label.`, "good");
    applyDeltas(p, { gold: 20 * p.level, rep: 3 });
  }

  // a heads-up when next week's costs will be tight
  const next = weeklyCost(p);
  if (p.cash >= 0 && p.cash < next * 2) lines.push({ icon: "⚠️", text: `Heads up: next week's food, transport and data cost about ${naira(next)}. You have ${naira(p.cash)}.`, tone: "bad" });

  // 12. Sapa / endings (Chill mode: no folding, just a warning)
  if (p.cash < 0) {
    p.stats.sapaWeeks++;
    lines.push({
      icon: "🫙",
      text: chill ? "You're broke. Sell beats at Yaba Hub or DJ at the bar to get back on your feet." : `You're broke (${naira(p.cash)}). Earn at Yaba Hub or the bar. ${4 - p.stats.sapaWeeks} week(s) before the label folds!`,
      tone: "bad",
    });
  } else p.stats.sapaWeeks = 0;
  if (!chill && p.stats.sapaWeeks >= 4) end(p, "fold");
  else if (p.level >= LEVELS.length - 1) end(p, "win");
  else if (p.week > MAX_WEEKS) end(p, "time");

  // 13. Event (held while the tutorial runs)
  if (opts.events && !p.ended && !p.pendingEvent) {
    const ev = rollEvent(p);
    if (ev) {
      p.pendingEvent = ev;
      p.eventsSeen[ev] = p.week;
      p.flags[`ev:${ev}`] = (p.flags[`ev:${ev}`] ?? 0) + 1;
    }
  }

  const recap: WeekRecap = { week, lines, income, expenses };
  p.recap = recap;
  return recap;
}

function removeArtist(p: Player, a: Artist, why: string, lines: WeekRecap["lines"]) {
  p.artists = p.artists.filter((x) => x.id !== a.id);
  p.obligations = p.obligations.filter((o) => o.ref !== a.id);
  p.songs = p.songs.filter((s) => s.artistId !== a.id || s.stage === "released");
  lines.push({ icon: "🚪", text: `${a.name} ${why}.`, tone: "bad" });
  applyDeltas(p, { rep: -5, hype: -3 });
  log(p, "🚪", `${a.name} ${why}.`, "bad");
}


export function score(p: Player) {
  return Math.max(0, Math.round(netWorth(p) / 10_000 + p.stats.no1 * 800 + p.stats.top10 * 200 + p.stats.charted * 50 + p.level * 1500 + p.rep * 10));
}

function end(p: Player, kind: "win" | "fold" | "time") {
  const s = score(p) + (kind === "win" ? Math.max(0, MAX_WEEKS - p.week) * 50 : 0);
  const t = {
    win: ["👑 Continental King!", `In ${p.week - 1} weeks you turned ${p.label} into a continental powerhouse.`],
    fold: ["🫙 The label folded", "Sapa won this round. Every big label has a comeback story; start yours."],
    time: [`⏳ Three years of ${p.label}`, `You built ${aOrAn(LEVELS[p.level].name)} ${LEVELS[p.level].name} label with ${p.stats.no1} No. 1s and ${p.stats.top10} Top 10s.`],
  }[kind];
  p.ended = { kind, week: p.week, score: s, title: t[0], text: t[1] };
}

export { streamsText };
