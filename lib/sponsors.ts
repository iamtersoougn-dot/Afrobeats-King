/**
 * Paid placements: billboards in the world and sponsored songs on Lagoon FM / the ClipTok feed.
 * Managed without code: set NEXT_PUBLIC_SPONSORS_JSON in Vercel (shape below), then redeploy.
 * Sponsored songs are real upcoming artists who paid to be promoted. They are always labelled
 * "Sponsored" and link out to the artist's own licensed audio; the game never hosts their music.
 * No ads for gambling, loan apps, alcohol or tobacco (see /terms).
 */
export interface Billboard {
  id: string;
  slot: "bridge" | "sanctuary" | "radio";
  brand: string;
  line: string;
  color: string;
  url?: string;
}
export interface SponsoredSong {
  id: string;
  artist: string;
  title: string;
  url: string; // the artist's own link (their streaming page)
  blurb?: string;
}
interface Inventory {
  billboards: Billboard[];
  songs: SponsoredSong[];
}

const HOUSE: Billboard[] = [
  { id: "house-bridge", slot: "bridge", brand: "Your brand here", line: "Billboards from ₦5,000/week", color: "#ffc93c", url: "/advertise" },
  { id: "house-sanctuary", slot: "sanctuary", brand: "Your brand here", line: "Be seen at The Sanctuary", color: "#ff4f9a", url: "/advertise" },
  { id: "house-radio", slot: "radio", brand: "Promote your song", line: "Upcoming artists: get heard", color: "#37d3c4", url: "/advertise" },
];

function load(): Inventory {
  const raw = process.env.NEXT_PUBLIC_SPONSORS_JSON;
  if (raw) {
    try {
      const j = JSON.parse(raw) as Partial<Inventory>;
      return {
        billboards: Array.isArray(j.billboards) ? j.billboards.filter((b) => b && b.slot && b.brand) : [],
        songs: Array.isArray(j.songs) ? j.songs.filter((s) => s && s.artist && s.title && /^https:\/\//.test(s.url)) : [],
      };
    } catch {
      /* fall through to house ads */
    }
  }
  return { billboards: [], songs: [] };
}

const INV = load();
/** The billboard in a slot: a paying brand if there is one, otherwise our own "advertise here". */
export const billboardFor = (slot: Billboard["slot"]) => INV.billboards.find((b) => b.slot === slot) ?? HOUSE.find((b) => b.slot === slot)!;
export const SPONSORED_SONGS = INV.songs;
