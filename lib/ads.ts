"use client";

/**
 * Ads integration.
 * - If NEXT_PUBLIC_ADSENSE_CLIENT is set, uses Google's H5 Games Ads (Ad Placement API: adBreak/adConfig).
 * - Otherwise returns "house", and the game shows a sponsor card (see lib/sponsors.ts) — sellable inventory.
 */

type AdBreakFn = (o: Record<string, unknown>) => void;
declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adBreak?: AdBreakFn;
    adConfig?: AdBreakFn;
  }
}

export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
let loaded = false;

export function initAds(soundOn: boolean) {
  if (typeof window === "undefined" || !ADSENSE_CLIENT || loaded) return;
  loaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-ad-frequency-hint", "60s");
  if (process.env.NODE_ENV !== "production") s.setAttribute("data-adbreak-test", "on");
  document.head.appendChild(s);
  window.adsbygoogle = window.adsbygoogle || [];
  window.adBreak = window.adConfig = function (o) {
    window.adsbygoogle!.push(o);
  };
  window.adConfig({ preloadAdBreaks: "on", sound: soundOn ? "on" : "off" });
}

/** Resolves "rewarded" | "dismissed" | "unavailable" | "house" */
export function showRewardedAd(name: string): Promise<"rewarded" | "dismissed" | "unavailable" | "house"> {
  if (!ADSENSE_CLIENT || typeof window === "undefined" || !window.adBreak) return Promise.resolve("house");
  return new Promise((resolve) => {
    let rewarded = false;
    let settled = false;
    const done = (v: "rewarded" | "dismissed" | "unavailable" | "house") => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    window.adBreak!({
      type: "reward",
      name,
      beforeReward: (showAdFn: () => void) => showAdFn(),
      adDismissed: () => done("dismissed"),
      adViewed: () => {
        rewarded = true;
      },
      adBreakDone: (info: { breakStatus?: string }) => {
        if (rewarded) done("rewarded");
        else if (info?.breakStatus && info.breakStatus !== "viewed") done("house"); // no fill → fall back to sponsor card
        else done("dismissed");
      },
    });
    setTimeout(() => done("house"), 15000);
  });
}

export function showInterstitial(name: string): Promise<void> {
  if (!ADSENSE_CLIENT || typeof window === "undefined" || !window.adBreak) return Promise.resolve();
  return new Promise((resolve) => {
    window.adBreak!({ type: "next", name, adBreakDone: () => resolve() });
    setTimeout(resolve, 12000);
  });
}
