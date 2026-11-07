/**
 * Daily quests, achievements and needs. Pure functions on the player plus small counters kept in the store's meta.
 * Lists are always shown unfinished first, finished at the bottom (sortTasks).
 */
import { LEVELS } from "./data";
import { latestRelease, songInProgress } from "./select";
import type { PlaceId, Player } from "./types";
import { hash } from "./rng";

// ───────── Daily quests ─────────
export interface QuestDef {
  id: string;
  icon: string;
  text: string;
  /** counted when one of these actions is done (or a special key: "endweek", "sign", "pay", "release") */
  on: string[];
  need: number;
  gold: number;
}

export const QUESTS: QuestDef[] = [
  { id: "q_record", icon: "🎙️", text: "Record 2 sessions", on: ["record", "pro_session"], need: 2, gold: 12 },
  { id: "q_beats", icon: "💿", text: "Sell 2 beats", on: ["sell_beat"], need: 2, gold: 10 },
  { id: "q_radio", icon: "📻", text: "Push a song on radio or do an interview", on: ["radio", "interview"], need: 1, gold: 10 },
  { id: "q_weeks", icon: "🌙", text: "End 2 weeks", on: ["endweek"], need: 2, gold: 12 },
  { id: "q_bill", icon: "🧾", text: "Pay a bill on time", on: ["pay"], need: 1, gold: 10 },
  { id: "q_release", icon: "🚀", text: "Release a single", on: ["release"], need: 1, gold: 20 },
  { id: "q_dj", icon: "🪩", text: "DJ the night or network at the bar", on: ["dj", "network"], need: 1, gold: 8 },
  { id: "q_ear", icon: "🎹", text: "Make beats 3 times", on: ["beat"], need: 3, gold: 10 },
  { id: "q_eat", icon: "🍛", text: "Eat at Mama Put", on: ["eat"], need: 1, gold: 6 },
  { id: "q_sign", icon: "✍🏾", text: "Scout or sign at the open-mic", on: ["sign", "network"], need: 1, gold: 10 },
];

/** Three quests for a Lagos day, the same for everyone that day. */
export function questsFor(day: string): QuestDef[] {
  const out: QuestDef[] = [];
  let i = 0;
  while (out.length < 3 && i < 30) {
    const q = QUESTS[hash(day, "quest", i++) % QUESTS.length];
    if (!out.includes(q)) out.push(q);
  }
  return out;
}

// ───────── Achievements ─────────
export interface AchDef {
  id: string;
  icon: string;
  name: string;
  text: string;
  gold: number;
  done: (p: Player) => boolean;
}

export const ACHIEVEMENTS: AchDef[] = [
  { id: "a_sign", icon: "✍🏾", name: "First signing", text: "Sign your first artist", gold: 10, done: (p) => p.artists.length > 0 || p.stats.released > 0 },
  { id: "a_release", icon: "🚀", name: "Out on Friday", text: "Release your first single", gold: 15, done: (p) => p.stats.released >= 1 },
  { id: "a_chart", icon: "📈", name: "Charting", text: "Get a song into the Top 50", gold: 20, done: (p) => p.stats.charted >= 1 },
  { id: "a_top10", icon: "🔟", name: "Top 10", text: "Get a song into the Top 10", gold: 30, done: (p) => p.stats.top10 >= 1 },
  { id: "a_no1", icon: "👑", name: "Number one", text: "Top the chart", gold: 60, done: (p) => p.stats.no1 >= 1 },
  { id: "a_studio", icon: "🎚️", name: "Real studio", text: "Grow to a Studio label", gold: 20, done: (p) => p.level >= 1 },
  { id: "a_indie", icon: "💿", name: "Indie power", text: "Grow to an Indie label", gold: 40, done: (p) => p.level >= 2 },
  { id: "a_major", icon: "🏆", name: "Major league", text: "Grow to a Major label", gold: 80, done: (p) => p.level >= 3 },
  { id: "a_cont", icon: "🌍", name: "Continental", text: "Grow to a Continental label", gold: 150, done: (p) => p.level >= 4 },
  { id: "a_show", icon: "🎤", name: "Showtime", text: "Put on a show at The Sanctuary", gold: 25, done: (p) => p.stats.shows >= 1 },
  { id: "a_sellout", icon: "🏟️", name: "Sold out", text: "Sell out The Sanctuary", gold: 50, done: (p) => p.stats.sellouts >= 1 },
  { id: "a_video", icon: "🎬", name: "Lights, camera", text: "Shoot a music video", gold: 15, done: (p) => p.stats.videos >= 1 },
  { id: "a_roster", icon: "👥", name: "Full house", text: "Have 4 artists signed at once", gold: 30, done: (p) => p.artists.length >= 4 },
  { id: "a_million", icon: "💰", name: "First million", text: "Hold ₦1,000,000 cash", gold: 20, done: (p) => p.cash >= 1_000_000 },
  { id: "a_releases10", icon: "🎶", name: "Hit factory", text: "Release 10 singles", gold: 30, done: (p) => p.stats.released >= 10 },
  { id: "a_viral", icon: "🌋", name: "Gone viral", text: "Have a song go viral on ClipTok", gold: 30, done: (p) => p.songs.some((s) => s.viral) },
];

/** Unfinished first, then ready to claim, finished at the bottom (tester rule from Campus to Camp). */
export function sortTasks<T>(items: T[], state: (t: T) => "todo" | "ready" | "done"): T[] {
  const order = { ready: 0, todo: 1, done: 2 };
  return [...items].sort((a, b) => order[state(a)] - order[state(b)]);
}

// ───────── Needs (Sims-style panel), all derived from existing stats ─────────
export interface Need {
  id: string;
  icon: string;
  name: string;
  value: number; // 0..100
  /** thought-bubble line when this is the worst need */
  thought: string;
  fix?: { label: string; place: PlaceId; action?: string };
}

export function needs(p: Player): Need[] {
  const bills = p.obligations.filter((o) => o.amount > 0 && o.dueWeek <= p.week + 1).reduce((t, o) => t + o.amount, 0);
  const money = Math.max(0, Math.min(100, ((p.cash - bills) / Math.max(150_000, bills * 2)) * 100));
  const moods = p.artists.map((a) => a.mood);
  const team = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 70;
  const sad = [...p.artists].sort((a, b) => a.mood - b.mood)[0];
  const song = songInProgress(p);
  const last = latestRelease(p);
  const music = !p.artists.length ? 0 : song ? 55 + song.sessions * 12 : last && last.releaseWeek !== undefined ? Math.max(10, 100 - (p.week - last.releaseWeek) * 15) : 20;
  return [
    { id: "energy", icon: "⚡", name: "Energy", value: p.energy, thought: "I'm so tired… Mama Put's rice would help.", fix: { label: "Eat at Mama Put", place: "mamaput", action: "eat" } },
    { id: "money", icon: "💰", name: "Money", value: money, thought: bills ? "Bills are coming. I need to hustle some cash." : "My pocket is light. Time to sell some beats.", fix: { label: "Sell a beat", place: "hub", action: "sell_beat" } },
    { id: "buzz", icon: "🔥", name: "Buzz", value: p.hype, thought: "Nobody is talking about us. We need radio.", fix: last ? { label: "Radio push", place: "radio", action: "radio" } : { label: "Network at the bar", place: "bar", action: "network" } },
    { id: "team", icon: "💜", name: "Team mood", value: team, thought: sad ? `${sad.name} feels neglected. Let's record something.` : "I need artists around me.", fix: sad ? { label: "Book a session", place: p.studio >= 2 ? "base" : "studio" } : { label: "Open-mic bar", place: "bar" } },
    { id: "music", icon: "🎶", name: "New music", value: music, thought: p.artists.length ? "Fans are asking for new music." : "I need an artist to make music with.", fix: p.artists.length ? { label: "Record", place: p.studio >= 2 ? "base" : "studio" } : { label: "Sign an artist", place: "bar" } },
  ];
}

export const worstNeed = (p: Player) => needs(p).sort((a, b) => a.value - b.value)[0];

export const levelName = (p: Player) => LEVELS[p.level].name;
