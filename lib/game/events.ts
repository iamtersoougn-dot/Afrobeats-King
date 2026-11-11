/**
 * Random events. One can fire at the end of a week (never during the tutorial; the store passes events:false).
 * Every event id rolled here must exist in EVENTS, or the game would wait on a choice it can't show.
 * The balance bot checks this on every run.
 */
import { calDay, chillOn, latestRelease, songInProgress } from "./select";
import { eventWeight } from "../kit/calendar";
import { CALENDAR, CHILL, DAYS_PER_TURN } from "./kit.config";
import { rng, type Rng } from "./rng";
import type { Deltas, Player, Tone } from "./types";
import { clamp, naira } from "./util";

export interface EventChoice {
  label: string;
  can?: (p: Player) => boolean;
  run: (p: Player, r: Rng) => { text: string; tone?: Tone; deltas: Deltas };
}

export interface GameEvent {
  id: string;
  icon: string;
  title: string;
  text: (p: Player) => string;
  when: (p: Player) => boolean;
  weight: number;
  /** Weeks before it can fire again. */
  cooldown: number;
  /** Most times it can happen in one 3-year game. */
  max?: number;
  choices: EventChoice[];
}

const moodiest = (p: Player) => [...p.artists].sort((a, b) => a.mood - b.mood)[0];
const starArtist = (p: Player) => [...p.artists].sort((a, b) => b.star - a.star)[0];

export const EVENTS: GameEvent[] = [
  {
    id: "nepa_cut",
    icon: "🔌",
    title: "Grid don go",
    text: () => "Light just went off in the middle of your session. Diesel is ₦12,000.",
    when: (p) => p.studio >= 2,
    weight: 3,
    cooldown: 9,
    max: 7,
    choices: [
      { label: "Buy diesel (₦12,000)", can: (p) => p.cash >= 12_000, run: () => ({ text: "The gen roars. Session saved.", deltas: { cash: -12_000 } }) },
      { label: "Wait for light", run: () => ({ text: "You waited three hours. The vibe died.", tone: "bad", deltas: { energy: -15 } }) },
    ],
  },
  {
    id: "royalty_demand",
    icon: "😤",
    title: "Artist wants a bigger cut",
    text: (p) => `${starArtist(p)?.name ?? "Your artist"} says: "My song dey chart, I want 10% more royalty."`,
    when: (p) => p.artists.some((a) => a.star >= 30),
    weight: 2,
    cooldown: 12,
    max: 6,
    choices: [
      {
        label: "Agree (+10% royalty)",
        run: (p) => {
          const a = starArtist(p)!;
          a.royalty = Math.min(0.7, Math.round((a.royalty + 0.1) * 100) / 100);
          a.loyalty = clamp(a.loyalty + 15);
          a.mood = clamp(a.mood + 15);
          return { text: `${a.name} is happy and loyal. Your share is smaller.`, tone: "good", deltas: {} };
        },
      },
      {
        label: "Say no",
        run: (p) => {
          const a = starArtist(p)!;
          a.loyalty = clamp(a.loyalty - 15);
          a.mood = clamp(a.mood - 15);
          return { text: `${a.name} is sulking. Keep them busy or they may leave.`, tone: "bad", deltas: {} };
        },
      },
    ],
  },
  {
    id: "beef_on_x",
    icon: "🐦",
    title: "Beef on X",
    text: (p) => `${moodiest(p)?.name ?? "Your artist"} is dragging a rival label on X. Everyone is watching.`,
    when: (p) => p.artists.length > 0,
    weight: 2,
    cooldown: 10,
    max: 6,
    choices: [
      { label: "Let it ride", run: () => ({ text: "Streams up, respect down. Classic.", tone: "neutral", deltas: { hype: 6, rep: -4 } }) },
      { label: "Tell them to delete it", run: (p) => { const a = moodiest(p)!; a.mood = clamp(a.mood - 8); return { text: "Tweets deleted. The artist feels muzzled.", deltas: { rep: 2 } }; } },
    ],
  },
  {
    id: "stream_farm",
    icon: "🤖",
    title: "Streaming farm offer",
    text: (p) => `A guy in a hoodie offers 2M "streams" for "${latestRelease(p)?.title}". ₦120,000. "Nobody go know."`,
    when: (p) => !!latestRelease(p) && p.week - (latestRelease(p)?.releaseWeek ?? 0) <= 4,
    weight: 2,
    cooldown: 16,
    max: 5,
    choices: [
      {
        label: "Pay him (₦120,000)",
        can: (p) => p.cash >= 120_000,
        run: (p) => {
          const s = latestRelease(p)!;
          s.farmed = 2_000_000;
          return { text: "The numbers will jump on Friday… if Tunely doesn't notice.", tone: "neutral", deltas: { cash: -120_000, heat: 30 } };
        },
      },
      { label: "Report him to Tunely", run: () => ({ text: "Tunely thanked you. The industry respects clean hands.", tone: "good", deltas: { rep: 3 } }) },
      { label: "Ignore", run: () => ({ text: "You blocked his number.", deltas: {} }) },
    ],
  },
  {
    id: "owambe_gig",
    icon: "🎉",
    title: "Owambe DJ gig",
    text: () => "A rich aunty wants you to DJ her 60th birthday this Saturday. ₦70,000 and food.",
    when: () => true,
    weight: 2,
    cooldown: 8,
    max: 8,
    choices: [
      { label: "Take the gig", can: (p) => p.energy >= 20, run: () => ({ text: "Aunty sprayed you. Jollof for days.", tone: "good", deltas: { cash: 70_000, energy: -20, cred: 1 } }) },
      { label: "Rest instead", run: () => ({ text: "You stayed home and slept.", deltas: { energy: 10 } }) },
    ],
  },
  {
    id: "blogger",
    icon: "📰",
    title: "Blogger wants a feature fee",
    text: () => "A big music blog will post your latest single for ₦40,000.",
    when: (p) => !!latestRelease(p),
    weight: 2,
    cooldown: 9,
    max: 7,
    choices: [
      { label: "Pay (₦40,000)", can: (p) => p.cash >= 40_000, run: (p) => { const s = latestRelease(p)!; s.promo = Math.min(200, s.promo + 25); return { text: `"${s.title}" is on the front page.`, tone: "good", deltas: { cash: -40_000, hype: 3 } }; } },
      { label: "No, thanks", run: () => ({ text: "They posted your rival instead.", deltas: {} }) },
    ],
  },
  {
    id: "third_mainland",
    icon: "🚗",
    title: "Third Mainland traffic",
    text: () => "Go-slow on the bridge. You'll miss half a day.",
    when: () => true,
    weight: 2,
    cooldown: 10,
    max: 7,
    choices: [
      { label: "Wait it out", run: () => ({ text: "Four hours on the bridge. You learned every song on the radio.", tone: "bad", deltas: { energy: -15 } }) },
      { label: "Okada (₦5,000)", can: (p) => p.cash >= 5_000, run: () => ({ text: "The okada man flew. You're shaking but on time.", deltas: { cash: -5_000 } }) },
    ],
  },
  {
    id: "poach",
    icon: "🦈",
    title: "Rival label poaching",
    text: (p) => `Big Wave Records wants ${starArtist(p)?.name}. They offer you ₦${Math.round(buyout(p) / 1000)}k to let them go.`,
    when: (p) => p.artists.some((a) => a.star >= 45 && a.loyalty < 60),
    weight: 1,
    cooldown: 14,
    max: 4,
    choices: [
      {
        label: "Take the buyout",
        run: (p) => {
          const a = starArtist(p)!;
          const pay = buyout(p);
          p.artists = p.artists.filter((x) => x.id !== a.id);
          p.obligations = p.obligations.filter((o) => o.ref !== a.id);
          p.songs = p.songs.filter((s) => s.artistId !== a.id || s.stage === "released");
          return { text: `${a.name} is gone. ${naira(pay)} in the bank.`, tone: "neutral", deltas: { cash: pay, hype: -4 } };
        },
      },
      {
        label: "Fight for them",
        run: (p) => {
          const a = starArtist(p)!;
          a.loyalty = clamp(a.loyalty + 20);
          return { text: `You reminded ${a.name} who believed in them first.`, tone: "good", deltas: { rep: 2 } };
        },
      },
    ],
  },
  {
    id: "sample_claim",
    icon: "⚖️",
    title: "Uncleared sample",
    text: (p) => `An old highlife band says "${latestRelease(p)?.title}" uses their horn line. They want ₦60,000.`,
    when: (p) => !!latestRelease(p) && p.week > 6,
    weight: 1,
    cooldown: 18,
    max: 4,
    choices: [
      { label: "Settle (₦60,000)", can: (p) => p.cash >= 60_000, run: () => ({ text: "Settled. The band even posted the song.", tone: "good", deltas: { cash: -60_000, rep: 2 } }) },
      {
        label: "Fight it",
        run: (p, r) => {
          if (r.chance(0.5)) return { text: "Their lawyer gave up. You win.", tone: "good", deltas: { rep: 1 } };
          const s = latestRelease(p)!;
          s.pulled = 4;
          return { text: `You lost. "${s.title}" is pulled for 4 weeks.`, tone: "bad", deltas: { rep: -5 } };
        },
      },
    ],
  },
  {
    id: "studio_cheer",
    icon: "🙌🏾",
    title: "Studio vibes",
    text: (p) => `${moodiest(p)?.name ?? "Your artist"} brought small chops and danced in the booth all night.`,
    when: (p) => p.artists.length > 0,
    weight: 2,
    cooldown: 9,
    max: 7,
    choices: [{ label: "Enjoy it", run: (p) => { for (const a of p.artists) a.mood = clamp(a.mood + 10); return { text: "Everyone's mood is up.", tone: "good", deltas: {} }; } }],
  },
  {
    id: "exhausted",
    icon: "🥵",
    title: "You collapsed",
    text: () => "You've been working with no rest. A doctor says take it easy. ₦8,000 for drugs.",
    when: (p) => p.energy < 10,
    weight: 3,
    cooldown: 8,
    max: 6,
    choices: [
      { label: "Buy the drugs (₦8,000)", can: (p) => p.cash >= 8_000, run: () => ({ text: "You feel better already.", deltas: { cash: -8_000 } }) },
      { label: "Pray and push on", run: () => ({ text: "You'll be slow this week.", tone: "bad", deltas: { energy: -20 } }) },
    ],
  },
  {
    id: "brand_deal",
    icon: "🥤",
    title: "Brand deal",
    text: (p) => `Zest Malt wants ${starArtist(p)?.name ?? "your artist"} for a jingle and a billboard. They're offering ${naira(brandPay(p))}.`,
    when: (p) => p.artists.some((a) => a.star >= 35),
    weight: 2,
    cooldown: 12,
    max: 5,
    choices: [
      {
        label: "Take the deal",
        run: (p) => {
          const a = starArtist(p)!;
          a.mood = clamp(a.mood + 8);
          return { text: `${a.name} is on billboards across Lagos. Money landed.`, tone: "good", deltas: { cash: brandPay(p), hype: 3, rep: -1 } };
        },
      },
      { label: "Protect the artist's image", run: (p) => ({ text: `You said no. ${starArtist(p)?.name} respects that.`, deltas: { rep: 2 } }) },
    ],
  },
  {
    id: "feature_ask",
    icon: "🎤",
    title: "Feature request",
    text: (p) => `A rising star from Eko Gold Music wants a verse on "${latestRelease(p)?.title}" remix. Their label asks ₦80,000 for studio time.`,
    when: (p) => !!latestRelease(p) && p.week - (latestRelease(p)?.releaseWeek ?? 0) <= 3,
    weight: 2,
    cooldown: 10,
    max: 6,
    choices: [
      {
        label: "Do the remix (₦80,000)",
        can: (p) => p.cash >= 80_000,
        run: (p) => {
          const s = latestRelease(p)!;
          s.promo = Math.min(200, s.promo + 45);
          return { text: `The remix is everywhere. "${s.title}" got a second life.`, tone: "good", deltas: { cash: -80_000, hype: 4 } };
        },
      },
      { label: "No, thanks", run: () => ({ text: "They found another label to work with.", deltas: {} }) },
    ],
  },
  {
    id: "song_leak",
    icon: "💧",
    title: "Song leaked",
    text: (p) => `Someone leaked a rough version of "${songInProgress(p)?.title}" on X. People are sharing it.`,
    when: (p) => songInProgress(p)?.stage === "recording" && (songInProgress(p)?.sessions ?? 0) >= 1,
    weight: 1,
    cooldown: 20,
    max: 3,
    choices: [
      { label: "Ride the buzz", run: () => ({ text: "Fans want the real thing now. Finish it fast.", tone: "good", deltas: { hype: 5 } }) },
      {
        label: "Get it taken down",
        run: (p) => {
          const s = songInProgress(p)!;
          s.quality = clamp(s.quality + 3);
          return { text: "Taken down. You used the time to polish the song.", deltas: { hype: -2 } };
        },
      },
    ],
  },
  {
    id: "dance_teacher",
    icon: "💃🏾",
    title: "A dance video takes off",
    text: (p) => `A dance teacher in Kaduna posted a routine to "${latestRelease(p)?.title}". It has a million views.`,
    when: (p) => !!latestRelease(p) && p.week - (latestRelease(p)?.releaseWeek ?? 0) <= 4,
    weight: 1,
    cooldown: 14,
    max: 4,
    choices: [
      {
        label: "Repost and thank her",
        run: (p) => {
          const s = latestRelease(p)!;
          s.promo = Math.min(200, s.promo + 35);
          return { text: `Free promo! "${s.title}" is climbing.`, tone: "good", deltas: { hype: 4, rep: 1 } };
        },
      },
    ],
  },
  {
    id: "masterclass",
    icon: "🎓",
    title: "A veteran producer's masterclass",
    text: () => "A producer who worked on hits in the 2000s is teaching a weekend class in Yaba. ₦30,000.",
    when: (p) => p.ear < 85,
    weight: 1,
    cooldown: 12,
    max: 4,
    choices: [
      { label: "Attend (₦30,000)", can: (p) => p.cash >= 30_000, run: () => ({ text: "Old tricks, new ears. Your mixes will thank you.", tone: "good", deltas: { cash: -30_000, ear: 5 } }) },
      { label: "Skip it", run: () => ({ text: "Maybe next time.", deltas: {} }) },
    ],
  },
];

function brandPay(p: Player) {
  const a = starArtist(p);
  return a ? Math.round((100_000 + a.star * 6_000) / 1000) * 1000 : 0;
}

function buyout(p: Player) {
  const a = starArtist(p);
  return a ? Math.round((150_000 + a.star * 8_000) / 1000) * 1000 : 0;
}

export const pickEvent = (id: string) => EVENTS.find((e) => e.id === id);
/** How many times an event has happened this game (counted in flags, so old saves just start at 0). */
export const timesSeen = (p: Player, id: string) => p.flags[`ev:${id}`] ?? 0;

/** Seeded: the same run always gets the same events. Seasons change the odds; Chill mode is gentler. */
export function rollEvent(p: Player): string | undefined {
  const r = rng(p.seed, "event", p.week);
  const chill = chillOn(p);
  if (!r.chance(0.45 * (chill ? CHILL.rules.eventOdds : 1))) return undefined;
  const d = calDay(p);
  const ok = EVENTS.filter((e) => e.when(p) && (p.eventsSeen[e.id] === undefined || p.week - p.eventsSeen[e.id] >= e.cooldown) && (e.max === undefined || timesSeen(p, e.id) < e.max) && !(chill && CHILL.rules.never.includes(e.id)));
  return r.weighted(ok, (e) => e.weight * eventWeight(CALENDAR, e.id, d, d + DAYS_PER_TURN) * (chill && CHILL.rules.setbacks.includes(e.id) ? CHILL.rules.setbackWeight : 1))?.id;
}
