import { productById } from "@/lib/products";
import { logPurchase, purchaseOwner } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";

/**
 * Paystack (backup provider). Verifies a transaction on the server before the game grants anything:
 * success, naira, amount ≥ price, the product matches, the buyer is this phone, and a reference unlocks only once.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return Response.json({ ok: false, message: "Payments are not configured on the server." }, { status: 503 });
  if (limited(`verify:${ipOf(request)}`, 20, 60_000)) return Response.json({ ok: false, message: "Too many attempts, wait a minute." }, { status: 429 });
  let body: { reference?: string; productId?: string; installId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Bad request" }, { status: 400 });
  }
  const reference = String(body.reference ?? "");
  const product = productById(String(body.productId ?? ""));
  if (!reference || !/^[\w.-]{6,100}$/.test(reference) || !product || !isUuidish(body.installId)) return Response.json({ ok: false, message: "Invalid purchase" }, { status: 400 });
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
  if (!res.ok) return Response.json({ ok: false, message: "Could not verify payment yet. Try again shortly." }, { status: 502 });
  const json = (await res.json()) as { status: boolean; data?: { status: string; amount: number; currency: string; metadata?: { productId?: string; installId?: string }; customer?: { email?: string } } };
  const d = json.data;
  const paidOk = json.status && d?.status === "success" && d.currency === "NGN" && d.amount >= product.priceNaira * 100;
  if (!paidOk || d?.metadata?.productId !== product.id) return Response.json({ ok: false, message: "Payment not successful." }, { status: 402 });
  if (d.metadata?.installId !== body.installId) return Response.json({ ok: false, message: "This payment was made on another phone." }, { status: 403 });
  const owner = await purchaseOwner(reference);
  if (owner && owner !== body.installId) return Response.json({ ok: false, message: "This payment was already used." }, { status: 409 });
  await logPurchase({ reference, productId: product.id, amountKobo: d.amount, email: d.customer?.email ?? null, source: "paystack", installId: body.installId });
  return Response.json({ ok: true, productId: product.id });
}
