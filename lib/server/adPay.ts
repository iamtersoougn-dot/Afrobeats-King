import { createHmac } from "node:crypto";
import { AD_PACKAGES, AD_WEEKS } from "@/lib/adPackages";
import { db, logPurchase } from "./db";
import type { FlwTx } from "./flutterwave";

/** Price of a booking, worked out on the server from the package (never trusted from the browser). */
export function adPrice(pkg: string, weeks: number): number | null {
  const p = AD_PACKAGES.find((x) => x.id === pkg);
  if (!p || !AD_WEEKS.includes(weeks)) return null;
  return p.price * weeks;
}

/** Marks a booking paid (once) and records the money with the other purchases. */
export async function markAdPaid(id: number, tx: FlwTx) {
  const c = db();
  if (!c) return false;
  const { data } = await c.from("abk_ad_requests").select("id, package, weeks, status").eq("id", id).maybeSingle();
  if (!data) return false;
  const due = adPrice(data.package, data.weeks ?? 1);
  if (!due || tx.amount < due) return false;
  if (data.status !== "paid") await c.from("abk_ad_requests").update({ status: "paid", paid_ref: tx.tx_ref, amount_paid: tx.amount, paid_at: new Date().toISOString() }).eq("id", id);
  await logPurchase({ reference: tx.tx_ref, productId: `ad_${data.package}`, amountKobo: Math.round(tx.amount * 100), email: tx.customer?.email ?? null, source: "flutterwave" });
  return true;
}

/** Private key for a booking's weekly report link. Needs AD_REPORT_SECRET in Vercel. */
export function reportKey(id: number): string | null {
  const s = process.env.AD_REPORT_SECRET;
  if (!s) return null;
  return createHmac("sha256", s).update(`abk-report:${id}`).digest("hex").slice(0, 20);
}
