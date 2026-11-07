export type Tone = "good" | "bad" | "neutral";
export type ProfileId = "richkid" | "producer";
export type Genre = "afrobeats" | "amapiano" | "streethop" | "afrorb" | "alte" | "gospel" | "drill";
export type PlaceId = "base" | "studio" | "hub" | "bar" | "radio" | "law" | "bank" | "mamaput" | "creator" | "sanctuary";
export type TabId = "home" | "label" | "wallet" | "phone" | "profile";

/** Numbers an action, event or bill can change. */
export interface Deltas {
  cash?: number;
  energy?: number;
  days?: number;
  hype?: number;
  rep?: number;
  ear?: number;
  cred?: number;
  heat?: number;
  gold?: number;
}

export interface ArtistLook {
  skin: string;
  hue: number; // outfit colour
  hair: number; // 0..4
}

/** The boss (the player's character). Drawn the same everywhere: world, scenes, wardrobe, live map. */
export interface BossLook {
  skin: string;
  hair: number; // 0..5
  hue: number; // outfit colour
  outfit: string; // shop id, "basic" by default
  extra?: string; // accessory id: shades, chain, cap, headphones, crown
}

export interface Artist {
  id: string;
  name: string;
  genre: Genre;
  talent: number; // 0-100
  star: number; // fans 0-100
  ego: number; // 0-100
  loyalty: number; // 0-100
  mood: number; // 0-100
  advance: number; // total advance (₦)
  royalty: number; // artist share of streaming income, 0..1
  signedWeek: number;
  lastReleaseWeek: number;
  look: ArtistLook;
  bio: string;
}

export type SongStage = "recording" | "mixing" | "mastered" | "released";

export interface Song {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  genre: Genre;
  quality: number; // 0-100
  sessions: number;
  stage: SongStage;
  releaseWeek?: number;
  promo: number; // 0-200, decays weekly
  weekly: number; // streams this week
  total: number;
  peak: number; // best chart position (0 = never charted)
  rank: number; // current position (0 = off chart)
  viral: boolean;
  pulled: number; // weeks banned from the chart (streaming farm caught)
  video?: boolean; // music video shot (+20% streams)
  farmed: number; // fake streams added this week
}

export interface NpcSong {
  id: string;
  title: string;
  artist: string;
  label: string;
  genre: Genre;
  base: number; // peak weekly streams
  born: number; // week it entered
  weekly: number;
  rank: number;
}

export type ObligationKind = "advance" | "release" | "rent" | "loan" | "show";

export interface Obligation {
  id: string;
  kind: ObligationKind;
  title: string;
  amount: number; // 0 for non-money obligations (release dates)
  dueWeek: number;
  place: PlaceId;
  ref?: string; // artist id for advance/release
  overdue: number; // weeks overdue so far
}

export interface Trend {
  genre: Genre;
  tag: string;
  until: number; // last week it is hot
}

export interface LogEntry {
  week: number;
  icon: string;
  text: string;
  tone: Tone;
}

export interface WeekRecap {
  week: number;
  lines: { icon: string; text: string; tone: Tone }[];
  income: number;
  expenses: number;
}

export interface Show {
  id: string;
  artistId: string;
  artistName: string;
  week: number; // show night (end of that week)
  venue: "sanctuary";
}

export interface Player {
  v: number;
  id: string;
  seed: string;
  name: string;
  label: string;
  profile: ProfileId;
  week: number; // 1-based, a turn = 1 week
  cash: number;
  gold: number;
  energy: number; // 0-100
  days: number; // 0-5 work days left this week
  hype: number; // 0-100
  rep: number; // 0-100
  ear: number; // 0-100
  cred: number; // 0-100
  heat: number; // 0-100 (hidden)
  level: number; // 0..4 label level
  studio: number; // 0 laptop, 2 home studio / leased room
  leased: boolean;
  artists: Artist[];
  songs: Song[];
  npc: NpcSong[];
  candidates: Artist[]; // open-mic acts this week
  obligations: Obligation[];
  trend: Trend;
  nextTrend: Trend;
  /** Times each action was used this week (diminishing returns + caps). */
  used: Record<string, number>;
  /** Money earned this week by source (caps). */
  earned: Record<string, number>;
  pendingEvent?: string;
  eventsSeen: Record<string, number>; // event id -> week last seen
  flags: Record<string, number>;
  log: LogEntry[];
  recap?: WeekRecap;
  stats: { earnedTotal: number; spentTotal: number; charted: number; top10: number; no1: number; released: number; bestRank: number; sapaWeeks: number; shows: number; sellouts: number; videos: number };
  loan: number; // outstanding loan balance
  look: BossLook;
  shows: Show[];
  // shared life-sim kit (lib/kit): all optional so old saves load
  chill?: boolean;
  calDay?: number; // days since 1 Jan 2026 at the start of this week
  uses?: Record<string, number>; // lifetime uses per action (Quick do, routines)
  routines?: string[];
  ended?: { kind: "win" | "fold" | "time"; week: number; score: number; title: string; text: string };
}

export interface ActionResult {
  ok: boolean;
  text: string;
  tone: Tone;
  deltas: Deltas;
  icon?: string;
  toast?: { icon: string; title: string; text?: string; tone: Tone };
}
