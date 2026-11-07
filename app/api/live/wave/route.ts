import { db } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";
import { WAVES } from "@/lib/live";
import { pidOf } from "@/lib/server/live";

/** Send a wave to another player: {installId, name, label, to (their public id), emoji}. */
export async function POST(request: Request) {
  const c = db();
  if (!c) return Response.json({ ok: false, configured: false });
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!isUuidish(b.installId) || typeof b.to !== "string" || !/^[0-9a-f]{16}$/.test(b.to)) return Response.json({ ok: false }, { status: 400 });
  if (!WAVES.includes(b.emoji as (typeof WAVES)[number])) return Response.json({ ok: false }, { status: 400 });
  const from = pidOf(b.installId);
  if (from === b.to) return Response.json({ ok: false }, { status: 400 });
  // one wave per person per 10 minutes, and a cap per sender
  if (limited(`wave:${from}:${b.to}`, 1, 600_000) || limited(`wavefrom:${from}`, 20, 3_600_000) || limited(`waveip:${ipOf(request)}`, 40, 3_600_000)) return Response.json({ ok: false, reason: "slow down" }, { status: 429 });
  const name = String(b.name ?? "").replace(/[<>]/g, "").trim().slice(0, 14) || "Boss";
  const label = String(b.label ?? "").replace(/[<>]/g, "").trim().slice(0, 24);
  const { error } = await c.from("abk_waves").insert({ from_pid: from, from_name: name, from_label: label, to_pid: b.to, emoji: b.emoji });
  return Response.json({ ok: !error });
}
