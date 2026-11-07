/**
 * Afrobeats King's settings for the shared life-sim kit (lib/kit, copied unchanged from Campus to Camp).
 * Seasons follow the Lagos music year: Detty December is show season, January is dry, harmattan is festival weather.
 */
import type { CalendarConfig } from "../kit/calendar";
import type { ChillConfig } from "../kit/chill";
import type { RoutineRules } from "../kit/routines";

export const CALENDAR: CalendarConfig = {
  seasons: [
    {
      id: "detty", name: "Detty December", emoji: "🎆", from: [12, 1], to: [1, 3], weather: "festive",
      blurb: "The diaspora is home, every night is a concert, and promoters are paying double.",
      mood: "Everyone wants a show, a feature and a free ticket.",
      effects: { prices: 1.2, demand: 1.4, mood: 2, events: { owambe_gig: 2.5, blogger: 1.5, third_mainland: 2 } },
    },
    {
      id: "january", name: "Long January", emoji: "🥲", from: [1, 4], to: [1, 31],
      blurb: "Everybody spent it all in December. Streams are fine, gigs are dry.",
      mood: "Promoters are 'on a budget' and DJs are asking for credit.",
      effects: { demand: 0.8, mood: -1, events: { owambe_gig: 0.4 } },
    },
    {
      id: "harmattan", name: "Harmattan", emoji: "🌫️", from: [11, 20], to: [2, 15], weather: "dust",
      blurb: "Dusty mornings and cracked lips. Vocalists are drinking warm water and honey.",
      mood: "Singers are complaining about their voices.",
      effects: { mood: -1, events: { exhausted: 1.4 } },
    },
    {
      id: "rainy", name: "Rainy season", emoji: "🌧️", from: [4, 1], to: [10, 15], weather: "rain",
      blurb: "Rain don start. Third Mainland is a car park and the studio roof is leaking.",
      mood: "Everyone is late because of traffic.",
      effects: { prices: 1.05, events: { third_mainland: 2, nepa_cut: 1.6 } },
    },
    {
      id: "festival", name: "Festival season", emoji: "🎪", from: [3, 1], to: [4, 15],
      blurb: "Campus shows and city festivals are booking acts. Good time to perform.",
      mood: "Students are asking who is headlining.",
      effects: { demand: 1.15, mood: 1 },
    },
    {
      id: "awards", name: "Awards season", emoji: "🏆", from: [8, 15], to: [9, 30],
      blurb: "Nominations are out. Bloggers are picking sides and every artist wants a red-carpet outfit.",
      mood: "Everyone is campaigning for votes.",
      effects: { mood: 1, events: { beef_on_x: 1.8, royalty_demand: 1.4 } },
    },
  ],
  festivals: [
    { id: "newyear", name: "New Year", emoji: "🎉", date: { fixed: [1, 1] }, greeting: "Happy New Year! Crossover concerts ran till 4 AM.", effects: { mood: 3 } },
    { id: "valentine", name: "Val's Day", emoji: "💘", date: { fixed: [2, 14] }, greeting: "Val's Day! Love songs are streaming double today.", effects: { mood: 1 } },
    { id: "eid_fitr", name: "Eid el-Fitr (Sallah)", emoji: "🌙", date: { lunar: "2026-03-20" }, days: 2, greeting: "Barka da Sallah! Ramadan is over. Jollof and visits all round.", effects: { mood: 2, demand: 1.1 } },
    { id: "easter", name: "Easter", emoji: "✝️", date: { easter: -2 }, days: 4, greeting: "Happy Easter! Long weekend: owambes and church concerts.", effects: { mood: 2 } },
    { id: "eid_kabir", name: "Eid el-Kabir", emoji: "🐏", date: { lunar: "2026-05-27" }, days: 2, greeting: "Barka da Sallah! Rams in every compound.", effects: { mood: 2, demand: 1.1 } },
    { id: "musicday", name: "World Music Day", emoji: "🎶", date: { fixed: [6, 21] }, greeting: "World Music Day! Free shows across Lagos.", effects: { mood: 2, demand: 1.15 } },
    { id: "independence", name: "Independence Day", emoji: "🇳🇬", date: { fixed: [10, 1] }, greeting: "Happy Independence Day! Green-white-green everywhere.", effects: { mood: 2 } },
    { id: "christmas", name: "Christmas", emoji: "🎄", date: { fixed: [12, 24] }, days: 3, greeting: "Merry Christmas! The biggest show week of the year.", effects: { mood: 3, demand: 1.2 } },
  ],
  onlyIn: {},
};

/** One turn is one week. A new label starts on a Monday in September 2026 (the music industry's "new year"). */
export const DAYS_PER_TURN = 7;
export const START_DAY = 250; // 8 Sep 2026 (days since 1 Jan 2026)

// ───────────────────────────── Chill mode ─────────────────────────────
export const CHILL: ChillConfig = {
  rules: {
    eventOdds: 0.7,
    setbackWeight: 0.35,
    setbacks: ["nepa_cut", "royalty_demand", "beef_on_x", "third_mainland", "poach", "sample_claim", "exhausted"],
    never: ["stream_farm", "exhausted"],
    badLuck: 0.35,
    bondDrift: 0.5,
    miniSpeed: 0.6,
  },
  scales: {
    money: [
      { upTo: -1, word: "In debt 😬", short: "Debt" },
      { upTo: 20_000, word: "Sapa don land", short: "Sapa" },
      { upTo: 100_000, word: "Tight", short: "Tight" },
      { upTo: 600_000, word: "Managing", short: "Okay" },
      { upTo: 3_000_000, word: "Comfortable", short: "Comfy" },
      { upTo: 30_000_000, word: "Big label money", short: "Big" },
      { upTo: Infinity, word: "Odogwu money 💼", short: "Odogwu" },
    ],
    energy: [
      { upTo: 15, word: "Exhausted" },
      { upTo: 35, word: "Tired" },
      { upTo: 65, word: "Okay" },
      { upTo: 85, word: "Fresh" },
      { upTo: 100, word: "Full of life", short: "Full" },
    ],
    meter: [
      { upTo: 15, word: "Unknown" },
      { upTo: 35, word: "Buzzing small" },
      { upTo: 60, word: "Talk of the town", short: "Talked of" },
      { upTo: 85, word: "Everywhere" },
      { upTo: 100, word: "Legendary" },
    ],
  },
};

export const CHILL_NOUNS: Record<string, string> = { cash: "money", energy: "energy", hype: "hype", rep: "respect", ear: "ear", cred: "street cred", gold: "gold" };
export const CHILL_NORMAL: Record<string, number> = { cash: 30_000, energy: 15, hype: 3, rep: 2, ear: 2, cred: 2, gold: 10 };

// ───────────────────────────── Routines ─────────────────────────────
export const ROUTINES: RoutineRules = { quickAt: 5, unlockAt: 10, max: 3, rewardScale: 0.9, energyFloor: 20 };
/** Actions you can't automate: they need a choice, a release, money decisions or are one-offs. */
export const NO_ROUTINE = ["release", "lease", "loan", "payola", "book_show", "shoot_video", "rest", "record", "pro_session", "mix", "pro_mix", "radio", "cliptok"];
