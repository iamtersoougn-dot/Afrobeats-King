/** In-game advertising and music promotion. Prices in naira per week. */
export interface AdPackage {
  id: string;
  name: string;
  emoji: string;
  price: number;
  where: string;
  who: string;
  /** artists promoting a song must give a link to their own music */
  needsLink?: boolean;
}

export const AD_PACKAGES: AdPackage[] = [
  { id: "song", name: "Sponsored song", emoji: "🎵", price: 5_000, where: "Your song in every player's ClipTok feed and the 'watch for gold' break, labelled Sponsored, with a link to your music", who: "Upcoming artists", needsLink: true },
  { id: "radio", name: "Lagoon FM spot", emoji: "📻", price: 7_500, where: "Your name and message in the Lagoon FM radio break", who: "Artists, events, small brands" },
  { id: "bridge", name: "Third Mainland billboard", emoji: "🌉", price: 15_000, where: "The big billboard by the bridge on everyone's Lagos map", who: "Drinks (non-alcoholic), telcos, fintechs, food brands" },
  { id: "sanctuary", name: "Sanctuary stage banner", emoji: "🏛️", price: 25_000, where: "The banner at The Sanctuary, the game's concert hall", who: "Event promoters, telcos, fashion" },
  { id: "concert", name: "Virtual concert", emoji: "🎤", price: 50_000, where: "A sponsored concert night at The Sanctuary: your name on the marquee, in the feed and the notice board, with a link to your music", who: "Artists with a release or tour", needsLink: true },
];
export const AD_WEEKS = [1, 2, 4];
/** Never sold: gambling, loan apps, alcohol, tobacco (see /terms). */
export const AD_BANNED = ["gambling", "betting", "loan app", "alcohol", "tobacco"];
