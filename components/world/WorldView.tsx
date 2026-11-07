"use client";

/**
 * The Lagos map: Home opens straight into it. Drag to move, pinch or use the buttons to zoom.
 * Tapping a place flies the camera there and opens its sheet. Smooth mode drops the moving people and traffic.
 */
import { useEffect, useMemo } from "react";
import { LEVELS, PLACES, type Place } from "@/lib/game/data";
import type { PlaceId, Player } from "@/lib/game/types";
import { billboardFor, noteAdView } from "@/lib/sponsors";
import { Filler, Palm, PlaceBuilding } from "./buildings";
import Figure, { toFigLook } from "./Figure";
import { usePanZoom } from "./usePanZoom";
import { isNight, useLagosHour, useSmooth } from "./useEnv";

export const WORLD_W = 1000;
export const WORLD_H = 1400;
export const placeXY = (p: Place) => ({ x: p.x * 10, y: p.y * 14 });

const HEIGHT: Record<PlaceId, number> = { base: 80, studio: 112, hub: 200, bar: 76, radio: 96, mamaput: 76, law: 244, bank: 150, creator: 100, sanctuary: 214 };

const WATER = "M 720 0 C 790 140 790 420 760 560 C 740 680 720 760 640 830 C 600 860 540 870 520 905 C 600 950 800 945 1000 940 L 1000 0 Z";
const SEA = "M 0 1330 C 200 1316 400 1342 600 1326 C 800 1312 900 1336 1000 1324 L 1000 1400 L 0 1400 Z";
const BRIDGE = "M 640 150 C 780 260 860 520 840 700 C 828 820 818 900 800 990";
const ROADS = [
  "M 0 360 L 720 360",
  "M 0 560 L 750 560",
  "M 0 840 L 600 840",
  "M 520 1140 L 1000 1140",
  "M 110 0 L 110 1320",
  "M 500 0 L 500 760",
  "M 640 945 L 640 1320",
];
// city blocks between the places (x, y = front middle at ground)
const FILL: [number, number, number, number][] = [
  [60, 200, 70, 90], [200, 160, 90, 60], [600, 260, 80, 120], [660, 470, 60, 80], [60, 500, 70, 70], [190, 480, 80, 100], [380, 470, 70, 60],
  [190, 760, 80, 70], [620, 640, 50, 60], [300, 1000, 110, 80], [440, 1100, 90, 120], [180, 1120, 100, 90], [70, 1250, 80, 60], [330, 1260, 120, 70],
  [960, 1080, 60, 140], [580, 1250, 60, 70], [400, 120, 70, 80], [420, 640, 50, 70],
];

/** Points along a cubic path for bridge pillars and lamps. */
function along(d: string, n: number) {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const segs: number[][] = [];
  let cur = [nums[0], nums[1]];
  for (let i = 2; i + 5 < nums.length + 1; i += 6) {
    segs.push([...cur, nums[i], nums[i + 1], nums[i + 2], nums[i + 3], nums[i + 4], nums[i + 5]]);
    cur = [nums[i + 4], nums[i + 5]];
  }
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * segs.length;
    const si = Math.min(segs.length - 1, Math.floor(t));
    const u = t - si;
    const [x0, y0, x1, y1, x2, y2, x3, y3] = segs[si];
    const m = 1 - u;
    pts.push({ x: m * m * m * x0 + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u * x3, y: m * m * m * y0 + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u * y3 });
  }
  return pts;
}

export interface Other {
  pid: string;
  name: string;
  place: string | null;
  look: { skin: string; hair: number; hue: number; outfit?: string; extra?: string } | null;
  label?: string | null;
}

export default function WorldView({ p, counts, onPlace, onLandmark, here, others = [], onOther, extras }: {
  p: Player;
  counts: Partial<Record<PlaceId, number>>;
  onPlace: (id: PlaceId) => void;
  onLandmark: (id: "bridge" | "billboard" | "mast" | "boat", slot?: string) => void;
  here: PlaceId;
  others?: Other[];
  onOther?: (o: Other) => void;
  extras?: { neon?: boolean; gold?: boolean; ride?: string };
}) {
  const hour = useLagosHour();
  const night = isNight(hour);
  const dusk = hour === 18 || hour === 6;
  const smooth = useSmooth();
  const hereXY = placeXY(PLACES.find((x) => x.id === here) ?? PLACES[0]);
  const [box, cam] = usePanZoom(WORLD_W, WORLD_H, {
    max: 2.2,
    minFit: 0.95,
    initial: (fit, size) => {
      const k = Math.min(fit * 1.55, 0.75);
      return { k, x: size.w / 2 - hereXY.x * k, y: size.h * 0.55 - hereXY.y * k };
    },
  });

  // the tutorial asks the map to bring its target place into view
  const { flyTo, view, ready } = cam;
  useEffect(() => {
    const go = (e: Event) => {
      const sel = String((e as CustomEvent).detail ?? "");
      const m = /place-([a-z]+)/.exec(sel);
      const pl = m && PLACES.find((x) => x.id === m[1]);
      if (pl) {
        const { x, y } = placeXY(pl);
        flyTo(x, y - HEIGHT[pl.id] / 2, Math.max(view.k, 0.6));
      }
    };
    window.addEventListener("abk-tour-target", go);
    return () => window.removeEventListener("abk-tour-target", go);
  }, [flyTo, view.k]);

  const bridgePts = useMemo(() => along(BRIDGE, 24), []);
  const ground = night ? "#1f1838" : "#c9b48c";
  const island = night ? "#24193f" : "#d7c49c";
  const road = night ? "#120c26" : "#5b5566";
  const water = night ? "#0d2547" : "#3d8fc7";
  const sorted = [...PLACES].sort((a, b) => a.y - b.y);

  const tap = (fn: () => void) => (e: React.MouseEvent) => {
    if (cam.dragged()) return;
    e.stopPropagation();
    fn();
  };

  return (
    <div ref={box} className={`relative h-full w-full touch-none select-none overflow-hidden ${smooth ? "smooth" : ""}`} style={{ background: night ? "#0d2547" : "#3d8fc7" }} {...cam.handlers} aria-label="Map of Lagos">
      <div className={`world-cam absolute left-0 top-0 origin-top-left ${cam.animate ? "anim" : ""}`} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k || 0.0001})`, width: WORLD_W, height: WORLD_H, opacity: ready ? 1 : 0 }}>
        <svg width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} className="block">
          {/* land, lagoon, sea */}
          <rect width={WORLD_W} height={WORLD_H} fill={ground} />
          <path d="M 520 945 L 1000 940 L 1000 1330 L 520 1330 Z" fill={island} />
          <path d={WATER} fill={water} />
          <path d={SEA} fill={night ? "#0a1d3b" : "#2f7fb8"} />
          <path d="M 0 1300 C 300 1290 700 1306 1000 1296 L 1000 1330 C 800 1340 300 1320 0 1336 Z" fill={night ? "#3a3157" : "#ead7a4"} />
          {!smooth && (
            <g opacity="0.35" stroke={night ? "#4c79b8" : "#bfe4ff"} strokeWidth="2" fill="none">
              {[120, 300, 480, 640, 900].map((y, i) => (
                <path key={y} className="ripple" style={{ animationDelay: `${-i * 2}s` }} d={`M ${760 + (i % 2) * 30} ${y} q 15 -6 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0`} />
              ))}
            </g>
          )}
          {/* roads */}
          {ROADS.map((d) => (
            <g key={d}>
              <path d={d} stroke={road} strokeWidth="34" fill="none" strokeLinecap="round" />
              <path d={d} stroke={night ? "#5a4b2a" : "#ffe08a"} strokeWidth="2" strokeDasharray="14 14" fill="none" />
            </g>
          ))}
          {/* Third Mainland Bridge: pillars, deck, lamps */}
          <g onClick={tap(() => onLandmark("bridge"))} style={{ cursor: "pointer" }}>
            {bridgePts.map((pt, i) => (i % 2 === 0 ? <rect key={i} x={pt.x - 4} y={pt.y} width="8" height="26" fill={night ? "#2a2550" : "#8d86b5"} /> : null))}
            <path d={BRIDGE} stroke={night ? "#3d3570" : "#9a93c0"} strokeWidth="40" fill="none" strokeLinecap="round" />
            <path d={BRIDGE} stroke={road} strokeWidth="32" fill="none" strokeLinecap="round" />
            <path d={BRIDGE} stroke={night ? "#5a4b2a" : "#ffe08a"} strokeWidth="2" strokeDasharray="12 12" fill="none" />
            {bridgePts.map((pt, i) => (i % 3 === 1 ? <circle key={`l${i}`} cx={pt.x + 20} cy={pt.y - 6} r={night ? 5 : 3} fill={night ? "#ffd36b" : "#8d86b5"} style={night ? { filter: "drop-shadow(0 0 5px #ffd36b)" } : undefined} /> : null))}
          </g>
          {/* traffic and boats */}
          {!smooth && (
            <g>
              <Danfo path={BRIDGE} dur={22} delay={0} />
              <Danfo path={BRIDGE} dur={26} delay={-11} />
              <Danfo path="M 800 990 C 818 900 828 820 840 700 C 860 520 780 260 640 150" dur={24} delay={-5} />
              <Danfo path="M 0 560 L 750 560" dur={16} delay={-3} />
              <Danfo path="M 600 840 L 0 840" dur={14} delay={-8} />
              <Danfo path="M 110 1320 L 110 0" dur={30} delay={-14} />
              <Danfo path="M 520 1140 L 1000 1140" dur={12} delay={-2} small />
              <Danfo path="M 0 360 L 720 360" dur={11} delay={-6} small />
              <g>
                <path d="M -6 0 L 30 0 L 22 8 L 2 8 Z" fill="#8b4a2a" />
                <animateMotion dur="60s" repeatCount="indefinite" path="M 900 60 C 860 300 960 600 880 880" rotate="0" />
              </g>
            </g>
          )}
          {/* palms */}
          {[[40, 640], [250, 960], [560, 1310], [700, 1300], [860, 1310], [460, 300], [980, 1290], [30, 1080]].map(([x, y]) => (
            <Palm key={`${x}-${y}`} x={x} y={y} s={0.9} />
          ))}
          {/* everything that stands up, back to front so nearer things cover farther ones */}
          {[...FILL.map((f, i) => ({ kind: "fill" as const, y: f[1], f, i })), ...sorted.map((pl) => ({ kind: "place" as const, y: placeXY(pl).y, pl }))]
            .sort((a, b) => a.y - b.y)
            .map((it) =>
              it.kind === "fill" ? (
                <Filler key={`f${it.i}`} x={it.f[0]} y={it.f[1]} w={it.f[2]} h={it.f[3]} night={night} seed={it.i} tone={it.i} />
              ) : (
                <PlaceNode
                  key={it.pl.id}
                  pl={it.pl}
                  night={night}
                  count={counts[it.pl.id] ?? 0}
                  locked={p.level < it.pl.minLevel}
                  onTap={tap(() => {
                    const { x, y } = placeXY(it.pl);
                    if (p.level >= it.pl.minLevel) flyTo(x, y - HEIGHT[it.pl.id] * 0.2, Math.max(view.k, 0.7));
                    onPlace(it.pl.id);
                  })}
                  extras={it.pl.id === "base" ? extras : undefined}
                />
              ),
            )}
          {/* billboards (paid slots) */}
          <BillboardSign slot="bridge" x={600} y={430} night={night} onTap={tap(() => onLandmark("billboard", "bridge"))} />
          <BillboardSign slot="sanctuary" x={360} y={250} night={night} onTap={tap(() => onLandmark("billboard", "sanctuary"))} />
          {/* walkers */}
          {!smooth && (
            <g>
              {[
                { d: "M 20 380 L 700 380", dur: 40, hue: 30, skin: "#6e452b", hair: 3 },
                { d: "M 690 576 L 30 576", dur: 46, hue: 190, skin: "#8d5a37", hair: 5 },
                { d: "M 40 858 L 580 858", dur: 38, hue: 330, skin: "#5a3a24", hair: 1 },
                { d: "M 990 1158 L 540 1158", dur: 30, hue: 50, skin: "#7d4f30", hair: 2 },
                { d: "M 128 60 L 128 1280", dur: 70, hue: 120, skin: "#4a2f1d", hair: 0 },
              ].map((w, i) => (
                <g key={i}>
                  <g>
                    <Figure look={{ skin: w.skin, hue: w.hue, hair: w.hair }} pose="walk" s={0.42} />
                    <animateMotion dur={`${w.dur}s`} repeatCount="indefinite" path={w.d} begin={`${-i * 7}s`} />
                  </g>
                </g>
              ))}
            </g>
          )}
          {/* other real players */}
          {others.slice(0, 12).map((o, i) => {
            const pl = PLACES.find((x) => x.id === o.place) ?? PLACES[(i * 3) % PLACES.length];
            const { x, y } = placeXY(pl);
            const ox = x - 70 + ((i * 47) % 140);
            return (
              <g key={o.pid} onClick={tap(() => onOther?.(o))} style={{ cursor: "pointer" }}>
                <Figure look={toFigLook(o.look ?? { skin: "#7d4f30", hue: 200, hair: 1 })} pose="idle" x={ox} y={y + 30} s={0.5} />
                <rect x={ox - 34} y={y + 34} width="68" height="18" rx="9" fill="#37d3c4" />
                <text x={ox} y={y + 47} textAnchor="middle" fontSize="11" fontWeight="800" fill="#06221f">
                  {o.name.slice(0, 10)} 👋
                </text>
              </g>
            );
          })}
          {/* you */}
          <g style={{ transform: `translate(${hereXY.x + 52}px, ${hereXY.y + 26}px)`, transition: "transform 1.2s ease-in-out" }}>
            <g key={here} className="once">
              <Figure look={toFigLook(p.look)} pose="walk" s={0.62} />
            </g>
            <rect x="-22" y="4" width="44" height="17" rx="8.5" fill="#ffc93c" />
            <text x="0" y="16.5" textAnchor="middle" fontSize="11" fontWeight="900" fill="#241a05">
              You
            </text>
          </g>
          {/* dusk / night wash */}
          {(night || dusk) && <rect width={WORLD_W} height={WORLD_H} fill={dusk ? "#ff7a45" : "#0b0630"} opacity={dusk ? 0.12 : 0.18} pointerEvents="none" />}
        </svg>
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <button className="btn btn-ghost h-11 w-11 p-0 text-xl" onClick={cam.zoomIn} aria-label="Zoom in">
          +
        </button>
        <button className="btn btn-ghost h-11 w-11 p-0 text-xl" onClick={cam.zoomOut} aria-label="Zoom out">
          −
        </button>
        <button className="btn btn-ghost h-11 w-11 p-0 text-base" onClick={() => flyTo(hereXY.x, hereXY.y, Math.max(view.k, 0.6))} aria-label="Find me">
          📍
        </button>
      </div>
    </div>
  );
}

function PlaceNode({ pl, night, count, locked, onTap, extras }: { pl: Place; night: boolean; count: number; locked: boolean; onTap: (e: React.MouseEvent) => void; extras?: { neon?: boolean; gold?: boolean; ride?: string } }) {
  const { x, y } = placeXY(pl);
  const h = HEIGHT[pl.id];
  const w = Math.max(170, pl.name.length * 14 + 74);
  const py = y - h - 36;
  return (
    <g data-tour={`place-${pl.id}`} role="button" aria-label={`${pl.name}${locked ? " (locked)" : ""}`} onClick={onTap} style={{ cursor: "pointer" }} opacity={locked ? 0.55 : 1}>
      {/* generous hit area */}
      <rect x={x - w / 2} y={py - 28} width={w} height={h + 70} fill="transparent" />
      <PlaceBuilding id={pl.id} x={x} y={y} night={night} extras={extras} />
      <g>
        <rect x={x - w / 2} y={py - 25} width={w} height="50" rx="25" fill={locked ? "#2f2260" : "#170f33"} stroke={locked ? "#3d2f78" : "#ffc93c"} strokeWidth="3" />
        <text x={x - w / 2 + 30} y={py + 9} textAnchor="middle" fontSize="24">
          {locked ? "🔒" : pl.icon}
        </text>
        <text x={x - w / 2 + 54} y={py + 8} fontSize="22" fontWeight="800" fill="#f6f0ff">
          {pl.name}
        </text>
        {count > 0 && !locked && (
          <g>
            <circle cx={x + w / 2 - 4} cy={py - 22} r="16" fill="#37d3c4" />
            <text x={x + w / 2 - 4} y={py - 15.5} textAnchor="middle" fontSize="18" fontWeight="900" fill="#06221f">
              {count}
            </text>
          </g>
        )}
        {locked && (
          <text x={x} y={py + 46} textAnchor="middle" fontSize="16" fontWeight="700" fill="#b9addb">
            {LEVELS[pl.minLevel].name} label
          </text>
        )}
      </g>
    </g>
  );
}

function Danfo({ path, dur, delay, small }: { path: string; dur: number; delay: number; small?: boolean }) {
  return (
    <g>
      <g transform={small ? "scale(0.6)" : undefined}>
        <rect x="-18" y="-10" width="36" height="20" rx="4" fill="#ffc93c" />
        <rect x="-18" y="-2" width="36" height="4" fill="#1d1404" />
        <rect x="-13" y="-8" width="9" height="5" fill="#2a1f55" />
        <rect x="2" y="-8" width="9" height="5" fill="#2a1f55" />
      </g>
      <animateMotion dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" path={path} rotate="auto" />
    </g>
  );
}

function BillboardSign({ slot, x, y, night, onTap }: { slot: "bridge" | "sanctuary"; x: number; y: number; night: boolean; onTap: (e: React.MouseEvent) => void }) {
  const b = billboardFor(slot);
  useEffect(() => noteAdView(b.id), [b.id]);
  return (
    <g onClick={onTap} style={{ cursor: "pointer" }} role="button" aria-label={`Billboard: ${b.brand}`}>
      <rect x={x - 3} y={y - 10} width="6" height="60" fill="#5a5296" />
      <rect x={x + 37} y={y - 10} width="6" height="60" fill="#5a5296" />
      <rect x={x - 30} y={y - 74} width="100" height="64" rx="4" fill="#141022" stroke={b.color} strokeWidth="3" style={night ? { filter: `drop-shadow(0 0 6px ${b.color})` } : undefined} />
      <text x={x + 20} y={y - 48} textAnchor="middle" fontSize="12" fontWeight="900" fill={b.color}>
        {b.brand.slice(0, 16)}
      </text>
      <text x={x + 20} y={y - 30} textAnchor="middle" fontSize="8.5" fill="#f6f0ff">
        {b.line.slice(0, 26)}
      </text>
      {b.id.startsWith("house") ? null : (
        <text x={x + 62} y={y - 14} textAnchor="end" fontSize="7" fill="#b9addb">
          Ad
        </text>
      )}
    </g>
  );
}
