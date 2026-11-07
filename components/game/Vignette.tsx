"use client";

import { useEffect } from "react";
import { useGame } from "@/lib/store";
import { ROUTINES } from "@/lib/game/kit.config";
import { songInProgress, latestRelease } from "@/lib/game/select";
import { ActivityStage, ACT } from "@/components/world/scenes";
import { toFigLook } from "@/components/world/Figure";
import { isNight, useLagosHour } from "@/components/world/useEnv";
import { toneText } from "./ui";

/** After every activity: a short scene of you doing it, with the result line and what changed. */
export default function Vignette() {
  const v = useGame((s) => s.vignette);
  const p = useGame((s) => s.player);
  const tour = useGame((s) => s.tour);
  const close = useGame((s) => s.closeVignette);
  const night = isNight(useLagosHour());

  useEffect(() => {
    if (!v) return;
    const t = setTimeout(close, 4200);
    return () => clearTimeout(t);
  }, [v, close]);

  if (!v || !p || tour !== null) return null;
  const act = ACT[v.actionId] ?? { pose: "idle" as const };
  const song = songInProgress(p) ?? latestRelease(p);
  const artist = (song && p.artists.find((a) => a.id === song.artistId)) ?? p.artists[0];
  const uses = p.uses?.[v.actionId] ?? 0;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true" aria-label="What happened" onClick={close}>
      <div className="sheet-in w-full max-w-[480px] overflow-hidden rounded-t-[22px] border-t border-line bg-night-2 sm:rounded-[22px]" onClick={(e) => e.stopPropagation()}>
        <div className="h-[190px]">
          <ActivityStage place={v.place} act={act} boss={toFigLook(p.look)} artist={artist ? { skin: artist.look.skin, hue: artist.look.hue, hair: artist.look.hair } : { skin: "#6e452b", hue: 160, hair: 3 }} night={night} />
        </div>
        <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <p className={`text-[15px] font-bold leading-snug ${toneText[v.tone]}`}>{v.text}</p>
          {v.chips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {v.chips.map((c, i) => (
                <span key={i} className={`rounded-full bg-night-3 px-2.5 py-1 text-[13px] font-extrabold ${toneText[c.tone]}`}>
                  {c.text}
                </span>
              ))}
            </div>
          )}
          {v.extra && <p className="mt-2 text-[13px] font-semibold text-danfo">{v.extra}</p>}
          {uses === ROUTINES.quickAt - 1 && <p className="mt-2 text-[12.5px] text-lilac">Do this once more to unlock ⚡ Quick (skips this scene).</p>}
          <button className="btn btn-danfo mt-3 w-full" onClick={close} autoFocus>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
