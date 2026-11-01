import type { Genre, PlaceId, ProfileId } from "./types";

export const WEEKS_PER_YEAR = 52;
export const MAX_WEEKS = 156; // 3 years
export const DAYS_PER_WEEK = 5;
export const CHART_SIZE = 50;
export const SESSIONS_PER_SONG = 3;
/** Living costs every week: food, transport, data. */
export const LIVING_COST = 15_000;

export const GENRES: Record<Genre, { name: string; icon: string; color: string }> = {
  afrobeats: { name: "Afrobeats", icon: "🥁", color: "#f5b82e" },
  amapiano: { name: "Amapiano", icon: "🎹", color: "#38d39f" },
  streethop: { name: "Street-hop", icon: "🛺", color: "#ff7a45" },
  afrorb: { name: "Afro-R&B", icon: "💜", color: "#b07cff" },
  alte: { name: "Alté", icon: "🌀", color: "#5ec8ff" },
  gospel: { name: "Afro-gospel", icon: "🙌🏾", color: "#ffe083" },
  drill: { name: "Afro-drill", icon: "🧊", color: "#9aa7c7" },
};
export const GENRE_IDS = Object.keys(GENRES) as Genre[];

export const TREND_TAGS = ["#ShakaraChallenge", "#SapaDance", "#OwambeStep", "#DanfoDrop", "#LekkiLean", "#JollofWine", "#HarmattanBounce", "#KpakpaShuffle", "#GidiGroove", "#SoftLifeSway"];

export interface Place {
  id: PlaceId;
  name: string;
  area: string;
  icon: string;
  blurb: string;
  /** map position in % of the map box */
  x: number;
  y: number;
  minLevel: number;
}

export const PLACES: Place[] = [
  { id: "base", name: "Your base", area: "Ojuelegba-side room", icon: "🏠", blurb: "Make beats, record, mix, release and rest.", x: 30, y: 46, minLevel: 0 },
  { id: "studio", name: "Surulere Sound", area: "Surulere", icon: "🎚️", blurb: "Rent pro sessions and mixing, or lease a room.", x: 42, y: 58, minLevel: 0 },
  { id: "hub", name: "Yaba Hub", area: "Yaba", icon: "💻", blurb: "Sell beats and mix for other artists. Cash!", x: 55, y: 36, minLevel: 0 },
  { id: "bar", name: "Open-mic bar", area: "Surulere", icon: "🎤", blurb: "Find and sign new artists. DJ for cash.", x: 18, y: 66, minLevel: 0 },
  { id: "radio", name: "Lagoon FM", area: "Ikeja", icon: "📻", blurb: "Push your songs on radio.", x: 38, y: 16, minLevel: 0 },
  { id: "mamaput", name: "Mama Put", area: "Yaba", icon: "🍲", blurb: "Eat, rest small and hear the gist.", x: 64, y: 52, minLevel: 0 },
  { id: "law", name: "Law office", area: "Victoria Island", icon: "⚖️", blurb: "Pay artist advances and sort contracts.", x: 74, y: 78, minLevel: 0 },
  { id: "bank", name: "Bank", area: "Victoria Island", icon: "🏦", blurb: "Loans and repayments.", x: 86, y: 70, minLevel: 0 },
  { id: "creator", name: "Creator house", area: "Lekki", icon: "📱", blurb: "ClipTok challenges with influencers.", x: 90, y: 88, minLevel: 1 },
];
export const placeById = (id: PlaceId) => PLACES.find((p) => p.id === id)!;

export interface Profile {
  id: ProfileId;
  name: string;
  icon: string;
  tagline: string;
  cash: number;
  ear: number;
  cred: number;
  hype: number;
  rep: number;
  studio: number;
  perks: string[];
  difficulty: string;
}

export const PROFILES: Profile[] = [
  {
    id: "richkid",
    name: "Rich kid with a studio",
    icon: "🎛️",
    tagline: "Daddy built you a home studio. Now prove you're not just money.",
    cash: 2_500_000,
    ear: 15,
    cred: 5,
    hype: 10,
    rep: 15,
    studio: 2,
    perks: ["₦2.5m to start", "Home studio: free, better sessions", "₦150k a week from Daddy until week 12", "Low street cred: street acts trust you less"],
    difficulty: "Easier start",
  },
  {
    id: "producer",
    name: "Hungry producer with a laptop",
    icon: "💻",
    tagline: "One laptop, cracked plugins, big dreams. The streets know your beats.",
    cash: 60_000,
    ear: 45,
    cred: 35,
    hype: 5,
    rep: 5,
    studio: 0,
    perks: ["₦60k to start", "Great ear: sells beats from day 1", "Ear grows 25% faster", "Street acts trust you"],
    difficulty: "Harder start",
  },
];
export const profileById = (id: ProfileId) => PROFILES.find((p) => p.id === id)!;

export interface LabelLevel {
  name: string;
  icon: string;
  slots: number;
  /** requirements to reach this level */
  netWorth: number;
  needRank: number; // best chart position needed (0 = none)
  needArtists: number;
  needNo1s: number;
  text: string;
}

export const LEVELS: LabelLevel[] = [
  { name: "Bedroom", icon: "🛏️", slots: 1, netWorth: 0, needRank: 0, needArtists: 0, needNo1s: 0, text: "Where it starts." },
  { name: "Studio", icon: "🎚️", slots: 2, netWorth: 1_000_000, needRank: 50, needArtists: 1, needNo1s: 0, text: "A song in the Top 50 and ₦1m net worth." },
  { name: "Indie", icon: "💿", slots: 4, netWorth: 5_000_000, needRank: 10, needArtists: 2, needNo1s: 0, text: "Two artists, a Top 10 song and ₦5m." },
  { name: "Major", icon: "🏆", slots: 6, netWorth: 30_000_000, needRank: 1, needArtists: 3, needNo1s: 1, text: "A No. 1 song, three artists and ₦30m." },
  { name: "Continental", icon: "🌍", slots: 8, netWorth: 150_000_000, needRank: 1, needArtists: 4, needNo1s: 3, text: "Three No. 1s, four artists and ₦150m." },
];

export const STUDIO_LEASE = { deposit: 150_000, rent: 100_000, every: 4 };
export const LOAN = { amount: 250_000, weekly: 25_000, weeks: 12 };
