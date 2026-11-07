/** Read-only helpers on a Player. Kept apart from engine.ts so events.ts can use them without a circular import. */
import { LEVELS, STUDIO_LEASE } from "./data";
import { effectsAt } from "../kit/calendar";
import { CALENDAR, DAYS_PER_TURN, START_DAY } from "./kit.config";
import type { Player } from "./types";

export const netWorth = (p: Player) => p.cash - p.loan + (p.leased ? STUDIO_LEASE.deposit : 0);
export const artistById = (p: Player, id: string) => p.artists.find((a) => a.id === id);
export const songInProgress = (p: Player) => p.songs.find((s) => s.stage === "recording" || s.stage === "mixing" || s.stage === "mastered");
export const releasedSongs = (p: Player) => p.songs.filter((s) => s.stage === "released");
export const latestRelease = (p: Player) => [...releasedSongs(p)].sort((a, b) => (b.releaseWeek ?? 0) - (a.releaseWeek ?? 0))[0];
export const slots = (p: Player) => LEVELS[p.level].slots;

/** Is Chill mode on for this run? */
export const chillOn = (p: Player) => !!p.chill;
/** Calendar day (days since 1 Jan 2026) at the start of the current week. */
export const calDay = (p: Player) => p.calDay ?? START_DAY + (p.week - 1) * DAYS_PER_TURN;
/** Season and festival effects for the current week. */
export const effectsNow = (p: Player) => effectsAt(CALENDAR, calDay(p), calDay(p) + DAYS_PER_TURN);
