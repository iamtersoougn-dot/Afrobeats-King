"use client";

import { useEffect, useRef } from "react";
import type { Tone } from "@/lib/game/types";

export const toneText: Record<Tone, string> = { good: "text-lagoon", bad: "text-okada", neutral: "text-lilac" };
export const toneBg: Record<Tone, string> = { good: "bg-lagoon/15 text-lagoon", bad: "bg-okada/15 text-okada", neutral: "bg-night-3 text-paper" };

/** A bottom sheet. Closes on the backdrop, the close button or Escape. */
export function Sheet({ title, onClose, children, tall, icon, label }: { title: string; onClose?: () => void; children: React.ReactNode; tall?: boolean; icon?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", k);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={label ?? title}>
      <button className="absolute inset-0 bg-black/55" aria-label="Close" onClick={onClose} tabIndex={-1} />
      <div ref={ref} tabIndex={-1} className={`sheet-in relative flex w-full max-w-[480px] flex-col rounded-t-[22px] border-t border-line bg-night-2 outline-none ${tall ? "h-[88dvh]" : "max-h-[86dvh]"}`}>
        <div className="flex items-center gap-2 px-4 pb-2 pt-3">
          {icon && <span className="text-2xl">{icon}</span>}
          <h2 className="font-display min-w-0 flex-1 truncate text-[17px] font-bold">{title}</h2>
          {onClose && (
            <button data-tour="sheet-close" className="btn btn-ghost h-11 w-11 shrink-0 p-0 text-lg" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
        <div className="scroll-y min-h-0 flex-1 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

/** Segments inside a tab (never new tabs). */
export function Segments<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; badge?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-night p-1" role="tablist">
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={value === o.id} className={`relative min-h-[44px] flex-1 rounded-xl px-1 text-[13.5px] font-bold ${value === o.id ? "bg-night-3 text-paper" : "text-lilac"}`} onClick={() => onChange(o.id)}>
          {o.label}
          {!!o.badge && <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-stage px-1 text-[11px] text-white">{o.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold ${toneBg[tone]}`}>{children}</span>;
}

export function Empty({ icon, text, action }: { icon: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-6 text-center">
      <div className="text-3xl">{icon}</div>
      <p className="max-w-[30ch] text-[14px] text-lilac">{text}</p>
      {action}
    </div>
  );
}

export function Bar({ value, color = "var(--danfo)" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-night">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-display text-[14px] font-bold text-paper">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
