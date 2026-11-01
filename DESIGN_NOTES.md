# Afrobeats King — Design Notes

> **Read this first in every new work session.** It holds the game's rules, how the code is laid out, the decisions made so far, and what's next.
> **Update it at the end of every session:** add new decisions and refresh "Current status" and "What's next".
> Built on the "Naija life-sim kit" from Campus to Camp (`iamtersoougn-dot/campus-to-camp`) and Japa Journey (`iamtersoougn-dot/japa-journey`). When in doubt, copy how those repos solved it.

Last updated: 2026-11-01 · Version: v0.2 (design + starting rules, not playable yet)
Working titles: **Afrobeats King** (main), "Afrobeats Tycoon" (alt / store listing)

---

## 1. The game in one paragraph

A Nigerian music-label life-sim played in the browser. You start in Lagos with either a rich kid's home studio or a hungry producer's laptop. Sign artists, book studio time, drop singles, shoot videos, chase the week's ClipTok trend, book shows up to the 4,000-cap Sanctuary in Ikeja and the Lagoon Dome, dodge (or use) payola and streaming farms, keep moody artists happy and survive contract wahala. Grow from **Bedroom** to **Continental** label in 3 in-game years (156 weeks), then keep playing for the yearly Golden Mic Awards. Inspired by Lagos Life; built to beat it on fun, depth, polish and revenue per player, with near-zero server cost.

## 2. Core loop

1. Read the **objective banner** (always visible under the stats, with a deadline chip). Tap it to jump to the right place.
2. Open the **Map**, tap a place, tap an action. Every action costs ⚡ energy; some cost cash; studio and shoots also take **days** of the week.
3. **End the week** (Friday is release day): streams pay out, the chart updates, bills and obligations come due, artist moods move, one event may fire.
4. Hit milestones to level the label up. New places, artist slots and venues unlock per level.

One turn = 1 week. A week has **⚡ 100 energy** and **5 work days** (Mon–Fri). Most actions cost energy only; studio sessions, video shoots and shows also cost days. Weekends are for shows.

## 3. Starting profiles

| | Rich kid with a studio | Hungry producer with a laptop |
| --- | --- | --- |
| Cash | ₦2,500,000 | ₦60,000 |
| Studio | Home studio (level 2, no rent) | Laptop (level 0): must rent sessions |
| Ear (production skill) | 15 | 45 |
| Street cred | 5 | 35 |
| Hype / Rep | 10 / 15 | 5 / 5 |
| Twist | "Daddy's money" ₦150k/week allowance that **stops at week 12**; snobbish: underground artists' loyalty −10 | Can sell beats at Yaba Hub (cash on day 1); first signing must be an unknown |
| Difficulty | Easy start, slower ear growth | Hard start, faster ear growth (+25%) |

## 4. Stats

**Player:** 💰 Cash (₦), ⚡ Energy (0–100, refills weekly), 🔥 Hype (label buzz 0–100, decays 4%/week), ⭐ Rep (industry respect 0–100, slow), 🎧 Ear (production skill 0–100, diminishing returns), 🧢 Street cred (0–100, unlocks street-hop artists and Agege/Mushin gigs), 🪙 Gold (premium, vanity and convenience only). Hidden: 🚩 Heat (risk from payola/farms, 0–100, decays 3/week).

**Artist:** Talent, Star power (fans 0–100), Ego, Loyalty, Mood, Genre (Afrobeats, Amapiano, Street-hop, Afro-R&B, Alté, Afro-gospel, Afro-drill), contract (advance, royalty split, singles owed, weeks left, buyout clause).

**Song:** Quality (studio level + ear + artist talent + sessions, with diminishing returns), Genre, Release week, Weekly streams, Peak chart position, Video yes/no, Promo points, Age (weeks since release).

**Label level:** Bedroom → Studio → Indie → Major → Continental. Each needs a mix of cash, chart results and shows (see §8). Unlocks places, artist slots (1/2/4/6/8) and venues.

## 5. Music model (seeded, no server, no loophole)

- Every run has a **seed**. NPC songs (~40 per week, from fictional rival labels) and the weekly **ClipTok trend** (a genre + a dance tag, lasts 3–5 weeks) come from the seed, never from other players.
- **Weekly streams** of a song = `base(quality) × starPower × (1 + hype/100) × trendFit × videoBoost × promo × decay(age) × noise(seed, week, songId)`, capped. Decay halves streams about every 5 weeks; a viral roll can flip a song once.
- **Chart:** your released songs + NPC songs ranked by weekly streams → Top 50. No. 1 = big hype and rep.
- **Income per week:** streams × ₦0.9 per 1,000 (label share after artist royalty), radio spins, shows, brand deals, merch, sync deals (rare).
- A shared weekly **chart race** across players comes later and is server-checked (§10).

## 6. Places (Lagos map, fictional venues)

| Place | What you do there | Unlock |
| --- | --- | --- |
| 🏠 Your base (bedroom / home studio) | Make beats (ear), rest, plan release | Start |
| 🎚️ Surulere Sound (rent studio) | Record sessions (₦ per session), mix & master | Start |
| 💻 Yaba Hub | Sell beats, mix for others (earn), learn plugins | Start |
| 🎤 Open-mic bar, Surulere | Scout & sign unknown artists, DJ for cash | Start |
| 📻 Lagoon FM, Ikeja | Radio push, interviews; payola offers show up here | Start |
| 📱 Lekki creator house | ClipTok challenge, influencer push | Studio |
| 🎬 Ikoyi video set | Shoot videos (deposit, then balance) | Studio |
| 🏛️ The Sanctuary, Ikeja | Book shows (deposit by date), virtual concerts | Indie |
| ⚖️ Law office, VI | Sign/renegotiate contracts, settle disputes | Start |
| 🏦 Bank & quick-loan shop | Loans (honest bank vs. satirical predatory loan app) | Start |
| 🍲 Mama Put | Food, energy, gossip (hints) | Start |
| 🏟️ Lagoon Dome / ✈️ Tour desk | Arena shows; Accra, Nairobi, Jo'burg tours | Major |

## 7. Obligations (real deadlines, paid at a map place)

| Obligation | When | Where | If missed |
| --- | --- | --- | --- |
| Studio rent (once you lease a room) | Every 4 weeks | Landlord / Surulere Sound | Late fee 10%, locked out after 2 weeks |
| Artist advance instalments | Weeks 1 and 4 after signing | Law office | Artist loyalty −20, may walk |
| Release date (master to distributor) | Thursday before the Friday you booked | Your base → distributor | Miss Friday, pay re-slot fee, hype −5 |
| Video balance | 2 weeks after shoot | Ikoyi video set | Video withheld |
| Show deposit | 3 weeks before the show | The Sanctuary | Show cancelled, deposit lost, rep −8 |
| Loan repayment | Weekly | Bank | Bank: interest; loan app: "shame messages" event chain, rep hit |

All open obligations show as deadline chips ("This week", "By week 6", "Overdue") and feed the objective banner.

## 8. Objective banner (one goal, always affordable)

Priority list (first match wins), in `lib/game/goals.ts`:

1. Pending event choice.
2. Overdue obligation.
3. Obligation due this week. **If cash < amount → "Earn ₦X: sell beats at Yaba Hub / DJ at the bar" instead.**
4. Energy < 10 → "End the week".
5. No artist signed → "Sign your first artist at the open-mic bar".
6. Song in progress → "Record session 2/3 at Surulere Sound".
7. Song mastered, no release date → "Book a Friday release".
8. Released song with no promo → "Push it on Lagoon FM or ClipTok".
9. Next label-level requirement (with progress bar).

Level requirements (tuned by the balance bot): Studio = ₦1.5M net worth + 1 song in Top 50; Indie = 3 artists + a Top 10 + one Sanctuary show; Major = a No. 1 + sell out the Sanctuary + ₦25M; Continental = 3-city tour + a Golden Mic award + ₦150M.

## 9. Wahala (events and systems)

- **Artist ego:** moods drop with low royalty, no releases, rival success. Ego events: demands a bigger cut, wants a feature with a rival, beefs on X (hype up, rep down), skips a show, threatens to leave. Resolve with money, a release, talking (charm check) or the law office.
- **Contract wahala:** rival labels poach (buyout offer), an artist's ex-manager claims a cut, a sample isn't cleared (song pulled or settlement).
- **Payola:** DJs/OAPs at Lagoon FM offer spins for cash. Works (streams up) but adds 🚩 Heat; at high heat an exposé hits rep hard.
- **Streaming farms:** a shady guy offers 2M fake streams. Big chart jump this week, very high heat; detection pulls the song, bans it from the chart for 8 weeks and crushes rep. Rivals sometimes farm against you: "Report to the platform" is a valid move.
- **Lagos life:** NEPA cuts power mid-session (buy diesel or lose the day), agberos at the video shoot, traffic on the Third Mainland Bridge makes you late, owambe DJ gig offers.
- Events are held until the tutorial ends; one event runner at a time (re-entry guard).

## 10. Economy and anti-loophole rules

Lagos Life's "unlimited cash" bug is the thing to avoid. Rules:

- Every income source has a **weekly cap** and **diminishing returns** when repeated in the same week (2nd beat sale −30%, 3rd −60%).
- **Nothing sells back above its cost.** Gear and cars resell at 50–70%.
- Song income comes only from the seeded model; no player input sets streams directly.
- Gold buys vanity and small conveniences (skip a mix wait, one energy refill per day). **Gold never buys streams, hype, chart position or artists.**
- Loans have caps tied to net worth.
- Saves are local (client can edit them). Anything shared (leaderboard, chart race, referrals) is server-checked: score caps by week, per-week stream caps, and server recomputation from the seed + action log for the chart race.
- **Balance bot** (`scripts/balance.mjs`) plays 500 seeded runs per profile with a few strategies (grinder, risk-taker using payola/farms, idle). Checks: no strategy grows cash faster than the cap curve; median grinder reaches Indie by weeks 30–45 and Major by 80–110; the farm strategy loses more than it gains on average; no negative-to-infinite loops. Run after every economy change.

## 11. Content rules

- **All artists, songs, labels, venues and platforms are fictional.** Artist names come from a generator (stage-name parts + pidgin/English words) checked against a **blocklist of real Nigerian/African artist names** in `lib/game/blocklist.ts`. Song titles come from phrase banks. **No lyrics.** No real likenesses: avatars are drawn from shapes like Campus to Camp's.
- Fictional brands: ClipTok (short video), Tunely (streaming), Lagoon FM, The Sanctuary, Lagoon Dome, Golden Mic Awards; rival labels Big Wave Records, Eko Gold Music, Jollof Republic.
- **Real artists appear only through a paid, signed sponsorship**, always labelled "Sponsored", with their own licensed audio as an outbound link (we never host their audio).
- Payola and streaming farms are satire with consequences, not a how-to.
- Audio: generated WebAudio sfx and an optional tiny generated beat loop. **Off by default on mobile data** (`navigator.connection.saveData` or cellular).

## 12. UX rules (from the Campus to Camp and Japa Journey playtests)

- **Guided first week** (`components/game/Tour.tsx`): skippable spotlight that makes the player tap the real buttons (`data-tour="…"`) and plays a real first turn: Map → Open-mic bar → Sign artist → Surulere Sound → Record session → Yaba Hub → Sell a beat → Home → End week. First play only, replay from Profile/Settings. Spotlight follows its target on re-render. **No popups, ads or events until it ends.**
- **Objective banner** always visible (see §8).
- **Five bottom tabs:** Home (label, roster, releases, chart), Map, Wallet (Money / Shop), Phone (ClipTok feed / Messages / Rewards), Profile (label, awards, settings, how to play, replay tutorial). Every screen ≤ 2 taps; sub-sections are segments, never new tabs.
- **"?" How to play** on every screen: one sheet with the goal, the stats and how a turn works.
- **Every change visible:** worded floats ("+₦2,000", "⚡ −15 Energy", "🔥 +3 Hype"), pills flash, important changes toast. Toasts never cover the stats; max 2 at once.
- **Phone-first:** 380px wide, tap targets ≥ 44px, no sideways scroll, mid-range Android on mobile data. Small bundle; no images over ~50 KB.

## 13. Monetization (to Campus to Camp v2.2 / Japa Journey v4 standard)

- **Paystack inline + server verification** (`/api/paystack/verify`): status success, currency NGN, amount ≥ price × 100, known product, `metadata.userId` = caller; idempotent grant by reference; once-only products enforced. **Signed webhook** (`x-paystack-signature`, HMAC sha512, timing-safe compare) as the backup. The browser never grants anything on its own.
- **Products** (`lib/products.ts`, shared by browser and server): gold packs ₦500 / ₦1,500 / ₦4,000 / ₦10,000; Bedroom starter pack (once); VIP "Odogwu Pass" 30 days; monthly **Tour Pass** (season pass); remove ads; time-limited offers as cards, never popups (sapa relief after a flop, first No. 1, welcome back). Vanity first: studio looks, outfits, cars, limited merch drops.
- **Rewarded ads** (AdSense H5) with **house-ad fallback**; never during the tutorial; VIP/remove-ads skip the wait but keep the reward.
- **Brand and music money:**
  - Billboards at map places (Sanctuary stage banner, Lagoon FM, Third Mainland Bridge, Lagoon Dome) for drink, telco and fintech brands, ₦5,000–₦50,000 per slot per week.
  - **Sponsored songs:** real upcoming artists pay to appear on in-game Lagoon FM and the ClipTok feed, and to play a **virtual concert** at The Sanctuary. Labelled "Sponsored", outbound licensed link.
  - **Self-serve booking page** (`/advertise`): pick slot and week, upload artwork, pay with Paystack (server-verified), owner approves.
  - **Weekly advertiser report:** impressions and taps per booking (Supabase counters), private report link per booking.
- **Retention:** daily reward (7-day cycle, VIP doubles), 3 daily quests, achievements, monthly Tour Pass, referral codes (`?ref=CODE`), leaderboard, weekly chart race.
- **Target:** beat Lagos Life's ~$0.019 revenue per player (≈$46.9k / 2.5M) with ≥ $0.04, while keeping server cost near zero (static pages, local saves, Supabase only for money and boards).
- Demo purchases are free only when no Paystack key is set and not in production.
- **Hosting note:** Vercel Hobby is non-commercial. Move to Vercel Pro or another host before taking real money.

## 14. Architecture and code map

Next.js 16 App Router + Tailwind v4 + TypeScript strict + zustand (persisted as `abk-save-v1`, versioned with `migrate`). Same layout as Campus to Camp:

| Area | Files |
| --- | --- |
| Game rules (pure, no React) | `lib/game/engine.ts` (create, actions, obligations, endWeek, levels, endings), `select.ts` (read-only helpers), `music.ts` (streams, chart, trends), `artists.ts` (open-mic acts, advances), `events.ts` (11 events, seeded roll), `names.ts` (name/title generators + real-artist blocklist), `rng.ts` (seeded), `data.ts` (places, profiles, levels), `util.ts` (deltas, worded chips), `types.ts`. To add: `goals.ts` |
| State | `lib/store.ts` (zustand `mutate` applies engine results; floats, toasts, modals) |
| Screens | `components/game/Shell.tsx` (HUD, objective banner, tabs), `tabs/*`, `MapView.tsx`, `Tour.tsx`, `Help.tsx`, `Toasts.tsx`, `Creation.tsx` |
| Money (slice 2) | `lib/products.ts`, `lib/paystack.ts`, `lib/ads.ts`, `lib/sponsors.ts`, `app/api/paystack/{verify,webhook}`, `app/advertise` |
| Cloud (slice 2+) | `lib/cloud.ts`, `app/api/{leaderboard,referral,track}`, `supabase/schema.sql` |
| Tests | `scripts/balance.ts` (`npm run balance`, built), `scripts/playtest.mjs` (380px Playwright, to add) |

Conventions: engine works on `structuredClone(player)`; React 19 lint is strict (no `Date.now()`/`Math.random` in render, no setState directly in effects); read `node_modules/next/dist/docs/` before new Next APIs; no secrets or personal emails in code (`.env.example` lists names only).

## 15. Build plan (small playable slices)

1. **Slice 1 — core loop:** creation (2 profiles), Lagos map (9 places), sign artist, record → master → release, seeded chart + trend, end week with bills, 3 obligations (advance, release date, studio rent), objective banner, tutorial, 5 tabs, help sheet, floats/toasts, ~20 events, balance bot, playtest.
2. **Slice 2 — money:** Paystack verify + webhook, store, gold, VIP, Tour Pass, offers, rewarded ads + house ads, billboards, sponsored songs, `/advertise`.
3. **Slice 3 — retention:** daily rewards, quests, achievements, referrals, leaderboard, weekly chart race (server-checked), cloud saves.
4. **Slice 4 — depth:** videos, shows and tours, payola/farm chains, awards, label levels to Continental, more events.

After each slice: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run balance`, `node scripts/playtest.mjs`, look at the screenshots, update this file.

## 16. Decision log (newest first)

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-01 | Build the game to Campus to Camp's v2.11 standard from the start (one-world Home, scenes, Smooth mode, unfinished-first lists, live players, genre season, daily event, ambassador codes, retention views) while keeping this game's own name, places, look and story | Audit: nothing was built yet, so there is nothing to retrofit (see section 19) |
| 2026-11-01 | Next.js 16.4.3 | Security advisories; same fix as Campus to Camp |
| 2026-11-01 | Events live in `events.ts`; read-only helpers in `select.ts`; the balance bot fails on any missing event id or stuck run | The rules called an events file that didn't exist (build broken); Campus to Camp froze live on a missing event |
| 2026-11-01 | Test on Vercel's free (Hobby) plan; owner will say when to move to a paid host | Owner decision; Hobby is non-commercial, so move before real money |
| 2026-10-16 | Design v0.1 written from Campus to Camp v2.2 and Japa Journey v4 | Same kit, same playtest lessons |
| 2026-10-16 | Seeded music model; gold never buys streams/chart | No money loophole, no server cost |
| 2026-10-16 | Verify flow follows Japa Journey v4 (user check, idempotent grant) | Stronger than Campus to Camp's verify |

## 17. Current status

- Not playable yet. The site shows a "coming soon" page; the rules (create, actions, signing, recording, release, chart, obligations, events, levels, endings) exist and pass lint, types and build.
- Balance bot (60 runs × 2 profiles × 3 strategies): no stuck runs, no missing events, but **far too easy**: the grinder reaches Continental by week ~45 with ~30 No. 1s. Player songs out-stream the NPC chart. Tune in slice 1 (target in section 10: Indie by weeks 30–45, Major by 80–110).
- No screens, tutorial, objective banner, tabs or playtest script yet.
- Repo: `iamtersoougn-dot/afrobeats-king` (main). Vercel not linked yet.

## 18. What's next

- [ ] Slice 1, core loop + player-experience rules: store (zustand, `abk-save-v1`, migrate), creation (2 profiles), slim stats bar, objective banner (`goals.ts`), 5 tabs, ? help, tutorial, floats/pills/result line, unfinished-first lists, Smooth mode, playtest script. Tune the economy with the bot.
- [ ] Link the repo to a Vercel project.
- [ ] Slice 2, the world: Lagos-at-night map (pan/zoom), own buildings and landmarks (The Sanctuary, Lagoon FM mast, Third Mainland Bridge, Lekki creator house), place scenes, activity scenes, needs + artist moods + thought bubble.
- [ ] Slice 3, together and coming back: live players, waves, set-phrase board, weekly genre-camp season, daily "Today in Lagos" event, ambassador codes, retention and funnel views.
- [ ] Slice 4, money: Paystack verify + webhook, gold/VIP/Tour Pass/offers, rewarded ads + house ads, billboards, `/advertise`, sponsored songs.

## 19. Upgrade audit against Campus to Camp v2.11 (2026-11-01)

Nothing was built when this was written, so every lesson is "not yet". Effort: S part of a session, M about one session, L several.

| Lesson | Upgrading here means | Effort | Slice |
| --- | --- | --- | --- |
| Phone-first (380px, 44px, no sideways scroll) | Every screen built to it; 380px playtest | S | 1 |
| Smooth mode | Auto on low-end phones + Settings switch; cuts crowds, traffic, idle animation | S | 1 |
| Home is the world, slim stats bar | Lagos map with your base; bar: ₦, ⚡, 🔥, ⭐, week | M | 2 |
| Guided first session | Tap-the-real-button tour: bar → sign → record → sell beat → end week | M | 1 |
| One objective banner | `goals.ts`, sends you to earn when you can't pay | S | 1 |
| 5 tabs, ? help | Home, Map (maybe Charts), Wallet, Phone, Profile; one help sheet | S | 1 |
| Every change visible | Floats, flashing pills, result line, max 2 toasts | S | 1 |
| Unfinished on top | Obligations by due date, done items at the bottom | S | 1 |
| Nothing can freeze | Done in v0.2 (events exist, bot checks) | S | ✓ |
| Zoomable map, buildings, people, traffic, day/night, landmarks | Own night-Lagos style; reuse pan/zoom code only | L | 2 |
| Fly to place + place scene | Booth, Hub desks, open-mic stage, radio studio | M | 2 |
| Activity scenes, natural movement | Producer at desk, artist in booth, DJ, dancers | L | 2 |
| Needs panel + thought bubble | Your needs + artist moods; "Fix it" shortcut | M | 2 |
| Light multiplayer | Other bosses on the map, waves, set music phrases | M | 3 |
| Weekly group season | Genre camps; winning genre's players get gold | M | 3 |
| Daily shared event | "Today in Lagos", date-seeded | S | 3 |
| Ambassador codes | LABEL-XXXX, rewards both sides | S | 3 |
| Retention + funnel views | Funnel: first artist, first release, first chart entry, Studio level | S | 3 |
| Paystack verify + webhook | Japa Journey's buyer check and grant-once | M | 4 |
| Gold, VIP, passes, offers | Vanity first; gold never buys streams | M | 4 |
| Rewarded ads + house fallback | Never in the tutorial | S | 4 |
| Billboards, `/advertise`, sponsored songs | From ₦5k/week; sponsored clearly labelled | M | 4 |
| Free test purchases only off production | Env check | S | 4 |
