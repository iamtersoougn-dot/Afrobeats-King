/** Read-only helpers on a Player. Kept apart from engine.ts so events.ts can use them without a circular import. */
import { LEVELS, STUDIO_LEASE } from "./data";
import type { Player } from "./types";

export const netWorth = (p: Player) => p.cash - p.loan + (p.leased ? STUDIO_LEASE.deposit : 0);
export const artistById = (p: Player, id: string) => p.artists.find((a) => a.id === id);
export const songInProgress = (p: Player) => p.songs.find((s) => s.stage === "recording" || s.stage === "mixing" || s.stage === "mastered");
export const releasedSongs = (p: Player) => p.songs.filter((s) => s.stage === "released");
export const latestRelease = (p: Player) => [...releasedSongs(p)].sort((a, b) => (b.releaseWeek ?? 0) - (a.releaseWeek ?? 0))[0];
export const slots = (p: Player) => LEVELS[p.level].slots;
