"use client";

import type { BossLook } from "@/lib/game/types";

export type Pose = "idle" | "walk" | "sit" | "nod" | "sing" | "dj" | "dance" | "phone" | "talk" | "eat" | "sleep";

export interface FigLook {
  skin: string;
  hair: number;
  hue: number;
  outfit?: string;
  extra?: string;
}

export const toFigLook = (l: BossLook | { skin: string; hue: number; hair: number }): FigLook => ({ outfit: "basic", ...l });

const HAIR = ["#1b120c", "#2a1a10", "#0e0a08", "#3b2414", "#5a3a1e", "#1b120c"];

/**
 * A front-facing person, about 100 units tall, standing on (0,0).
 * Poses are CSS classes (app/globals.css .fig-*): legs step by lifting the knee, sitting shortens the thighs.
 */
export default function Figure({ look, pose = "idle", x = 0, y = 0, s = 1, delay = 0 }: { look: FigLook; pose?: Pose; x?: number; y?: number; s?: number; delay?: number }) {
  const shirt = `hsl(${look.hue} 70% 55%)`;
  const shirtDark = `hsl(${look.hue} 60% 38%)`;
  const pants = look.outfit === "tracksuit" ? `hsl(${look.hue} 60% 30%)` : "#2b2546";
  const skin = look.skin;
  const robe = look.outfit === "gold_agbada";
  const poses = pose === "nod" ? "fig-sit fig-nod" : `fig-${pose}`;
  const style = delay ? ({ animationDelay: `${delay}s` } as React.CSSProperties) : undefined;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={style}>
      <g className={`fig ${poses}`}>
        {/* shadow */}
        <ellipse cx="0" cy="1" rx="17" ry="3.5" fill="#000" opacity="0.28" />
        {/* legs */}
        {[-1, 1].map((side) => (
          <g key={side} className={`leg ${side < 0 ? "leg-l" : "leg-r"}`}>
            <rect className="thigh" x={side * 6 - 4} y={-44} width="8" height="23" rx="3" fill={pants} />
            <g className="shin">
              <rect x={side * 6 - 3.5} y={-23} width="7" height="20" rx="3" fill={pants} />
              <ellipse cx={side * 6 + side * 1.5} cy={-2} rx="6" ry="3.4" fill={look.outfit === "drip" ? "#fff" : "#141022"} />
            </g>
          </g>
        ))}
        <g className="bodyg">
          {/* arms (behind the torso edges) */}
          {[-1, 1].map((side) => (
            <g key={side} className={`arm ${side < 0 ? "arm-l" : "arm-r"}`}>
              <rect x={side * 14 - 3} y={-71} width="6" height="25" rx="3" fill={robe ? "#e9b949" : shirtDark} />
              <circle cx={side * 14} cy={-45} r="3.6" fill={skin} />
            </g>
          ))}
          {/* torso */}
          {robe ? (
            <path d="M -18 -72 Q 0 -78 18 -72 L 22 -36 Q 0 -32 -22 -36 Z" fill="#f2c24f" stroke="#b8871a" strokeWidth="1" />
          ) : (
            <path d="M -12 -73 Q 0 -77 12 -73 L 12 -42 Q 0 -40 -12 -42 Z" fill={shirt} />
          )}
          {look.outfit === "drip" && <path d="M -12 -73 L -3 -42 M 12 -73 L 3 -42" stroke={shirtDark} strokeWidth="3" />}
          {look.outfit === "ankara" && (
            <g fill="#ffd35e" opacity="0.9">
              {[-6, 2, 9].map((cx, i) => (
                <circle key={i} cx={cx - 2} cy={-66 + i * 8} r="2.2" />
              ))}
              <circle cx="5" cy="-58" r="1.8" fill="#37d3c4" />
            </g>
          )}
          {look.outfit === "tracksuit" && <rect x="-12" y="-62" width="24" height="3" fill="#fff" opacity="0.85" />}
          {look.outfit === "tour_jacket" && <text x="0" y="-55" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff">TOUR</text>}
          {look.extra === "chain" && <path d="M -7 -73 Q 0 -60 7 -73" fill="none" stroke="#ffd35e" strokeWidth="2" />}
          {look.extra === "gold_mic" && (
            <g>
              <path d="M -7 -73 Q 0 -60 7 -73" fill="none" stroke="#ffd35e" strokeWidth="1.5" />
              <rect x="-1.5" y="-63" width="3" height="5" rx="1" fill="#ffd35e" />
            </g>
          )}
          {/* neck + head */}
          <g className="head">
            <rect x="-3" y="-78" width="6" height="6" fill={skin} />
            <circle cx="0" cy="-87" r="10" fill={skin} />
            <Hair kind={look.hair} />
            {/* face */}
            {look.extra === "shades" ? (
              <rect x="-7.5" y="-90" width="15" height="4.5" rx="2" fill="#0b0816" />
            ) : (
              <g fill="#140d07">
                <circle cx="-3.6" cy="-88" r="1.2" />
                <circle cx="3.6" cy="-88" r="1.2" />
              </g>
            )}
            <path d="M -3 -83 Q 0 -80.5 3 -83" stroke="#140d07" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            {look.extra === "snapback" && <path d="M -10.5 -92 Q 0 -103 10.5 -92 L 15 -91 L -10.5 -91 Z" fill={shirtDark} />}
            {look.extra === "headphones" && (
              <g>
                <path d="M -10 -88 Q 0 -104 10 -88" fill="none" stroke="#0b0816" strokeWidth="2.6" />
                <rect x="-12.5" y="-91" width="4.5" height="8" rx="2" fill="#ff4f9a" />
                <rect x="8" y="-91" width="4.5" height="8" rx="2" fill="#ff4f9a" />
              </g>
            )}
            {look.extra === "crown" && <path d="M -8 -96 L -8 -103 L -4 -99 L 0 -105 L 4 -99 L 8 -103 L 8 -96 Z" fill="#ffc93c" stroke="#b8871a" strokeWidth="0.8" />}
          </g>
        </g>
      </g>
    </g>
  );
}

function Hair({ kind }: { kind: number }) {
  const c = HAIR[kind % HAIR.length];
  switch (kind % 6) {
    case 0: // low cut
      return <path d="M -10 -89 Q -9 -99 0 -98 Q 9 -99 10 -89 Q 6 -94 0 -94 Q -6 -94 -10 -89 Z" fill={c} />;
    case 1: // high top
      return <rect x="-9.5" y="-104" width="19" height="13" rx="4" fill={c} />;
    case 2: // locs
      return (
        <g fill={c}>
          <path d="M -10 -88 Q -10 -100 0 -99 Q 10 -100 10 -88 Z" />
          {[-9, -5, 5, 9].map((x) => (
            <rect key={x} x={x - 1.5} y={-92} width="3" height="16" rx="1.5" />
          ))}
        </g>
      );
    case 3: // afro puff
      return <circle cx="0" cy="-96" r="12" fill={c} />;
    case 4: // braids up (bun)
      return (
        <g fill={c}>
          <path d="M -10 -88 Q -10 -99 0 -98 Q 10 -99 10 -88 Q 5 -93 0 -93 Q -5 -93 -10 -88 Z" />
          <circle cx="0" cy="-102" r="5" />
        </g>
      );
    default: // gele (head wrap)
      return <path d="M -13 -91 Q -6 -108 4 -102 Q 14 -104 13 -91 Q 0 -96 -13 -91 Z" fill="#ff4f9a" />;
  }
}
