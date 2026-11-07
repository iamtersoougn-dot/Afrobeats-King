import { db } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";
import { BOARD_PHRASES, SCOPE } from "@/lib/live";
import { pidOf } from "@/lib/server/live";

/** Post a set phrase to the notice board: {installId, name, scope, msg (phrase key)}. No free text, so no moderation needed. */
export async function POST(request: Request) {
  const c = db();
  if (!c) return Response.json({ ok: false, configured: false });
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!isUuidish(b.installId) || b.scope !== SCOPE || !(String(b.msg) in BOARD_PHRASES)) return Response.json({ ok: false }, { status: 400 });
  const pid = pidOf(b.installId);
  if (limited(`board:${pid}`, 1, 120_000) || limited(`boardip:${ipOf(request)}`, 20, 3_600_000)) return Response.json({ ok: false, reason: "slow down" }, { status: 429 });
  const name = String(b.name ?? "").replace(/[<>]/g, "").trim().slice(0, 14) || "Boss";
  const { error } = await c.from("abk_board_posts").insert({ scope: SCOPE, pid, name, msg: String(b.msg) });
  return Response.json({ ok: !error });
}
