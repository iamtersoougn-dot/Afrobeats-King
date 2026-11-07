"use client";

/**
 * Lagos buildings, drawn front-on with a little depth to the right (a "street-front" style, not isometric).
 * Each building stands on (x, y) = middle of its front, at ground level.
 */
import type { PlaceId } from "@/lib/game/types";

export interface Palette {
  night: boolean;
}

const D = 18; // depth to the right
const shade = (night: boolean, day: string, nightC: string) => (night ? nightC : day);

/** A block: front face, side face, roof. */
export function Block({ x, y, w, h, front, side, roof, children }: { x: number; y: number; w: number; h: number; front: string; side: string; roof: string; children?: React.ReactNode }) {
  const l = x - w / 2, r = x + w / 2, t = y - h, dy = D * 0.6;
  return (
    <g>
      <polygon points={`${r},${y} ${r + D},${y - dy} ${r + D},${t - dy} ${r},${t}`} fill={side} />
      <polygon points={`${l},${t} ${r},${t} ${r + D},${t - dy} ${l + D},${t - dy}`} fill={roof} />
      <rect x={l} y={t} width={w} height={h} fill={front} />
      {children}
    </g>
  );
}

/** A grid of windows; some lit at night. */
export function Windows({ x, y, w, h, cols, rows, night, seed = 1, lit = "#ffd36b", dark = "#1d1640", day = "#9fc4e8" }: { x: number; y: number; w: number; h: number; cols: number; rows: number; night: boolean; seed?: number; lit?: string; dark?: string; day?: string }) {
  const cw = w / cols, rh = h / rows;
  const out: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const on = ((r * 7 + c * 13 + seed * 31) % 10) < 6;
      out.push(<rect key={`${r}-${c}`} x={x + c * cw + cw * 0.2} y={y + r * rh + rh * 0.2} width={cw * 0.6} height={rh * 0.55} fill={night ? (on ? lit : dark) : day} opacity={night && on ? 0.95 : 0.9} />);
    }
  return <g>{out}</g>;
}

const Neon = ({ x, y, text, color, size = 16, night }: { x: number; y: number; text: string; color: string; size?: number; night: boolean }) => (
  <text className={night ? "neon" : undefined} x={x} y={y} textAnchor="middle" fontSize={size} fontWeight="900" fill={night ? color : "#2a1f55"} style={{ fontFamily: "var(--font-display)", filter: night ? `drop-shadow(0 0 5px ${color})` : undefined }}>
    {text}
  </text>
);

export function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 0 0 Q 4 -30 -2 -60" stroke="#6b4a2b" strokeWidth="5" fill="none" />
      {[-60, -20, 20, 60, 100, 140].map((a) => (
        <path key={a} d="M -2 -60 q 18 -8 30 6" stroke="#1f8a5b" strokeWidth="6" fill="none" strokeLinecap="round" transform={`rotate(${a} -2 -60)`} />
      ))}
    </g>
  );
}

/** One building per place. */
export function PlaceBuilding({ id, x, y, night, extras }: { id: PlaceId; x: number; y: number; night: boolean; extras?: { neon?: boolean; gold?: boolean; ride?: string } }) {
  const wall = (d: string, n: string) => shade(night, d, n);
  switch (id) {
    case "base":
      return (
        <g>
          <Block x={x} y={y} w={120} h={74} front={wall("#d9c2a0", "#4a3a5e")} side={wall("#b39a78", "#382b4a")} roof={wall("#8b8f99", "#55596a")}>
            {/* zinc roof lines */}
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1={x - 60 + i * 16} y1={y - 74} x2={x - 60 + i * 16 + D} y2={y - 74 - D * 0.6} stroke={wall("#6f737d", "#3e4252")} strokeWidth="2" />
            ))}
            <rect x={x - 46} y={y - 56} width="30" height="24" fill={night ? (extras?.neon ? "#b07cff" : "#ff7ab8") : "#9fc4e8"} />
            <rect x={x + 14} y={y - 56} width="30" height="24" fill={night ? "#ffd36b" : "#9fc4e8"} />
            <rect x={x - 10} y={y - 40} width="20" height="40" fill={wall("#6b4a2b", "#2a1f3a")} />
            {extras?.gold && <circle cx={x + 29} cy={y - 44} r="6" fill="#ffc93c" />}
          </Block>
          {extras?.ride === "gwagon" && <rect x={x + 70} y={y - 18} width="44" height="18" rx="4" fill="#111" />}
          {extras?.ride === "tokunbo" && <rect x={x + 70} y={y - 14} width="40" height="14" rx="6" fill="#c9c3e6" />}
          {extras?.ride === "keke" && <rect x={x + 72} y={y - 16} width="26" height="16" rx="6" fill="#ffc93c" />}
        </g>
      );
    case "studio":
      return (
        <g>
          <Block x={x} y={y} w={140} h={104} front={wall("#3b3a63", "#2a2550")} side={wall("#2e2d50", "#1f1a3e")} roof={wall("#55548a", "#3a3370")}>
            <rect x={x - 54} y={y - 34} width="108" height="34" fill={wall("#22213f", "#140f2c")} />
            <Neon x={x} y={y - 70} text="SURULERE SOUND" color="#ff4f9a" size={13} night={night} />
            {/* sound wave sign */}
            <path d={`M ${x - 44} ${y - 50} l 8 -6 l 8 12 l 8 -16 l 8 20 l 8 -14 l 8 8 l 8 -4 l 8 2 l 8 -6 l 8 4`} stroke={night ? "#37d3c4" : "#2a1f55"} strokeWidth="2.5" fill="none" className={night ? "neon" : undefined} />
          </Block>
        </g>
      );
    case "hub":
      return (
        <Block x={x} y={y} w={120} h={190} front={wall("#4c7ea6", "#1d3a5c")} side={wall("#3a6688", "#142a46")} roof={wall("#6b9cc4", "#28507a")}>
          <Windows x={x - 56} y={y - 182} w={112} h={150} cols={5} rows={8} night={night} seed={3} lit="#7ff3ff" />
          <rect x={x - 22} y={y - 28} width="44" height="28" fill={wall("#22213f", "#0b0816")} />
          <Neon x={x} y={y - 196} text="YABA HUB" color="#37d3c4" size={14} night={night} />
        </Block>
      );
    case "bar":
      return (
        <g>
          <Block x={x} y={y} w={150} h={68} front={wall("#7a3b4e", "#43213a")} side={wall("#5e2d3c", "#33182c")} roof={wall("#9b4c63", "#5a2b4c")}>
            <rect x={x - 26} y={y - 44} width="52" height="44" fill={night ? "#ffb347" : "#3a2a16"} opacity={night ? 0.85 : 1} />
            <Neon x={x} y={y - 52} text="OPEN MIC" color="#ffc93c" size={13} night={night} />
          </Block>
          <path d={`M ${x - 75} ${y - 70} Q ${x} ${y - 52} ${x + 75} ${y - 70}`} stroke="#5a4b8f" strokeWidth="1.5" fill="none" />
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} className={night ? "blink" : undefined} style={{ animationDelay: `${i * 0.17}s` }} cx={x - 72 + i * 18} cy={y - 68 + Math.sin((i / 8) * Math.PI) * 9} r="3" fill={["#ffc93c", "#ff4f9a", "#37d3c4"][i % 3]} />
          ))}
        </g>
      );
    case "radio":
      return (
        <g>
          {/* the Lagoon FM mast: a landmark you can see from anywhere */}
          <path d={`M ${x + 30} ${y - 70} L ${x + 44} ${y - 300} L ${x + 58} ${y - 70}`} stroke={wall("#c4bce0", "#8d86b5")} strokeWidth="3" fill="none" />
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d={`M ${x + 31 + i * 1.3} ${y - 80 - i * 22} L ${x + 57 - i * 1.3} ${y - 98 - i * 22}`} stroke={wall("#c4bce0", "#8d86b5")} strokeWidth="1.5" />
          ))}
          <circle className="blink" cx={x + 44} cy={y - 304} r="5" fill="#ff3b3b" style={{ filter: "drop-shadow(0 0 6px #ff3b3b)" }} />
          <Block x={x} y={y} w={110} h={86} front={wall("#e9e3f7", "#3d3570")} side={wall("#c9c0e2", "#2c2656")} roof={wall("#bdb3d9", "#4d4488")}>
            <Windows x={x - 50} y={y - 78} w={100} h={46} cols={4} rows={2} night={night} seed={5} />
            <Neon x={x} y={y - 16} text="LAGOON FM" color="#37d3c4" size={12} night={night} />
          </Block>
        </g>
      );
    case "mamaput":
      return (
        <g>
          <rect x={x - 50} y={y - 50} width="5" height="50" fill="#5c361e" />
          <rect x={x + 45} y={y - 50} width="5" height="50" fill="#5c361e" />
          <path d={`M ${x - 62} ${y - 48} L ${x + 62} ${y - 48} L ${x + 50} ${y - 72} L ${x - 50} ${y - 72} Z`} fill="#ff6b5b" />
          {Array.from({ length: 5 }, (_, i) => (
            <rect key={i} x={x - 46 + i * 20} y={y - 72} width="10" height="24" fill="#fff" opacity="0.85" />
          ))}
          <rect x={x - 40} y={y - 26} width="80" height="26" fill="#5c361e" />
          <ellipse cx={x + 18} cy={y - 28} rx="14" ry="4" fill="#d9531e" />
          <path className="bob" d={`M ${x + 14} ${y - 36} q 4 -8 0 -14 M ${x + 22} ${y - 36} q 4 -8 0 -14`} stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" />
          {night && <circle cx={x} cy={y - 50} r="40" fill="#ffd36b" opacity="0.08" />}
        </g>
      );
    case "law":
      return (
        <Block x={x} y={y} w={110} h={230} front={wall("#8a94b8", "#2b3360")} side={wall("#6e7896", "#1e244a")} roof={wall("#a6afd0", "#3a4380")}>
          <Windows x={x - 50} y={y - 220} w={100} h={190} cols={4} rows={10} night={night} seed={7} />
          <rect x={x - 18} y={y - 26} width="36" height="26" fill={wall("#22213f", "#0b0816")} />
          <text x={x} y={y - 232} textAnchor="middle" fontSize="20">⚖️</text>
        </Block>
      );
    case "bank":
      return (
        <Block x={x} y={y} w={140} h={116} front={wall("#efe9f9", "#4a4380")} side={wall("#d4cbe9", "#383166")} roof={wall("#c9c0e2", "#5a5296")}>
          <polygon points={`${x - 70},${y - 116} ${x + 70},${y - 116} ${x},${y - 146}`} fill={wall("#d4cbe9", "#383166")} />
          {[-48, -16, 16, 48].map((dx) => (
            <rect key={dx} x={x + dx - 7} y={y - 104} width="14" height="104" fill={wall("#fff", "#6f679a")} />
          ))}
          <Neon x={x} y={y - 122} text="BANK" color="#ffc93c" size={11} night={night} />
        </Block>
      );
    case "creator":
      return (
        <g>
          <rect x={x - 90} y={y - 10} width="60" height="14" rx="4" fill="#37d3c4" opacity="0.7" />
          <Block x={x + 10} y={y} w={150} h={92} front={wall("#fff4fa", "#5a2b5e")} side={wall("#f0d6e5", "#41203f")} roof={wall("#ffe0ef", "#73386f")}>
            <rect x={x - 56} y={y - 80} width="132" height="44" fill={night ? "#ff9ccf" : "#bfe5ff"} opacity="0.75" />
            <circle cx={x + 50} cy={y - 58} r="12" fill="none" stroke="#fff" strokeWidth="4" style={{ filter: night ? "drop-shadow(0 0 6px #fff)" : undefined }} />
            <Neon x={x + 10} y={y - 14} text="#ClipTok" color="#ff4f9a" size={12} night={night} />
          </Block>
        </g>
      );
    case "sanctuary":
      return (
        <g>
          <Block x={x} y={y} w={230} h={120} front={wall("#5b2b74", "#2b1546")} side={wall("#45205a", "#1e0f34")} roof={wall("#7a3d99", "#3d1f60")}>
            {/* domed roof */}
            <path d={`M ${x - 115} ${y - 120} Q ${x} ${y - 210} ${x + 115} ${y - 120} Z`} fill={wall("#8c4cb0", "#4a2470")} />
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={i} className={night ? "blink" : undefined} style={{ animationDelay: `${i * 0.11}s` }} cx={x - 104 + i * 16} cy={y - 124} r="3.5" fill="#ffc93c" />
            ))}
            <Neon x={x} y={y - 82} text="THE SANCTUARY" color="#ffc93c" size={17} night={night} />
            <rect x={x - 40} y={y - 46} width="80" height="46" fill={night ? "#ffb347" : "#2b1546"} opacity={night ? 0.8 : 1} />
          </Block>
          {night && [x - 80, x + 80].map((bx, i) => <path key={bx} className="neon" style={{ animationDelay: `${i}s` }} d={`M ${bx} ${y - 130} L ${bx + (i ? 60 : -60)} ${y - 330} L ${bx + (i ? 90 : -30)} ${y - 330} Z`} fill="#ffc93c" opacity="0.1" />)}
        </g>
      );
  }
}

/** Plain city blocks that fill the map between places. */
export function Filler({ x, y, w, h, night, seed, tone = 0 }: { x: number; y: number; w: number; h: number; night: boolean; seed: number; tone?: number }) {
  const hues = [[250, 22], [280, 20], [215, 25], [20, 25]][tone % 4];
  const front = night ? `hsl(${hues[0]} ${hues[1]}% 20%)` : `hsl(${hues[0]} ${hues[1]}% 70%)`;
  const side = night ? `hsl(${hues[0]} ${hues[1]}% 14%)` : `hsl(${hues[0]} ${hues[1]}% 58%)`;
  const roof = night ? `hsl(${hues[0]} ${hues[1]}% 26%)` : `hsl(${hues[0]} ${hues[1]}% 78%)`;
  return (
    <Block x={x} y={y} w={w} h={h} front={front} side={side} roof={roof}>
      <Windows x={x - w / 2 + 4} y={y - h + 6} w={w - 8} h={h - 14} cols={Math.max(2, Math.round(w / 22))} rows={Math.max(1, Math.round(h / 24))} night={night} seed={seed} />
    </Block>
  );
}
