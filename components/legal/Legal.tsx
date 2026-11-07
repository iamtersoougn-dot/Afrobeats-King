import Link from "next/link";
import type { ReactNode } from "react";

/** Who runs the game and how to reach them. Set these in Vercel; nothing personal is hard-coded. */
export const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR_NAME || "the Afrobeats King team";
export const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
export const UPDATED = "7 November 2026";

export function Contact() {
  return CONTACT ? (
    <>
      email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, or use <b>Settings → Report a problem</b> in the game
    </>
  ) : (
    <>
      use <b>Settings → Report a problem</b> in the game and leave a WhatsApp number or email so we can reply
    </>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="legal mx-auto max-w-2xl px-4 pb-16 pt-8 text-[15.5px] leading-relaxed text-paper/90">
      <Link href="/" className="text-sm font-bold text-danfo">
        ← Back to the game
      </Link>
      <h1 className="font-display mt-3 text-[clamp(1.8rem,6vw,2.4rem)] font-black leading-tight text-paper">{title}</h1>
      <p className="mt-1 text-sm text-lilac">Last updated {UPDATED}</p>
      {children}
      <p className="mt-10 flex gap-4 text-sm text-lilac">
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        <Link href="/terms" className="underline">
          Terms
        </Link>
        <Link href="/advertise" className="underline">
          Advertise
        </Link>
      </p>
    </main>
  );
}
