"use client";

import { useState } from "react";
import { useGame } from "@/lib/store";
import { useLive } from "@/lib/liveClient";
import { ACTIONS, actionLock, payLock, signLock } from "@/lib/game/engine";
import { LEVELS, PLACES } from "@/lib/game/data";
import { pickEvent } from "@/lib/game/events";
import type { PlaceId, Player } from "@/lib/game/types";
import { needs, worstNeed } from "@/lib/game/meta";
import { dailyEvent } from "@/lib/daily";
import { OFFERS, productById } from "@/lib/products";
import { billboardFor, isHouse, noteAdTap } from "@/lib/sponsors";
import { CALENDAR } from "@/lib/game/kit.config";
import { fmtDate, nextFestival, seasonsOn, whenText } from "@/lib/kit/calendar";
import { calDay } from "@/lib/game/select";
import { aOrAn } from "@/lib/game/util";
import WorldView from "@/components/world/WorldView";
import { useFrameCheck, useNow } from "@/components/world/useEnv";
import { Bar, Sheet } from "../ui";

/** How many things you can do at each place right now (the green number on the map). */
export function placeCounts(p: Player): Partial<Record<PlaceId, number>> {
  const out: Partial<Record<PlaceId, number>> = {};
  for (const a of ACTIONS) if (!actionLock(p, a)) out[a.place] = (out[a.place] ?? 0) + 1;
  for (const o of p.obligations) if (o.amount > 0 && !payLock(p, o)) out[o.place] = (out[o.place] ?? 0) + 1;
  if (p.candidates.some((c) => !signLock(p, c))) out.bar = (out.bar ?? 0) + 1;
  return out;
}

export default function HomeTab() {
  const p = useGame((s) => s.player)!;
  // a pop-up covers the map: pause its animations (and don't measure the frame rate then)
  const covered = useGame((s) => !!s.place || !!s.sheet || !!s.vignette);
  useFrameCheck(!covered);
  const here = useGame((s) => s.here);
  const meta = useGame((s) => s.meta);
  const openPlace = useGame((s) => s.openPlace);
  const openSheet = useGame((s) => s.openSheet);
  const toast = useGame((s) => s.toast);
  const endTurn = useGame((s) => s.endTurn);
  const setTab = useGame((s) => s.setTab);
  const others = useLive((s) => s.players);
  const wave = useLive((s) => s.wave);
  const [needsOpen, setNeedsOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const now = useNow();
  const ev = dailyEvent(new Date(now));
  const worst = worstNeed(p);
  const pending = p.pendingEvent ? pickEvent(p.pendingEvent) : null;
  const offerId = Object.entries(meta.offers).find(([id, until]) => until > now && !meta.bought.includes(OFFERS.find((o) => o.id === id)?.productId ?? ""))?.[0];
  const offer = offerId ? OFFERS.find((o) => o.id === offerId) : null;
  const tired = p.energy < 25 || p.days <= 0;

  const onPlace = (id: PlaceId) => {
    const pl = PLACES.find((x) => x.id === id)!;
    if (p.level < pl.minLevel) return toast({ icon: "🔒", title: `${pl.name} opens when you're ${aOrAn(LEVELS[pl.minLevel].name)} ${LEVELS[pl.minLevel].name} label`, text: "See Label → Grow for what's left.", tone: "neutral" });
    openPlace(id);
  };

  const d = calDay(p);
  const seasons = seasonsOn(CALENDAR, d);
  const fest = nextFestival(CALENDAR, d);

  return (
    <div className="relative h-full">
      <WorldView
        p={p}
        here={here}
        counts={placeCounts(p)}
        onPlace={onPlace}
        paused={covered}
        extras={{ neon: !!p.flags["studio:neon"], gold: !!p.flags["studio:gold_room"], ride: ["gwagon", "tokunbo", "keke"].find((r) => p.flags[`ride:${r}`]) }}
        others={others.map((o) => ({ pid: o.pid, name: o.name, place: o.place, look: o.look, label: o.label }))}
        onOther={(o) => wave(o.pid, "👋").then((ok) => ok && toast({ icon: "👋", title: `You waved at ${o.name}`, tone: "good" }))}
        onLandmark={(id, slot) => {
          if (id === "bridge") toast({ icon: "🌉", title: "Third Mainland Bridge", text: "About 11.8 km over the lagoon. Rush hour here is a lifestyle.", tone: "neutral" });
          if (id === "billboard") {
            const b = billboardFor(slot === "sanctuary" ? "sanctuary" : "bridge");
            if (!isHouse(b.id) && b.url) {
              noteAdTap(b.id);
              window.open(b.url, "_blank", "noopener,noreferrer");
              return;
            }
          }
          if (id === "billboard") toast({ icon: "📢", title: slot === "bridge" ? "Billboard by the bridge" : "Billboard at The Sanctuary", text: "Brands and artists can book this spot from ₦5,000 a week. Profile → Advertise.", tone: "neutral" });
        }}
      />

      {/* top strip: season, today in Lagos */}
      <div className="pointer-events-none absolute left-2 right-2 top-2 flex flex-col gap-1.5">
        {/* one slim line; tap to see today's event, the season and the trend in full */}
        <button
          className="pointer-events-auto flex min-h-[40px] max-w-full items-center gap-1.5 self-start rounded-2xl bg-night-2/90 px-3 py-1.5 text-left text-[12.5px] shadow-lg backdrop-blur"
          data-tour="today"
          onClick={() => setInfoOpen(!infoOpen)}
          aria-expanded={infoOpen}
          aria-label={`Today in Lagos: ${ev.title}`}
        >
          <span className="text-base">{ev.emoji}</span>
          {infoOpen ? (
            <span className="min-w-0">
              <span className="block font-bold leading-tight">Today in Lagos: {ev.title}</span>
              <span className="block leading-tight text-lilac">{ev.label}</span>
              <span className="mt-1 block leading-tight text-lilac">
                {fmtDate(d)} · {seasons.map((x) => `${x.emoji} ${x.name}`).join(", ") || "📅 Normal week"}
                {fest && ` · ${fest.f.emoji} ${fest.f.name} ${whenText(fest.inDays)}`}
              </span>
              <span className="mt-1 block leading-tight text-lilac">📱 Trending: {p.trend.tag}</span>
            </span>
          ) : (
            <span className="min-w-0 truncate font-semibold">
              {ev.label} · {seasons[0]?.emoji ?? "📅"} {fmtDate(d)} ▾
            </span>
          )}
        </button>
        {pending && (
          <button className="pointer-events-auto flex items-center gap-2 self-stretch rounded-2xl border-2 border-stage bg-night-2 px-3 py-2 text-left" onClick={() => openSheet("event")}>
            <span className="text-2xl">{pending.icon}</span>
            <span className="min-w-0 flex-1 text-[14px] font-bold">{pending.title}</span>
            <span className="btn btn-stage min-h-[38px] px-3 text-[13px]">Decide</span>
          </button>
        )}
        {offer && !pending && (
          <button className="pointer-events-auto flex items-center gap-2 self-stretch rounded-2xl border border-danfo/60 bg-night-2/95 px-3 py-2 text-left" onClick={() => setTab("wallet")}>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-bold">{offer.title}</span>
              <span className="block text-[12px] text-lilac">{offer.pitch} ₦{productById(offer.productId)?.priceNaira.toLocaleString()}</span>
            </span>
            <span className="text-[12px] font-bold text-danfo">Wallet</span>
          </button>
        )}
      </div>

      {/* thought bubble */}
      {worst && worst.value < 45 && (
        <button className="absolute bottom-[72px] left-2 max-w-[58%] rounded-2xl rounded-bl-sm bg-paper px-3 py-2 text-left text-[13px] font-semibold leading-snug text-night shadow-xl" onClick={() => setNeedsOpen(true)} aria-label="What your boss is thinking">
          💭 {worst.thought}
          {worst.fix && <span className="mt-1 block text-[12px] font-extrabold text-[#a3115b]">Fix it: {worst.fix.label}</span>}
        </button>
      )}

      {/* bottom controls */}
      <div className="absolute bottom-3 left-2 right-16 flex items-end gap-2">
        <button className="btn btn-ghost h-12 w-12 shrink-0 flex-col gap-0 p-0 text-[18px] leading-none" onClick={() => setNeedsOpen(true)} aria-label="Needs">
          💜<span className="text-[9.5px] font-bold">Needs</span>
        </button>
        <button className="btn btn-ghost h-12 w-12 shrink-0 flex-col gap-0 p-0 text-[18px] leading-none" onClick={() => setPlacesOpen(true)} aria-label="Places">
          🧭<span className="text-[9.5px] font-bold">Places</span>
        </button>
        <button data-tour="end-turn" className={`btn h-12 min-w-0 flex-1 whitespace-nowrap text-[15px] ${tired ? "btn-danfo pulse-ring" : "btn-danfo"}`} onClick={() => endTurn()}>
          🌙 End week
        </button>
      </div>

      {needsOpen && <NeedsSheet onClose={() => setNeedsOpen(false)} />}
      {placesOpen && (
        <Sheet title="Places in Lagos" onClose={() => setPlacesOpen(false)} icon="📍">
          <PlacesList
            p={p}
            onPick={(id) => {
              setPlacesOpen(false);
              onPlace(id);
            }}
          />
        </Sheet>
      )}
    </div>
  );
}

function PlacesList({ p, onPick }: { p: Player; onPick: (id: PlaceId) => void }) {
  const counts = placeCounts(p);
  return (
    <ul className="grid gap-2 pb-2">
      {PLACES.map((pl) => {
        const locked = p.level < pl.minLevel;
        return (
          <li key={pl.id}>
            <button className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl bg-night-3 px-3 py-2 text-left ${locked ? "opacity-55" : ""}`} onClick={() => onPick(pl.id)}>
              <span className="text-2xl">{locked ? "🔒" : pl.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-bold">
                  {pl.name} <span className="font-normal text-lilac">· {pl.area}</span>
                </span>
                <span className="block text-[12.5px] text-lilac">{locked ? `Opens at ${LEVELS[pl.minLevel].name} level` : pl.blurb}</span>
              </span>
              {!!counts[pl.id] && !locked && <span className="grid h-7 min-w-7 place-items-center rounded-full bg-lagoon px-1 text-[13px] font-black text-night">{counts[pl.id]}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function NeedsSheet({ onClose }: { onClose: () => void }) {
  const p = useGame((s) => s.player)!;
  const openPlace = useGame((s) => s.openPlace);
  const list = needs(p).sort((a, b) => a.value - b.value);
  const colour = (v: number) => (v < 30 ? "var(--okada)" : v < 60 ? "var(--danfo)" : "var(--lagoon)");
  return (
    <Sheet title="How you're doing" onClose={onClose} icon="💜">
      <p className="text-[13px] text-lilac">Lowest first. Tap Fix it to go straight there.</p>
      <ul className="mt-3 grid gap-2 pb-3">
        {list.map((n) => (
          <li key={n.id} className="rounded-2xl bg-night-3 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">{n.icon}</span>
              <span className="flex-1 text-[14px] font-bold">{n.name}</span>
              {n.fix && n.value < 70 && (
                <button
                  className="btn btn-ghost min-h-[40px] px-3 text-[12.5px]"
                  onClick={() => {
                    onClose();
                    openPlace(n.fix!.place);
                  }}
                >
                  Fix it: {n.fix.label}
                </button>
              )}
            </div>
            <div className="mt-2">
              <Bar value={n.value} color={colour(n.value)} />
            </div>
          </li>
        ))}
      </ul>
      {p.artists.length > 0 && (
        <>
          <h3 className="font-display mt-1 text-[14px] font-bold">Your artists&apos; moods</h3>
          <ul className="mt-2 grid gap-2 pb-4">
            {[...p.artists]
              .sort((a, b) => a.mood - b.mood)
              .map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-night-3 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{a.name}</span>
                  <span className="w-28">
                    <Bar value={a.mood} color={colour(a.mood)} />
                  </span>
                  <span className="w-14 text-right text-[12px] text-lilac">{a.mood < 30 ? "Upset" : a.mood < 60 ? "Okay" : "Happy"}</span>
                </li>
              ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}

