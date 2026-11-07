import { db } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";

const clean = (s: unknown, max: number) => String(s ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const KINDS = ["bug", "stuck", "slow", "money", "idea", "other"];

/** "Report a problem": stores the player's note plus game details (stage, turn, device, recent errors). */
export async function POST(request: Request) {
  const c = db();
  if (!c) return Response.json({ ok: false, configured: false });
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const install = isUuidish(b.installId) ? b.installId : null;
  if (limited(`report:${install ?? "anon"}`, 4, 3_600_000) || limited(`reportip:${ipOf(request)}`, 12, 3_600_000))
    return Response.json({ ok: false, reason: "You've sent a few reports already. Thank you! Try again in an hour." }, { status: 429 });
  const message = clean(b.message, 1500);
  const kind = KINDS.includes(String(b.kind)) ? String(b.kind) : "other";
  if (message.length < 5) return Response.json({ ok: false, reason: "Tell us a little about what happened." }, { status: 400 });
  // details are small and shallow: cap the size so nobody can stuff the table
  let details: unknown = {};
  try {
    const raw = JSON.stringify(b.details ?? {});
    details = raw.length <= 6000 ? JSON.parse(raw) : { truncated: raw.slice(0, 6000) };
  } catch {
    details = {};
  }
  const { error } = await c.from("abk_bug_reports").insert({ install_id: install, kind, message, contact: clean(b.contact, 80) || null, details });
  return Response.json({ ok: !error, reason: error ? "Couldn't send right now. Try again in a minute." : undefined });
}
