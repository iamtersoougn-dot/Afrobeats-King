/**
 * "Today in Lagos" (one shared event per real day, the same for every player) and the weekly genre-camp season.
 * Dates are Lagos time (UTC+1, no daylight saving). Not seeded by the run: two friends see the same day.
 */
import type { Deltas, Genre } from "./game/types";

export interface DailyEvent {
  id: string;
  emoji: string;
  title: string;
  text: string;
  /** actions that get the bonus */
  ids: string[];
  bonus: Deltas;
  label: string;
}

export const DAILY: DailyEvent[] = [
  { id: "amapiano_night", emoji: "🎹", title: "Amapiano night at the bar", text: "The whole of Surulere is at the open-mic tonight. DJs are paid extra.", ids: ["dj", "network"], bonus: { cash: 10_000, hype: 1 }, label: "+₦10,000 (Amapiano night)" },
  { id: "beat_sale", emoji: "💿", title: "Beat-buyer day at Yaba Hub", text: "Upcoming artists are in Yaba with cash. Beats sell faster.", ids: ["sell_beat", "mix_others"], bonus: { cash: 6_000 }, label: "+₦6,000 (beat-buyer day)" },
  { id: "light_on", emoji: "💡", title: "Light all day", text: "No outage today. Sessions run smooth.", ids: ["record", "pro_session", "mix", "beat"], bonus: { energy: 6, ear: 0.5 }, label: "+6 ⚡ (light all day)" },
  { id: "radio_takeover", emoji: "📻", title: "Lagoon FM new-music hour", text: "The OAPs are playing new songs all morning.", ids: ["radio", "interview"], bonus: { hype: 2 }, label: "+2 🔥 (new-music hour)" },
  { id: "jollof_friday", emoji: "🍛", title: "Mama Put jollof Friday", text: "Extra meat for everyone.", ids: ["eat", "gist"], bonus: { energy: 8 }, label: "+8 ⚡ (jollof Friday)" },
  { id: "cliptok_wave", emoji: "📱", title: "ClipTok dance wave", text: "Everyone is posting dance videos today.", ids: ["cliptok", "shoot_video"], bonus: { hype: 3 }, label: "+3 🔥 (dance wave)" },
  { id: "producer_meetup", emoji: "🧠", title: "Producers' meetup", text: "Free plugin tips and small chops at the Hub.", ids: ["plugins", "beat", "network"], bonus: { ear: 1 }, label: "+1 🎧 (producers' meetup)" },
];

/** YYYY-MM-DD in Lagos time. */
export function lagosDay(now: Date) {
  return new Date(now.getTime() + 3_600_000).toISOString().slice(0, 10);
}
const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

export function dailyEvent(now: Date): DailyEvent {
  const n = dayNumber(lagosDay(now));
  return DAILY[(((n * 5 + 2) % DAILY.length) + DAILY.length) % DAILY.length];
}
export const eventMatches = (ev: DailyEvent, actionId: string) => ev.ids.includes(actionId);

/** Season week id, Monday to Sunday in Lagos time, e.g. "2026-W45". */
export function seasonWeek(now: Date) {
  const d = new Date(Date.parse(`${lagosDay(now)}T00:00:00Z`));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThu.getTime()) / 86_400_000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
export const previousWeek = (now: Date) => seasonWeek(new Date(now.getTime() - 7 * 86_400_000));
export function weekEndsAt(now: Date) {
  const day = lagosDay(now);
  const d = new Date(Date.parse(`${day}T00:00:00Z`));
  const dow = (d.getUTCDay() + 6) % 7;
  return new Date(Date.parse(`${day}T00:00:00Z`) + (7 - dow) * 86_400_000 - 3_600_000);
}

// ───────── Genre camps: the weekly season ─────────
/** Every player joins one genre camp. Each action earns its camp a point; the top camp's players get gold. */
export const CAMPS: Record<Genre, { name: string; cry: string }> = {
  afrobeats: { name: "Team Afrobeats", cry: "The original vibe 🥁" },
  amapiano: { name: "Team Amapiano", cry: "Log drum gang 🎹" },
  streethop: { name: "Team Street-hop", cry: "From the streets 🛺" },
  afrorb: { name: "Team Afro-R&B", cry: "Lovers only 💜" },
  alte: { name: "Team Alté", cry: "Different by design 🌀" },
  gospel: { name: "Team Afro-gospel", cry: "Praise on the beat 🙌🏾" },
  drill: { name: "Team Afro-drill", cry: "Cold and calm 🧊" },
};
export const SEASON_WIN_GOLD = 60;
export const SEASON_WEEK_CAP = 600;
/** Season points per thing done. Routines earn none (kit rule). */
export const SEASON_PTS = { action: 1, release: 5, chart: 5, no1: 30, show: 15 };
