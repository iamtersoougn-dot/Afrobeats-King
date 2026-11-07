/** Shared bits for light multiplayer (client + server). Everyone plays on the same Lagos map. */
import type { Genre } from "./game/types";

export interface LiveLook {
  skin: string;
  hair: number;
  hue: number;
  outfit?: string;
  extra?: string;
}
export interface LivePlayer {
  pid: string;
  name: string;
  label: string | null;
  camp: Genre | null;
  place: string | null;
  look: LiveLook | null;
  level: number | null;
  ago: number; // seconds since last seen
}
export interface BoardPost {
  id: number;
  name: string;
  msg: string;
  ago: number;
  mine?: boolean;
}
export const SCOPE = "lagos";
export const WAVES = ["👋", "🙌🏾", "🔥", "🎶", "🙏🏾"] as const;

/** Notice-board phrases. Players can only post these, so the board never needs moderating. */
export const BOARD_PHRASES: Record<string, string> = {
  beat: "Who needs a beat? 🎹",
  collab: "Looking for a collab 🤝🏾",
  dropped: "My song just dropped! 🚀",
  stream: "Stream my new single 🎧",
  show: "Show at The Sanctuary soon 🎤",
  trend: "Who's jumping on the trend? 📱",
  sapa: "Sapa is real this week 🫠",
  studio: "Studio session tonight 🎙️",
  camp: "My genre camp is winning this week 💪🏾",
  grind: "No days off 💪🏾",
  congrats: "Congrats to this week's No. 1 👑",
  hello: "Hello Lagos! 👋",
};
