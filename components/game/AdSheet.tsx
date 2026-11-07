"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/lib/store";
import { showRewardedAd } from "@/lib/ads";
import { AD_GOLD, MAX_ADS_PER_DAY } from "@/lib/products";
import { billboardFor, SPONSORED_SONGS } from "@/lib/sponsors";
import { lagosDay } from "@/lib/daily";
import { Sheet } from "./ui";

/**
 * Rewarded ad: the player chooses to watch, and gets gold. Uses Google's H5 game ads when configured;
 * if there is no ad (or no ad network), a short house/sponsor card plays instead. Never during the tutorial.
 */
export default function AdSheet({ onClose }: { onClose: () => void }) {
  const reward = useGame((s) => s.adReward);
  const meta = useGame((s) => s.meta);
  const tour = useGame((s) => s.tour);
  const [stage, setStage] = useState<"ask" | "loading" | "house" | "done">("ask");
  const [left, setLeft] = useState(5);
  const today = lagosDay(new Date());
  const used = meta.ads.day === today ? meta.ads.n : 0;

  useEffect(() => {
    if (stage !== "house") return;
    if (left <= 0) {
      const t = setTimeout(() => {
        reward();
        setStage("done");
      }, 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, left, reward]);

  const start = async () => {
    setStage("loading");
    const r = await showRewardedAd("gold");
    if (r === "rewarded") {
      reward();
      setStage("done");
    } else if (r === "house") {
      setLeft(5);
      setStage("house");
    } else setStage("ask");
  };

  const song = SPONSORED_SONGS[used % Math.max(1, SPONSORED_SONGS.length)];
  const board = billboardFor("radio");
  if (tour !== null) return null;
  return (
    <Sheet title="Watch for gold" icon="📺" onClose={onClose}>
      <div className="grid gap-3 pb-4">
        {stage === "ask" && (
          <>
            <p className="text-[14px]">
              Watch a short ad and get <b className="text-danfo">+{AD_GOLD} 🪙</b>. {MAX_ADS_PER_DAY - used} left today.
            </p>
            <button className="btn btn-danfo" disabled={used >= MAX_ADS_PER_DAY} onClick={start}>
              {used >= MAX_ADS_PER_DAY ? "Come back tomorrow" : "Watch"}
            </button>
          </>
        )}
        {stage === "loading" && <p className="text-[14px] text-lilac">Loading the ad…</p>}
        {stage === "house" && (
          <div className="rounded-2xl border border-line bg-night-3 p-4">
            {song ? (
              <>
                <p className="text-[11.5px] font-bold text-lilac">Sponsored song</p>
                <p className="font-display mt-1 text-[18px] font-bold">{song.title}</p>
                <p className="text-[14px]">{song.artist}</p>
                {song.blurb && <p className="mt-1 text-[13px] text-lilac">{song.blurb}</p>}
                <a className="btn btn-ghost mt-3 w-full" href={song.url} target="_blank" rel="noopener noreferrer sponsored">
                  Listen on the artist&apos;s page
                </a>
              </>
            ) : (
              <>
                <p className="text-[11.5px] font-bold text-lilac">From Afrobeats King</p>
                <p className="font-display mt-1 text-[18px] font-bold" style={{ color: board.color }}>
                  {board.brand}
                </p>
                <p className="text-[14px]">{board.line}</p>
                <a className="btn btn-ghost mt-3 w-full" href="/advertise">
                  See ad spots
                </a>
              </>
            )}
            <p className="mt-3 text-center text-[13px] text-lilac">{left > 0 ? `Gold in ${left}…` : "Done"}</p>
          </div>
        )}
        {stage === "done" && (
          <>
            <p className="text-[15px] font-bold text-lagoon">+{AD_GOLD} 🪙 added. Thanks for watching.</p>
            <button className="btn btn-danfo" onClick={onClose}>
              Back to the game
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
