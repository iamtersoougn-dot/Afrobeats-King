import { db } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";

const clean = (s: unknown, max: number) => String(s ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

export async function GET(request: Request) {
  const c = db();
  if (!c) return Response.json({ configured: false, rows: [] });
  const limit = Math.min(100, Number(new URL(request.url).searchParams.get("limit") ?? 50) || 50);
  const { data, error } = await c.from("abk_leaderboard").select("name, label, title, score").order("score", { ascending: false }).limit(limit);
  if (error) return Response.json({ configured: true, rows: [], error: "unavailable" }, { status: 500 });
  // cached at Vercel's edge for a minute: one database read serves everyone opening the leaderboard
  return Response.json({ configured: true, rows: data }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}

/**
 * Post a label's score. Scores come from the phone, so the server rejects impossible ones:
 * the score can't be more than a label could earn by that week, and each phone keeps only its best row.
 */
export async function POST(request: Request) {
  const c = db();
  if (!c) return Response.json({ configured: false });
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!isUuidish(b.installId)) return Response.json({ ok: false }, { status: 400 });
  if (limited(`lb:${b.installId}`, 3, 3_600_000) || limited(`lbip:${ipOf(request)}`, 10, 3_600_000)) return Response.json({ ok: false, reason: "Try again later." }, { status: 429 });
  const score = Math.round(Number(b.score));
  const week = Math.round(Number(b.week));
  const level = Math.round(Number(b.level));
  if (!Number.isFinite(score) || !Number.isFinite(week) || week < 1 || week > 200 || level < 0 || level > 4) return Response.json({ ok: false }, { status: 400 });
  if (score < 0 || score > Math.min(150_000, 600 * week + 5_000)) return Response.json({ ok: false, reason: "That score doesn't look right." }, { status: 400 });
  const { data: cur } = await c.from("abk_leaderboard").select("score").eq("install_id", b.installId).maybeSingle();
  if (cur && cur.score >= score) return Response.json({ ok: true, kept: true });
  const { error } = await c.from("abk_leaderboard").upsert({ install_id: b.installId, name: clean(b.name, 18) || "Boss", label: clean(b.label, 24), title: clean(b.title, 60), score, week, level, updated_at: new Date().toISOString() }, { onConflict: "install_id" });
  return Response.json({ ok: !error });
}
