import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, OPERATOR } from "@/components/legal/Legal";

export const metadata: Metadata = { title: "Terms · Afrobeats King", description: "The rules for playing Afrobeats King, buying gold and passes, refunds, and promoting music." };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p>These terms are the agreement between you and {OPERATOR}, who run Afrobeats King. By playing, you agree to them. We&apos;ve kept them short and plain.</p>
      <h2>1. The game</h2>
      <ul>
        <li>Afrobeats King is a free game about running a record label in Lagos. It is fiction. Every artist, song, label, radio station, venue and platform in it is made up, and the game uses no real artist&apos;s name, likeness or lyrics.</li>
        <li>Real artists appear only when they pay to promote their own music. Those spots are always labelled &quot;Sponsored&quot; and link to the artist&apos;s own page.</li>
        <li>Payola, streaming farms and loans in the game are satire. Nothing in the game is advice about the music business, money or contracts.</li>
        <li>The game may change, get new features, or lose old ones. We try hard not to break your save.</li>
      </ul>
      <h2>2. Playing fair</h2>
      <ul>
        <li>Don&apos;t cheat the online features (live map, genre camps, leaderboard, invites), attack the servers, or use bots.</li>
        <li>Don&apos;t use offensive or real artists&apos; names for your boss or label. We may remove names, scores or posts that break these rules, and block players who keep doing it.</li>
        <li>Gold never buys streams, chart places, hype or artists. That is on purpose.</li>
      </ul>
      <h2>3. Gold, passes and other purchases</h2>
      <ul>
        <li>You can buy gold, the Odogwu Pass (VIP), the monthly Tour Pass and ad removal with naira. Prices are shown before you pay, and payment is taken by Flutterwave or Paystack.</li>
        <li>Gold, items and passes are a licence to use them inside the game. They have no cash value, can&apos;t be swapped for money, and can&apos;t be moved to someone else.</li>
        <li>Items arrive straight away. The Tour Pass and VIP last for the time shown.</li>
        <li>Your purchases live in your save on this phone. Use <b>Wallet → Restore purchases</b> on the same phone if something goes missing.</li>
        <li>If you are under 18, ask a parent or guardian before buying anything.</li>
      </ul>
      <h2>4. Refunds</h2>
      <ul>
        <li>
          <b>Paid but didn&apos;t get it?</b> Tap <b>Wallet → Restore purchases</b>. If it still hasn&apos;t arrived, report it within 14 days (Settings → Report a problem → Payment problem) with your payment reference. We&apos;ll deliver it or refund you in full.
        </li>
        <li>
          <b>Charged twice for the same thing?</b> We refund the extra payment.
        </li>
        <li>
          <b>Bought by mistake?</b> Tell us within 48 hours. If you haven&apos;t used it, we&apos;ll refund it.
        </li>
        <li>Refunds go back to the card or account you paid with, usually within 5–10 working days.</li>
      </ul>
      <h2>5. Ads, sponsors and music promotion</h2>
      <p>
        Brands can book billboards and artists can promote their songs on the <Link href="/advertise">advertise page</Link>. Artists must own or be licensed to promote the music they link to. Sponsors are responsible for their own offers. We don&apos;t accept ads for gambling, loan apps, alcohol, tobacco or anything illegal, and we check every booking before it goes live.
      </p>
      <h2>6. Your content and ours</h2>
      <p>The game&apos;s art, code, writing and characters belong to {OPERATOR}. You&apos;re welcome to share screenshots and clips of your play.</p>
      <h2>7. Limits</h2>
      <p>We provide the game as it is and can&apos;t promise it will always be online or bug-free. As far as the law allows, we aren&apos;t responsible for indirect losses, such as lost progress after clearing browser data. Nothing here takes away your rights under Nigerian consumer protection law.</p>
      <h2>8. Changes and contact</h2>
      <p>
        We may update these terms; big changes will be announced in the game. These terms are governed by the laws of the Federal Republic of Nigeria. Questions or complaints: <Contact />.
      </p>
    </LegalPage>
  );
}
