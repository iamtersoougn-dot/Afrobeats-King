import { db } from "@/lib/server/db";
import { ipOf, limited } from "@/lib/server/rate";
import { AD_BANNED, AD_PACKAGES, AD_WEEKS } from "@/lib/adPackages";
import { reportKey } from "@/lib/server/adPay";

const clean = (s: unknown, max: number) => String(s ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

/** A brand's or artist's booking. Saved, then paid online straight away (Flutterwave) or by a link the owner sends. */
export async function POST(request: Request) {
  const c = db();
  if (!c) return Response.json({ ok: false, configured: false, reason: "Bookings aren't switched on yet. Please email us." });
  if (limited(`ad:${ipOf(request)}`, 5, 3_600_000)) return Response.json({ ok: false, reason: "Too many requests. Try again later." }, { status: 429 });
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const pkg = AD_PACKAGES.find((p) => p.id === clean(b.package, 20));
  const link = clean(b.link, 200);
  const row = {
    business: clean(b.business, 60),
    contact_name: clean(b.name, 40),
    contact: clean(b.contact, 80),
    package: pkg?.id ?? "",
    brand_text: clean(b.brandText, 40),
    link: /^https:\/\/[^\s]+$/.test(link) ? link : null,
    message: clean(b.message, 500),
    weeks: AD_WEEKS.includes(Number(b.weeks)) ? Number(b.weeks) : 1,
  };
  if (!pkg || !row.business || !row.contact_name || row.contact.length < 6) return Response.json({ ok: false, reason: "Please fill in your name, business or artist name, and a phone number or email." }, { status: 400 });
  if (pkg.needsLink && !row.link) return Response.json({ ok: false, reason: "Add a link (starting with https://) to your song on a streaming site." }, { status: 400 });
  const text = `${row.business} ${row.brand_text} ${row.message}`.toLowerCase();
  if (AD_BANNED.some((w) => text.includes(w))) return Response.json({ ok: false, reason: "We don't take ads for gambling, loan apps, alcohol or tobacco." }, { status: 400 });
  const { data, error } = await c.from("abk_ad_requests").insert(row).select("id").single();
  if (error || !data) return Response.json({ ok: false, reason: "Couldn't save your request. Try again in a minute." });
  const key = reportKey(data.id);
  return Response.json({ ok: true, id: data.id, payOnline: !!process.env.FLW_SECRET_KEY, report: key ? `/advertise/report?id=${data.id}&key=${key}` : null });
}
