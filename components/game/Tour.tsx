"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/lib/store";
import type { Player } from "@/lib/game/types";

interface Step {
  id: string;
  /** element to spotlight; omit for a centred card */
  target?: string;
  title: string;
  body: string;
  /** "next" shows a Next button; "tap" waits for the player to tap the real button */
  mode: "next" | "tap";
  skip?: (p: Player) => boolean;
}

const sel = (v: string) => `[data-tour="${v}"]`;

function steps(p: Player): Step[] {
  return [
    { id: "intro", title: `Welcome to Lagos, ${p.name}! 🎶`, body: `${p.label} starts today. Let's play your first week together: sign an artist, record, earn some cash, then end the week. About a minute.`, mode: "next" },
    { id: "stats", target: sel("hud-stats"), title: "Your stats", body: "💰 Cash pays for everything. ⚡ Energy is used by every activity. 🔥 Hype is your buzz, ⭐ Rep is respect, 🪙 Gold is for looks.", mode: "next" },
    { id: "goal", target: sel("goal"), title: "Your next move", body: "This yellow board always shows the one thing to do next, with its deadline. Tap it any time to go straight there.", mode: "next" },
    { id: "bar", target: sel("place-bar"), title: "Go to the Open-mic bar", body: "New acts perform here every week. Tap the bar on the map.", mode: "tap" },
    { id: "sign", target: '[data-tour="sign-artist"]:not([disabled])', title: "Sign your first artist", body: "Pick an act and sign them. You pay half the advance now; the rest is due at the Law office in 3 weeks.", mode: "tap", skip: (q) => q.artists.length > 0 },
    { id: "close1", target: sel("sheet-close"), title: "Back to the map", body: "Close the bar.", mode: "tap" },
    { id: "base", target: sel("place-base"), title: "Go home to record", body: "Your base has a free studio setup. Tap it.", mode: "tap" },
    { id: "record", target: sel("action-record"), title: "Record a session", body: "A song takes 3 sessions, then mix & master, then release on Friday. Watch your stats change.", mode: "tap" },
    { id: "close2", target: sel("sheet-close"), title: "Now earn some cash", body: "Close your base.", mode: "tap" },
    { id: "hub", target: sel("place-hub"), title: "Yaba Hub", body: "Upcoming artists buy beats here. Tap Yaba Hub.", mode: "tap" },
    { id: "sell", target: sel("action-sell_beat"), title: "Sell a beat", body: "Quick cash. Your 🎧 Ear makes beats worth more.", mode: "tap" },
    { id: "close3", target: sel("sheet-close"), title: "Almost done", body: "Close Yaba Hub.", mode: "tap" },
    { id: "end", target: sel("end-turn"), title: "End the week", body: "When your energy or days run out, end the week. Streams pay, bills go out and Lagos happens.", mode: "tap" },
    { id: "done", title: "You've got it! 👑", body: "That's the loop: yellow board → a place on the map → End week. Finish your first single and get it on the chart. Tap ? at the top any time.", mode: "next" },
  ];
}

function findVisible(selector: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    els.find((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden";
    }) ?? null
  );
}

/** First-play tutorial: a spotlight on the real buttons, and a real first week. Always skippable. */
export default function Tour() {
  const step = useGame((s) => s.tour);
  const p = useGame((s) => s.player);
  const setTour = useGame((s) => s.setTour);
  const finish = useGame((s) => s.finishTour);
  const list = useMemo(() => (p ? steps(p) : []), [p?.name, p?.label]); // eslint-disable-line react-hooks/exhaustive-deps
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vh, setVh] = useState(800);
  const scrolled = useRef<{ id: string; at: number; n: number }>({ id: "", at: 0, n: 0 });
  const cur = step !== null ? list[step] : null;

  const advance = useCallback(() => {
    const s = useGame.getState();
    const pl = s.player;
    if (s.tour === null || !pl) return;
    let n = s.tour + 1;
    while (n < list.length && list[n].skip?.(pl)) n++;
    if (n >= list.length) finish(false);
    else setTour(n);
  }, [list, finish, setTour]);

  // ask the map to fly to a target place
  useEffect(() => {
    if (cur?.target) window.dispatchEvent(new CustomEvent("abk-tour-target", { detail: cur.target }));
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // follow the target as the screen re-renders
  useLayoutEffect(() => {
    if (!cur) return;
    let t = 0;
    const tick = () => {
      setVh(window.innerHeight);
      if (cur.target) {
        const el = findVisible(cur.target);
        if (el) {
          const r0 = el.getBoundingClientRect();
          const inView = r0.top > 120 && r0.bottom < window.innerHeight - 90;
          const pinned = !!el.closest("nav, header, svg");
          const st = scrolled.current;
          const now = Date.now();
          if (!inView && !pinned && (st.id !== cur.id || (now - st.at > 700 && st.n < 5))) {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
            scrolled.current = { id: cur.id, at: now, n: st.id === cur.id ? st.n + 1 : 1 };
          }
          setRect(el.getBoundingClientRect());
        } else setRect(null);
      } else setRect(null);
      t = window.setTimeout(tick, 120);
    };
    tick();
    return () => clearTimeout(t);
  }, [cur]);

  // tap-to-advance: the real click happens, then we move on
  useEffect(() => {
    if (!cur || cur.mode !== "tap" || !cur.target) return;
    const onClick = (e: MouseEvent) => {
      const el = findVisible(cur.target!);
      if (el && e.target instanceof Node && el.contains(e.target)) setTimeout(advance, 80);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [cur, advance]);

  useEffect(() => {
    const pl = useGame.getState().player;
    if (cur && pl && cur.skip?.(pl)) advance();
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cur || !p) return null;
  const pad = 6;
  const hole = rect ? { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 } : null;
  const below = hole ? hole.y + hole.h / 2 < vh * 0.5 : false;
  const shown = list.filter((s) => !s.skip?.(p));
  const index = Math.max(1, shown.findIndex((s) => s.id === cur.id) + 1);
  const dim = "rgba(8,4,24,0.74)";
  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={`Tutorial: ${cur.title}`}>
      {hole ? (
        <>
          <div className="pointer-events-auto absolute left-0 right-0 top-0" style={{ height: Math.max(0, hole.y), background: dim }} />
          <div className="pointer-events-auto absolute left-0 right-0" style={{ top: hole.y + hole.h, bottom: 0, background: dim }} />
          <div className="pointer-events-auto absolute left-0" style={{ top: hole.y, height: hole.h, width: Math.max(0, hole.x), background: dim }} />
          <div className="pointer-events-auto absolute right-0" style={{ top: hole.y, height: hole.h, left: hole.x + hole.w, background: dim }} />
          <div data-tour-ring className="pulse-ring pointer-events-none absolute rounded-2xl border-[3px] border-danfo" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} />
          {cur.mode === "next" && <div className="pointer-events-auto absolute" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} />}
        </>
      ) : (
        <div className="pointer-events-auto absolute inset-0" style={{ background: dim }} />
      )}
      <div
        className="sheet-in pointer-events-auto absolute w-[min(360px,calc(100vw-24px))] rounded-2xl border border-danfo/50 bg-night-2 p-4 shadow-2xl"
        style={{ left: "50%", translate: hole ? "-50% 0" : "-50% -50%", ...(hole ? (below ? { top: Math.min(hole.y + hole.h + 14, vh - 230) } : { bottom: Math.min(vh - hole.y + 14, vh - 200) }) : { top: "50%" }) }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-extrabold text-danfo">
            Step {index} of {shown.length}
          </span>
          {cur.id !== "done" && (
            <button className="min-h-[40px] rounded-lg px-2 text-[13px] font-bold text-lilac underline-offset-2 hover:underline" onClick={() => finish(true)}>
              Skip tutorial
            </button>
          )}
        </div>
        <div className="font-display mt-1 text-[18px] font-bold leading-tight">{cur.title}</div>
        <p className="mt-1 text-[14.5px] leading-snug text-paper/90">{cur.body}</p>
        {cur.mode === "next" ? (
          <button className="btn btn-danfo mt-3 min-h-[48px] w-full text-[16px]" onClick={advance} autoFocus>
            {cur.id === "intro" ? "Start" : cur.id === "done" ? "Let's go!" : "Next"}
          </button>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-[13px] font-bold text-danfo">
            <span className="inline-block animate-bounce">👆</span>
            {rect ? "Tap the highlighted button" : "Loading…"}
          </div>
        )}
      </div>
    </div>
  );
}
