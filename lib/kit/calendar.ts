/**
 * Naija life-sim kit · Seasonal calendar.
 *
 * Game-agnostic. A game hands in a CalendarConfig (its seasons and festivals) and a "day" number
 * (days since 1 Jan 2026). The kit says which seasons are on, which festivals fall inside a turn,
 * what's coming next, and the combined effects (prices, demand, mood, event weights).
 * Nothing here knows about any one game.
 */

export type Weather = "rain" | "dust" | "mist" | "festive";

export interface Effects {
  /** multiplies living costs and fares (1 = normal) */
  prices?: number;
  /** multiplies cash earned from hustles and trading (1 = normal) */
  demand?: number;
  /** happiness change per turn */
  mood?: number;
  /** health change per turn */
  health?: number;
  /** how fast friendships cool: multiplies the per-turn bond drift (1 = normal, 0.5 = people are warmer) */
  bonds?: number;
  /** event id → weight multiplier while this is on (0 = can't happen) */
  events?: Record<string, number>;
}

/** Month-day pair, 1-based. */
export type MD = [month: number, day: number];

export interface Season {
  id: string;
  name: string;
  emoji: string;
  /** inclusive window inside one year; may wrap past December (e.g. from [12,1] to [2,28]) */
  from: MD;
  to: MD;
  /** one line for the banner, in the game's voice */
  blurb: string;
  /** how people around the player feel, for NPC lines */
  mood?: string;
  weather?: Weather;
  effects?: Effects;
  /** limit to some life stages (game-defined strings); omit for all */
  stages?: string[];
}

export type FestivalDate =
  | { fixed: MD }
  /** days after Easter Sunday (0 = Easter Sunday, -2 = Good Friday, 1 = Easter Monday) */
  | { easter: number }
  /** a lunar (Hijri) festival: one known ISO date; other years are worked out from the 354.37-day lunar year */
  | { lunar: string };

export interface Festival {
  id: string;
  name: string;
  emoji: string;
  date: FestivalDate;
  /** how many days it runs (default 1) */
  days?: number;
  /** feed line when it arrives */
  greeting: string;
  /** event id to open when it lands in a turn (once per year) */
  event?: string;
  /** stages the event may open in (default: all) */
  eventStages?: string[];
  effects?: Effects;
}

export interface CalendarConfig {
  seasons: Season[];
  festivals: Festival[];
  /** event id → season or festival id it is tied to. Outside that window the event can't roll. */
  onlyIn?: Record<string, string[]>;
}

// ───────────────────────────── dates ─────────────────────────────
const EPOCH = Date.UTC(2026, 0, 1);
const DAY = 86_400_000;
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Day number (days since 1 Jan 2026) for a calendar date. */
export const dayOf = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY);

export function dateOf(day: number) {
  const dt = new Date(EPOCH + Math.floor(day) * DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export const fmtDate = (day: number) => {
  const { m, d } = dateOf(day);
  return `${d} ${MONTHS[m - 1]}`;
};

/** Easter Sunday (Gregorian), Anonymous algorithm. */
export function easter(y: number): MD {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return [Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1];
}

const LUNAR_YEAR = 354.367;

/** Start days of a festival that fall in calendar year y (lunar ones can land twice in one year). */
export function festivalDays(f: Festival, y: number): number[] {
  if ("fixed" in f.date) return [dayOf(y, f.date.fixed[0], f.date.fixed[1])];
  if ("easter" in f.date) {
    const [m, d] = easter(y);
    return [dayOf(y, m, d) + f.date.easter];
  }
  const [ay, am, ad] = f.date.lunar.split("-").map(Number);
  const anchor = dayOf(ay, am, ad);
  const lo = dayOf(y, 1, 1), hi = dayOf(y + 1, 1, 1);
  const out: number[] = [];
  const k0 = Math.floor((lo - anchor) / LUNAR_YEAR) - 1;
  for (let k = k0; k <= k0 + 3; k++) {
    const d = Math.round(anchor + k * LUNAR_YEAR);
    if (d >= lo && d < hi) out.push(d);
  }
  return out;
}

// ───────────────────────────── queries ─────────────────────────────
const mdKey = ([m, d]: MD) => m * 100 + d;

export function seasonOn(s: Season, day: number, stage?: string) {
  if (stage && s.stages && !s.stages.includes(stage)) return false;
  const { m, d } = dateOf(day);
  const k = m * 100 + d, a = mdKey(s.from), b = mdKey(s.to);
  return a <= b ? k >= a && k <= b : k >= a || k <= b;
}

/** Seasons that are on at a given day (several can overlap: rainy season and school resumption). */
export const seasonsOn = (cfg: CalendarConfig, day: number, stage?: string) => cfg.seasons.filter((s) => seasonOn(s, day, stage));

export interface FestivalHit {
  f: Festival;
  day: number;
  year: number;
}

/** Festivals whose days overlap the span [from, to). */
export function festivalsIn(cfg: CalendarConfig, from: number, to: number): FestivalHit[] {
  const y0 = dateOf(from).y, y1 = dateOf(to).y;
  const hits: FestivalHit[] = [];
  for (const f of cfg.festivals) {
    for (let y = y0 - 1; y <= y1; y++) {
      for (const start of festivalDays(f, y)) {
        const end = start + (f.days ?? 1);
        if (start < to && end > from) hits.push({ f, day: start, year: dateOf(start).y });
      }
    }
  }
  return hits.sort((a, b) => a.day - b.day);
}

/** The next festival starting after `day` (looks up to ~13 months ahead). */
export function nextFestival(cfg: CalendarConfig, day: number): (FestivalHit & { inDays: number }) | null {
  const hit = festivalsIn(cfg, day + 1, day + 400)[0];
  return hit ? { ...hit, inDays: hit.day - day } : null;
}

/** Combined effects of everything on during the span [from, to). */
export function effectsAt(cfg: CalendarConfig, from: number, to: number, stage?: string): Required<Omit<Effects, "events">> & { events: Record<string, number> } {
  const on: Effects[] = [...seasonsOn(cfg, from, stage).map((s) => s.effects ?? {}), ...festivalsIn(cfg, from, to).map((h) => h.f.effects ?? {})];
  const out = { prices: 1, demand: 1, mood: 0, health: 0, bonds: 1, events: {} as Record<string, number> };
  for (const e of on) {
    out.prices *= e.prices ?? 1;
    out.demand *= e.demand ?? 1;
    out.mood += e.mood ?? 0;
    out.health += e.health ?? 0;
    out.bonds *= e.bonds ?? 1;
    for (const [k, v] of Object.entries(e.events ?? {})) out.events[k] = (out.events[k] ?? 1) * v;
  }
  return out;
}

/**
 * Weight multiplier for a random event right now: season/festival boosts,
 * and 0 when the event is tied to a window (onlyIn) that isn't on.
 */
export function eventWeight(cfg: CalendarConfig, eventId: string, from: number, to: number, stage?: string): number {
  const tied = cfg.onlyIn?.[eventId];
  if (tied) {
    const live = new Set([...seasonsOn(cfg, from, stage).map((s) => s.id), ...festivalsIn(cfg, from, to).map((h) => h.f.id)]);
    if (!tied.some((id) => live.has(id))) return 0;
  }
  return effectsAt(cfg, from, to, stage).events[eventId] ?? 1;
}

/** "this week" / "in 3 weeks" / "in 2 months" */
export function whenText(inDays: number) {
  if (inDays <= 7) return "this week";
  if (inDays < 45) return `in ${Math.round(inDays / 7)} weeks`;
  return `in ${Math.round(inDays / 30)} months`;
}
