import { productById } from "@/lib/products";
import { logPurchase, purchaseOwner } from "@/lib/server/db";
import { flwConfigured, paidInFull, productOfRef, validRef, verifyTx } from "@/lib/server/flutterwave";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";

/**
 * Confirms a game purchase with Flutterwave before the game hands anything out.
 * Checks: paid, in naira, amount covers the price, the item comes from our own reference,
 * the payment was started on this phone, and a reference unlocks only once.
 */
export async function POST(request: Request) {
  if (!flwConfigured()) return Response.json({ ok: false, message: "Payments are not configured on the server." }, { status: 503 });
  if (limited(`flwverify:${ipOf(request)}`, 20, 60_000)) return Response.json({ ok: false, message: "Too many attempts, wait a minute." }, { status: 429 });
  let b: { txRef?: string; transactionId?: string | number; installId?: string };
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Bad request" }, { status: 400 });
  }
  if (!validRef(b.txRef) || !isUuidish(b.installId)) return Response.json({ ok: false, message: "Invalid purchase" }, { status: 400 });
  const product = productById(productOfRef(b.txRef) ?? "");
  if (!product) return Response.json({ ok: false, message: "Invalid purchase" }, { status: 400 });
  const tx = await verifyTx({ id: b.transactionId, txRef: b.txRef });
  if (!tx) return Response.json({ ok: false, pending: true, message: "We couldn't confirm the payment yet. We'll check again next time you open the game." }, { status: 202 });
  if (!paidInFull(tx, b.txRef, product.priceNaira)) return Response.json({ ok: false, message: tx.status === "successful" ? "Payment amount didn't match." : "Payment not completed." }, { status: 402 });
  const meta = (tx.meta ?? {}) as Record<string, unknown>;
  if (meta.installId !== b.installId) return Response.json({ ok: false, message: "This payment was made on another phone. Open the game there to get it." }, { status: 403 });
  const owner = await purchaseOwner(b.txRef);
  if (owner && owner !== b.installId) return Response.json({ ok: false, message: "This payment was already used." }, { status: 409 });
  await logPurchase({ reference: b.txRef, productId: product.id, amountKobo: Math.round(tx.amount * 100), email: tx.customer?.email ?? null, source: "flutterwave", installId: b.installId });
  return Response.json({ ok: true, productId: product.id });
}
