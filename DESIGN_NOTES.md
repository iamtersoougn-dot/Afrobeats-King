# Afrobeats King — Design Notes

> **Read this first in every new work session.** It holds the game's rules, how the code is laid out, the decisions made so far, and what's next.
> **Update it at the end of every session:** add new decisions and refresh "Current status" and "What's next".
> Built on the "Naija life-sim kit" from Campus to Camp (`iamtersoougn-dot/campus-to-camp`) and Japa Journey (`iamtersoougn-dot/japa-journey`). Those repos are the reference for **systems and code patterns only**, never for names, places, art or story.

Last updated: 2026-11-11 · Version: **v0.4.0** (balance, screens and map-speed pass)
Repo: `iamtersoougn-dot/Afrobeats-King` (main) · Hosting: Vercel free plan for testing (owner decides when to move to a paid/commercial host)

---

## 1. The game in one paragraph

A Nigerian music-label life-sim played in the browser. You start in Lagos with either a rich kid's home studio or a hungry producer's laptop. Sign artists at the open-mic bar, record and release singles, push them on Lagoon FM and ClipTok, shoot videos, book shows at The Sanctuary, dodge (or use) payola and streaming farms, keep moody artists happy and survive contract wahala. Grow from **Bedroom** to **Continental** label in 3 in-game years (156 weeks). Everything is fictional: no real artists, songs or lyrics. Inspired by Lagos Life; built to beat it on fun, depth, polish and revenue per player, with near-zero server cost.

## 2. Core loop

1. Read the **objective banner** (yellow "danfo board" under the stats). It shows ONE goal and a deadline chip. Tap it to go there.
2. **Home is the Lagos map.** Tap a place: the camera flies there and its sheet opens (scene, bills payable here, actions).
3. Each action costs ⚡ energy (100 a week); studio work and shoots also cost 📅 days (5 a week). After an action a short scene plays with the result line and every change.
4. **End week**: routines run, streams pay, the chart moves, shows happen, bills and deadlines are checked, artist moods move, the calendar advances, one event may fire (never during the tutorial).
5. Meet the next level's requirements to grow the label. Levels unlock artist slots and places.

## 3. Starting profiles

| | Rich kid with a studio | Club DJ with savings (middle) | Hungry producer with a laptop |
| --- | --- | --- | --- |
| Cash | ₦2,500,000 | ₦600,000 | ₦60,000 |
| Studio | Home studio (level 2, free sessions) | None (pro sessions at Surulere Sound) | Laptop (level 0); pro sessions ₦25k at Surulere Sound |
| Ear / Street cred | 15 / 5 | 30 / 45 | 45 / 35 |
| Hype / Rep | 10 / 15 | 10 / 10 | 5 / 5 |
| Twist | ₦120k a week from Daddy until week 8 | DJ gigs pay well from day one | Ear grows 25% faster; week 1's first act is always affordable |

## 4. Stats

**Player:** 💰 Cash, ⚡ Energy (0–100, refills weekly), 🔥 Hype (buzz, fades 10% a week, gains halve above 50 and quarter above 80), ⭐ Rep (respect, slow, gains shrink above 60), 🎧 Ear (skill, diminishing), 🧢 Street cred (DJ pay, street acts' loyalty), 🪙 Gold (kept across labels; looks and small extras only). Hidden 🚩 Heat (payola/farms; exposés).

**Artist:** talent, fans (star), ego, loyalty, mood, genre (Afrobeats, Amapiano, Street-hop, Afro-R&B, Alté, Afro-gospel, Afro-drill), advance (half on signing, rest at the Law office within 3 weeks), royalty share. Fans grow from the best-charting song each week (+1.2 Top 10, +0.7 Top 25, +0.3 charting) and fade 1.5% a week; Top 10 and No. 1 give one-off boosts.

**Song:** 3 sessions (quality approaches a ceiling set by talent, ear and studio), then mix & master, then release on Friday. Artists need **3 weeks between singles**.

**Label levels** (`lib/game/data.ts` LEVELS):

| Level | Slots | Needs |
| --- | --- | --- |
| Bedroom | 1 | — |
| Studio | 2 | 1 artist, a Top 50 song, ₦1m net worth. Unlocks the creator house and The Sanctuary |
| Indie | 4 | 2 artists, a Top 10 song, ₦3m |
| Major | 6 | 3 artists, 2 No. 1s, ₦45m |
| Continental | 8 | 4 artists, 4 No. 1s, ₦150m (the win) |

## 5. Music model (seeded, no server, no loophole)

- Every run has a seed. ~46 rival songs (fictional labels, peaks ₦15k–1.1M streams, log-spread) and the ClipTok trend (a genre + tag for 3–5 weeks) come from the seed, never from other players.
- Weekly streams = `(600 + q²·16) × (0.4 + fans/100) × (1 + hype/250) × trend 1.35 × (1 + √promo/20) × video 1.2 × decay 0.84/week × noise`, capped at 2.5M. One viral roll per song (×2.6), likelier on-trend.
- Label income = streams / 1000 × ₦1,000 × (1 − artist royalty), plus **radio spins** each week for every charting song: (51 − chart place) × ₦500.
- **Living cost**: ₦15k a week (food, transport, data; moved by season prices; +₦10k with a leased studio). The banner and the week recap warn when cash won't cover next week.
- Shows at The Sanctuary: ₦400k deposit, ₦800k balance due by show week (unpaid = cancelled, deposit lost); fill = 8% + fans·0.6% + hype·0.3% (+5% with a Top 10); label keeps 35% of 4,000 × ₦3,000 × season demand. One show at a time, 6 weeks apart.
- Music video (creator house, Studio level): ₦250k, +20% streams for that single.

## 6. Places (fictional venues, `lib/game/data.ts` PLACES)

Your base (beats, record, mix, release, rest) · Surulere Sound (pro sessions, pro mix, lease a room) · Yaba Hub (sell beats, mix for others, plugins) · Open-mic bar (sign acts, DJ, network) · Lagoon FM (radio push, interview, payola) · Mama Put (food, gist about the next trend) · Law office (advances) · Bank (loans) · Creator house (ClipTok challenge, music video; Studio level) · The Sanctuary (shows; Studio level). Landmarks: Third Mainland Bridge (tap for a fact), Lagoon FM mast, two paid billboard slots.

## 7. Obligations (real deadlines, paid at a place)

| Obligation | When | Where | If missed (Chill mode: reminder only) |
| --- | --- | --- | --- |
| Advance balance | 3 weeks after signing | Law office | Loyalty and mood fall; artist walks after 2 weeks |
| Release a single with each artist | 8 weeks after signing, then every 4 | Your base | Mood and loyalty fall, hype −3 |
| Studio rent (if leased) | Every 4 weeks | Surulere Sound | +10% late fee, then locked out |
| Loan repayment | Weekly | Bank | Interest and rep hit |
| Show balance | By show week | The Sanctuary | Show cancelled, deposit lost, rep hit |

Broke for 4 weeks in a row = the label folds (not in Chill mode).

## 8. Objective banner (`lib/game/goals.ts`)

Priority: pending event → overdue bill → bill due this week → out of energy/days → sign first artist → record/mix/release the song in progress → push a fresh single → start the next single (release deadlines) → upcoming show balance → next level's first unmet requirement. **Always doable:** if a bill or signing is unaffordable it sends you to earn first (sell beats → mix for artists → DJ → end the week), and it only suggests paid studio time when that still leaves ₦50k plus bills due in the next 3 weeks. The balance bot fails if the banner ever points at a locked action.

## 9. Wahala (`lib/game/events.ts`)

16 events: grid outage, royalty demand, beef on X, streaming-farm offer (45% chance of being caught: pulled 8 weeks, big rep hit), owambe DJ gig, paid blogger, Third Mainland traffic, rival poaching (buyout), uncleared sample, studio vibes, collapse from exhaustion, and (v0.4) a malt-drink jingle deal, a remix feature request, a leaked song, a dance teacher from Kaduna, a sound-engineering masterclass. Each event has a cooldown and a per-game cap (`max`), counted in `flags["ev:<id>"]`, so none repeats more than ~8 times in a 3-year game. Seasons change their odds; Chill mode makes setbacks rarer and turns off the farm and collapse events. Payola adds heat; high heat can trigger an exposé.

## 10. Economy guards

- Weekly caps and repeat penalties on every hustle (2nd use −30%, then −60%, −80%); seasons move pay and caps together.
- Hustle pay (`HUSTLE` in data.ts) is small and capped by label level (cap × (1 + level × 0.5)), so making music beats hustling once your songs chart.
- **Never buyable with real money:** streams, chart places, hype, rep, artists, label levels, camp points, leaderboard places, in-game naira. Packs give gold and looks only. Gold can never be cashed out.
- Nothing sells back above cost. Loans capped. Gold never buys streams, hype, chart spots or artists.
- **Balance bot** (`npm run balance`): seeded runs × 2 profiles × grinder/risky/chill/idle. Fails on a stuck run, a missing event id, an event with no possible choice, or a banner pointing at a locked action. Latest (40 runs per row): producer grinder Studio wk ~15, Indie ~28, Major ~84, Continental 15% (by ~wk 153); rich kid Indie ~14, Major ~68, Continental ~wk 133 (easier start, by design); Chill producer Major 60%. No run folds when following the banner. Bots play near-perfectly; real players will be slower.

## 11. Content rules

- All artists, songs, labels, venues and platforms are fictional (Tunely, ClipTok, Lagoon FM, The Sanctuary, Big Wave Records…). Names come from generators checked against a blocklist of real artists (`lib/game/names.ts`). No lyrics. No real likenesses.
- Real artists appear only through a paid booking, always labelled "Sponsored", with a link to their own music; the game never hosts their audio.
- Payola and streaming farms are satire with consequences.
- No ads for gambling, loan apps, alcohol or tobacco (booking route rejects them; terms say so).

## 12. Player experience (Campus to Camp playtest lessons)

- **Guided first week** (`components/game/Tour.tsx`): open-mic bar → sign → base → record → Yaba Hub → sell a beat → End week. Taps the real buttons (`data-tour`), follows them on re-render, skippable, replay from Profile/Settings/Help. No events, recap pop-up, ads or vignettes while it runs.
- One objective banner; **5 tabs** (Home = map, Label = artists/songs/Top 50/bills, Wallet = money/shop, Phone = ClipTok feed/Live/Rewards, Profile); sub-sections are segments. "?" in the header everywhere.
- Every change visible: worded floats, flashing stat pills, a result line and scene after each action; toasts (max 2) sit under the banner, never over the stats or the bottom controls.
- Lists: unfinished on top, done at the bottom (quests, achievements, level requirements, Tour Pass tiers, actions in a place).
- Needs panel (energy, money, buzz, team mood, new music) and a thought bubble with **Fix it**; artists' moods listed.
- **Smooth mode**: automatic on low-end phones (≤3 GB, ≤4 cores, data saver, reduced motion) **or a measured frame rate under 40 fps** in the first seconds on the map, with a one-time notice; switch in Settings. Drops walkers, traffic, boats and idle animation.
- **Map speed**: the city is drawn once (`City` is memoized) and only redraws when what it shows changes; panning moves the camera only. All map animation pauses while a pop-up covers it.
- **Results stay out of the way**: an action's result (words, changes, a small scene) shows inside that action's card, above its buttons, and stays until the next action. The words show first; the scene follows ~0.1 s later.
- **End week asks once** if you did nothing and still have ⚡ 60+ (never in the tutorial, and not when the yellow board itself says to end the week); a second tap ends it.
- **Welcome card at each new label level** (what's new, the next goal, a first-step button); reopen it from "?".
- Home's top shows one slim line (today's bonus · date), tap to expand. The objective wraps to two lines. Long lists fold ("Show N older songs", Top 10 + your songs with "Show the full Top 50", news, achievements) and Rewards has jump buttons.
- Phone-first: 360–380px, 44px tap targets, no sideways scroll (playtest checks all three). Sound is generated and off by default.
- Crash screen with "Back to the map" and "Report a problem"; the last 5 errors go with reports.

## 13. Coming back and playing together

- **Live map**: other bosses appear at the place they're at (first name, label, look); tap to wave. Notice board with set phrases only. Heartbeat ~45 s while active, half speed after 2 idle minutes, none after 5 or in a hidden tab; only changes are fetched; server can slow everyone (`LIVE_INTERVAL_SEC`) or switch it off (`LIVE_OFF=1`).
- **Genre camps** (weekly season): pick a camp at the start; every action +1, release +5, chart entry +5, show +15, No. 1 +30; cap 600 a week; the server accepts at most +80 per heartbeat; everyone in the winning camp gets 60 🪙 once. Routines earn no points.
- **Today in Lagos**: one shared daily event (same for everyone that day) with a bonus on matching actions.
- **Invite codes** (NAME-XXXX): inviter gets 100 🪙 and the friend 50 🪙 once the friend has played 4 weeks.
- Daily reward (7-day cycle, VIP doubles +25), 3 daily quests, 16 achievements, monthly **Tour Pass** (30 tiers, free + premium tracks), leaderboard (best score per phone, server rejects impossible scores; Chill labels skip it).
- Shared kit (`lib/kit/`, copied unchanged): seasonal calendar (Detty December, Long January, harmattan, rainy season, festival and awards seasons, festivals), **Chill mode** (no game-over or late fees, fewer setbacks, money as words), **routines** (Quick do after 5 uses, routine after 10, max 3, 90% reward).

## 14. Money

- **Flutterwave first** (`NEXT_PUBLIC_PAYMENTS_PROVIDER=flutterwave`), Paystack as backup. Flutterwave: `/api/flutterwave/init` (price from the server's product list, reference `abk-<item>-<time>-<rand>`) → player pays on Flutterwave's page → back to `/?pay=flw` → `/api/flutterwave/verify` asks Flutterwave and checks paid, naira, amount ≥ price, the item from our reference, **the same phone started it**, and **a reference unlocks only once**. Signed webhook (`verif-hash`/HMAC, then re-checked with the API) records purchases so **Restore purchases** delivers them. Paystack verify does the same checks; its webhook checks the HMAC SHA-512 signature. The browser never grants anything alone. Free test purchases only without a payment provider outside production (or `NEXT_PUBLIC_DEMO_PURCHASES=true` on a preview).
- Products (`lib/products.ts`): gold packs ₦500–₦10,000, Bedroom starter pack, Odogwu Pass (VIP 30 days), Tour Pass (+10 tiers option), remove ads, time-limited offer cards (sapa relief, first No. 1, level up, welcome back), never pop-ups. Gold buys looks (outfits, extras, studio looks, rides parked at your base) and one +40 energy refill a day.
- Rewarded ads (Google H5 games ads) with a house/sponsored-song fallback, 10 a day, never in the tutorial; VIP/remove-ads players load no ad script.
- **Advertisers and artists**: `/advertise` self-serve booking (sponsored song ₦5k, Lagoon FM spot ₦7.5k, Third Mainland billboard ₦15k, Sanctuary banner ₦25k, virtual concert ₦50k per week; 1/2/4 weeks), live preview, pay online with Flutterwave, private weekly report link (`/advertise/report`, signed with `AD_REPORT_SECRET`) counting views and taps. Live placements are set with `NEXT_PUBLIC_SPONSORS_JSON` (ids `b<booking>`).

## 15. Code map

| Area | Files |
| --- | --- |
| Rules (pure, no React) | `lib/game/engine.ts` (create, actions, signing, obligations, shows, endWeek, levels, endings), `select.ts`, `music.ts`, `artists.ts`, `events.ts`, `goals.ts`, `meta.ts` (quests, achievements, needs, task sorting), `names.ts`, `data.ts`, `kit.config.ts`, `rng.ts`, `util.ts`, `types.ts` |
| Shared kit | `lib/kit/` (calendar, chill, routines; copied from Campus to Camp unchanged) |
| State | `lib/store.ts` (zustand, saved as `abk-save-v1`, version 2 with `migratePlayer`) |
| Client services | `lib/liveClient.ts`, `lib/live.ts`, `lib/daily.ts`, `lib/season.ts`, `lib/products.ts`, `lib/pay.ts`, `lib/ads.ts`, `lib/sponsors.ts`, `lib/analytics.ts`, `lib/sound.ts`, `lib/device.ts` |
| Screens | `components/game/` (Game, Creation, Shell, Tour, PlaceSheet, Vignette, Sheets, AdSheet, LiveBeat, ErrorBoundary, `tabs/*`) |
| World | `components/world/` (WorldView map, buildings, Figure with poses, scenes + ACT table, usePanZoom, useEnv clock and Smooth mode) |
| Server | `lib/server/*`, `app/api/*` (live, wave, board, camps, ambassador, referral, entitlements, leaderboard, report, track, privacy/delete, flutterwave/*, paystack/*, advertise) |
| Pages | `/` game, `/advertise`, `/advertise/report`, `/privacy`, `/terms` |
| Database | `supabase/schema.sql` (all tables `abk_*`, RLS on, views `abk_retention`, `abk_funnel`, `abk_revenue`, `abk_ad_inbox`, `abk_ad_report`, `abk_reports_inbox`, daily clean-up) |
| Tests | `scripts/balance.ts` (`npm run balance`), `scripts/lifesim.ts` (`npx tsx scripts/lifesim.ts`, RUNS=100: 3 backgrounds × careful/grinder/slacker/crammer/hustler; money at weeks 10/26/52/104, broke %, folds, stuck, music vs hustle ₦, event repeats), `scripts/playtest.mjs` (Playwright; also checks the tutorial counter) |

Conventions: rules work on `structuredClone(player)` and the store applies results; React 19 lint is strict (render never reads the clock: use `useNow()`); read `node_modules/next/dist/docs/` before new Next APIs (`searchParams` is a Promise); no secrets or personal emails in code (`.env.example` lists names only); commit as the GitHub no-reply address.

## 16. How to test

```bash
npm install
npm run lint && npx tsc --noEmit && npm run build
npm run balance                      # RUNS=200 for a bigger sample
npm start                            # http://localhost:3000
BASE_URL=http://localhost:3000 CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/playtest.mjs   # PROFILE=richkid for the other start
```

## 17. Decision log (newest first)

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-11 | v0.4.0: owner picked all 11 items of the improvement list | Campus to Camp lessons template |
| 2026-11-11 | Hustle pay cut and capped by level; ₦1,000 per 1,000 streams; radio spins for charting songs; Major ₦45m, Continental ₦150m | Hustling out-earned making music (hustler ₦17.5m vs careful producer ₦5.4m at week 52) |
| 2026-11-11 | Weekly living cost shown before it bites (banner + recap) | 22% of careful producers went broke without warning |
| 2026-11-11 | Event cooldowns + per-game caps; 5 new events | Grid outage up to 22 times and traffic 18 times a game |
| 2026-11-11 | Shop packs give gold and looks, never in-game naira (starter: 220 gold + snapback + neon; "Comeback pack" 120 gold). **Revertible** in `lib/products.ts` | Keeps money earned in play; fair to free players |
| 2026-11-11 | Middle start "Club DJ with savings" | Owner's template asks for poor/average/rich starts |
| 2026-11-11 | Name boxes on the first creation screen fit the phone (were 412px wide: sideways scroll at 360–380px); playtest now checks that screen too | Found in this session's playtest screenshots |
| 2026-11-11 | Map starts hidden at full size (not near-zero scale) | Chrome laid SVG text out at zero width at a tiny scale, and the drawn-once city kept the blank labels |
| 2026-11-07 | v0.3.0: slices 1–4 built in one go (owner: "implement slice 1 and all other recommendations") | Audit recommendations |
| 2026-11-07 | Flutterwave is the main payment provider, Paystack kept as backup; verify checks the buyer's phone and grant-once on top of Campus to Camp's checks | Owner verified with Flutterwave (Nov 2026) |
| 2026-11-07 | All Supabase tables prefixed `abk_` | Lets this game share the owner's free Supabase project |
| 2026-11-07 | Tab 2 is **Label** (artists, songs, Top 50, bills) instead of a second map, because Home is the map | Every screen within 2 taps without a duplicate map |
| 2026-11-07 | Weekly group = **genre camps** | Fits the game; no real-world data needed |
| 2026-11-07 | Economy retuned with the bot: flatter stream multipliers, hype fades 10%/week, fan growth capped per artist, 3 weeks between singles, ₦800 per 1,000 streams, Sanctuary shows at Studio level, Indie ₦3m, Major 2 No. 1s, Continental ₦100m + 4 No. 1s, Daddy ₦120k until week 8 | v0.2 bot reached Continental by week ~45 |
| 2026-11-07 | Players can let an artist go (Label → Artists) | Chill mode artists never leave, so rosters clogged |
| 2026-11-07 | Shared kit copied in; Chill mode, seasonal calendar, routines; Report a problem, Privacy, Terms, Delete my online data, traffic limits from Campus to Camp v2.12–v2.14 | Same launch-safety bar as Campus to Camp |
| 2026-11-07 | Look: night indigo, danfo yellow, stage magenta, lagoon teal; Unbounded display font; objective banner as a danfo destination board; street-front buildings (not isometric) | Own identity, not a Campus to Camp reskin |
| 2026-11-01 | Upgrade audit (section 19); events file written so the build works; Next.js 16.4.3 | Build was broken; security advisories |
| 2026-11-01 | Test on Vercel's free plan until the owner says otherwise | Owner decision; Hobby is non-commercial, so move before real money |
| 2026-10-16 | Seeded music model; gold never buys streams/chart | No money loophole, no server cost |

## 18. Current status

- **v0.4.0 numbers** (life sim, 100 runs per row, median; producer = poor start, dj = middle, richkid = rich):

| Start · style | Cash wk 26 | wk 52 | wk 104 | Ever broke | Major by wk |
| --- | --- | --- | --- | --- | --- |
| producer careful (before) | ₦1.3m | ₦5.4m | — | 22% | 107 |
| producer careful (now) | ₦1.4m | ₦10.3m | ₦51.6m | 0% | 97 |
| producer grinder | ₦493k | ₦13.6m | ₦76.4m | 1% | 81 |
| producer slacker / crammer | ₦127k / ₦139k | ₦446k / ₦1.0m | ₦3.8m / ₦5.3m | 35% / 30% | not reached |
| producer hustler only (before → now) | ₦8.0m → ₦3.5m | ₦17.5m → ₦7.3m | ₦14.9m | 0% | never |
| dj careful | ₦1.5m | ₦11.0m | ₦52.6m | 0% | 96 |
| richkid careful / grinder | ₦6.7m / ₦11.8m | ₦17.4m / ₦42.5m | ₦76.6m / ₦135m | 0% | 76 / 55 |

  0 stuck games, 0 folds in 1,500 runs. Making music beats hustling from about week 40; before week 26 hustling still earns more (by design: you hustle to fund your first songs). Events per game now at most 7–8 (was up to 22). Balance bot: no stuck runs, no missing events.
- **Speed** (simulated phone: Chrome with CPU slowed 4×, 360px, a week-121 save): tap an action → result on screen 77–136 ms (measured inside the page); tap a place → sheet ~0.5 s; End week → recap ~0.3 s. Panning changes nothing inside the city drawing. Map animations stop under pop-ups and restart after.
- Old saves: a version-1 save loads, migrates to version 2, keeps its week and cash, plays on, and is not greeted with welcome cards for levels reached earlier.
- **Playable** at 360–380px: creation, tutorial, full loop, world, scenes, all tabs, shop (test mode), live/season/invites/leaderboard (need Supabase), payments (need keys), advertiser page.
- Checks passing: lint, types, build, balance bot (no stuck runs, no missing events, banner always doable), 380px playtest for both profiles (tutorial, 3 more weeks, all tabs and sheets, no sideways scroll, no errors), payment checks against a stand-in Flutterwave (wrong phone 403, underpaid 402, bad reference 400, unsigned webhook 401, Paystack signature checked).
- Not yet run against a real Supabase or real Flutterwave account. Grant-once needs the database.
- Not linked to Vercel yet (owner will do it later).

## 19. What's next

- [ ] **Owner:** link the repo to a Vercel project; set env vars from `.env.example`; run `supabase/schema.sql` in Supabase; set the Flutterwave webhook URL and secret hash; set `AD_REPORT_SECRET`.
- [ ] Real-phone playtest with a few people; watch `abk_retention` and `abk_funnel`.
- [ ] Shared weekly **chart race** between players (server-checked from seed + action log).
- [ ] Cloud saves (sign-in) so purchases survive a lost phone.
- [ ] More depth: Lagoon Dome and tours (Accra, Nairobi, Jo'burg), Golden Mic Awards, contract renegotiation, more events, interiors.
- [ ] Close the early gap: hustling still out-earns music before week ~26 (owner to decide if that's wanted).
- [ ] Check the Smooth-mode frame-rate trigger on a real cheap Android phone.
- [ ] Optional generated beat loop (off on mobile data).

## 20. Upgrade audit against Campus to Camp (2026-11-01, done in v0.3.0)

| Lesson | Status in v0.3.0 |
| --- | --- |
| Phone-first 380px / 44px / no sideways scroll, Smooth mode | Done (playtest enforces it) |
| Home is the world, slim stats bar | Done |
| Guided first session, one objective banner, 5 tabs, "?" everywhere | Done |
| Every change visible; unfinished tasks on top | Done |
| Nothing can freeze (every event/modal exists) | Done (bot + crash screen) |
| Zoomable map, buildings, people, traffic, day/night, landmarks | Done in this game's own style |
| Fly to place + place scene; activity scenes with natural movement | Done (knee-lift steps, seated at desks) |
| Needs panel + thought bubble with Fix it | Done |
| Light multiplayer, weekly group season, daily shared event, invite codes, retention/funnel views | Done (need Supabase) |
| Server-verified payments + webhook; gold/VIP/passes; rewarded ads; billboards, `/advertise`, sponsored songs, reports | Done (need keys) |
