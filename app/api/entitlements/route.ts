import { db } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";

/**
 * Purchases recorded by the payment webhooks and server rewards (season wins, invites) for this phone,
 * so "Restore purchases" and the next game load can hand them out.
 */
export async function GET(request: Request) {
  const c = db();
  if (!c) return Response.json({ configured: false, purchases: [], rewards: [] });
  if (limited(`ent:${ipOf(request)}`, 20, 60_000)) return Response.json({ error: "slow down" }, { status: 429 });
  const install = new URL(request.url).searchParams.get("install");
  if (!isUuidish(install)) return Response.json({ purchases: [], rewards: [] });
  const [{ data: purchases }, { data: rewards }] = await Promise.all([
    c.from("abk_purchases").select("reference, product_id").eq("install_id", install).limit(200),
    c.from("abk_rewards").select("id, gold, reason").eq("install_id", install).limit(200),
  ]);
  return Response.json({ configured: true, purchases: purchases ?? [], rewards: rewards ?? [] });
}
