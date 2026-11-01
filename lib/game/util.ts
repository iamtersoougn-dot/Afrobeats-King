import type { Deltas, Player, Tone } from "./types";

export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function naira(n: number, compact = true): string {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(Math.round(n));
  if (compact) {
    if (v >= 1_000_000_000) return `${sign}₦${trim(v / 1_000_000_000)}b`;
    if (v >= 1_000_000) return `${sign}₦${trim(v / 1_000_000)}m`;
    if (v >= 100_000) return `${sign}₦${trim(v / 1000)}k`;
  }
  return `${sign}₦${v.toLocaleString("en-NG")}`;
}
function trim(x: number) {
  return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1).replace(/\.0$/, "") : x.toFixed(2).replace(/\.?0+$/, "");
}

export const streamsText = (n: number) => (n >= 1_000_000 ? `${trim(n / 1_000_000)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

/** Ear grows slower as it gets higher; the producer learns 25% faster. */
export function earGain(p: Player, v: number) {
  if (v <= 0) return v;
  let m = p.profile === "producer" ? 1.25 : 1;
  if (p.ear > 80) m *= 0.25;
  else if (p.ear > 60) m *= 0.5;
  else if (p.ear > 40) m *= 0.75;
  return v * m;
}

const PCT: (keyof Deltas)[] = ["energy", "hype", "rep", "ear", "cred", "heat"];

/** Apply deltas to a (cloned) player and return what actually changed. */
export function applyDeltas(p: Player, d: Deltas | undefined): Deltas {
  const out: Deltas = {};
  if (!d) return out;
  for (const k of PCT) {
    let v = d[k];
    if (!v) continue;
    if (k === "ear") v = earGain(p, v);
    if (k === "rep" && v > 0 && p.rep > 60) v *= p.rep > 85 ? 0.3 : 0.6;
    const before = p[k as "energy"];
    const after = clamp(Math.round((before + v) * 10) / 10);
    (p as unknown as Record<string, number>)[k] = after;
    const diff = Math.round((after - before) * 10) / 10;
    if (diff) out[k] = diff;
  }
  if (d.days) {
    const before = p.days;
    p.days = clamp(p.days + d.days, 0, 5);
    if (p.days - before) out.days = p.days - before;
  }
  if (d.cash) {
    p.cash = Math.round(p.cash + d.cash);
    out.cash = Math.round(d.cash);
    if (d.cash > 0) p.stats.earnedTotal += d.cash;
    else p.stats.spentTotal -= d.cash;
  }
  if (d.gold) {
    p.gold = Math.max(0, p.gold + d.gold);
    out.gold = d.gold;
  }
  return out;
}

const LABEL: Record<string, [string, string]> = {
  energy: ["⚡", "Energy"],
  days: ["📅", "Day"],
  hype: ["🔥", "Hype"],
  rep: ["⭐", "Rep"],
  ear: ["🎧", "Ear"],
  cred: ["🧢", "Street cred"],
  gold: ["🪙", "Gold"],
};

/** Worded change labels: "+₦2,000", "⚡ −15 Energy", "🔥 +3 Hype". Heat is hidden. */
export function deltaChips(d: Deltas): { text: string; tone: Tone }[] {
  const chips: { text: string; tone: Tone }[] = [];
  for (const k of ["cash", "energy", "days", "hype", "rep", "ear", "cred", "gold"] as const) {
    const v = d[k];
    if (!v) continue;
    if (k === "cash") {
      chips.push({ text: `${v > 0 ? "+" : "−"}${naira(Math.abs(v), false)}`, tone: v > 0 ? "good" : "bad" });
      continue;
    }
    const [icon, name] = LABEL[k];
    const n = Math.abs(v);
    const shown = Number.isInteger(n) ? n : n.toFixed(1);
    const plural = k === "days" && n !== 1 ? "s" : "";
    const tone: Tone = v > 0 ? "good" : k === "energy" || k === "days" ? "neutral" : "bad";
    chips.push({ text: `${icon} ${v > 0 ? "+" : "−"}${shown} ${name}${plural}`, tone });
  }
  return chips;
}

export const weekLabel = (w: number) => `Week ${((w - 1) % 52) + 1} · Year ${Math.floor((w - 1) / 52) + 1}`;
