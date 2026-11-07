"use client";

import { useGame } from "@/lib/store";
import { ACTIONS, actionCost, actionLock, canRoutine, dueText, payLock, signLock, type ActionDef } from "@/lib/game/engine";
import { GENRES, placeById } from "@/lib/game/data";
import { ROUTINES } from "@/lib/game/kit.config";
import { canQuick, isRoutine, routineLock } from "@/lib/kit/routines";
import type { Artist, PlaceId, Player } from "@/lib/game/types";
import { naira } from "@/lib/game/util";
import { ActivityStage } from "@/components/world/scenes";
import Figure, { toFigLook } from "@/components/world/Figure";
import { isNight, useLagosHour } from "@/components/world/useEnv";
import { Chip, Section, Sheet } from "./ui";

/** A place: its scene, what you owe here, who you can sign here, and what you can do. */
export default function PlaceSheet({ id }: { id: PlaceId }) {
  const p = useGame((s) => s.player)!;
  const close = useGame((s) => s.openPlace);
  const pay = useGame((s) => s.pay);
  const pl = placeById(id);
  const night = isNight(useLagosHour());
  const actions = ACTIONS.filter((a) => a.place === id);
  // things you can do now first, locked ones after (unfinished on top)
  const sorted = [...actions].sort((a, b) => Number(!!actionLock(p, a)) - Number(!!actionLock(p, b)));
  const bills = p.obligations.filter((o) => o.place === id && o.amount > 0).sort((a, b) => a.dueWeek - b.dueWeek);
  return (
    <Sheet title={pl.name} icon={pl.icon} onClose={() => close(null)} tall>
      <div className="relative -mx-4 h-[150px] overflow-hidden">
        <ActivityStage place={id} act={{ pose: id === "mamaput" ? "eat" : id === "bar" ? "talk" : "idle", at: 110, prop: id === "mamaput" ? "bench" : undefined }} boss={toFigLook(p.look)} night={night} />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-night-2 to-transparent px-4 pb-2 pt-6 text-[13px] text-lilac">
          {pl.area} · {pl.blurb}
        </div>
      </div>
      {bills.length > 0 && (
        <Section title="Pay here">
          <ul className="grid gap-2">
            {bills.map((o) => {
              const why = payLock(p, o);
              const chip = dueText(p, o);
              return (
                <li key={o.id} className="flex items-center gap-3 rounded-2xl border border-danfo/50 bg-night-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold">{o.title}</span>
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      <Chip tone={chip === "Overdue" ? "bad" : "neutral"}>{chip}</Chip>
                      <Chip>{naira(o.amount, false)}</Chip>
                    </span>
                  </span>
                  <button data-tour={`pay-${o.kind}`} className="btn btn-danfo shrink-0 text-[14px]" disabled={!!why} onClick={() => pay(o.id)}>
                    {why ?? "Pay"}
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
      {id === "bar" && <Candidates p={p} />}
      <Section title="What you can do">
        <ul className="grid gap-2 pb-4">
          {sorted.map((a) => (
            <li key={a.id}>
              <ActionCard p={p} a={a} />
            </li>
          ))}
        </ul>
      </Section>
    </Sheet>
  );
}

export function ActionCard({ p, a }: { p: Player; a: ActionDef }) {
  const act = useGame((s) => s.act);
  const toggle = useGame((s) => s.toggleRoutine);
  const why = actionLock(p, a);
  const cost = actionCost(p, a);
  const st = { uses: p.uses ?? {}, routines: p.routines ?? [] };
  const quick = canQuick(st, a.id, ROUTINES);
  const routine = isRoutine(st, a.id);
  const rLock = routineLock(st, a.id, ROUTINES, canRoutine(a.id));
  const showRoutine = canRoutine(a.id) && (routine || (st.uses[a.id] ?? 0) >= ROUTINES.unlockAt);
  return (
    <div className={`rounded-2xl bg-night-3 px-3 py-2.5 ${why ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-night text-2xl">{a.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-bold leading-tight">{a.label}</div>
          <div className="mt-0.5 text-[12.5px] leading-snug text-lilac">{a.desc}</div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {a.energy > 0 && <Chip>⚡ −{a.energy}</Chip>}
            {a.energy < 0 && <Chip tone="good">⚡ +{-a.energy}</Chip>}
            {a.days ? <Chip>📅 {a.days} day{a.days > 1 ? "s" : ""}</Chip> : null}
            {cost > 0 && <Chip>{naira(cost)}</Chip>}
            {routine && <Chip tone="good">🔁 Routine</Chip>}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button data-tour={`action-${a.id}`} className="btn btn-danfo min-w-0 flex-1 text-[14px]" disabled={!!why} onClick={() => act(a.id)}>
          {why ?? "Do it"}
        </button>
        {quick && !why && (
          <button className="btn btn-ghost shrink-0 px-3 text-[13px]" onClick={() => act(a.id, true)} aria-label={`Quick do: ${a.label}`}>
            ⚡ Quick
          </button>
        )}
        {showRoutine && (
          <button className={`btn shrink-0 px-3 text-[13px] ${routine ? "btn-stage" : "btn-ghost"}`} onClick={() => toggle(a.id)} title={rLock ?? undefined} aria-pressed={routine}>
            🔁
          </button>
        )}
      </div>
    </div>
  );
}

function Candidates({ p }: { p: Player }) {
  const sign = useGame((s) => s.sign);
  return (
    <Section title="Acts on stage tonight">
      <ul className="grid gap-2">
        {p.candidates.map((c) => (
          <li key={c.id}>
            <ArtistCard a={c} p={p} onSign={() => sign(c.id)} lock={signLock(p, c)} />
          </li>
        ))}
        {!p.candidates.length && <li className="text-[13px] text-lilac">You signed tonight&apos;s act. New acts come next week.</li>}
      </ul>
    </Section>
  );
}

export function ArtistCard({ a, p, onSign, lock }: { a: Artist; p: Player; onSign?: () => void; lock?: string | null }) {
  const g = GENRES[a.genre];
  const hot = a.genre === p.trend.genre;
  return (
    <div className="rounded-2xl bg-night-3 px-3 py-2.5">
      <div className="flex items-start gap-3">
        <svg viewBox="-30 -110 60 115" className="h-14 w-11 shrink-0" aria-hidden>
          <ActorMini a={a} />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[15px] font-bold">{a.name}</span>
            <span className="rounded-full px-2 py-0.5 text-[11.5px] font-bold" style={{ background: `${g.color}22`, color: g.color }}>
              {g.icon} {g.name}
            </span>
            {hot && <Chip tone="good">📱 On trend</Chip>}
          </div>
          <div className="mt-0.5 text-[12.5px] text-lilac">{a.bio}</div>
          <div className="mt-1.5 grid grid-cols-3 gap-1 text-[12px]">
            <span>🎤 Talent {a.talent}</span>
            <span>⭐ Fans {Math.round(a.star)}</span>
            <span>😤 Ego {a.ego}</span>
          </div>
          {onSign && (
            <div className="mt-1 text-[12px] text-lilac">
              Advance {naira(a.advance)} (half now) · royalty {Math.round(a.royalty * 100)}%
            </div>
          )}
        </div>
      </div>
      {onSign && (
        <button data-tour="sign-artist" className="btn btn-danfo mt-2 w-full text-[14px]" disabled={!!lock} onClick={onSign}>
          {lock ?? `Sign ${a.name.split(" ")[0]} (${naira(Math.ceil(a.advance / 2))} now)`}
        </button>
      )}
    </div>
  );
}

function ActorMini({ a }: { a: Artist }) {
  return <Figure look={{ skin: a.look.skin, hue: a.look.hue, hair: a.look.hair }} pose="idle" />;
}

