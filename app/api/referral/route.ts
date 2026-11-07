import { db } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";

/**
 * An invited player calls this after playing 4 weeks. The link carries an invite code (e.g. AMAKA-7Q3K).
 * Each new player counts once; the inviter gets gold (collected through /api/entitlements), and so does the friend.
 */
const INVITER_GOLD = 100;
const FRIEND_GOLD = 50;

export async function POST(request: Request) {
  const c = db();
  if (!c) return Response.json({ ok: false, configured: false });
  if (limited(`ref:${ipOf(request)}`, 5, 3_600_000)) return Response.json({ ok: false }, { status: 429 });
  let b: { referrer?: unknown; referee?: unknown };
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (typeof b.referrer !== "string" || !/^[\w-]{4,64}$/.test(b.referrer) || !isUuidish(b.referee)) return Response.json({ ok: false }, { status: 400 });
  let referrer = b.referrer;
  const { data: amb } = await c.from("abk_ambassadors").select("install_id").eq("code", referrer.toUpperCase()).maybeSingle();
  if (amb?.install_id) referrer = amb.install_id;
  else if (!isUuidish(referrer)) return Response.json({ ok: false, reason: "unknown code" }, { status: 400 });
  if (referrer === b.referee) return Response.json({ ok: false }, { status: 400 });
  const { error } = await c.from("abk_referrals").insert({ referrer_install: referrer, referee_install: b.referee, ip: ipOf(request) });
  if (error) return Response.json({ ok: false, reason: "already counted" });
  await c.from("abk_rewards").insert([
    { install_id: referrer, gold: INVITER_GOLD, reason: "A friend you invited played their first month" },
    { install_id: b.referee, gold: FRIEND_GOLD, reason: "Welcome gift for joining with an invite" },
  ]);
  return Response.json({ ok: true });
}
