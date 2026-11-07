import { GENRE_IDS, GENRES } from "./data";
import { artistName } from "./names";
import { rng } from "./rng";
import type { Artist, Player } from "./types";

const SKINS = ["#5a3a24", "#6e452b", "#7d4f30", "#8d5a37", "#4a2f1d", "#a06a42"];
const BIOS = [
  "Sings at church on Sunday, at the bar on Friday.",
  "Has 3k followers and a mum who believes.",
  "Wrote 200 songs in a notebook. Shows you 3.",
  "Danced for other artists. Wants the mic now.",
  "Freestyles in danfo queues. Crowd loves it.",
  "Studied engineering. Parents don't know about this.",
  "Viral once for a cover. Wants a real hit.",
  "Raspy voice, big heart, bigger ego.",
  "From Makurdi with love songs and patience.",
  "Shy until the beat drops.",
];

/** Signing cost for an artist. */
export function advanceFor(a: Pick<Artist, "talent" | "star">) {
  return Math.round((30_000 + a.talent * 900 + a.star * a.star * 120) / 1000) * 1000;
}

/** Open-mic acts for a given week: unknowns at the start, better acts as the label grows. */
export function candidatesFor(p: Player, week: number): Artist[] {
  const out: Artist[] = [];
  const lvl = p.level;
  for (let i = 0; i < 3; i++) {
    const r = rng(p.seed, "cand", week, i);
    const genre = r.chance(0.3) ? p.trend.genre : r.pick(GENRE_IDS);
    // the very first act is always one a broke producer can afford
    const first = week === 1 && i === 0;
    const talent = Math.round(Math.min(first ? 40 : 95, r.range(25, 55) + lvl * 9 + (i === 2 ? 8 : 0)));
    const star = Math.round(Math.min(first ? 8 : 90, r.range(2, 18) + lvl * 10 + (i === 2 ? 6 : 0)));
    const ego = Math.round(r.range(15, 70) + star * 0.3);
    const street = genre === "streethop" || genre === "drill";
    const loyaltyBase = r.range(45, 70) + (street ? (p.cred - 25) * 0.4 : 0);
    const a: Artist = {
      id: `a${week}_${i}`,
      name: artistName(r),
      genre,
      talent,
      star,
      ego: Math.min(100, ego),
      loyalty: Math.round(Math.max(15, Math.min(90, loyaltyBase))),
      mood: 70,
      advance: 0,
      royalty: Math.round(r.range(0.3, 0.45) * 100) / 100,
      signedWeek: 0,
      lastReleaseWeek: 0,
      look: { skin: r.pick(SKINS), hue: Math.round(r.range(0, 360)), hair: r.int(0, 4) },
      bio: `${GENRES[genre].name}. ${r.pick(BIOS)}`,
    };
    a.advance = advanceFor(a);
    out.push(a);
  }
  return out;
}

export const slotsUsed = (p: Player) => p.artists.length;
