/**
 * Naija life-sim kit · Routines.
 *
 * Stops repetitive grinding. Every action counts its lifetime uses. After `quickAt` uses the
 * player can skip the scene ("Quick do"); after `unlockAt` uses they can make it a routine
 * that runs by itself at the end of each turn for a slightly smaller reward.
 */

export interface RoutineRules {
  /** uses before "Quick do" (skip the scene) appears */
  quickAt: number;
  /** uses before an action can become a routine */
  unlockAt: number;
  /** most routines at once */
  max: number;
  /** share of the normal reward a routine gets (0.9 = 90%) */
  rewardScale: number;
  /** a routine won't run if it would leave energy below this */
  energyFloor: number;
}

export interface RoutineState {
  uses: Record<string, number>;
  routines: string[];
}

export const usesOf = (s: RoutineState, id: string) => s.uses[id] ?? 0;
export const canQuick = (s: RoutineState, id: string, r: RoutineRules) => usesOf(s, id) >= r.quickAt;
export const isRoutine = (s: RoutineState, id: string) => s.routines.includes(id);

/** null when the action can become a routine, otherwise the reason it can't (for the button hint). */
export function routineLock(s: RoutineState, id: string, r: RoutineRules, eligible: boolean): string | null {
  if (!eligible) return "This one needs you there in person";
  if (isRoutine(s, id)) return null;
  const n = usesOf(s, id);
  if (n < r.unlockAt) return `Do it ${r.unlockAt - n} more time${r.unlockAt - n === 1 ? "" : "s"} to unlock`;
  if (s.routines.length >= r.max) return `You already have ${r.max} routines. Turn one off first.`;
  return null;
}

/** Turns a routine on or off. Returns the new list, or a reason it can't. */
export function toggleRoutine(s: RoutineState, id: string, r: RoutineRules, eligible: boolean): { routines: string[] } | { why: string } {
  if (isRoutine(s, id)) return { routines: s.routines.filter((x) => x !== id) };
  const lock = routineLock(s, id, r, eligible);
  if (lock) return { why: lock };
  return { routines: [...s.routines, id] };
}

/** Scales the gains in a reward (positive numbers) and leaves costs alone. */
export function scaleGains<T extends object>(d: T, scale: number, skip: string[] = []): T {
  const out = { ...d };
  for (const [k, v] of Object.entries(d) as [string, unknown][]) {
    if (typeof v === "number" && v > 0 && !skip.includes(k)) (out as Record<string, number>)[k] = Number.isInteger(v) ? Math.round(v * scale) : Math.round(v * scale * 100) / 100;
  }
  return out;
}
