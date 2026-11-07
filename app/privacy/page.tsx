import type { Metadata } from "next";
import { Contact, LegalPage, OPERATOR } from "@/components/legal/Legal";

export const metadata: Metadata = { title: "Privacy · Afrobeats King", description: "What Afrobeats King stores, why, and how to delete it." };

const ROWS: [string, string, string][] = [
  ["Your game save and settings, on your phone", "So you can carry on where you stopped", "Until you clear your browser data"],
  ["A random device code (not linked to your name)", "To give you gold you're owed, count invites and stop cheating", "While you play"],
  ["Live map: your boss's first name, label name, look, genre camp, place and label level", "So other players can see and wave at you. Turn it off in Settings", "Hidden after 10 minutes away; deleted after 30 days"],
  ["Waves and notice-board posts (set phrases only, no free typing)", "Light multiplayer", "Waves 7 days, posts 30 days"],
  ["Your genre camp's weekly points", "The weekly camp table and winners' gold", "About 4 months"],
  ["Game milestones, e.g. \"signed an artist\", \"reached Studio level\" (no names)", "To see where players get stuck and fix it", "Up to 6 months; totals kept longer"],
  ["Leaderboard: first name, label name, level and score", "The public leaderboard", "Kept as a record, until you delete it"],
  ["Invite codes: who invited whom, and the invited player's IP address", "To give invite rewards and stop fake invites", "Until you delete it"],
  ["Purchases: reference, item, amount and the email you gave the payment page", "To deliver what you bought, handle refunds, and keep records the law requires", "As long as tax law requires"],
  ["Problem reports: your note, optional contact, and game details (week, phone size, recent errors)", "To fix bugs and reply to you", "Until fixed, then up to 1 year"],
  ["Advertiser and artist bookings: name, business, phone or email, song link", "To run the booking and send its weekly report", "Up to 2 years"],
];

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>Afrobeats King is a free browser game run by {OPERATOR}. You can play without an account, and we collect as little as we can. We follow the Nigeria Data Protection Act 2023.</p>
      <h2>The short version</h2>
      <ul>
        <li>Your game is saved on your own phone.</li>
        <li>We never ask for your real name, phone number or home address. Your boss can have any name.</li>
        <li>We never see your card details. Payments go through a licensed payment company.</li>
        <li>
          You can delete your online data any time in <b>Settings → Delete my online data</b>.
        </li>
        <li>We don&apos;t sell your data.</li>
      </ul>
      <h2>What is stored, and why</h2>
      <table>
        <thead>
          <tr>
            <th>What</th>
            <th>Why</th>
            <th>How long</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([a, b, c]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{b}</td>
              <td>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Who else handles data</h2>
      <ul>
        <li>
          <b>Vercel</b> hosts the game, and <b>Supabase</b> stores the online data above. Both keep short-lived security logs (such as IP addresses).
        </li>
        <li>
          <b>Flutterwave</b> or <b>Paystack</b> take payments under their own privacy policies; we only get a confirmation.
        </li>
        <li>
          <b>Google</b> serves the font. If ads are on, Google ads may use cookies to show and measure ads.
        </li>
        <li>Sponsored songs and billboards link to the sponsor&apos;s own page. We never host their music.</li>
      </ul>
      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your data, or object to how we use it. Most of it you can delete yourself in <b>Settings → Delete my online data</b>. For anything else, <Contact />. We reply within 30 days. You can also complain to the Nigeria Data Protection Commission (NDPC).
      </p>
      <h2>Young players</h2>
      <p>If you are under 18, please play with a parent or guardian&apos;s OK and ask them before buying anything. We don&apos;t knowingly collect personal details from children.</p>
      <h2>Changes</h2>
      <p>If we change this page in a way that matters, we&apos;ll say so in the game. The date at the top shows the latest version.</p>
    </LegalPage>
  );
}
