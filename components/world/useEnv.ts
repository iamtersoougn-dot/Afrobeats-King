"use client";

import { useSyncExternalStore } from "react";
import { lowEndDevice } from "@/lib/device";
import { useGame } from "@/lib/store";

// ───────── a shared clock, ticking every 30 s (React's render must not read the time itself) ─────────
let nowVal = typeof window === "undefined" ? 0 : Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribeClock(cb: () => void) {
  listeners.add(cb);
  nowVal = Date.now();
  if (!timer)
    timer = setInterval(() => {
      nowVal = Date.now();
      listeners.forEach((l) => l());
    }, 30_000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
/** Current time in ms, refreshed every 30 seconds. */
export const useNow = () => useSyncExternalStore(subscribeClock, () => nowVal, () => 0);
/** Real hour in Lagos (0–23). Server render assumes night, the game's home look. */
export const useLagosHour = () => {
  const t = useNow();
  return t ? (new Date(t).getUTCHours() + 1) % 24 : 21;
};
export const isNight = (h: number) => h >= 19 || h < 6;

// ───────── Smooth mode: fewer moving things on cheap phones ─────────
const noop = () => () => {};
export function useSmooth(): boolean {
  const pref = useGame((s) => s.meta.smooth);
  const auto = useSyncExternalStore(noop, lowEndDevice, () => false);
  return pref ?? auto;
}
