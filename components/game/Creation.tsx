"use client";

import { useState } from "react";
import { useGame } from "@/lib/store";
import { GENRES, GENRE_IDS, PROFILES } from "@/lib/game/data";
import type { BossLook, Genre, ProfileId } from "@/lib/game/types";
import { CAMPS } from "@/lib/daily";
import Figure from "@/components/world/Figure";
import { Backdrop } from "@/components/world/scenes";

const SKINS = ["#4a2f1d", "#5a3a24", "#6e452b", "#7d4f30", "#8d5a37", "#a06a42"];
const HUES = [285, 330, 25, 50, 140, 200];
const HAIRS = ["Low cut", "High top", "Locs", "Afro puff", "Bun", "Gele"];

export default function Creation() {
  const newGame = useGame((s) => s.newGame);
  const hasPlayed = useGame((s) => s.meta.tutorialDone);
  const lastCamp = useGame((s) => s.meta.camp);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [profile, setProfile] = useState<ProfileId>("producer");
  const [camp, setCamp] = useState<Genre>(lastCamp ?? "afrobeats");
  const [look, setLook] = useState<BossLook>({ skin: "#7d4f30", hair: 1, hue: 285, outfit: "basic" });
  const [chill, setChill] = useState(false);

  if (step === 0)
    return (
      <div className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-hidden">
        <div className="absolute inset-0">
          <svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
            <Backdrop place="sanctuary" />
            <Figure look={{ skin: "#5a3a24", hue: 330, hair: 3 }} pose="sing" x={120} y={150} s={0.9} />
            <Figure look={{ skin: "#7d4f30", hue: 45, hair: 1, outfit: "gold_agbada", extra: "shades" }} pose="dance" x={180} y={150} s={1} delay={-0.4} />
            <Figure look={{ skin: "#8d5a37", hue: 200, hair: 5 }} pose="dance" x={240} y={150} s={0.9} delay={-0.2} />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-b from-night/30 via-night/40 to-night" />
        </div>
        <div className="relative mt-auto px-5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <h1 className="font-display leading-[0.92]">
            <span className="block text-[52px] font-black text-paper">Afrobeats</span>
            <span className="block text-[64px] font-black text-danfo" style={{ textShadow: "0 0 24px rgba(255,201,60,.45)" }}>
              King 👑
            </span>
          </h1>
          <p className="mt-3 max-w-[34ch] text-[15px] leading-snug text-paper/90">Run a record label in Lagos. Sign artists, drop singles, chase the trend and go from a bedroom studio to the whole continent.</p>
          <button className="btn btn-danfo mt-5 min-h-[54px] w-full text-[17px]" onClick={() => setStep(1)}>
            Start your label
          </button>
          <p className="mt-3 text-center text-[12px] text-lilac">Free · saves on your phone · all artists and songs are made up</p>
        </div>
      </div>
    );

  const preview = (
    <svg viewBox="-40 -112 80 118" className="h-32 w-24 shrink-0" aria-label="Your character">
      <Figure look={{ ...look }} pose="idle" />
    </svg>
  );

  if (step === 1)
    return (
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pb-6 pt-5">
        <p className="text-[13px] font-bold text-lilac">Step 1 of 2</p>
        <h1 className="font-display mt-1 text-[24px] font-bold">Who&apos;s the boss?</h1>
        <div className="mt-4 flex items-center gap-4 rounded-[20px] bg-night-2 p-3">
          {preview}
          <label className="grid min-w-0 flex-1 gap-1 text-[13px] font-bold">
            Your name
            <input className="min-h-[48px] w-full min-w-0 rounded-2xl bg-night-3 px-3 text-[16px] font-normal outline-none" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="e.g. Tersoo" autoFocus />
          </label>
        </div>
        <div className="mt-4">
          <div className="text-[13px] font-bold">Skin</div>
          <div className="mt-1.5 flex gap-2">
            {SKINS.map((c) => (
              <button key={c} className={`h-11 w-11 rounded-full border-[3px] ${look.skin === c ? "border-danfo" : "border-transparent"}`} style={{ background: c }} onClick={() => setLook({ ...look, skin: c })} aria-label="Skin tone" aria-pressed={look.skin === c} />
            ))}
          </div>
        </div>
        <div className="mt-4">
          <div className="text-[13px] font-bold">Hair</div>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {HAIRS.map((h, i) => (
              <button key={h} className={`min-h-[44px] rounded-xl text-[13px] font-bold ${look.hair === i ? "bg-danfo text-danfo-ink" : "bg-night-3"}`} onClick={() => setLook({ ...look, hair: i })}>
                {h}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <div className="text-[13px] font-bold">Shirt colour</div>
          <div className="mt-1.5 flex gap-2">
            {HUES.map((h) => (
              <button key={h} className={`h-11 w-11 rounded-xl border-[3px] ${look.hue === h ? "border-danfo" : "border-transparent"}`} style={{ background: `hsl(${h} 70% 55%)` }} onClick={() => setLook({ ...look, hue: h })} aria-label="Shirt colour" aria-pressed={look.hue === h} />
            ))}
          </div>
        </div>
        <div className="mt-auto flex gap-2 pt-6">
          <button className="btn btn-ghost" onClick={() => setStep(0)}>
            Back
          </button>
          <button className="btn btn-danfo flex-1" disabled={!name.trim()} onClick={() => setStep(2)}>
            Next
          </button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pb-6 pt-5">
      <p className="text-[13px] font-bold text-lilac">Step 2 of 2</p>
      <h1 className="font-display mt-1 text-[24px] font-bold">Your label</h1>
      <label className="mt-3 grid gap-1 text-[13px] font-bold">
        Label name
        <input className="min-h-[48px] w-full min-w-0 rounded-2xl bg-night-3 px-3 text-[16px] font-normal outline-none" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={24} placeholder={`${name.trim() || "Boss"} Records`} />
      </label>
      <div className="mt-4 text-[13px] font-bold">How you start</div>
      <div className="mt-1.5 grid gap-2">
        {PROFILES.map((pr) => (
          <button key={pr.id} className={`rounded-2xl border-2 p-3 text-left ${profile === pr.id ? "border-danfo bg-danfo/10" : "border-line bg-night-3"}`} onClick={() => setProfile(pr.id)} aria-pressed={profile === pr.id}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{pr.icon}</span>
              <span className="flex-1 text-[15px] font-bold">{pr.name}</span>
              <span className="text-[12px] font-bold text-lilac">{pr.difficulty}</span>
            </div>
            <p className="mt-1 text-[13px] text-lilac">{pr.tagline}</p>
            <ul className="mt-1.5 grid gap-0.5 text-[12.5px]">
              {pr.perks.map((k) => (
                <li key={k}>· {k}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      <div className="mt-4 text-[13px] font-bold">Your genre camp</div>
      <p className="text-[12.5px] text-lilac">Every week, players earn points for their camp. The top camp gets gold. You can sign any genre.</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {GENRE_IDS.map((g) => (
          <button key={g} className={`min-h-[48px] rounded-xl px-2 text-left text-[13px] font-bold ${camp === g ? "bg-danfo text-danfo-ink" : "bg-night-3"}`} onClick={() => setCamp(g)} aria-pressed={camp === g}>
            {GENRES[g].icon} {CAMPS[g].name.replace("Team ", "")}
          </button>
        ))}
      </div>
      <button className="mt-4 flex min-h-[56px] items-center gap-3 rounded-2xl bg-night-3 px-3 text-left" onClick={() => setChill(!chill)} role="switch" aria-checked={chill}>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold">🌿 Chill mode</span>
          <span className="block text-[12.5px] text-lilac">No game-over, no late fees, fewer setbacks. Skips the leaderboard.</span>
        </span>
        <span className={`h-7 w-12 shrink-0 rounded-full p-1 ${chill ? "bg-lagoon" : "bg-night"}`}>
          <span className={`block h-5 w-5 rounded-full bg-paper transition ${chill ? "translate-x-5" : ""}`} />
        </span>
      </button>
      <div className="mt-6 flex gap-2">
        <button className="btn btn-ghost" onClick={() => setStep(1)}>
          Back
        </button>
        <button className="btn btn-danfo flex-1 text-[16px]" onClick={() => newGame({ name: name.trim(), label: label.trim() || `${name.trim() || "Boss"} Records`, profile, look, chill, camp })}>
          {hasPlayed ? "Start the label" : "Start (with a quick tour)"}
        </button>
      </div>
    </div>
  );
}
