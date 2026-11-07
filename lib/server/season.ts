import type { SupabaseClient } from "@supabase/supabase-js";
import { previousWeek, seasonWeek } from "@/lib/daily";

export interface CampRow {
  camp: string;
  players: number;
  pts: number;
}

/** Totals per genre camp for one season week, highest first. */
export async function weekTable(c: SupabaseClient, week: string): Promise<CampRow[]> {
  const { data } = await c.from("abk_season_scores").select("camp, pts").eq("week", week).limit(20000);
  const by = new Map<string, CampRow>();
  for (const r of data ?? []) {
    const m = by.get(r.camp) ?? { camp: r.camp, players: 0, pts: 0 };
    m.players += 1;
    m.pts += r.pts ?? 0;
    by.set(r.camp, m);
  }
  return [...by.values()].sort((a, b) => b.pts - a.pts || b.players - a.players);
}

let cache: { week: string; at: number; winner: CampRow | null } | null = null;
/** Last week's winning camp (cached 10 minutes per server instance). */
export async function lastWinner(c: SupabaseClient, now = new Date()) {
  const week = previousWeek(now);
  if (cache && cache.week === week && Date.now() - cache.at < 600_000) return { week, winner: cache.winner };
  const rows = await weekTable(c, week);
  cache = { week, at: Date.now(), winner: rows[0] && rows[0].pts > 0 ? rows[0] : null };
  return { week, winner: cache.winner };
}

export { seasonWeek };
