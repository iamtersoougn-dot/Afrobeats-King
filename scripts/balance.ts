/**
 * Balance bot. Plays seeded runs with simple strategies and checks the economy and that nothing gets stuck.
 * Usage: npm run balance            (default 200 runs per profile × strategy)
 *        RUNS=500 npm run balance
 * Fails (exit 1) if a run freezes, an event id is missing, or a strategy breaks the money caps.
 */
import { ACTIONS, actionLock, createPlayer, doAction, endWeek, netWorth, payObligation, resolveEvent, signArtist, signLock } from "../lib/game/engine";
import { pickEvent } from "../lib/game/events";
import { LEVELS, MAX_WEEKS } from "../lib/game/data";
import type { Player, ProfileId } from "../lib/game/types";

type Strategy = "grinder" | "risky" | "idle";
const RUNS = Number(process.env.RUNS ?? 200);
const problems: string[] = [];

function playWeek(p: Player, s: Strategy) {
  if (s === "idle") return;
  // pay what's due
  for (const o of [...p.obligations].sort((a, b) => a.dueWeek - b.dueWeek)) if (o.amount > 0 && o.dueWeek <= p.week + 1) payObligation(p, o.id);
  // sign if there's room
  for (const c of [...p.candidates].sort((a, b) => b.talent + b.star - (a.talent + a.star))) if (!signLock(p, c)) signArtist(p, c.id);
  const order =
    s === "risky"
      ? ["release", "pro_mix", "mix", "pro_session", "record", "payola", "cliptok", "radio", "interview", "sell_beat", "mix_others", "dj", "eat", "beat"]
      : ["release", "pro_mix", "mix", "pro_session", "record", "cliptok", "radio", "interview", "sell_beat", "mix_others", "dj", "gist", "eat", "beat", "plugins", "network"];
  for (let guard = 0; guard < 40; guard++) {
    const next = order.map((id) => ACTIONS.find((a) => a.id === id)!).find((a) => {
      if (actionLock(p, a)) return false;
      // keep a cash buffer for bills before spending on promo
      const cost = typeof a.cost === "number" ? a.cost : 0;
      return cost === 0 || p.cash - cost > 60_000;
    });
    if (!next) break;
    const r = doAction(p, next.id);
    if (!r.ok) break;
  }
  if (s === "risky" && p.cash < 20_000 && p.loan === 0) doAction(p, "loan");
}

function run(profile: ProfileId, s: Strategy, i: number) {
  const p = createPlayer({ name: "Bot", label: "Bot Records", profile, seed: `bot-${profile}-${s}-${i}` });
  let peakCash = p.cash;
  let levelWeek: number[] = [];
  for (let w = 0; w < MAX_WEEKS + 2 && !p.ended; w++) {
    const before = p.week;
    playWeek(p, s);
    if (p.pendingEvent) {
      const ev = pickEvent(p.pendingEvent);
      if (!ev) {
        problems.push(`missing event id "${p.pendingEvent}" (${profile}/${s}/${i})`);
        break;
      }
      const idx = ev.choices.findIndex((c) => !c.can || c.can(p));
      if (idx < 0) {
        problems.push(`event "${ev.id}" has no possible choice (${profile}/${s}/${i})`);
        break;
      }
      resolveEvent(p, idx);
    }
    const lvl = p.level;
    endWeek(p, { events: true });
    if (p.level > lvl) levelWeek[p.level] = p.week;
    if (p.week !== before + 1 && !p.ended) {
      problems.push(`week did not advance (${profile}/${s}/${i})`);
      break;
    }
    peakCash = Math.max(peakCash, p.cash);
  }
  if (!p.ended) problems.push(`run never ended (${profile}/${s}/${i})`);
  levelWeek = levelWeek ?? [];
  return { p, peakCash, levelWeek };
}

const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);
const fmt = (n: number) => (Number.isNaN(n) ? "—" : n >= 1e6 ? `₦${(n / 1e6).toFixed(1)}m` : `₦${Math.round(n / 1000)}k`);

console.log(`Afrobeats King balance bot: ${RUNS} runs per profile and strategy\n`);
for (const profile of ["richkid", "producer"] as ProfileId[]) {
  for (const s of ["grinder", "risky", "idle"] as Strategy[]) {
    const res = Array.from({ length: RUNS }, (_, i) => run(profile, s, i));
    const ends = { win: 0, fold: 0, time: 0 };
    for (const r of res) if (r.p.ended) ends[r.p.ended.kind]++;
    const lv = (n: number) => median(res.map((r) => r.levelWeek[n]).filter((x) => x !== undefined));
    const reached = (n: number) => Math.round((res.filter((r) => r.p.level >= n).length / RUNS) * 100);
    console.log(
      `${profile.padEnd(8)} ${s.padEnd(7)} | fold ${String(ends.fold).padStart(3)} win ${String(ends.win).padStart(3)} time ${String(ends.time).padStart(3)}` +
        ` | net worth ${fmt(median(res.map((r) => netWorth(r.p))))} | No.1s ${median(res.map((r) => r.p.stats.no1))}` +
        ` | reach ${LEVELS.slice(1).map((L, i) => `${L.name} ${reached(i + 1)}% @wk ${lv(i + 1) || "—"}`).join(", ")}`,
    );
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n` + [...new Set(problems)].slice(0, 20).join("\n"));
  process.exit(1);
}
console.log("\nNo stuck runs, no missing events.");
