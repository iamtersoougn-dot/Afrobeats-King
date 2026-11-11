"use client";

import { useEffect, useSyncExternalStore } from "react";
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
  const measured = useGame((s) => s.meta.autoSmooth);
  const auto = useSyncExternalStore(noop, lowEndDevice, () => false);
  return pref ?? (auto || measured);
}

/**
 * Watches the first few seconds on the map. A cheap phone (by its specs) or a low frame rate
 * turns Smooth mode on, with a short notice the first time. Does nothing if the player chose a setting.
 */
export function useFrameCheck(active: boolean) {
  const pref = useGame((s) => s.meta.smooth);
  const noticed = useGame((s) => s.meta.smoothNoticed);
  const autoSmooth = useGame((s) => s.autoSmooth);
  useEffect(() => {
    if (!active || pref !== null || noticed) return;
    if (lowEndDevice()) {
      const t = setTimeout(() => autoSmooth("phone"), 1500);
      return () => clearTimeout(t);
    }
    let frames = 0;
    let start = 0;
    let raf = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      frames++;
      if (t - start < 3000) raf = requestAnimationFrame(tick);
      else if (document.visibilityState === "visible" && (frames * 1000) / (t - start) < 40) autoSmooth("fps");
    };
    // wait for the first screen to settle before measuring
    const wait = setTimeout(() => (raf = requestAnimationFrame(tick)), 2000);
    return () => {
      clearTimeout(wait);
      cancelAnimationFrame(raf);
    };
  }, [active, pref, noticed, autoSmooth]);
}
