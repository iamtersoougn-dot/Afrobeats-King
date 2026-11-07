import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/server/db";
import { reportKey } from "@/lib/server/adPay";
import { AD_PACKAGES } from "@/lib/adPackages";
import { seasonWeek } from "@/lib/daily";

export const metadata: Metadata = { title: "Your ad report · Afrobeats King", robots: { index: false } };

/** Private weekly report for one booking: how many players saw it and tapped it. Link is keyed with AD_REPORT_SECRET. */
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const q = await searchParams;
  const id = Number(q.id);
  const key = String(q.key ?? "");
  const ok = Number.isInteger(id) && id > 0 && !!reportKey(id) && reportKey(id) === key;
  const c = db();
  if (!ok || !c)
    return (
      <main className="mx-auto max-w-[560px] px-4 py-10">
        <h1 className="font-display text-[24px] font-bold">Report not found</h1>
        <p className="mt-2 text-lilac">Check the link from your booking, or contact us.</p>
      </main>
    );
  const { data: b } = await c.from("abk_ad_requests").select("id, business, package, weeks, status, paid_at, created_at").eq("id", id).maybeSingle();
  const { data: ev } = await c.from("abk_events").select("name, at").in("name", ["ad_view", "ad_tap"]).eq("props->>id", `b${id}`).limit(50000);
  const weeks = new Map<string, { views: number; taps: number }>();
  for (const e of ev ?? []) {
    const w = seasonWeek(new Date(e.at));
    const m = weeks.get(w) ?? { views: 0, taps: 0 };
    if (e.name === "ad_view") m.views++;
    else m.taps++;
    weeks.set(w, m);
  }
  const rows = [...weeks.entries()].sort((a, b2) => b2[0].localeCompare(a[0]));
  const pkg = AD_PACKAGES.find((p) => p.id === b?.package);
  return (
    <main className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <Link href="/advertise" className="text-sm font-bold text-danfo">
        ← Advertise
      </Link>
      <h1 className="font-display mt-3 text-[26px] font-black">{b?.business ?? "Your booking"}</h1>
      <p className="text-lilac">
        {pkg?.emoji} {pkg?.name} · {b?.weeks} week{(b?.weeks ?? 1) > 1 ? "s" : ""} · {b?.status === "live" ? "Live" : b?.status === "paid" ? "Paid, going live soon" : b?.status === "done" ? "Finished" : "Waiting for payment"}
      </p>
      <table className="mt-5 w-full text-left text-[14px]">
        <thead>
          <tr className="text-lilac">
            <th className="py-2">Week</th>
            <th>Seen by players</th>
            <th>Taps</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map(([w, m]) => (
              <tr key={w} className="border-t border-line">
                <td className="py-2">{w}</td>
                <td>{m.views.toLocaleString()}</td>
                <td>{m.taps.toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="py-3 text-lilac">
                No numbers yet. They appear once your spot is live.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-4 text-[12.5px] text-lilac">&quot;Seen&quot; counts each player once per visit to the game. Numbers update every few minutes.</p>
    </main>
  );
}
