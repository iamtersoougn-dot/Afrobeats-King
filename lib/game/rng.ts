/** Seeded random numbers. Every random roll in the rules goes through here so runs replay exactly and the balance bot is fair. */

/** 32-bit string hash (FNV-1a). */
export function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for games. */
export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next: () => number;
  range: (lo: number, hi: number) => number;
  int: (lo: number, hi: number) => number;
  chance: (p: number) => boolean;
  pick: <T>(arr: readonly T[]) => T;
  weighted: <T>(items: readonly T[], weight: (t: T) => number) => T | undefined;
}

export function rng(...parts: (string | number)[]): Rng {
  const next = mulberry(hash(...parts));
  const range = (lo: number, hi: number) => lo + next() * (hi - lo);
  const int = (lo: number, hi: number) => Math.floor(range(lo, hi + 1));
  return {
    next,
    range,
    int,
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weighted: (items, weight) => {
      const total = items.reduce((s, t) => s + Math.max(0, weight(t)), 0);
      if (total <= 0) return undefined;
      let r = next() * total;
      for (const t of items) {
        r -= Math.max(0, weight(t));
        if (r <= 0) return t;
      }
      return items[items.length - 1];
    },
  };
}
