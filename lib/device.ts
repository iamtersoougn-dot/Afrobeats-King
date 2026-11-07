"use client";

/** True on phones that are likely to struggle with lots of animation. */
export function lowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (n.connection?.saveData) return true;
  if (typeof n.deviceMemory === "number" && n.deviceMemory <= 3) return true;
  if (typeof n.hardwareConcurrency === "number" && n.hardwareConcurrency <= 4) return true;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  return false;
}
