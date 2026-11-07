/**
 * The objective banner: ONE goal at a time, picked from a priority list.
 * Every goal must be doable right now: if the player can't pay, the goal sends them to earn first.
 */
import { LEVELS } from "./data";
import { ACTIONS, actionLock, dueText, levelReqs } from "./engine";
import { pickEvent } from "./events";
import { latestRelease, songInProgress } from "./select";
import type { Obligation, PlaceId, Player, TabId } from "./types";
import { naira } from "./util";

export interface Goal {
  icon: string;
  text: string;
  /** deadline chip: "This week", "By week 6", "Overdue", "Now" */
  chip?: string;
  urgent?: boolean;
  /** where tapping the banner goes */
  place?: PlaceId;
  action?: string;
  tab?: TabId;
  /** opens the pending event / end-of-week button */
  open?: "event" | "endweek";
  /** progress 0..1 for level goals */
  progress?: number;
}

const can = (p: Player, id: string) => {
  const a = ACTIONS.find((x) => x.id === id);
  return !!a && !actionLock(p, a);
};

/** Best way to earn money right now. */
export function earnGoal(p: Player, need: number, why: string, chip?: string): Goal {
  const short = naira(Math.max(0, need - p.cash));
  if (can(p, "sell_beat")) return { icon: "💿", text: `Earn ${short} for ${why}: sell a beat at Yaba Hub`, chip, urgent: true, place: "hub", action: "sell_beat" };
  if (can(p, "mix_others")) return { icon: "🎧", text: `Earn ${short} for ${why}: mix for an artist at Yaba Hub`, chip, urgent: true, place: "hub", action: "mix_others" };
  if (can(p, "dj")) return { icon: "🪩", text: `Earn ${short} for ${why}: DJ the night at the bar`, chip, urgent: true, place: "bar", action: "dj" };
  return { icon: "😴", text: `Out of hustles this week. End the week, then earn ${short} for ${why}`, chip, urgent: true, open: "endweek", tab: "home" };
}

function billGoal(p: Player, o: Obligation): Goal {
  const chip = dueText(p, o);
  if (p.cash < o.amount) return earnGoal(p, o.amount, o.title.split(":")[0].toLowerCase(), chip);
  const where = { law: "the Law office", studio: "Surulere Sound", bank: "the bank", sanctuary: "The Sanctuary" }[o.place as string] ?? "the map";
  return { icon: "🧾", text: `Pay ${naira(o.amount)}: ${o.title} at ${where}`, chip, urgent: chip === "Overdue" || chip === "This week", place: o.place, tab: "home" };
}

export function currentGoal(p: Player): Goal {
  if (p.ended) return { icon: "🏁", text: "Your story is done. Start a new label from Profile.", tab: "profile" };

  // 1. a decision is waiting
  if (p.pendingEvent) {
    const ev = pickEvent(p.pendingEvent);
    return { icon: ev?.icon ?? "❗", text: `Decide: ${ev?.title ?? "something happened"}`, chip: "Now", urgent: true, open: "event" };
  }

  // 2–3. money obligations: overdue first, then this week
  const money = p.obligations.filter((o) => o.amount > 0).sort((a, b) => a.dueWeek - b.dueWeek);
  const overdue = money.find((o) => o.dueWeek < p.week || o.overdue > 0);
  if (overdue) return billGoal(p, overdue);
  const thisWeek = money.find((o) => o.dueWeek <= p.week);
  if (thisWeek) return billGoal(p, thisWeek);

  // 4. tired
  if (p.energy < 10) return { icon: "🌙", text: "You're out of energy. End the week to rest and get paid", chip: "Now", open: "endweek", tab: "home" };

  if (p.days <= 0) return { icon: "🌙", text: "No work days left. End the week", chip: "Now", open: "endweek", tab: "home" };

  // 5. no artist yet
  if (!p.artists.length) {
    const cheapest = [...p.candidates].sort((a, b) => a.advance - b.advance)[0];
    if (cheapest && p.cash < Math.ceil(cheapest.advance / 2)) return earnGoal(p, Math.ceil(cheapest.advance / 2), "your first signing");
    return { icon: "🎤", text: "Sign your first artist at the Open-mic bar", chip: "This week", place: "bar" };
  }

  // 6–8. the song pipeline
  const s = songInProgress(p);
  // paid studio time only when it leaves enough for bills due in the next 3 weeks
  const soon = p.obligations.filter((o) => o.amount > 0 && o.dueWeek <= p.week + 3).reduce((t, o) => t + o.amount, 0);
  const proOk = p.studio < 2 && can(p, "pro_session") && p.cash - 25_000 >= soon + 50_000;
  if (s?.stage === "recording") {
    const where: PlaceId = proOk ? "studio" : "base";
    return { icon: "🎙️", text: `Record "${s.title}" with ${s.artistName}: session ${s.sessions + 1} of 3`, place: where, action: where === "base" ? "record" : "pro_session" };
  }
  const proMixOk = can(p, "pro_mix") && p.cash - 20_000 >= soon + 50_000;
  if (s?.stage === "mixing") return { icon: "🎛️", text: `Mix & master "${s.title}"`, place: proMixOk ? "studio" : "base", action: proMixOk ? "pro_mix" : "mix" };
  if (s?.stage === "mastered") return { icon: "🚀", text: `Release "${s.title}" this Friday`, chip: "This week", place: "base", action: "release" };

  // 9. a fresh single needs a push
  const last = latestRelease(p);
  if (last && last.releaseWeek !== undefined && p.week - last.releaseWeek <= 1 && last.promo < 25) {
    if (can(p, "radio")) return { icon: "📻", text: `Push "${last.title}" on Lagoon FM so it climbs the chart`, place: "radio", action: "radio" };
    if (can(p, "interview")) return { icon: "🗣️", text: `Talk up "${last.title}" on the morning show (free)`, place: "radio", action: "interview" };
  }

  // 10. start the next single (release deadlines)
  const rel = p.obligations.filter((o) => o.kind === "release").sort((a, b) => a.dueWeek - b.dueWeek)[0];
  if (rel && can(p, "record")) {
    return { icon: "📅", text: rel.title.replace("Release a single", "Record a single"), chip: dueText(p, rel), place: proOk ? "studio" : "base", action: proOk ? "pro_session" : "record" };
  }
  if (can(p, "record")) return { icon: "🎙️", text: "Start your next single", place: proOk ? "studio" : "base", action: proOk ? "pro_session" : "record" };

  // 11. show balance coming up (not due yet)
  const show = money.find((o) => o.kind === "show");
  if (show) return billGoal(p, show);

  // 12. next label level
  const next = LEVELS[p.level + 1];
  if (next) {
    const reqs = levelReqs(p);
    const todo = reqs.find((r) => !r.done);
    if (todo) {
      const done = reqs.filter((r) => r.done).length;
      return { icon: next.icon, text: `Grow to ${next.name}: ${todo.label}`, chip: `${done}/${reqs.length}`, tab: "label", progress: reqs.reduce((t, r) => t + r.progress, 0) / reqs.length };
    }
  }
  return { icon: "🌙", text: "Good week. End it to see your streams", open: "endweek", tab: "home" };
}
