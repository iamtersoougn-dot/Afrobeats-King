"use client";

/**
 * Inside each place: a side-on backdrop (360×200) and the ACT table that says how every activity looks.
 * Figures stand on the floor line (y≈178); desks and chairs are drawn so people sit at them.
 */
import type { PlaceId } from "@/lib/game/types";
import Figure, { type FigLook, type Pose } from "./Figure";

const FLOOR = 178;

export interface Act {
  /** the boss's pose */
  pose: Pose;
  /** where the boss stands (x) */
  at?: number;
  /** an artist joins the scene */
  artist?: { pose: Pose; at: number };
  /** little effect over the scene */
  fx?: "notes" | "coins" | "hearts" | "zzz" | "rocket" | "flash" | "steam" | "waves" | "fire";
  /** furniture the pose needs */
  prop?: "desk" | "console" | "mic" | "decks" | "bench" | "bed" | "counter" | "ring";
}

export const ACT: Record<string, Act> = {
  beat: { pose: "nod", at: 120, prop: "desk", fx: "notes" },
  record: { pose: "nod", at: 90, prop: "desk", artist: { pose: "sing", at: 270 }, fx: "notes" },
  mix: { pose: "nod", at: 150, prop: "desk", fx: "waves" },
  release: { pose: "phone", at: 180, fx: "rocket" },
  rest: { pose: "sleep", at: 180, prop: "bed", fx: "zzz" },
  pro_session: { pose: "nod", at: 95, prop: "console", artist: { pose: "sing", at: 275 }, fx: "notes" },
  pro_mix: { pose: "nod", at: 150, prop: "console", fx: "waves" },
  lease: { pose: "talk", at: 160, fx: "flash" },
  sell_beat: { pose: "nod", at: 110, prop: "desk", artist: { pose: "talk", at: 260 }, fx: "coins" },
  mix_others: { pose: "nod", at: 150, prop: "desk", fx: "waves" },
  plugins: { pose: "nod", at: 150, prop: "desk", fx: "flash" },
  dj: { pose: "dj", at: 180, prop: "decks", fx: "notes" },
  network: { pose: "talk", at: 140, artist: { pose: "talk", at: 220 }, fx: "hearts" },
  radio: { pose: "nod", at: 130, prop: "desk", fx: "waves" },
  interview: { pose: "talk", at: 120, prop: "desk", fx: "waves" },
  payola: { pose: "talk", at: 150, artist: { pose: "phone", at: 230 }, fx: "coins" },
  eat: { pose: "eat", at: 170, prop: "bench", fx: "steam" },
  gist: { pose: "talk", at: 150, prop: "bench", fx: "hearts" },
  loan: { pose: "talk", at: 150, prop: "counter", fx: "coins" },
  shoot_video: { pose: "dance", at: 180, prop: "ring", artist: { pose: "dance", at: 250 }, fx: "flash" },
  cliptok: { pose: "dance", at: 170, prop: "ring", fx: "fire" },
  book_show: { pose: "talk", at: 160, fx: "fire" },
  sign: { pose: "talk", at: 140, artist: { pose: "sing", at: 240 }, fx: "hearts" },
  pay: { pose: "talk", at: 160, prop: "counter", fx: "coins" },
};

const P = {
  wall: "#2a1f55",
  wall2: "#33266a",
  floor: "#1a1236",
  wood: "#7a4a2a",
  wood2: "#5c361e",
  metal: "#8d86b5",
  glass: "#5fd7ff",
};

/** The room of a place, drawn behind the figures. */
export function Backdrop({ place, night = true }: { place: PlaceId; night?: boolean }) {
  const sky = night ? "#120a2a" : "#7fb6e8";
  return (
    <g>
      <rect width="360" height="200" fill={P.wall} />
      <rect y={FLOOR} width="360" height={200 - FLOOR} fill={P.floor} />
      {ROOMS[place]?.(sky)}
    </g>
  );
}

const windowBox = (x: number, y: number, w: number, h: number, sky: string) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={sky} stroke="#140d2c" strokeWidth="3" />
    <path d={`M ${x + w / 2} ${y} V ${y + h} M ${x} ${y + h / 2} H ${x + w}`} stroke="#140d2c" strokeWidth="2" />
  </g>
);

const neon = (x: number, y: number, text: string, color: string, size = 14) => (
  <text className="neon" x={x} y={y} textAnchor="middle" fontSize={size} fontWeight="900" fill={color} style={{ fontFamily: "var(--font-display)", filter: `drop-shadow(0 0 4px ${color})` }}>
    {text}
  </text>
);

const ROOMS: Partial<Record<PlaceId, (sky: string) => React.ReactNode>> = {
  base: (sky) => (
    <g>
      {windowBox(24, 40, 70, 56, sky)}
      <rect x="250" y="30" width="80" height="50" rx="4" fill="#1a1236" />
      <text x="290" y="60" textAnchor="middle" fontSize="10" fill="#ffc93c" fontWeight="800">PLATINUM?</text>
      <rect x="120" y="44" width="16" height="70" rx="3" fill="#120a26" />
      <circle cx="128" cy="60" r="5" fill="#ff4f9a" opacity="0.8" />
      <circle cx="128" cy="88" r="8" fill="#0b0816" />
    </g>
  ),
  studio: (sky) => (
    <g>
      {/* vocal booth glass on the right */}
      <rect x="215" y="30" width="125" height="148" fill="#14203e" stroke="#0b0816" strokeWidth="4" />
      <rect x="222" y="38" width="111" height="80" fill={P.glass} opacity="0.22" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={232 + i * 26} y="128" width="18" height="40" fill="#2b2050" />
      ))}
      {neon(278, 26, "ON AIR", "#ff4f9a", 11)}
      {/* acoustic foam */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={16 + i * 38} y="30" width="30" height="30" fill={i % 2 ? "#3a2b72" : "#2f235f"} />
      ))}
      <rect x="0" y="10" width="360" height="4" fill="#0b0816" />
      {sky && null}
    </g>
  ),
  hub: (sky) => (
    <g>
      {windowBox(20, 30, 100, 70, sky)}
      {windowBox(240, 30, 100, 70, sky)}
      {neon(180, 50, "YABA HUB", "#37d3c4", 15)}
      <rect x="150" y="70" width="60" height="34" rx="3" fill="#0b0816" />
      <text x="180" y="91" textAnchor="middle" fontSize="9" fill="#37d3c4">beats ₦₦₦</text>
    </g>
  ),
  bar: (sky) => (
    <g>
      <rect width="360" height="200" fill="#1f1440" />
      {/* string lights */}
      <path d="M 0 30 Q 90 60 180 30 Q 270 60 360 30" fill="none" stroke="#5a4b8f" strokeWidth="1.5" />
      {Array.from({ length: 13 }, (_, i) => (
        <circle key={i} className="blink" style={{ animationDelay: `${i * 0.13}s` }} cx={i * 30} cy={30 + Math.sin((i / 6) * Math.PI) * 14} r="3.5" fill={["#ffc93c", "#ff4f9a", "#37d3c4"][i % 3]} />
      ))}
      {/* stage */}
      <rect x="60" y="150" width="240" height="28" fill="#3a2a16" />
      <rect x="60" y="148" width="240" height="4" fill="#ffc93c" opacity="0.6" />
      {neon(180, 80, "OPEN MIC", "#ffc93c", 18)}
      <ellipse cx="180" cy="178" rx="120" ry="10" fill="#ffc93c" opacity="0.08" />
      {sky && null}
    </g>
  ),
  radio: () => (
    <g>
      {neon(70, 40, "LAGOON FM", "#37d3c4", 13)}
      <rect x="240" y="26" width="90" height="26" rx="5" fill="#0b0816" />
      {neon(285, 45, "● ON AIR", "#ff6b5b", 12)}
      {/* wall foam */}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={20 + i * 52} y="66" width="40" height="40" fill={i % 2 ? "#3a2b72" : "#2f235f"} />
      ))}
    </g>
  ),
  mamaput: (sky) => (
    <g>
      <rect width="360" height="200" fill={sky} />
      {/* canopy */}
      <path d="M 20 70 L 340 70 L 320 40 L 40 40 Z" fill="#ff6b5b" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={40 + i * 36} y="40" width="18" height="30" fill="#fff" opacity="0.85" />
      ))}
      <rect x="30" y="70" width="6" height="108" fill="#5c361e" />
      <rect x="324" y="70" width="6" height="108" fill="#5c361e" />
      {/* pots */}
      <rect x="250" y="122" width="60" height="30" rx="4" fill="#2b2b2b" />
      <ellipse cx="280" cy="122" rx="30" ry="6" fill="#d9531e" />
      <rect x="240" y="152" width="80" height="26" fill="#5c361e" />
      <text x="90" y="110" fontSize="12" fontWeight="900" fill="#241a05">MAMA PUT</text>
      <rect y={FLOOR} width="360" height={200 - FLOOR} fill="#3a2e22" />
    </g>
  ),
  law: (sky) => (
    <g>
      {windowBox(230, 30, 110, 80, sky)}
      {/* shelves of files */}
      <rect x="20" y="36" width="150" height="100" fill="#3d2a1a" />
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <rect x="20" y={66 + r * 33} width="150" height="4" fill="#2a1a0e" />
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={26 + i * 14} y={40 + r * 33} width="10" height="26" fill={["#b5462e", "#2e6fb5", "#d9b04a"][(i + r) % 3]} />
          ))}
        </g>
      ))}
      <text x="285" y="128" textAnchor="middle" fontSize="18">⚖️</text>
    </g>
  ),
  bank: () => (
    <g>
      <rect width="360" height="200" fill="#e9e3f7" />
      {[40, 120, 200, 280].map((x) => (
        <rect key={x} x={x} y="20" width="22" height="158" fill="#d4cbe9" />
      ))}
      <rect y={FLOOR} width="360" height={200 - FLOOR} fill="#bdb3d9" />
      <text x="180" y="60" textAnchor="middle" fontSize="14" fontWeight="900" fill="#3d2f78" style={{ fontFamily: "var(--font-display)" }}>
        LAGOON BANK
      </text>
    </g>
  ),
  creator: (sky) => (
    <g>
      <rect width="360" height="200" fill="#ffe6f1" />
      {windowBox(20, 26, 120, 90, sky)}
      <rect y={FLOOR} width="360" height={200 - FLOOR} fill="#f0c3d8" />
      {/* sofa */}
      <rect x="230" y="130" width="110" height="48" rx="10" fill="#ff4f9a" />
      <rect x="230" y="118" width="110" height="20" rx="8" fill="#e23f86" />
      <text x="290" y="60" textAnchor="middle" fontSize="12" fontWeight="900" fill="#e23f86">#ClipTok</text>
    </g>
  ),
  sanctuary: () => (
    <g>
      <rect width="360" height="200" fill="#0d0820" />
      {/* light beams */}
      {[60, 150, 210, 300].map((x, i) => (
        <path key={x} className="neon" style={{ animationDelay: `${i * 0.6}s` }} d={`M ${x} 0 L ${x - 40} 150 L ${x + 40} 150 Z`} fill={["#ff4f9a", "#37d3c4", "#ffc93c", "#b07cff"][i]} opacity="0.18" />
      ))}
      <rect x="20" y="140" width="320" height="38" fill="#2a1f55" />
      <rect x="20" y="138" width="320" height="4" fill="#ff4f9a" />
      {neon(180, 40, "THE SANCTUARY", "#ffc93c", 16)}
      {/* crowd */}
      {Array.from({ length: 22 }, (_, i) => (
        <circle key={i} className="bob" style={{ animationDelay: `${(i % 5) * 0.2}s` }} cx={10 + i * 16} cy={192 - (i % 3) * 3} r="8" fill="#000" opacity="0.75" />
      ))}
    </g>
  ),
};

/** Furniture drawn in front of the wall and behind/around the figure. */
function Prop({ kind, at }: { kind: Act["prop"]; at: number }) {
  switch (kind) {
    case "desk":
      return (
        <g>
          {/* chair behind the person */}
          <rect x={at - 16} y={FLOOR - 70} width="32" height="34" rx="6" fill="#141022" />
          <rect x={at - 3} y={FLOOR - 36} width="6" height="36" fill="#141022" />
        </g>
      );
    case "console":
      return (
        <g>
          <rect x={at - 16} y={FLOOR - 70} width="32" height="34" rx="6" fill="#141022" />
          <rect x={at - 3} y={FLOOR - 36} width="6" height="36" fill="#141022" />
        </g>
      );
    case "bench":
      return <rect x={at - 50} y={FLOOR - 30} width="100" height="8" fill={P.wood2} />;
    default:
      return null;
  }
}

/** Furniture that sits in front of the person (the desk top hides their lap: they're sitting at it). */
function FrontProp({ kind, at }: { kind: Act["prop"]; at: number }) {
  switch (kind) {
    case "desk":
      return (
        <g>
          <rect x={at - 46} y={FLOOR - 44} width="92" height="7" rx="2" fill={P.wood} />
          <rect x={at - 42} y={FLOOR - 37} width="6" height="37" fill={P.wood2} />
          <rect x={at + 36} y={FLOOR - 37} width="6" height="37" fill={P.wood2} />
          {/* laptop */}
          <path d={`M ${at - 18} ${FLOOR - 44} L ${at - 14} ${FLOOR - 66} L ${at + 14} ${FLOOR - 66} L ${at + 18} ${FLOOR - 44} Z`} fill="#c9c3e6" />
          <rect x={at - 12} y={FLOOR - 63} width="24" height="15" fill="#37d3c4" opacity="0.6" />
        </g>
      );
    case "console":
      return (
        <g>
          <path d={`M ${at - 60} ${FLOOR - 40} L ${at - 50} ${FLOOR - 56} L ${at + 50} ${FLOOR - 56} L ${at + 60} ${FLOOR - 40} Z`} fill="#2b2546" />
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={at - 44 + i * 9} y={FLOOR - 54} width="3" height="10" fill={i % 3 ? "#8d86b5" : "#ff4f9a"} />
          ))}
          <rect x={at - 60} y={FLOOR - 40} width="120" height="40" fill="#1a1530" />
        </g>
      );
    case "decks":
      return (
        <g>
          <rect x={at - 55} y={FLOOR - 50} width="110" height="50" fill="#141022" />
          <rect x={at - 55} y={FLOOR - 54} width="110" height="6" fill="#2b2546" />
          <circle cx={at - 28} cy={FLOOR - 51} r="11" fill="#0b0816" stroke="#8d86b5" />
          <circle cx={at + 28} cy={FLOOR - 51} r="11" fill="#0b0816" stroke="#8d86b5" />
          <text x={at} y={FLOOR - 20} textAnchor="middle" fontSize="9" fill="#ffc93c" fontWeight="900">
            DJ
          </text>
        </g>
      );
    case "mic":
      return (
        <g>
          <rect x={at - 1.5} y={FLOOR - 92} width="3" height="92" fill="#8d86b5" />
          <ellipse cx={at} cy={FLOOR - 95} rx="4" ry="6" fill="#141022" />
        </g>
      );
    case "bed":
      return null;
    case "counter":
      return (
        <g>
          <rect x={at - 10} y={FLOOR - 50} width="160" height="50" fill="#8d86b5" />
          <rect x={at - 14} y={FLOOR - 54} width="168" height="6" fill="#6f679a" />
        </g>
      );
    case "ring":
      return (
        <g>
          <circle cx={at - 70} cy={FLOOR - 110} r="20" fill="none" stroke="#fff" strokeWidth="5" style={{ filter: "drop-shadow(0 0 6px #fff)" }} />
          <rect x={at - 72} y={FLOOR - 90} width="3" height="90" fill="#8d86b5" />
        </g>
      );
    default:
      return null;
  }
}

function Fx({ kind }: { kind: Act["fx"] }) {
  if (!kind) return null;
  const glyph = { notes: "♪ ♫ ♪", coins: "₦ ₦ ₦", hearts: "💬 🤝🏾", zzz: "z z Z", rocket: "🚀", flash: "✨", steam: "∿ ∿", waves: "▁▃▅▇▅▃", fire: "🔥" }[kind];
  return (
    <text className="bob" x="300" y="70" textAnchor="middle" fontSize="20" fill="#ffc93c" opacity="0.95">
      {glyph}
    </text>
  );
}

/** One activity, played out: room, furniture, the boss (and maybe an artist), and an effect. */
export function ActivityStage({ place, act, boss, artist, night = true }: { place: PlaceId; act: Act; boss: FigLook; artist?: FigLook; night?: boolean }) {
  const at = act.at ?? 180;
  const sitting = act.pose === "nod" || act.pose === "eat" || (act.pose === "talk" && (act.prop === "desk" || act.prop === "bench"));
  const bossPose: Pose = act.pose === "talk" && sitting ? "talk" : act.pose;
  const seatY = act.prop === "bench" ? FLOOR - 4 : FLOOR;
  return (
    <svg viewBox="0 0 360 200" className="block h-full w-full" role="img" aria-label="Activity scene" preserveAspectRatio="xMidYMid slice">
      <Backdrop place={place} night={night} />
      <Prop kind={act.prop} at={at} />
      {act.pose === "sleep" ? (
        <g>
          <rect x="90" y={FLOOR - 26} width="180" height="26" rx="4" fill="#3d2f78" />
          <rect x="96" y={FLOOR - 36} width="40" height="14" rx="6" fill="#f6f0ff" />
          <g transform={`translate(150 ${FLOOR - 30}) rotate(-90)`}>
            <Figure look={boss} pose="sleep" s={0.9} />
          </g>
          <rect x="140" y={FLOOR - 32} width="125" height="12" rx="5" fill={`hsl(${boss.hue} 60% 45%)`} />
        </g>
      ) : (
        <g className={sitting ? "fig-sit" : undefined}>
          <Figure look={boss} pose={bossPose === "nod" ? "nod" : bossPose} x={at} y={seatY} s={1.05} />
        </g>
      )}
      {act.artist && artist && (
        <g>
          {act.artist.pose === "sing" && <FrontProp kind="mic" at={act.artist.at - 18} />}
          <Figure look={artist} pose={act.artist.pose} x={act.artist.at} y={FLOOR} s={1.05} delay={-0.3} />
        </g>
      )}
      <FrontProp kind={act.prop} at={at} />
      <Fx kind={act.fx} />
    </svg>
  );
}
