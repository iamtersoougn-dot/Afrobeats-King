"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AD_PACKAGES, AD_WEEKS } from "@/lib/adPackages";

type Done = { id: number; payOnline: boolean; report: string | null };

/** Self-serve booking for brands and artists: pick a spot, see a preview, send the request, pay online. */
export default function AdvertiserPage() {
  const [pkg, setPkg] = useState(AD_PACKAGES[0].id);
  const [weeks, setWeeks] = useState(1);
  const [form, setForm] = useState({ name: "", business: "", contact: "", brandText: "", link: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | string>("idle");
  const [done, setDone] = useState<Done | null>(null);
  const [email, setEmail] = useState("");
  const [paid, setPaid] = useState<string | null>(null);
  const p = AD_PACKAGES.find((x) => x.id === pkg)!;
  const total = p.price * weeks;

  // back from Flutterwave
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ref = q.get("tx_ref");
    if (!q.get("booking") || !ref) return;
    window.history.replaceState(null, "", "/advertise");
    if (q.get("status") === "cancelled") {
      setTimeout(() => setPaid("Payment cancelled. Your booking is saved; you can pay later from the link we send."), 0);
      return;
    }
    fetch("/api/flutterwave/ad-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ txRef: ref, transactionId: q.get("transaction_id") }) })
      .then((r) => r.json())
      .then((d) => setPaid(d.ok ? "Paid. Thank you! We'll check your booking and put it live, usually within a day." : d.pending ? "Payment still processing. We'll confirm it shortly." : "We couldn't confirm the payment. Reply to your receipt email or contact us."))
      .catch(() => setPaid("We couldn't confirm the payment yet. We'll check and contact you."));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const send = async () => {
    setState("sending");
    try {
      const r = await fetch("/api/advertise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, package: pkg, weeks }) });
      const d = await r.json();
      if (d.ok) {
        setDone({ id: d.id, payOnline: d.payOnline, report: d.report });
        setState("idle");
      } else setState(d.reason ?? "Couldn't send. Try again.");
    } catch {
      setState("No connection. Try again.");
    }
  };
  const payNow = async () => {
    if (!done) return;
    setState("sending");
    const r = await fetch("/api/flutterwave/ad-init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: done.id, email }) });
    const d = await r.json().catch(() => ({}));
    if (d.ok && d.link) window.location.href = d.link;
    else setState(d.message ?? "Couldn't start the payment.");
  };

  const input = "min-h-[48px] w-full rounded-2xl bg-night-3 px-3 text-[15px] outline-none";
  return (
    <main className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <Link href="/" className="text-sm font-bold text-danfo">
        ← Back to the game
      </Link>
      <h1 className="font-display mt-3 text-[30px] font-black leading-tight">Get seen in Lagos&apos;s music game</h1>
      <p className="mt-2 text-[15px] text-paper/90">Afrobeats King players run record labels on a live map of Lagos. Put your brand on that map, or put your song in front of people who love new music.</p>
      {paid && <p className="mt-4 rounded-2xl bg-lagoon/15 px-3 py-2 text-[14px] text-lagoon">{paid}</p>}

      <h2 className="font-display mt-6 text-[17px] font-bold">1. Pick a spot</h2>
      <div className="mt-2 grid gap-2">
        {AD_PACKAGES.map((x) => (
          <button key={x.id} className={`rounded-2xl border-2 p-3 text-left ${pkg === x.id ? "border-danfo bg-danfo/10" : "border-line bg-night-2"}`} onClick={() => setPkg(x.id)} aria-pressed={pkg === x.id}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{x.emoji}</span>
              <span className="flex-1 text-[15px] font-bold">{x.name}</span>
              <span className="font-bold text-danfo">₦{x.price.toLocaleString()}/week</span>
            </div>
            <p className="mt-1 text-[13px] text-paper/85">{x.where}</p>
            <p className="text-[12.5px] text-lilac">Good for: {x.who}</p>
          </button>
        ))}
      </div>

      <h2 className="font-display mt-6 text-[17px] font-bold">2. How long?</h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {AD_WEEKS.map((w) => (
          <button key={w} className={`min-h-[48px] rounded-xl font-bold ${weeks === w ? "bg-danfo text-danfo-ink" : "bg-night-3"}`} onClick={() => setWeeks(w)}>
            {w} week{w > 1 ? "s" : ""}
          </button>
        ))}
      </div>

      <h2 className="font-display mt-6 text-[17px] font-bold">3. Preview</h2>
      <div className="mt-2 rounded-2xl bg-night-2 p-4">
        {p.needsLink ? (
          <div className="flex items-center gap-3 rounded-2xl bg-night-3 px-3 py-2">
            <span className="text-2xl">🎵</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold">{form.brandText || "Your song title"}</span>
              <span className="block text-[12px] text-lilac">{form.business || "Your artist name"}</span>
            </span>
            <span className="rounded-full bg-night px-2 py-0.5 text-[12px] font-bold">Sponsored</span>
          </div>
        ) : (
          <div className="mx-auto w-[240px] rounded-md border-[3px] border-danfo bg-[#141022] px-3 py-4 text-center" style={{ boxShadow: "0 0 18px rgba(255,201,60,.35)" }}>
            <div className="font-display text-[18px] font-bold text-danfo">{form.business || "Your brand"}</div>
            <div className="text-[12.5px]">{form.brandText || "Your short message"}</div>
          </div>
        )}
      </div>

      <h2 className="font-display mt-6 text-[17px] font-bold">4. Your details</h2>
      {done ? (
        <div className="mt-2 grid gap-3 rounded-2xl bg-night-2 p-4">
          <p className="text-[15px] font-bold text-lagoon">Request saved (booking #{done.id}). Total ₦{total.toLocaleString()}.</p>
          {done.report && (
            <p className="text-[13px] text-lilac">
              Your private weekly report:{" "}
              <a className="text-danfo underline" href={done.report}>
                open and bookmark it
              </a>
              .
            </p>
          )}
          {done.payOnline ? (
            <>
              <label className="grid gap-1 text-[13px] font-bold">
                Email for your receipt
                <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <button className="btn btn-danfo min-h-[50px]" disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || state === "sending"} onClick={payNow}>
                Pay ₦{total.toLocaleString()} now
              </button>
            </>
          ) : (
            <p className="text-[14px]">We&apos;ll contact you with a payment link. Your spot goes live after payment and a quick check.</p>
          )}
          {state !== "idle" && state !== "sending" && <p className="text-[13px] text-okada">{state}</p>}
        </div>
      ) : (
        <div className="mt-2 grid gap-3">
          <label className="grid gap-1 text-[13px] font-bold">
            Your name
            <input className={input} value={form.name} onChange={set("name")} maxLength={40} />
          </label>
          <label className="grid gap-1 text-[13px] font-bold">
            {p.needsLink ? "Artist name" : "Business or brand name"}
            <input className={input} value={form.business} onChange={set("business")} maxLength={60} />
          </label>
          <label className="grid gap-1 text-[13px] font-bold">
            Phone (WhatsApp) or email
            <input className={input} value={form.contact} onChange={set("contact")} maxLength={80} />
          </label>
          <label className="grid gap-1 text-[13px] font-bold">
            {p.needsLink ? "Song title" : "Short message on the billboard (40 letters)"}
            <input className={input} value={form.brandText} onChange={set("brandText")} maxLength={40} />
          </label>
          {p.needsLink && (
            <label className="grid gap-1 text-[13px] font-bold">
              Link to your song (your own streaming page)
              <input className={input} value={form.link} onChange={set("link")} placeholder="https://" maxLength={200} inputMode="url" />
            </label>
          )}
          <label className="grid gap-1 text-[13px] font-bold">
            Anything else? (optional)
            <textarea className="min-h-[90px] w-full rounded-2xl bg-night-3 p-3 text-[15px] outline-none" value={form.message} onChange={set("message")} maxLength={500} />
          </label>
          <p className="text-[12.5px] text-lilac">We don&apos;t take ads for gambling, loan apps, alcohol or tobacco. Every booking is checked before it goes live. Artists must own or be licensed to promote the music they link to.</p>
          {state !== "idle" && state !== "sending" && <p className="text-[13px] text-okada">{state}</p>}
          <button className="btn btn-danfo min-h-[52px] text-[16px]" disabled={state === "sending"} onClick={send}>
            {state === "sending" ? "Sending…" : `Book for ₦${total.toLocaleString()}`}
          </button>
        </div>
      )}
      <p className="mt-10 flex gap-4 text-sm text-lilac">
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        <Link href="/terms" className="underline">
          Terms
        </Link>
      </p>
    </main>
  );
}
