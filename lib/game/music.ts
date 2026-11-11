import { CHART_SIZE, GENRE_IDS, TREND_TAGS } from "./data";
import { RIVAL_LABELS, artistName, songTitle } from "./names";
import { rng } from "./rng";
import type { Artist, Genre, NpcSong, Player, Song, Trend } from "./types";

/** Hard cap on any one song's weekly streams, so no combination can run away. */
export const STREAM_CAP = 2_500_000;
/** Label's naira per 1,000 streams before the artist's royalty. */
export const NAIRA_PER_1K = 1_000;

export function makeTrend(seed: string, from: number, prev?: Genre): Trend {
  const r = rng(seed, "trend", from);
  let genre = r.pick(GENRE_IDS);
  if (genre === prev) genre = GENRE_IDS[(GENRE_IDS.indexOf(genre) + 1) % GENRE_IDS.length];
  return { genre, tag: r.pick(TREND_TAGS), until: from + r.int(3, 5) - 1 };
}

export function makeNpc(seed: string, week: number, i: number, trend: Genre): NpcSong {
  const r = rng(seed, "npc", week, i);
  // log-uniform peak between 15k and 1.1M; a few monsters
  let base = Math.exp(r.range(Math.log(15_000), Math.log(1_100_000)));
  const genre = r.chance(0.35) ? trend : r.pick(GENRE_IDS);
  if (genre === trend) base *= 1.25;
  return { id: `n${week}_${i}`, title: songTitle(r), artist: artistName(r), label: r.pick(RIVAL_LABELS), genre, base: Math.round(base), born: week, weekly: 0, rank: 0 };
}

/** Starting chart: 46 songs of mixed ages. */
export function seedChart(seed: string, trend: Genre): NpcSong[] {
  const out: NpcSong[] = [];
  for (let i = 0; i < 46; i++) {
    const s = makeNpc(seed, 0, i, trend);
    s.born = -rng(seed, "age", i).int(0, 10);
    out.push(s);
  }
  return out;
}

const npcStreams = (s: NpcSong, week: number, seed: string) => {
  const age = week - s.born;
  const rise = age <= 1 ? 0.75 : 1; // songs climb in their first week
  const decay = Math.pow(0.86, Math.max(0, age - 1));
  const noise = rng(seed, "nn", s.id, week).range(0.85, 1.15);
  return Math.round(s.base * rise * decay * noise);
};

/** Fit of a song's genre to the hot trend. */
export const trendFit = (g: Genre, t: Trend) => (g === t.genre ? 1.35 : 1);

/**
 * Weekly streams for one of the player's released songs (pure, seeded).
 * Multipliers are kept gentle so they can't stack into a runaway: quality matters most,
 * star power, hype, promo and the trend each add a bounded push.
 */
export function songStreams(p: Player, s: Song, a: Artist | undefined, week: number): { streams: number; viral: boolean } {
  if (s.stage !== "released" || s.releaseWeek === undefined) return { streams: 0, viral: false };
  const age = week - s.releaseWeek;
  const q = s.quality;
  const base = 600 + q * q * 16; // q50 ≈ 40k, q75 ≈ 91k, q90 ≈ 130k
  const star = 0.4 + (a ? a.star : 15) / 100; // 0.4 – 1.4
  const hype = 1 + p.hype / 250; // up to 1.4
  const promo = 1 + Math.sqrt(Math.max(0, s.promo)) / 20; // promo 200 → 1.7
  const video = s.video ? 1.2 : 1;
  const rise = age === 0 ? 0.8 : 1;
  const decay = Math.pow(0.84, Math.max(0, age - 1));
  const r = rng(p.seed, "ss", s.id, week);
  const noise = r.range(0.85, 1.15);
  let streams = base * star * hype * trendFit(s.genre, p.trend) * promo * video * rise * decay * noise;
  let viral = false;
  // one viral moment per song, more likely on-trend with good quality and promo
  if (!s.viral && age <= 5 && q >= 55) {
    const pv = 0.01 + (s.genre === p.trend.genre ? 0.025 : 0) + s.promo / 8000 + p.hype / 5000;
    if (r.chance(pv)) {
      viral = true;
      streams *= 2.6;
    }
  }
  return { streams: Math.min(STREAM_CAP, Math.round(streams)), viral };
}

export interface ChartRow {
  id: string;
  title: string;
  artist: string;
  label: string;
  genre: Genre;
  weekly: number;
  mine: boolean;
}

/** Combine NPC songs and the player's released songs into the Top 50. */
export function buildChart(p: Player): ChartRow[] {
  const rows: ChartRow[] = p.npc.map((s) => ({ id: s.id, title: s.title, artist: s.artist, label: s.label, genre: s.genre, weekly: s.weekly, mine: false }));
  for (const s of p.songs) {
    if (s.stage !== "released" || s.pulled > 0 || s.weekly <= 0) continue;
    rows.push({ id: s.id, title: s.title, artist: s.artistName, label: p.label, genre: s.genre, weekly: s.weekly + s.farmed, mine: true });
  }
  rows.sort((a, b) => b.weekly - a.weekly);
  return rows.slice(0, CHART_SIZE);
}

/** Advance the NPC chart to `week` (age, drop, add new songs). */
export function tickNpc(p: Player, week: number) {
  for (const s of p.npc) s.weekly = npcStreams(s, week, p.seed);
  // drop songs that have faded
  p.npc = p.npc.filter((s) => s.weekly > 6_000 && week - s.born < 26);
  const r = rng(p.seed, "new", week);
  const target = 46;
  let i = 0;
  while (p.npc.length < target && i < 10) {
    const s = makeNpc(p.seed, week, i++, p.trend.genre);
    s.weekly = npcStreams(s, week, p.seed);
    p.npc.push(s);
  }
  // occasional extra drop from a rival
  if (r.chance(0.5)) {
    const s = makeNpc(p.seed, week, 20, p.trend.genre);
    s.weekly = npcStreams(s, week, p.seed);
    p.npc.push(s);
  }
}
