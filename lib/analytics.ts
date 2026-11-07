"use client";

/** Tiny first-party analytics: batches events to /api/track (stored in Supabase if configured). */
type Ev = { n: string; p: Record<string, unknown>; t: number };
let queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const ENABLED = process.env.NEXT_PUBLIC_ANALYTICS !== "off";

function installId(): string {
  try {
    const raw = localStorage.getItem("abk-save-v1");
    return raw ? JSON.parse(raw)?.state?.meta?.installId ?? "" : "";
  } catch {
    return "";
  }
}

function flush(beacon = false) {
  if (!queue.length) return;
  const body = JSON.stringify({ install: installId(), events: queue.slice(0, 50) });
  queue = [];
  try {
    if (beacon && navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function analytics(n: string, p: Record<string, unknown> = {}) {
  if (!ENABLED || typeof window === "undefined") return;
  queue.push({ n, p, t: Date.now() });
  if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, 15000);
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush(true));
}
