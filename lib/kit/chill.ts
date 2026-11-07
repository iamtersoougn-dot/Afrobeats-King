/**
 * Naija life-sim kit · Chill mode.
 *
 * A relaxed way to play: no countdowns, no game-overs, numbers shown as words, gentler luck.
 * The kit holds the rules and the word scales; each game decides where to apply them.
 * When Chill is off, games must behave exactly as before.
 */

/** One step on a word scale: values up to `upTo` read as `word`. Order ascending. */
export interface Band {
  upTo: number;
  word: string;
  /** shorter form for tight spots like a top bar */
  short?: string;
}

export interface ChillRules {
  /** chance a random event rolls at end of turn, as a multiple of normal (0.7 = 30% fewer) */
  eventOdds: number;
  /** weight multiplier for events the game marks as setbacks */
  setbackWeight: number;
  /** event ids treated as setbacks */
  setbacks: string[];
  /** event ids that never roll in Chill mode */
  never: string[];
  /** bad-luck chances (allowance missing, etc.) are multiplied by this */
  badLuck: number;
  /** relationships cool this much slower (0.5 = half speed) */
  bondDrift: number;
  /** timed mini-games run at this speed (0.6 = 40% slower) and never time out */
  miniSpeed: number;
}

export interface ChillConfig {
  rules: ChillRules;
  /** word scales by meter name (e.g. "energy", "health", "happy", "money") */
  scales: Record<string, Band[]>;
}

/** Word for a value on a scale; the last band catches everything above. */
export function word(bands: Band[], value: number, short = false): string {
  const b = bands.find((x) => value <= x.upTo) ?? bands[bands.length - 1];
  if (!b) return "";
  return short ? (b.short ?? b.word) : b.word;
}

/** "a little" / "some" / "a lot" for a change, sized against what's normal for that meter. */
export function amount(n: number, normal: number): string {
  const a = Math.abs(n);
  if (a === 0) return "";
  if (a < normal * 0.4) return "a little";
  if (a < normal * 1.5) return "some";
  return "a lot of";
}

/**
 * A change as words: "+ a little energy", "− some money".
 * `nouns` maps meter keys to the word players see.
 */
export function softDelta(key: string, n: number, normal: Record<string, number>, nouns: Record<string, string>): string | null {
  if (!n) return null;
  const noun = nouns[key];
  if (!noun) return null;
  return `${n > 0 ? "+" : "−"} ${amount(n, normal[key] ?? 10)} ${noun}`;
}

/** Shrinks the bad half of a random roll. Pass the normal probability; returns the Chill one. */
export const gentler = (prob: number, on: boolean, rules: ChillRules) => (on ? prob * rules.badLuck : prob);
