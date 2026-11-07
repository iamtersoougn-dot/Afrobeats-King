"use client";

/**
 * Game store (zustand, saved on the phone as "abk-save-v1").
 * The rules live in lib/game (pure functions on a cloned player); the store applies results,
 * shows floats/toasts, and keeps the out-of-run things (gold, looks, quests, passes) in `meta`.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_LOOK, SAVE_VERSION, actionById, clone, createPlayer, doAction, dropArtist, endWeek, payObligation, resolveEvent, score, signArtist, type NewGameOpts } from "./game/engine";
import { canQuick, toggleRoutine } from "./kit/routines";
import { NO_ROUTINE, ROUTINES, START_DAY, DAYS_PER_TURN } from "./game/kit.config";
import { ACHIEVEMENTS, questsFor } from "./game/meta";
import type { ActionResult, Deltas, Genre, PlaceId, Player, TabId, Tone } from "./game/types";
import { applyDeltas, deltaChips } from "./game/util";
import { SEASON_PTS, SEASON_WEEK_CAP, dailyEvent, eventMatches, lagosDay, seasonWeek } from "./daily";
import { SEASON_TIERS, XP, XP_PER_TIER, currentSeason, freeReward, premiumReward } from "./season";
import { AD_GOLD, DAILY_REWARDS, MAX_ADS_PER_DAY, OFFERS, PRODUCTS, REFILL, itemById, productById } from "./products";
import { DEMO_PURCHASES, PAY_PROVIDER, payWithPaystack, startFlutterwave, verifyFlutterwave, verifyPurchase } from "./pay";
import { analytics } from "./analytics";
import { setSoundEnabled, sfx } from "./sound";

export interface Toast {
  id: number;
  icon: string;
  title: string;
  text?: string;
  tone: Tone;
}
export interface Float {
  id: number;
  text: string;
  tone: Tone;
}
export interface Vignette {
  id: number;
  actionId: string;
  place: PlaceId;
  text: string;
  tone: Tone;
  chips: { text: string; tone: Tone }[];
  extra?: string; // daily bonus line
}
export type Sheet = null | "help" | "report" | "recap" | "event" | "settings" | "wardrobe" | "ad" | "level" | "newgame";

export interface Meta {
  installId: string;
  tutorialDone: boolean;
  smooth: boolean | null; // null = decide from the phone
  sound: boolean;
  livePresence: boolean;
  camp: Genre | null;
  gold: number;
  owned: string[];
  vipUntil: number;
  noAds: boolean;
  pass: { id: string; premium: boolean; xp: number; free: number[]; prem: number[] };
  daily: { last: string; streak: number };
  quests: { day: string; prog: Record<string, number>; claimed: string[] };
  ach: string[];
  season: { week: string; pts: number };
  ref: string | null;
  refSent: boolean;
  offers: Record<string, number>; // offer id → expires at (ms)
  offersSeen: string[];
  purchases: string[]; // payment references already granted
  bought: string[]; // product ids bought (once-only)
  pending: { txRef: string; productId: string; at: number }[];
  rewards: number[]; // server reward ids collected
  lastSeen: number;
  ads: { day: string; n: number };
  refill: string;
  email: string;
  errors: string[];
  submitted: string[]; // run ids sent to the leaderboard
}

const freshMeta = (): Meta => ({
  installId: "",
  tutorialDone: false,
  smooth: null,
  sound: false,
  livePresence: true,
  camp: null,
  gold: 0,
  owned: ["basic"],
  vipUntil: 0,
  noAds: false,
  pass: { id: "", premium: false, xp: 0, free: [], prem: [] },
  daily: { last: "", streak: 0 },
  quests: { day: "", prog: {}, claimed: [] },
  ach: [],
  season: { week: "", pts: 0 },
  ref: null,
  refSent: false,
  offers: {},
  offersSeen: [],
  purchases: [],
  bought: [],
  pending: [],
  rewards: [],
  lastSeen: 0,
  ads: { day: "", n: 0 },
  refill: "",
  email: "",
  errors: [],
  submitted: [],
});

interface State {
  player: Player | null;
  meta: Meta;
  // screen state (not saved)
  tab: TabId;
  seg: Record<string, string>;
  place: PlaceId | null;
  /** where the boss is standing on the map */
  here: PlaceId;
  sheet: Sheet;
  tour: number | null;
  toasts: Toast[];
  floats: Float[];
  flash: Record<string, number>;
  vignette: Vignette | null;
  busy: boolean;
  hydrated: boolean;

  // navigation
  setTab: (t: TabId) => void;
  setSeg: (key: string, v: string) => void;
  openPlace: (p: PlaceId | null) => void;
  openSheet: (s: Sheet) => void;
  closeVignette: () => void;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  // tutorial
  setTour: (n: number | null) => void;
  finishTour: (skipped: boolean) => void;
  replayTour: () => void;
  // game
  newGame: (o: Omit<NewGameOpts, "seed"> & { camp: Genre }) => void;
  quitGame: () => void;
  act: (id: string, quick?: boolean) => ActionResult;
  sign: (id: string) => ActionResult;
  drop: (id: string) => ActionResult;
  pay: (id: string) => ActionResult;
  choose: (i: number) => void;
  endTurn: () => void;
  toggleRoutine: (id: string) => void;
  // meta
  claimDaily: () => void;
  claimQuest: (id: string) => void;
  claimTier: (tier: number, premium: boolean) => void;
  buyItem: (id: string) => void;
  equip: (id: string) => void;
  refillEnergy: () => void;
  adReward: () => void;
  setSetting: (k: "smooth" | "sound" | "livePresence", v: boolean | null) => void;
  setChill: (v: boolean) => void;
  setLook: (l: Partial<Player["look"]>) => void;
  // money
  buy: (productId: string, email: string) => Promise<{ ok: boolean; message?: string; redirect?: string }>;
  grant: (productId: string, ref: string) => void;
  finishPayReturn: (r: { status: string; txRef: string; transactionId: string | null }) => Promise<void>;
  retryPending: () => Promise<void>;
  onOpen: () => void;
  logError: (msg: string) => void;
}

let uid = 1;
const now = () => Date.now();
const isVip = (m: Meta) => m.vipUntil > now();
export const vipOn = (m: Meta) => isVip(m);

/** Fill fields that older saves don't have. */
export function migratePlayer(p: Player): Player {
  const q = { ...p } as Player;
  q.look ??= { ...DEFAULT_LOOK };
  q.shows ??= [];
  q.uses ??= {};
  q.routines ??= [];
  q.chill ??= false;
  q.calDay ??= START_DAY + (q.week - 1) * DAYS_PER_TURN;
  q.stats = { ...q.stats, shows: q.stats.shows ?? 0, sellouts: q.stats.sellouts ?? 0, videos: q.stats.videos ?? 0 };
  q.v = SAVE_VERSION;
  return q;
}

export const useGame = create<State>()(
  persist(
    (set, get) => {
      /** Clone → change → commit. Gold moves to meta; achievements are granted. */
      const mutate = (fn: (p: Player) => void) => {
        const cur = get().player;
        if (!cur) return;
        const p = clone(cur);
        fn(p);
        const meta = { ...get().meta };
        if (p.gold) {
          meta.gold += p.gold;
          p.gold = 0;
        }
        // achievements: granted the moment they're done
        const newly = ACHIEVEMENTS.filter((a) => !meta.ach.includes(a.id) && a.done(p));
        if (newly.length) {
          meta.ach = [...meta.ach, ...newly.map((a) => a.id)];
          meta.gold += newly.reduce((t, a) => t + a.gold, 0);
          meta.pass = addXp(meta, XP.achievement * newly.length);
          for (const a of newly.slice(0, 2)) get().toast({ icon: a.icon, title: `Achievement: ${a.name}`, text: `+${a.gold} 🪙`, tone: "good" });
          analytics("achievement", { id: newly[0].id });
        }
        set({ player: p, meta });
      };

      const showChips = (d: Deltas) => {
        const chips = deltaChips(d);
        if (!chips.length) return chips;
        const floats = chips.map((c) => ({ id: uid++, text: c.text, tone: c.tone }));
        const flash: Record<string, number> = { ...get().flash };
        for (const k of Object.keys(d)) flash[k] = now();
        set((s) => ({ floats: [...s.floats, ...floats].slice(-6), flash }));
        setTimeout(() => set((s) => ({ floats: s.floats.filter((f) => !floats.some((x) => x.id === f.id)) })), 2200);
        return chips;
      };

      const addXp = (m: Meta, xp: number) => {
        const season = currentSeason(new Date());
        const pass = m.pass.id === season.id ? m.pass : { id: season.id, premium: false, xp: 0, free: [], prem: [] };
        return { ...pass, xp: pass.xp + xp };
      };

      /** quests, season points and pass XP for something the player did (routines don't count). */
      const progress = (key: string, pts: number) => {
        const m = { ...get().meta };
        const day = lagosDay(new Date());
        const qs = m.quests.day === day ? { ...m.quests, prog: { ...m.quests.prog } } : { day, prog: {}, claimed: [] };
        for (const q of questsFor(day)) if (q.on.includes(key)) qs.prog[q.id] = Math.min(q.need, (qs.prog[q.id] ?? 0) + 1);
        m.quests = qs;
        const week = seasonWeek(new Date());
        const s = m.season.week === week ? m.season : { week, pts: 0 };
        m.season = { week, pts: Math.min(SEASON_WEEK_CAP, s.pts + pts) };
        m.pass = addXp(m, key === "endweek" ? XP.week : XP.action);
        set({ meta: m });
      };

      const offer = (id: string) => {
        const m = get().meta;
        const def = OFFERS.find((o) => o.id === id);
        if (!def || m.offersSeen.includes(id) || m.bought.includes(def.productId)) return;
        set({ meta: { ...m, offersSeen: [...m.offersSeen, id], offers: { ...m.offers, [id]: now() + def.hours * 3_600_000 } } });
      };

      return {
        player: null,
        meta: freshMeta(),
        tab: "home",
        seg: {},
        place: null,
        here: "base",
        sheet: null,
        tour: null,
        toasts: [],
        floats: [],
        flash: {},
        vignette: null,
        busy: false,
        hydrated: false,

        setTab: (t) => set({ tab: t, place: null }),
        setSeg: (key, v) => set((s) => ({ seg: { ...s.seg, [key]: v } })),
        openPlace: (pl) => set((s) => ({ place: pl, here: pl ?? s.here })),
        openSheet: (s) => set({ sheet: s }),
        closeVignette: () => set({ vignette: null }),
        toast: (t) => {
          const id = uid++;
          // at most two at once, newest wins
          set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-2) }));
          setTimeout(() => get().dismissToast(id), 3800);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

        setTour: (n) => set({ tour: n }),
        finishTour: (skipped) => {
          set((s) => ({ tour: null, meta: { ...s.meta, tutorialDone: true } }));
          analytics("tutorial_done", { skipped });
        },
        replayTour: () => set({ tour: 0, tab: "home", place: null, sheet: null }),

        newGame: (o) => {
          const m = { ...get().meta };
          if (!m.installId) m.installId = crypto.randomUUID();
          m.camp = o.camp;
          const seed = `${m.installId.slice(0, 8)}-${now().toString(36)}`;
          const p = createPlayer({ ...o, seed });
          set({ player: p, meta: m, tab: "home", place: null, sheet: null, vignette: null, tour: m.tutorialDone ? null : 0 });
          analytics("life_start", { profile: o.profile, camp: o.camp, chill: !!o.chill });
        },

        quitGame: () => set({ player: null, sheet: null, place: null, vignette: null, tour: null, tab: "home" }),

        act: (id, quick = false) => {
          let res: ActionResult = { ok: false, text: "", tone: "bad", deltas: {} };
          let extra: string | undefined;
          mutate((p) => {
            res = doAction(p, id);
            if (!res.ok) return;
            // today's shared event gives a small bonus on matching actions
            const ev = dailyEvent(new Date());
            if (eventMatches(ev, id)) {
              const b = applyDeltas(p, ev.bonus);
              for (const [k, v] of Object.entries(b) as [keyof Deltas, number][]) res.deltas[k] = (res.deltas[k] ?? 0) + v;
              extra = `${ev.emoji} ${ev.label}`;
            }
          });
          if (!res.ok) {
            get().toast({ icon: "🚫", title: res.text, tone: "bad" });
            return res;
          }
          const chips = showChips(res.deltas);
          progress(id, id === "release" ? SEASON_PTS.release : SEASON_PTS.action);
          const a = actionById(id)!;
          if (res.toast) get().toast(res.toast);
          if (id === "release") sfx.drop();
          else sfx.tap();
          const p = get().player!;
          const skip = quick && canQuick({ uses: p.uses ?? {}, routines: p.routines ?? [] }, id, ROUTINES);
          // the tutorial needs the screen clear, so it shows the result line without the scene
          set({ vignette: skip ? null : { id: uid++, actionId: id, place: a.place, text: res.text, tone: res.tone, chips, extra } });
          if (skip || get().tour !== null) get().toast({ icon: a.icon, title: res.text, tone: res.tone });
          return res;
        },

        sign: (id) => {
          let res: ActionResult = { ok: false, text: "", tone: "bad", deltas: {} };
          mutate((p) => (res = signArtist(p, id)));
          if (res.ok) {
            showChips(res.deltas);
            progress("sign", SEASON_PTS.action);
            if (res.toast) get().toast(res.toast);
            sfx.good();
            analytics("signed");
          } else get().toast({ icon: "🚫", title: res.text, tone: "bad" });
          return res;
        },

        drop: (id) => {
          let res: ActionResult = { ok: false, text: "", tone: "bad", deltas: {} };
          mutate((p) => (res = dropArtist(p, id)));
          showChips(res.deltas);
          get().toast({ icon: "👋🏾", title: res.text, tone: res.ok ? "neutral" : "bad" });
          return res;
        },

        pay: (id) => {
          let res: ActionResult = { ok: false, text: "", tone: "bad", deltas: {} };
          mutate((p) => (res = payObligation(p, id)));
          if (res.ok) {
            showChips(res.deltas);
            progress("pay", SEASON_PTS.action);
            sfx.coin();
            if (res.toast) get().toast(res.toast);
          } else get().toast({ icon: "🚫", title: res.text, tone: "bad" });
          return res;
        },

        choose: (i) => {
          let res: ActionResult = { ok: false, text: "", tone: "bad", deltas: {} };
          mutate((p) => (res = resolveEvent(p, i)));
          if (!res.ok) return;
          showChips(res.deltas);
          set((s) => ({ sheet: null, meta: { ...s.meta, pass: addXp(s.meta, XP.event) } }));
          get().toast({ icon: res.icon ?? "✅", title: res.text, tone: res.tone });
        },

        endTurn: () => {
          const before = get().player;
          if (!before || before.ended) return;
          const touring = get().tour !== null;
          let lvlUp = false;
          let firstNo1 = false;
          let sold = 0;
          mutate((p) => {
            const lv = p.level;
            const no1 = p.stats.no1;
            const shows = p.stats.shows;
            const charted = p.stats.charted;
            // random events wait until the tutorial is over
            endWeek(p, { events: get().meta.tutorialDone && !touring });
            lvlUp = p.level > lv;
            firstNo1 = no1 === 0 && p.stats.no1 > 0;
            sold = (p.stats.shows - shows) * SEASON_PTS.show + (p.stats.charted - charted) * SEASON_PTS.chart + (p.stats.no1 - no1) * SEASON_PTS.no1;
          });
          const p = get().player!;
          progress("endweek", SEASON_PTS.action + sold);
          set({ place: null, vignette: null });
          if (lvlUp) {
            sfx.drop();
            offer("level");
            analytics("level", { level: p.level });
          }
          if (firstNo1) offer("no1");
          if (p.cash < 0) offer("sapa");
          if (p.ended) analytics("life_end", { kind: p.ended.kind, week: p.week });
          // no popups while the tutorial is running: the recap waits in the feed
          if (touring) get().toast({ icon: "🌙", title: `Week ${p.week - 1} done`, text: "Your recap is in Phone → Feed.", tone: "neutral" });
          else set({ sheet: "recap" });
        },

        toggleRoutine: (id) => {
          const p = get().player;
          if (!p) return;
          const r = toggleRoutine({ uses: p.uses ?? {}, routines: p.routines ?? [] }, id, ROUTINES, !NO_ROUTINE.includes(id));
          if ("why" in r) return get().toast({ icon: "🔁", title: r.why, tone: "bad" });
          mutate((q) => (q.routines = r.routines));
          const on = r.routines.includes(id);
          get().toast({ icon: "🔁", title: on ? `Routine on: ${actionById(id)?.label}` : "Routine off", text: on ? "It runs by itself at the end of each week for 90% of the reward." : undefined, tone: "neutral" });
        },

        claimDaily: () => {
          const m = { ...get().meta };
          const today = lagosDay(new Date());
          if (m.daily.last === today) return;
          const yesterday = lagosDay(new Date(now() - 86_400_000));
          const streak = m.daily.last === yesterday ? m.daily.streak + 1 : 1;
          let gold = DAILY_REWARDS[(streak - 1) % DAILY_REWARDS.length];
          if (isVip(m)) gold = gold * 2 + 25;
          m.daily = { last: today, streak };
          m.gold += gold;
          m.pass = addXp(m, XP.daily);
          set({ meta: m });
          showChips({ gold });
          get().toast({ icon: "🎁", title: `Day ${streak} reward: +${gold} 🪙`, text: isVip(m) ? "Odogwu Pass doubled it." : "Come back tomorrow for more.", tone: "good" });
          sfx.coin();
        },

        claimQuest: (id) => {
          const m = { ...get().meta };
          const day = lagosDay(new Date());
          const q = questsFor(day).find((x) => x.id === id);
          if (!q || m.quests.day !== day || m.quests.claimed.includes(id) || (m.quests.prog[id] ?? 0) < q.need) return;
          m.quests = { ...m.quests, claimed: [...m.quests.claimed, id] };
          m.gold += q.gold;
          m.pass = addXp(m, XP.quest);
          set({ meta: m });
          showChips({ gold: q.gold });
          sfx.coin();
        },

        claimTier: (tier, premium) => {
          const m = { ...get().meta };
          const season = currentSeason(new Date());
          if (m.pass.id !== season.id) m.pass = addXp(m, 0);
          const pass = { ...m.pass };
          if (tier > SEASON_TIERS || Math.floor(pass.xp / XP_PER_TIER) < tier) return;
          if (premium && !pass.premium) return;
          const list = premium ? pass.prem : pass.free;
          if (list.includes(tier)) return;
          const r = premium ? premiumReward(tier) : freeReward(tier);
          if (premium) pass.prem = [...pass.prem, tier];
          else pass.free = [...pass.free, tier];
          m.pass = pass;
          if (r.kind === "gold") m.gold += r.value as number;
          if (r.kind === "item" && !m.owned.includes(r.value as string)) m.owned = [...m.owned, r.value as string];
          set({ meta: m });
          if (r.kind === "energy") mutate((p) => (p.energy = Math.min(100, p.energy + (r.value as number))));
          get().toast({ icon: "🎟️", title: `Tour Pass: ${r.label}`, tone: "good" });
        },

        buyItem: (id) => {
          const it = itemById(id);
          const m = get().meta;
          if (!it || m.owned.includes(id)) return;
          if (!it.gold) return get().toast({ icon: "🔒", title: "Only from packs, the Tour Pass or awards", tone: "neutral" });
          if (m.gold < it.gold) return get().toast({ icon: "🪙", title: `You need ${it.gold - m.gold} more gold`, tone: "bad" });
          set({ meta: { ...m, gold: m.gold - it.gold, owned: [...m.owned, id] } });
          get().equip(id);
          analytics("gold_item", { id });
        },

        equip: (id) => {
          const it = itemById(id);
          if (!it || !get().meta.owned.includes(id)) return;
          mutate((p) => {
            if (it.slot === "outfit") p.look = { ...p.look, outfit: id, hue: it.hue ?? p.look.hue };
            else if (it.slot === "extra") p.look = { ...p.look, extra: p.look.extra === id ? undefined : id };
            else p.flags[`${it.slot}:${id}`] = p.flags[`${it.slot}:${id}`] ? 0 : 1;
          });
        },

        refillEnergy: () => {
          const m = get().meta;
          const day = lagosDay(new Date());
          if (m.refill === day) return get().toast({ icon: "⚡", title: "One refill a day. Back tomorrow.", tone: "neutral" });
          if (m.gold < REFILL.gold) return get().toast({ icon: "🪙", title: `Needs ${REFILL.gold} gold`, tone: "bad" });
          set({ meta: { ...m, gold: m.gold - REFILL.gold, refill: day } });
          mutate((p) => (p.energy = Math.min(100, p.energy + REFILL.energy)));
          showChips({ energy: REFILL.energy });
        },

        adReward: () => {
          const m = { ...get().meta };
          const day = lagosDay(new Date());
          const ads = m.ads.day === day ? m.ads : { day, n: 0 };
          if (ads.n >= MAX_ADS_PER_DAY) return get().toast({ icon: "📺", title: "That's all the ads for today", tone: "neutral" });
          m.ads = { day, n: ads.n + 1 };
          m.gold += AD_GOLD;
          set({ meta: m });
          showChips({ gold: AD_GOLD });
        },

        setSetting: (k, v) => {
          set((s) => ({ meta: { ...s.meta, [k]: v } }));
          if (k === "sound") setSoundEnabled(!!v);
        },
        setChill: (v) =>
          mutate((p) => {
            p.chill = v;
            if (v) p.flags.chillEver = 1;
          }),
        setLook: (l) => mutate((p) => (p.look = { ...p.look, ...l })),

        // ───────── payments: the server always checks before anything is granted ─────────
        buy: async (productId, email) => {
          const prod = productById(productId);
          const m = get().meta;
          if (!prod) return { ok: false, message: "Unknown item" };
          if (prod.oncePerAccount && m.bought.includes(productId)) return { ok: false, message: "You already have this." };
          analytics("purchase_click", { productId });
          if (DEMO_PURCHASES) {
            get().grant(productId, `demo-${now()}`);
            return { ok: true, message: "Demo purchase (no real money)." };
          }
          if (!PAY_PROVIDER) return { ok: false, message: "The shop isn't open yet. Try again soon." };
          set({ meta: { ...m, email } });
          if (PAY_PROVIDER === "flutterwave") {
            const r = await startFlutterwave(productId, email, m.installId);
            if (!r.ok) return { ok: false, message: r.message };
            set((s) => ({ meta: { ...s.meta, pending: [...s.meta.pending.filter((x) => now() - x.at < 3 * 86_400_000), { txRef: r.txRef, productId, at: now() }] } }));
            return { ok: true, redirect: r.link };
          }
          const out = await payWithPaystack(prod, email, m.installId);
          if (out.status !== "success") return { ok: false, message: out.status === "cancelled" ? "Payment cancelled." : out.message };
          const v = await verifyPurchase(out.reference, productId, m.installId);
          if (!v.ok) return { ok: false, message: v.message ?? "We couldn't confirm the payment yet." };
          get().grant(productId, out.reference);
          return { ok: true };
        },

        grant: (productId, ref) => {
          const prod = productById(productId);
          const m = { ...get().meta };
          if (!prod || m.purchases.includes(ref)) return;
          m.purchases = [...m.purchases, ref].slice(-200);
          m.bought = m.bought.includes(productId) ? m.bought : [...m.bought, productId];
          m.gold += prod.gold;
          if (prod.vipDays) m.vipUntil = Math.max(now(), m.vipUntil) + prod.vipDays * 86_400_000;
          if (prod.removeAds) m.noAds = true;
          if (prod.items) m.owned = [...new Set([...m.owned, ...prod.items])];
          if (prod.pass) {
            m.pass = addXp(m, 0);
            m.pass = { ...m.pass, premium: true, xp: m.pass.xp + (prod.passTiers ?? 0) * XP_PER_TIER };
          }
          m.pending = m.pending.filter((x) => x.productId !== productId || !ref.startsWith("abk-"));
          set({ meta: m });
          if (prod.cash) mutate((p) => (p.cash += prod.cash!));
          get().toast({ icon: "🎉", title: `${prod.name} unlocked`, text: prod.gold ? `+${prod.gold} 🪙` : undefined, tone: "good" });
          sfx.good();
          analytics("purchase_success", { productId });
        },

        finishPayReturn: async (r) => {
          const pend = get().meta.pending.find((x) => x.txRef === r.txRef);
          if (r.status === "cancelled") return get().toast({ icon: "💳", title: "Payment cancelled", tone: "neutral" });
          const v = await verifyFlutterwave(r.txRef, r.transactionId, get().meta.installId);
          const productId = pend?.productId ?? /^abk-([a-z0-9_]+)-/.exec(r.txRef)?.[1] ?? "";
          if (v.ok) get().grant(productId, r.txRef);
          else get().toast({ icon: "💳", title: v.pending ? "Payment still processing" : "Payment not confirmed", text: v.message, tone: v.pending ? "neutral" : "bad" });
        },

        /** Picks up purchases recorded by the webhook and server rewards (season wins, invites). */
        retryPending: async () => {
          const m = get().meta;
          if (!m.installId) return;
          try {
            const res = await fetch(`/api/entitlements?install=${encodeURIComponent(m.installId)}`);
            const d = (await res.json()) as { purchases?: { reference: string; product_id: string }[]; rewards?: { id: number; gold: number; reason: string }[] };
            for (const pu of d.purchases ?? []) if (!get().meta.purchases.includes(pu.reference) && PRODUCTS.some((x) => x.id === pu.product_id)) get().grant(pu.product_id, pu.reference);
            for (const rw of d.rewards ?? []) {
              if (get().meta.rewards.includes(rw.id)) continue;
              set((s) => ({ meta: { ...s.meta, gold: s.meta.gold + rw.gold, rewards: [...s.meta.rewards, rw.id] } }));
              get().toast({ icon: "🎁", title: `+${rw.gold} 🪙`, text: rw.reason, tone: "good" });
            }
          } catch {
            /* offline: try next time */
          }
        },

        onOpen: () => {
          const m = { ...get().meta };
          if (!m.installId) m.installId = crypto.randomUUID();
          // ?ref=CODE from an invite link (kept until the first week is played)
          try {
            const q = new URLSearchParams(window.location.search);
            const ref = q.get("ref");
            if (ref && !m.ref && /^[\w-]{4,64}$/.test(ref)) m.ref = ref;
          } catch {
            /* ignore */
          }
          const away = m.lastSeen && now() - m.lastSeen > 3 * 86_400_000;
          m.lastSeen = now();
          set({ meta: m });
          setSoundEnabled(m.sound);
          if (away) offer("comeback");
          analytics("session_start", { tutorial: m.tutorialDone, week: get().player?.week ?? 0 });
          get().retryPending();
        },

        logError: (msg) => set((s) => ({ meta: { ...s.meta, errors: [...s.meta.errors, msg.slice(0, 200)].slice(-5) } })),
      };
    },
    {
      name: "abk-save-v1",
      version: SAVE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ player: s.player, meta: s.meta }),
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as { player?: Player | null; meta?: Partial<Meta> };
        if (version < SAVE_VERSION && s.player) s.player = migratePlayer(s.player);
        return { player: s.player ?? null, meta: { ...freshMeta(), ...(s.meta ?? {}) } } as unknown as State;
      },
      merge: (persisted, current) => {
        const s = (persisted ?? {}) as { player?: Player | null; meta?: Partial<Meta> };
        return { ...current, player: s.player ? migratePlayer(s.player) : null, meta: { ...freshMeta(), ...(s.meta ?? {}) } };
      },
      // localStorage loads synchronously, before `useGame` exists, so flag "ready" on the next tick
      onRehydrateStorage: () => () => {
        setTimeout(() => useGame.setState({ hydrated: true }), 0);
      },
    },
  ),
);

/** Score for the leaderboard (Chill runs don't go on it, kit rule). */
export const runScore = (p: Player) => score(p);
