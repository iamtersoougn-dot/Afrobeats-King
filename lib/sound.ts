"use client";

/** Tiny generated sounds (no audio files to download). Off by default; the player turns them on in Settings. */
let ctx: AudioContext | null = null;
let enabled = false;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.07, delay = 0, slide?: number) {
  if (!enabled) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  tap: () => tone(520, 0.05, "triangle", 0.04),
  coin: () => {
    tone(988, 0.08, "square", 0.035);
    tone(1319, 0.16, "square", 0.035, 0.07);
  },
  good: () => [523, 659, 784].forEach((f, i) => tone(f, 0.12, "triangle", 0.05, i * 0.09)),
  bad: () => tone(300, 0.3, "sawtooth", 0.035, 0, 140),
  /** a two-bar log-drum riff for releases and level-ups */
  drop: () => [110, 110, 147, 110, 165, 147].forEach((f, i) => tone(f, 0.18, "sine", 0.09, i * 0.13, f * 0.7)),
};
