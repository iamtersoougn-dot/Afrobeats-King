/** Tour Pass: a monthly season with a free and a premium reward track (premium sold in the shop). */
export const SEASON_TIERS = 30;
export const XP_PER_TIER = 120;

const THEMES = ["Long January Grind", "Love Songs", "Festival Run", "Easter Owambe", "Rain and Riddims", "Music Day", "Mid-year Mixtape", "Awards Race", "Back to Business", "Green-White Vibes", "Harmattan Hits", "Detty December"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function currentSeason(now: Date) {
  const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return { id, name: `${MONTHS[now.getMonth()]} Tour · ${THEMES[now.getMonth()]}`, end };
}

export type Reward = { kind: "gold" | "energy" | "item"; value: number | string; label: string };

export function freeReward(tier: number): Reward {
  if (tier % 5 === 0) return { kind: "gold", value: 15, label: "15 🪙" };
  if (tier % 2 === 0) return { kind: "energy", value: 30, label: "+30 ⚡" };
  return { kind: "gold", value: 5, label: "5 🪙" };
}

export function premiumReward(tier: number): Reward {
  if (tier === 10) return { kind: "item", value: "tour_jacket", label: "Tour jacket" };
  if (tier === 20) return { kind: "item", value: "gold_mic", label: "Gold mic chain" };
  if (tier === 30) return { kind: "gold", value: 150, label: "150 🪙" };
  if (tier % 5 === 0) return { kind: "gold", value: 40, label: "40 🪙" };
  return { kind: "gold", value: 15, label: "15 🪙" };
}

export const XP = { action: 3, week: 12, quest: 40, event: 6, achievement: 25, daily: 30 };
