import { db } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";
import { pidOf } from "@/lib/server/live";

/**
 * "Delete my online data": removes everything stored about this phone's install id
 * (live map, waves, board posts, season points, analytics, invites, rewards, problem reports, leaderboard rows).
 * Payment records are kept because the law requires them.
 */
export async function POST(request: Request) {
  const c = db();
  if (!c) return Response.json({ ok: true, configured: false });
  if (limited(`del:${ipOf(request)}`, 5, 3_600_000)) return Response.json({ ok: false }, { status: 429 });
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!isUuidish(b.installId)) return Response.json({ ok: false }, { status: 400 });
  const id = b.installId;
  const pid = pidOf(id);
  const jobs = [
    c.from("abk_presence").delete().eq("pid", pid),
    c.from("abk_waves").delete().or(`from_pid.eq.${pid},to_pid.eq.${pid}`),
    c.from("abk_board_posts").delete().eq("pid", pid),
    c.from("abk_season_scores").delete().eq("pid", pid),
    c.from("abk_season_claims").delete().eq("pid", pid),
    c.from("abk_events").delete().eq("install_id", id),
    c.from("abk_referrals").delete().or(`referee_install.eq.${id},referrer_install.eq.${id}`),
    c.from("abk_ambassadors").delete().eq("install_id", id),
    c.from("abk_rewards").delete().eq("install_id", id),
    c.from("abk_bug_reports").delete().eq("install_id", id),
    c.from("abk_leaderboard").delete().eq("install_id", id),
  ];
  const res = await Promise.allSettled(jobs.map((j) => Promise.resolve(j)));
  const failed = res.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && (r.value as { error: unknown }).error)).length;
  return Response.json({ ok: failed === 0, failed });
}
