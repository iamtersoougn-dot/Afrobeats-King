import crypto from "crypto";
import { logPurchase } from "@/lib/server/db";
import { productById } from "@/lib/products";

/**
 * Paystack webhook (backup provider). In Paystack → Settings → API Keys & Webhooks:
 *   https://YOUR-DOMAIN/api/paystack/webhook
 * Checks the x-paystack-signature (HMAC SHA-512 of the body with the secret key) before recording anything.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return new Response("not configured", { status: 503 });
  const raw = await request.text();
  const sig = request.headers.get("x-paystack-signature") ?? "";
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return new Response("invalid signature", { status: 401 });
  try {
    const evt = JSON.parse(raw) as { event: string; data: { reference: string; amount: number; currency?: string; customer?: { email?: string }; metadata?: { productId?: string; installId?: string } } };
    if (evt.event === "charge.success") {
      const md = evt.data.metadata ?? {};
      const prod = productById(md.productId ?? "");
      if (!prod || evt.data.currency !== "NGN" || evt.data.amount < prod.priceNaira * 100) return new Response("ok");
      const install = md.installId && /^[\w-]{8,64}$/.test(md.installId) ? md.installId : null;
      await logPurchase({ reference: evt.data.reference, productId: prod.id, amountKobo: evt.data.amount, email: evt.data.customer?.email ?? null, source: "paystack-webhook", installId: install });
    }
  } catch {
    /* ignore malformed */
  }
  return new Response("ok");
}
