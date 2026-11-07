"use client";

import { useGame } from "@/lib/store";
import { currentGoal, type Goal } from "@/lib/game/goals";
import { word } from "@/lib/kit/chill";
import { CHILL } from "@/lib/game/kit.config";
import { chillOn } from "@/lib/game/select";
import { nairaShort, weekLabel } from "@/lib/game/util";
import type { TabId } from "@/lib/game/types";
import { questsFor } from "@/lib/game/meta";
import { lagosDay } from "@/lib/daily";
import { toneText } from "./ui";
import HomeTab from "./tabs/HomeTab";
import LabelTab from "./tabs/LabelTab";
import WalletTab from "./tabs/WalletTab";
import PhoneTab from "./tabs/PhoneTab";
import ProfileTab from "./tabs/ProfileTab";
import PlaceSheet from "./PlaceSheet";
import Vignette from "./Vignette";
import Sheets from "./Sheets";
import Tour from "./Tour";
import LiveBeat from "./LiveBeat";

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: "home", icon: "🗺️", label: "Home" },
  { id: "label", icon: "💿", label: "Label" },
  { id: "wallet", icon: "💰", label: "Wallet" },
  { id: "phone", icon: "📱", label: "Phone" },
  { id: "profile", icon: "👤", label: "Profile" },
];

export default function Shell() {
  const p = useGame((s) => s.player)!;
  const tab = useGame((s) => s.tab);
  const place = useGame((s) => s.place);
  const sheet = useGame((s) => s.sheet);
  const meta = useGame((s) => s.meta);
  const setTab = useGame((s) => s.setTab);
  const openSheet = useGame((s) => s.openSheet);
  const openPlace = useGame((s) => s.openPlace);
  const goal = currentGoal(p);

  const go = (g: Goal) => {
    if (g.open === "event") return openSheet("event");
    if (g.open === "endweek") {
      setTab("home");
      return;
    }
    if (g.place) {
      setTab("home");
      openPlace(g.place);
      return;
    }
    if (g.tab) setTab(g.tab);
  };

  const day = lagosDay(new Date());
  const qs = questsFor(day);
  const ready = qs.filter((q) => meta.quests.day === day && (meta.quests.prog[q.id] ?? 0) >= q.need && !meta.quests.claimed.includes(q.id)).length + (meta.daily.last !== day ? 1 : 0);

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-night">
      <Hud />
      <button data-tour="goal" className="plate flex min-h-[46px] w-full items-center gap-2 px-3 text-left" onClick={() => go(goal)} aria-label={`Objective: ${goal.text}`}>
        <span className="text-xl">{goal.icon}</span>
        <span className="min-w-0 flex-1 text-[14px] font-extrabold leading-tight">{goal.text}</span>
        {goal.chip && <span className={`shrink-0 rounded-md px-2 py-1 text-[11.5px] font-black ${goal.urgent ? "bg-okada text-white" : "bg-danfo-ink text-danfo"}`}>{goal.chip}</span>}
      </button>
      <Floats />
      <Toasts />
      <main className="relative min-h-0 flex-1">
        {tab === "home" && <HomeTab />}
        {tab === "label" && <LabelTab />}
        {tab === "wallet" && <WalletTab />}
        {tab === "phone" && <PhoneTab />}
        {tab === "profile" && <ProfileTab />}
      </main>
      <nav className="grid grid-cols-5 border-t border-line bg-night-2 pb-[env(safe-area-inset-bottom)]" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} data-tour={`nav-${t.id}`} className={`relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[11.5px] font-bold ${tab === t.id ? "text-danfo" : "text-lilac"}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <span className="text-[21px] leading-none">{t.icon}</span>
            {t.label}
            {t.id === "phone" && ready > 0 && <span className="absolute right-[22%] top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-stage px-1 text-[11px] text-white">{ready}</span>}
            {t.id === "label" && p.obligations.some((o) => o.amount > 0 && o.dueWeek <= p.week) && <span className="absolute right-[26%] top-2 h-2.5 w-2.5 rounded-full bg-okada" />}
          </button>
        ))}
      </nav>
      {place && <PlaceSheet id={place} />}
      <Vignette />
      {sheet && <Sheets which={sheet} />}
      <Tour />
      <LiveBeat />
    </div>
  );
}

function Hud() {
  const p = useGame((s) => s.player)!;
  const gold = useGame((s) => s.meta.gold);
  const flash = useGame((s) => s.flash);
  const openSheet = useGame((s) => s.openSheet);
  const chill = chillOn(p);
  const pill = (k: string, icon: string, text: string, label: string, tone?: string) => (
    <span key={`${k}-${flash[k] ?? 0}`} className={`flex shrink-0 items-center gap-0.5 rounded-lg px-1 py-1 text-[13px] font-extrabold tabular-nums ${flash[k] ? "pill-flash" : ""} ${tone ?? ""}`} aria-label={`${label}: ${text}`}>
      <span aria-hidden className="text-[12px]">{icon}</span>
      <span>{text}</span>
    </span>
  );
  return (
    <header className="flex items-center gap-1 bg-night-2 px-2 pb-1.5 pt-[max(6px,env(safe-area-inset-top))]">
      <div data-tour="hud-stats" className="flex min-w-0 flex-1 items-center justify-between gap-0 overflow-hidden">
        {pill("cash", "💰", chill ? word(CHILL.scales.money, p.cash, true) : nairaShort(p.cash), "Cash", p.cash < 0 ? "text-okada" : "text-danfo")}
        {pill("energy", "⚡", chill ? word(CHILL.scales.energy, p.energy, true) : String(Math.round(p.energy)), "Energy", p.energy < 20 ? "text-okada" : undefined)}
        {pill("hype", "🔥", String(Math.round(p.hype)), "Hype", "text-stage")}
        {pill("rep", "⭐", String(Math.round(p.rep)), "Rep")}
        {pill("gold", "🪙", String(gold), "Gold", "text-danfo")}
      </div>
      <span className="shrink-0 rounded-lg bg-night-3 px-1.5 py-1 text-[11px] font-bold leading-none text-lilac" title={weekLabel(p.week)} aria-label={weekLabel(p.week)}>
        Wk
        <br />
        {p.week}
      </span>
      <button className="btn btn-ghost h-10 w-10 shrink-0 p-0 text-[17px] font-black" onClick={() => openSheet("help")} aria-label="How to play">
        ?
      </button>
    </header>
  );
}

function Floats() {
  const floats = useGame((s) => s.floats);
  if (!floats.length) return null;
  return (
    <div className="pointer-events-none relative z-40 h-0" aria-live="polite">
      <div className="absolute left-0 right-0 top-1 flex flex-wrap justify-center gap-1 px-3">
        {floats.map((f) => (
          <span key={f.id} className={`float-up rounded-full bg-night-2/95 px-2.5 py-1 text-[13px] font-extrabold shadow-lg ${toneText[f.tone]}`}>
            {f.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div className="pointer-events-none relative z-50 h-0" aria-live="polite">
      <div className="absolute left-0 right-0 top-10 flex flex-col gap-1.5 px-3">
        {toasts.map((t) => (
          <button key={t.id} className={`toast-in pointer-events-auto flex w-full items-start gap-2 rounded-2xl border bg-night-2 px-3 py-2 text-left shadow-xl ${t.tone === "good" ? "border-lagoon/60" : t.tone === "bad" ? "border-okada/60" : "border-line"}`} onClick={() => dismiss(t.id)}>
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-bold leading-snug">{t.title}</span>
              {t.text && <span className="block text-[12.5px] leading-snug text-lilac">{t.text}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
