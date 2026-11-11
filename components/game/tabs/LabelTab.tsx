"use client";

import { useState } from "react";
import { useGame } from "@/lib/store";
import { buildChart } from "@/lib/game/music";
import { GENRES, LEVELS, placeById } from "@/lib/game/data";
import { dueText, levelReqs, netWorth, payLock, slots } from "@/lib/game/engine";
import { naira, streamsText } from "@/lib/game/util";
import { ArtistCard } from "../PlaceSheet";
import { Bar, Chip, Empty, Fold, Section, Segments } from "../ui";

type Seg = "roster" | "songs" | "chart" | "bills";

export default function LabelTab() {
  const p = useGame((s) => s.player)!;
  const segVal = (useGame((s) => s.seg.label) as Seg) ?? "roster";
  const setSeg = useGame((s) => s.setSeg);
  const due = p.obligations.filter((o) => o.amount > 0 && o.dueWeek <= p.week).length;
  return (
    <div className="scroll-y h-full px-3 pb-6 pt-3">
      <Growth />
      <div className="mt-3">
        <Segments<Seg>
          value={segVal}
          onChange={(v) => setSeg("label", v)}
          options={[
            { id: "roster", label: "Artists" },
            { id: "songs", label: "Songs" },
            { id: "chart", label: "Top 50" },
            { id: "bills", label: "Bills", badge: due },
          ]}
        />
      </div>
      {segVal === "roster" && <Roster />}
      {segVal === "songs" && <Songs />}
      {segVal === "chart" && <Chart />}
      {segVal === "bills" && <Bills />}
    </div>
  );
}

function Growth() {
  const p = useGame((s) => s.player)!;
  const L = LEVELS[p.level];
  const next = LEVELS[p.level + 1];
  const reqs = levelReqs(p);
  return (
    <div className="rounded-[20px] border border-line bg-night-2 p-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{L.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="font-display truncate text-[17px] font-bold">{p.label}</div>
          <div className="text-[12.5px] text-lilac">
            {L.name} label · {p.artists.length}/{slots(p)} artists · net worth {naira(netWorth(p))}
          </div>
        </div>
      </div>
      {next ? (
        <div className="mt-3">
          <div className="text-[13px] font-bold">
            Next: {next.icon} {next.name}
          </div>
          {/* unfinished first */}
          <ul className="mt-1.5 grid gap-1.5">
            {[...reqs]
              .sort((a, b) => Number(a.done) - Number(b.done))
              .map((r) => (
                <li key={r.label} className="flex items-center gap-2 text-[13px]">
                  <span className="w-5 text-center">{r.done ? "✅" : "⬜"}</span>
                  <span className={`w-36 shrink-0 ${r.done ? "text-lilac line-through" : ""}`}>{r.label}</span>
                  <Bar value={r.progress * 100} color={r.done ? "var(--lagoon)" : "var(--danfo)"} />
                </li>
              ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-lagoon">Top of Africa. Keep the hits coming.</p>
      )}
    </div>
  );
}

function Roster() {
  const p = useGame((s) => s.player)!;
  const drop = useGame((s) => s.drop);
  const openPlace = useGame((s) => s.openPlace);
  const setTab = useGame((s) => s.setTab);
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!p.artists.length)
    return (
      <div className="mt-4">
        <Empty
          icon="🎤"
          text="No artists yet. New acts perform at the Open-mic bar every week."
          action={
            <button
              className="btn btn-danfo"
              onClick={() => {
                setTab("home");
                openPlace("bar");
              }}
            >
              Go to the Open-mic bar
            </button>
          }
        />
      </div>
    );
  return (
    <ul className="mt-3 grid gap-2">
      {p.artists.map((a) => (
        <li key={a.id}>
          <ArtistCard a={a} p={p} />
          <div className="-mt-1 flex items-center gap-2 rounded-b-2xl bg-night-3 px-3 pb-2.5 text-[12.5px] text-lilac">
            <span className="flex-1">
              Mood {Math.round(a.mood)} · Loyalty {Math.round(a.loyalty)} · {a.lastReleaseWeek ? `last single week ${a.lastReleaseWeek}` : "no single yet"}
            </span>
            {confirm === a.id ? (
              <>
                <button className="btn btn-ghost min-h-[40px] px-2 text-[12px]" onClick={() => setConfirm(null)}>
                  Keep
                </button>
                <button
                  className="btn btn-stage min-h-[40px] px-2 text-[12px]"
                  onClick={() => {
                    drop(a.id);
                    setConfirm(null);
                  }}
                >
                  Let go
                </button>
              </>
            ) : (
              <button className="min-h-[40px] px-1 text-[12px] font-bold underline" onClick={() => setConfirm(a.id)}>
                Let go
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Songs() {
  const p = useGame((s) => s.player)!;
  // in progress on top, then released newest first
  const list = [...p.songs].sort((a, b) => Number(a.stage === "released") - Number(b.stage === "released") || (b.releaseWeek ?? 999) - (a.releaseWeek ?? 999));
  if (!list.length) return <div className="mt-4"><Empty icon="🎙️" text="No songs yet. Record 3 sessions at your base or Surulere Sound to make your first single." /></div>;
  return (
    <ul className="mt-3 grid gap-2">
      <Fold
        items={list}
        limit={6}
        more={(n) => `Show ${n} older song${n === 1 ? "" : "s"}`}
        render={(s) => {
        const g = GENRES[s.genre];
        return (
          <li key={s.id} className="rounded-2xl bg-night-3 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{g.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-bold">{s.title}</span>
                <span className="block text-[12px] text-lilac">
                  {s.artistName} · quality {s.quality}
                  {s.video ? " · 🎬 video" : ""}
                  {s.viral ? " · 🌋 viral" : ""}
                </span>
              </span>
              {s.stage === "released" ? (
                <span className="text-right text-[12px]">
                  <span className="block font-bold">{s.rank ? `No. ${s.rank}` : s.pulled ? "Pulled" : "Off chart"}</span>
                  <span className="block text-lilac">{streamsText(s.weekly)}/wk</span>
                </span>
              ) : (
                <Chip tone="good">{s.stage === "recording" ? `Recording ${s.sessions}/3` : s.stage === "mixing" ? "Needs mixing" : "Ready to release"}</Chip>
              )}
            </div>
            {s.stage === "released" && (
              <div className="mt-1 text-[12px] text-lilac">
                Peak {s.peak ? `No. ${s.peak}` : "—"} · {streamsText(s.total)} total streams · out week {s.releaseWeek}
              </div>
            )}
          </li>
        );
        }}
      />
    </ul>
  );
}

function Chart() {
  const p = useGame((s) => s.player)!;
  const [full, setFull] = useState(false);
  // the Top 10, plus any of your songs further down; the full 50 on request
  const rows = buildChart(p).map((r, i) => ({ ...r, pos: i + 1 }));
  const shown = full ? rows : rows.filter((r) => r.pos <= 10 || r.mine);
  return (
    <div className="mt-3">
      <p className="mb-2 text-[12.5px] text-lilac">
        Tunely Top 50, Nigeria. Hot right now: {GENRES[p.trend.genre].icon} {GENRES[p.trend.genre].name} ({p.trend.tag}).
      </p>
      <ol className="grid gap-1">
        {shown.map((r) => (
          <li key={r.id} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] ${r.mine ? "bg-danfo/15 ring-1 ring-danfo" : "bg-night-3"}`}>
            <span className="font-display w-7 text-right text-[13px] font-bold text-lilac">{r.pos}</span>
            <span className="min-w-0 flex-1 truncate">
              <b>{r.title}</b> · {r.artist}
            </span>
            <span className="shrink-0 text-[11.5px] text-lilac">{streamsText(r.weekly)}</span>
          </li>
        ))}
      </ol>
      <button className="btn btn-ghost mt-2 w-full text-[13.5px]" onClick={() => setFull(!full)} aria-expanded={full}>
        {full ? "Show the Top 10 only" : "Show the full Top 50"}
      </button>
    </div>
  );
}

function Bills() {
  const p = useGame((s) => s.player)!;
  const pay = useGame((s) => s.pay);
  const setTab = useGame((s) => s.setTab);
  const openPlace = useGame((s) => s.openPlace);
  // overdue first, then by date
  const list = [...p.obligations].sort((a, b) => a.dueWeek - b.dueWeek);
  const shows = p.shows;
  return (
    <div className="mt-3">
      {!list.length && !shows.length && <Empty icon="🧾" text="No bills or deadlines right now. Enjoy it." />}
      <ul className="grid gap-2">
        {list.map((o) => {
          const chip = dueText(p, o);
          const why = o.amount > 0 ? payLock(p, o) : null;
          return (
            <li key={o.id} className="rounded-2xl bg-night-3 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold">{o.title}</span>
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    <Chip tone={chip === "Overdue" ? "bad" : chip === "This week" ? "bad" : "neutral"}>{chip}</Chip>
                    {o.amount > 0 && <Chip>{naira(o.amount, false)}</Chip>}
                    <Chip>📍 {placeById(o.place).name}</Chip>
                  </span>
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                {o.amount > 0 && (
                  <button className="btn btn-danfo flex-1 text-[13.5px]" disabled={!!why} onClick={() => pay(o.id)}>
                    {why ?? `Pay ${naira(o.amount)}`}
                  </button>
                )}
                <button
                  className="btn btn-ghost flex-1 text-[13.5px]"
                  onClick={() => {
                    setTab("home");
                    openPlace(o.place);
                  }}
                >
                  Go there
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {shows.length > 0 && (
        <Section title="Shows booked">
          <ul className="grid gap-2">
            {shows.map((s) => (
              <li key={s.id} className="rounded-2xl bg-night-3 px-3 py-2 text-[13.5px]">
                🎤 {s.artistName} at The Sanctuary · week {s.week}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
