import { db } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";

export async function POST(request: Request) {
  const c = db();
  if (!c) return new Response(null, { status: 204 });
  if (limited(`track:${ipOf(request)}`, 30, 60_000)) return new Response(null, { status: 429 });
  let body: { install?: unknown; events?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const install = isUuidish(body.install) ? body.install : null;
  const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
  const rows = events
    .filter((e): e is { n: string; p?: unknown; t?: number } => !!e && typeof (e as { n?: unknown }).n === "string")
    .map((e) => ({ install_id: install, name: e.n.slice(0, 40), props: typeof e.p === "object" ? e.p : {}, at: new Date(Number(e.t) || Date.now()).toISOString() }));
  if (rows.length) await c.from("abk_events").insert(rows);
  return new Response(null, { status: 204 });
}
