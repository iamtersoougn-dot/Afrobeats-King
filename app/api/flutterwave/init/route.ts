import { productById } from "@/lib/products";
import { createPayment, flwConfigured, newTxRef, siteUrl } from "@/lib/server/flutterwave";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";

/** Starts a Flutterwave payment for a game item. The price comes from the server's own product list. */
export async function POST(request: Request) {
  if (!flwConfigured()) return Response.json({ ok: false, message: "Payments are not configured on the server." }, { status: 503 });
  if (limited(`flwinit:${ipOf(request)}`, 10, 60_000)) return Response.json({ ok: false, message: "Too many attempts, wait a minute." }, { status: 429 });
  let b: { productId?: string; email?: string; installId?: string };
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Bad request" }, { status: 400 });
  }
  const product = productById(String(b.productId ?? ""));
  const email = String(b.email ?? "").trim().slice(0, 120);
  if (!product) return Response.json({ ok: false, message: "Unknown item" }, { status: 400 });
  if (!isUuidish(b.installId)) return Response.json({ ok: false, message: "Open the game again and retry." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ ok: false, message: "Enter a valid email for your receipt." }, { status: 400 });
  const txRef = newTxRef("abk", product.id);
  const res = await createPayment({
    txRef,
    amount: product.priceNaira,
    email,
    redirectUrl: `${siteUrl(request)}/?pay=flw`,
    title: "Afrobeats King",
    description: product.name,
    meta: { productId: product.id, installId: b.installId },
  });
  if ("error" in res) return Response.json({ ok: false, message: res.error }, { status: 502 });
  return Response.json({ ok: true, link: res.link, txRef });
}
