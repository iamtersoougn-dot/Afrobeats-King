"use client";

import { useEffect } from "react";
import { useGame, vipOn } from "@/lib/store";
import { useLive } from "@/lib/liveClient";
import { initAds } from "@/lib/ads";

/**
 * Background jobs, kept light: the live heartbeat (about every 45 s while you're playing,
 * half speed after 2 idle minutes, none after 5 or when the tab is hidden), the invite reward
 * once you've played 4 weeks, and loading ads only after the tutorial.
 */
export default function LiveBeat() {
  const beat = useLive((s) => s.beat);
  const week = useGame((s) => s.player?.week ?? 0);
  const tutorialDone = useGame((s) => s.meta.tutorialDone);
  const ref = useGame((s) => s.meta.ref);
  const refSent = useGame((s) => s.meta.refSent);

  useEffect(() => {
    let last = Date.now();
    const touch = () => (last = Date.now());
    const evs = ["pointerdown", "keydown", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const idle = Date.now() - last;
      if (idle > 5 * 60_000) return;
      beat(false, idle > 2 * 60_000 ? 2 : 1);
    }, 5_000);
    const first = setTimeout(() => beat(true), 1_500);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(t);
      clearTimeout(first);
    };
  }, [beat]);

  // an invited player counts once they've played 4 weeks
  useEffect(() => {
    if (!ref || refSent || week < 5) return;
    const g = useGame.getState();
    fetch("/api/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referrer: ref, referee: g.meta.installId }) })
      .then(() => useGame.setState((s) => ({ meta: { ...s.meta, refSent: true } })))
      .catch(() => {});
  }, [ref, refSent, week]);

  // ads load only after the tutorial, and never for VIP / remove-ads players
  useEffect(() => {
    const m = useGame.getState().meta;
    if (tutorialDone && !m.noAds && !vipOn(m)) initAds(m.sound);
  }, [tutorialDone]);

  return null;
}
