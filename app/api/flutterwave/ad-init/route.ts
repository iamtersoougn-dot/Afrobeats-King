import { db } from "@/lib/server/db";
import { AD_PACKAGES } from "@/lib/adPackages";
import { adPrice } from "@/lib/server/adPay";
import { createPayment, flwConfigured, newTxRef, siteUrl } from "@/lib/server/flutterwave";
import { ipOf, limited } from "@/lib/server/rate";

/** Starts payment for a booking that was just saved on /advertise. The price is worked out here, never sent by the browser. */
export async function POST(request: Request) {
  const c = db();
  if (!c || !flwConfigured()) return Response.json({ ok: false, message: "Online payment isn't switched on yet. We'll send you a payment link." }, { status: 503 });
  if (limited(`adinit:${ipOf(request)}`, 6, 600_000)) return Response.json({ ok: false, message: "Too many attempts, wait a few minutes." }, { status: 429 });
  let b: { requestId?: number; email?: string };
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const id = Number(b.requestId);
  const email = String(b.email ?? "").trim().slice(0, 120);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ ok: false, message: "Booking not found." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ ok: false, message: "Enter a valid email for your receipt." }, { status: 400 });
  const { data } = await c.from("abk_ad_requests").select("id, business, package, weeks, status, created_at").eq("id", id).maybeSingle();
  if (!data || data.status === "paid") return Response.json({ ok: false, message: data ? "This booking is already paid. Thank you!" : "Booking not found." }, { status: 400 });
  if (Date.now() - Date.parse(data.created_at) > 7 * 86_400_000) return Response.json({ ok: false, message: "This booking is old. Please send a new request." }, { status: 400 });
  const amount = adPrice(data.package, data.weeks ?? 1);
  const pkg = AD_PACKAGES.find((p) => p.id === data.package);
  if (!amount || !pkg) return Response.json({ ok: false, message: "Booking not found." }, { status: 400 });
  const res = await createPayment({
    txRef: newTxRef("abkad", id),
    amount,
    email,
    name: data.business,
    redirectUrl: `${siteUrl(request)}/advertise?booking=${id}`,
    title: "Afrobeats King ad",
    description: `${pkg.name}, ${data.weeks ?? 1} week${(data.weeks ?? 1) > 1 ? "s" : ""}`,
    meta: { adRequest: id },
  });
  if ("error" in res) return Response.json({ ok: false, message: res.error }, { status: 502 });
  return Response.json({ ok: true, link: res.link });
}
