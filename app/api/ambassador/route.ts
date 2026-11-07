import { randomInt } from "node:crypto";
import { db } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";
import { CAMPS } from "@/lib/daily";

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const makeCode = (name: string) => {
  const base = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "BOSS";
  let tail = "";
  for (let i = 0; i < 4; i++) tail += ALPHA[randomInt(ALPHA.length)];
  return `${base}-${tail}`;
};

/** Invite codes: POST {installId, name, camp} → {code, invites, goldEarned} (creates the code once). */
export async function POST(request: Request) {
  const c = db();
  if (!c) return Response.json({ configured: false });
  if (limited(`amb:${ipOf(request)}`, 20, 60_000)) return Response.json({ ok: false }, { status: 429 });
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!isUuidish(b.installId)) return Response.json({ ok: false }, { status: 400 });
  const name = String(b.name ?? "").replace(/[<>]/g, "").trim().slice(0, 14) || "Boss";
  const camp = typeof b.camp === "string" && b.camp in CAMPS ? b.camp : null;
  try {
    let { data: me } = await c.from("abk_ambassadors").select("code").eq("install_id", b.installId).maybeSingle();
    if (!me) {
      for (let i = 0; i < 5 && !me; i++) {
        const code = makeCode(name);
        const { error } = await c.from("abk_ambassadors").insert({ code, install_id: b.installId, name, camp });
        if (!error) me = { code };
      }
      if (!me) return Response.json({ ok: false }, { status: 500 });
    }
    const { count } = await c.from("abk_referrals").select("referee_install", { count: "exact", head: true }).eq("referrer_install", b.installId);
    return Response.json({ configured: true, code: me.code, invites: count ?? 0, goldEarned: (count ?? 0) * 100 });
  } catch {
    return Response.json({ configured: false });
  }
}
