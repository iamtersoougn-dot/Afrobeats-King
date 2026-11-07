"use client";

import { useEffect, useState } from "react";
import { useGame, vipOn } from "@/lib/store";
import { useLive } from "@/lib/liveClient";
import { BOARD_PHRASES } from "@/lib/live";
import { GENRES } from "@/lib/game/data";
import { ACHIEVEMENTS, questsFor, sortTasks } from "@/lib/game/meta";
import { CAMPS, SEASON_WEEK_CAP, SEASON_WIN_GOLD, lagosDay, seasonWeek, weekEndsAt } from "@/lib/daily";
import { DAILY_REWARDS } from "@/lib/products";
import { SEASON_TIERS, XP_PER_TIER, currentSeason, freeReward, premiumReward } from "@/lib/season";
import { SPONSORED_SONGS } from "@/lib/sponsors";
import { useNow } from "@/components/world/useEnv";
import { Bar, Chip, Empty, Section, Segments } from "../ui";

type Seg = "feed" | "live" | "rewards";

export default function PhoneTab() {
  const seg = (useGame((s) => s.seg.phone) as Seg) ?? "feed";
  const setSeg = useGame((s) => s.setSeg);
  const meta = useGame((s) => s.meta);
  const now = useNow();
  const day = lagosDay(new Date(now));
  const ready = questsFor(day).filter((q) => meta.quests.day === day && (meta.quests.prog[q.id] ?? 0) >= q.need && !meta.quests.claimed.includes(q.id)).length + (meta.daily.last !== day ? 1 : 0);
  return (
    <div className="scroll-y h-full px-3 pb-6 pt-3">
      <Segments<Seg>
        value={seg}
        onChange={(v) => setSeg("phone", v)}
        options={[
          { id: "feed", label: "ClipTok" },
          { id: "live", label: "Live" },
          { id: "rewards", label: "Rewards", badge: ready },
        ]}
      />
      {seg === "feed" && <Feed />}
      {seg === "live" && <Live />}
      {seg === "rewards" && <Rewards />}
    </div>
  );
}

function Feed() {
  const p = useGame((s) => s.player)!;
  const g = GENRES[p.trend.genre];
  return (
    <div>
      <div className="mt-3 rounded-[20px] border border-stage/50 bg-night-2 p-3">
        <div className="text-[12px] font-bold text-stage">Trending on ClipTok</div>
        <div className="font-display mt-1 text-[19px] font-bold">{p.trend.tag}</div>
        <div className="text-[13px] text-lilac">
          {g.icon} {g.name} songs get a big push until week {p.trend.until}. Release one and do a ClipTok challenge.
        </div>
        {p.flags.gist === p.week && <div className="mt-1 text-[12.5px] text-danfo">Mama Put&apos;s gist: next up is {GENRES[p.nextTrend.genre].name}.</div>}
      </div>
      {SPONSORED_SONGS.length > 0 && (
        <Section title="New music">
          <div className="grid gap-2">
            {SPONSORED_SONGS.slice(0, 3).map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer sponsored" className="flex min-h-[56px] items-center gap-3 rounded-2xl bg-night-3 px-3 py-2">
                <span className="text-2xl">🎵</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">{s.title}</span>
                  <span className="block text-[12px] text-lilac">{s.artist}</span>
                </span>
                <Chip>Sponsored</Chip>
              </a>
            ))}
          </div>
        </Section>
      )}
      {p.recap && (
        <Section title={`Week ${p.recap.week} recap`}>
          <ul className="grid gap-1.5">
            {p.recap.lines.map((l, i) => (
              <li key={i} className="flex gap-2 rounded-xl bg-night-3 px-3 py-2 text-[13px]">
                <span>{l.icon}</span>
                <span className={l.tone === "bad" ? "text-okada" : ""}>{l.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Label news">
        <ul className="grid gap-1.5">
          {p.log.slice(0, 25).map((l, i) => (
            <li key={i} className="flex gap-2 rounded-xl bg-night-3 px-3 py-2 text-[13px]">
              <span>{l.icon}</span>
              <span className="min-w-0 flex-1">{l.text}</span>
              <span className="shrink-0 text-[11.5px] text-lilac">wk {l.week}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Live() {
  const meta = useGame((s) => s.meta);
  const p = useGame((s) => s.player)!;
  const toast = useGame((s) => s.toast);
  const live = useLive();
  const now = useNow();
  const [amb, setAmb] = useState<{ code: string; invites: number; goldEarned: number } | null>(null);
  const [ambState, setAmbState] = useState<"idle" | "loading" | "off">("idle");
  const loadCamps = live.loadCamps;
  useEffect(() => {
    loadCamps();
  }, [loadCamps]);
  const week = seasonWeek(new Date(now || 1));
  const myPts = meta.season.week === week ? meta.season.pts : 0;
  const ends = weekEndsAt(new Date(now || 1));
  const days = Math.max(0, Math.ceil((ends.getTime() - (now || 1)) / 86_400_000));
  const camp = meta.camp ?? p.artists[0]?.genre ?? "afrobeats";

  const getCode = async () => {
    setAmbState("loading");
    try {
      const r = await fetch("/api/ambassador", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ installId: meta.installId, name: p.name, camp }) });
      const d = await r.json();
      if (d.configured && d.code) {
        setAmb(d);
        setAmbState("idle");
      } else setAmbState("off");
    } catch {
      setAmbState("off");
    }
  };
  const share = async (code: string) => {
    const url = `${window.location.origin}/?ref=${code}`;
    const text = `I'm running ${p.label} in Afrobeats King, a Lagos music-label game. Start your own label: ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: "Afrobeats King", text, url });
      else {
        await navigator.clipboard.writeText(text);
        toast({ icon: "📋", title: "Invite copied", text: "Paste it in WhatsApp or X.", tone: "good" });
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div>
      <Section title={`Genre camps · this week`} aside={<span className="text-[12px] text-lilac">ends in {days} day{days === 1 ? "" : "s"}</span>}>
        <div className="rounded-2xl bg-night-3 p-3">
          <div className="text-[14px] font-bold">
            You&apos;re in {GENRES[camp].icon} {CAMPS[camp].name}
          </div>
          <div className="text-[12.5px] text-lilac">{CAMPS[camp].cry}. Everything you do earns your camp points. The top camp&apos;s players each get {SEASON_WIN_GOLD} 🪙.</div>
          <div className="mt-2 flex items-center gap-2 text-[13px]">
            <span className="w-28 shrink-0">Your points: {myPts}</span>
            <Bar value={(myPts / SEASON_WEEK_CAP) * 100} />
          </div>
        </div>
        {live.camps.length > 0 && (
          <ol className="mt-2 grid gap-1">
            {live.camps.map((c, i) => (
              <li key={c.camp} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] ${c.camp === camp ? "bg-danfo/15 ring-1 ring-danfo" : "bg-night-3"}`}>
                <span className="w-5 font-bold text-lilac">{i + 1}</span>
                <span className="flex-1">{CAMPS[c.camp as keyof typeof CAMPS]?.name ?? c.camp}</span>
                <span className="text-lilac">{c.players} players</span>
                <span className="w-16 text-right font-bold">{c.pts.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Who's in Lagos now">
        {live.configured === false ? (
          <Empty icon="📡" text="Live play isn't switched on yet. You'll see other label bosses here soon." />
        ) : live.players.length === 0 ? (
          <Empty icon="🌙" text="No one else is around right now. Invite a friend below." />
        ) : (
          <ul className="grid gap-1.5">
            {live.players.slice(0, 20).map((o) => (
              <li key={o.pid} className="flex items-center gap-2 rounded-xl bg-night-3 px-3 py-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate">
                  <b>{o.name}</b>
                  {o.label ? ` · ${o.label}` : ""}
                  {o.camp ? ` · ${GENRES[o.camp]?.icon ?? ""}` : ""}
                </span>
                <span className="shrink-0 text-[11.5px] text-lilac">{o.ago < 90 ? "now" : `${Math.round(o.ago / 60)}m`}</span>
                <button className="btn btn-ghost min-h-[40px] px-2 text-[15px]" onClick={() => live.wave(o.pid, "👋").then((ok) => ok && toast({ icon: "👋", title: `Waved at ${o.name}`, tone: "good" }))} aria-label={`Wave at ${o.name}`}>
                  👋
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {live.configured !== false && (
        <Section title="Notice board">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(BOARD_PHRASES).map(([k, v]) => (
              <button key={k} className="min-h-[40px] rounded-full bg-night-3 px-3 text-[12.5px] font-semibold" onClick={() => live.post(k)}>
                {v}
              </button>
            ))}
          </div>
          <ul className="mt-2 grid gap-1">
            {live.board.map((b) => (
              <li key={b.id} className="rounded-xl bg-night px-3 py-1.5 text-[13px]">
                <b>{b.mine ? "You" : b.name}</b>: {BOARD_PHRASES[b.msg] ?? ""} <span className="text-[11px] text-lilac">· {b.ago < 90 ? "now" : `${Math.round(b.ago / 60)}m`}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11.5px] text-lilac">Set phrases only, so the board stays friendly.</p>
        </Section>
      )}

      <Section title="Invite friends">
        <div className="rounded-2xl bg-night-3 p-3">
          <p className="text-[13px] text-lilac">Share your code. When a friend plays their first 4 weeks, you get 100 🪙.</p>
          {amb ? (
            <>
              <div className="font-display mt-2 text-[22px] font-black tracking-wide text-danfo">{amb.code}</div>
              <div className="text-[12.5px] text-lilac">
                {amb.invites} friend{amb.invites === 1 ? "" : "s"} joined · {amb.goldEarned} 🪙 earned
              </div>
              <button className="btn btn-danfo mt-2 w-full" onClick={() => share(amb.code)}>
                Share invite
              </button>
            </>
          ) : (
            <button className="btn btn-danfo mt-2 w-full" disabled={ambState === "loading"} onClick={ambState === "off" ? () => share(meta.installId) : getCode}>
              {ambState === "loading" ? "Getting your code…" : ambState === "off" ? "Share the game" : "Get my invite code"}
            </button>
          )}
        </div>
      </Section>
    </div>
  );
}

function Rewards() {
  const meta = useGame((s) => s.meta);
  const p = useGame((s) => s.player)!;
  const claimDaily = useGame((s) => s.claimDaily);
  const claimQuest = useGame((s) => s.claimQuest);
  const claimTier = useGame((s) => s.claimTier);
  const setTab = useGame((s) => s.setTab);
  const setSeg = useGame((s) => s.setSeg);
  const now = useNow();
  const day = lagosDay(new Date(now || 1));
  const claimedToday = meta.daily.last === day;
  const streak = claimedToday ? meta.daily.streak : meta.daily.last === lagosDay(new Date((now || 1) - 86_400_000)) ? meta.daily.streak + 1 : 1;
  const qs = questsFor(day);
  const prog = meta.quests.day === day ? meta.quests : { prog: {} as Record<string, number>, claimed: [] as string[] };
  const qState = (id: string, need: number) => (prog.claimed.includes(id) ? "done" : (prog.prog[id] ?? 0) >= need ? "ready" : "todo");
  const season = currentSeason(new Date(now || 1));
  const pass = meta.pass.id === season.id ? meta.pass : { premium: false, xp: 0, free: [] as number[], prem: [] as number[] };
  const tier = Math.min(SEASON_TIERS, Math.floor(pass.xp / XP_PER_TIER));
  const achState = (id: string) => (meta.ach.includes(id) ? "done" : "todo");
  return (
    <div>
      <Section title="Daily reward">
        <div className="rounded-2xl bg-night-3 p-3">
          <div className="grid grid-cols-7 gap-1">
            {DAILY_REWARDS.map((g, i) => {
              const d = i + 1;
              const cur = ((streak - 1) % 7) + 1;
              const got = claimedToday ? d <= cur : d < cur;
              return (
                <div key={i} className={`rounded-lg py-1.5 text-center text-[11.5px] font-bold ${d === cur && !claimedToday ? "bg-danfo text-danfo-ink" : got ? "bg-lagoon/20 text-lagoon" : "bg-night text-lilac"}`}>
                  <div>Day {d}</div>
                  <div>{vipOn(meta) ? g * 2 + 25 : g}🪙</div>
                </div>
              );
            })}
          </div>
          <button className="btn btn-danfo mt-2 w-full" disabled={claimedToday} onClick={claimDaily}>
            {claimedToday ? "Collected. Back tomorrow" : `Collect day ${((streak - 1) % 7) + 1}`}
          </button>
        </div>
      </Section>

      <Section title="Today's quests">
        <ul className="grid gap-2">
          {sortTasks(qs, (q) => qState(q.id, q.need)).map((q) => {
            const st = qState(q.id, q.need);
            const n = Math.min(q.need, prog.prog[q.id] ?? 0);
            return (
              <li key={q.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${st === "done" ? "bg-night opacity-60" : "bg-night-3"}`}>
                <span className="text-xl">{q.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14px] font-bold ${st === "done" ? "line-through" : ""}`}>{q.text}</span>
                  <span className="mt-1 flex items-center gap-2 text-[12px] text-lilac">
                    {n}/{q.need}
                    <Bar value={(n / q.need) * 100} />
                  </span>
                </span>
                {st === "ready" ? (
                  <button className="btn btn-danfo shrink-0 px-3 text-[13px]" onClick={() => claimQuest(q.id)}>
                    +{q.gold}🪙
                  </button>
                ) : (
                  <span className="shrink-0 text-[12px] font-bold text-lilac">{st === "done" ? "Done" : `${q.gold}🪙`}</span>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={season.name} aside={<span className="text-[12px] text-lilac">Tier {tier}/{SEASON_TIERS}</span>}>
        <div className="rounded-2xl bg-night-3 p-3">
          <Bar value=  {((pass.xp % XP_PER_TIER) / XP_PER_TIER) * 100} color="var(--stage)" />
          <p className="mt-1 text-[12px] text-lilac">Earn XP by playing, quests and daily rewards. {pass.premium ? "Premium track unlocked." : "Unlock the premium track in Wallet → Shop."}</p>
          <div className="no-scrollbar mt-2 grid gap-1.5">
            {Array.from({ length: SEASON_TIERS }, (_, i) => i + 1)
              .filter((t) => t <= tier + 3)
              .sort((a, b) => {
                // claimable first, then upcoming, claimed at the bottom
                const st = (t: number) => (pass.free.includes(t) && (!pass.premium || pass.prem.includes(t)) ? 2 : t <= tier ? 0 : 1);
                return st(a) - st(b) || a - b;
              })
              .slice(0, 8)
              .map((t) => {
                const f = freeReward(t);
                const pr = premiumReward(t);
                const reached = t <= tier;
                return (
                  <div key={t} className="flex items-center gap-2 text-[12.5px]">
                    <span className="w-12 font-bold text-lilac">Tier {t}</span>
                    <button className="btn btn-ghost min-h-[40px] flex-1 px-2 text-[12.5px]" disabled={!reached || pass.free.includes(t)} onClick={() => claimTier(t, false)}>
                      {pass.free.includes(t) ? "✓" : f.label}
                    </button>
                    <button className="btn btn-ghost min-h-[40px] flex-1 px-2 text-[12.5px]" disabled={!reached || !pass.premium || pass.prem.includes(t)} onClick={() => claimTier(t, true)}>
                      {pass.prem.includes(t) ? "✓" : `${pass.premium ? "" : "🔒 "}${pr.label}`}
                    </button>
                  </div>
                );
              })}
          </div>
          {!pass.premium && (
            <button
              className="btn btn-stage mt-2 w-full text-[13.5px]"
              onClick={() => {
                setSeg("wallet", "shop");
                setTab("wallet");
              }}
            >
              Get the Tour Pass
            </button>
          )}
        </div>
      </Section>

      <Section title="Achievements" aside={<span className="text-[12px] text-lilac">{meta.ach.length}/{ACHIEVEMENTS.length}</span>}>
        <ul className="grid gap-1.5">
          {sortTasks(ACHIEVEMENTS, (a) => achState(a.id)).map((a) => {
            const done = meta.ach.includes(a.id);
            return (
              <li key={a.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${done ? "bg-night opacity-70" : "bg-night-3"}`}>
                <span className={`text-xl ${done ? "" : "grayscale"}`}>{a.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold">{a.name}</span>
                  <span className="block text-[12px] text-lilac">{a.text}</span>
                </span>
                <span className={`text-[12px] font-bold ${done ? "text-lagoon" : "text-lilac"}`}>{done ? "✓" : `${a.gold}🪙`}</span>
              </li>
            );
          })}
        </ul>
      </Section>
      {p.chill && <p className="mt-3 text-[12px] text-lilac">🌿 Chill label: you still earn gold and camp points.</p>}
    </div>
  );
}
