import { productById } from "@/lib/products";
import { logPurchase } from "@/lib/server/db";
import { markAdPaid } from "@/lib/server/adPay";
import { adRequestOfRef, flwConfigured, paidInFull, productOfRef, validRef, verifyTx, webhookTrusted } from "@/lib/server/flutterwave";

/**
 * Flutterwave webhook. In the Flutterwave dashboard → Settings → Webhooks:
 *   URL: https://YOUR-DOMAIN/api/flutterwave/webhook   Secret hash: the same text as FLW_SECRET_HASH
 * Every call is re-checked with Flutterwave's API before anything is recorded, so a faked call does nothing.
 * Game purchases recorded here reach the player through "Restore purchases" or the next game load.
 */
export async function POST(request: Request) {
  if (!flwConfigured()) return new Response("not configured", { status: 503 });
  const raw = await request.text();
  if (!webhookTrusted(raw, request.headers)) return new Response("invalid signature", { status: 401 });
  try {
    const evt = JSON.parse(raw) as { event?: string; type?: string; data?: { id?: number; tx_ref?: string } };
    const d = evt.data;
    if ((evt.event ?? evt.type) !== "charge.completed" || !d || !validRef(d.tx_ref)) return new Response("ok");
    const tx = await verifyTx({ id: d.id, txRef: d.tx_ref });
    const adId = adRequestOfRef(d.tx_ref);
    if (adId !== null) {
      if (tx && tx.status === "successful" && tx.currency === "NGN" && tx.tx_ref === d.tx_ref) await markAdPaid(adId, tx);
      return new Response("ok");
    }
    const product = productById(productOfRef(d.tx_ref) ?? "");
    if (!product || !tx || !paidInFull(tx, d.tx_ref, product.priceNaira)) return new Response("ok");
    const meta = (tx.meta ?? {}) as Record<string, unknown>;
    const install = typeof meta.installId === "string" && /^[\w-]{8,64}$/.test(meta.installId) ? meta.installId : null;
    await logPurchase({ reference: d.tx_ref, productId: product.id, amountKobo: Math.round(tx.amount * 100), email: tx.customer?.email ?? null, source: "flutterwave-webhook", installId: install });
  } catch {
    /* malformed: ignore */
  }
  return new Response("ok");
}
