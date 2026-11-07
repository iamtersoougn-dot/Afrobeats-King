"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface View {
  x: number;
  y: number;
  k: number;
}

/**
 * Pan and zoom for a fixed-size world inside a resizable box.
 * Drag (mouse or one finger), pinch (two fingers), wheel, plus flyTo for buttons.
 * Taps still reach child buttons: we only capture the pointer once it has moved.
 */
export function usePanZoom(worldW: number, worldH: number, opts: { minFit?: number; max?: number; initial?: (fit: number, size: { w: number; h: number }) => View } = {}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 0 });
  const [animate, setAnimate] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ x: number; y: number; moved: boolean; pinch?: number; mid?: { x: number; y: number } }>({ x: 0, y: 0, moved: false });
  const viewRef = useRef(view);
  const optsRef = useRef(opts);
  useLayoutEffect(() => {
    viewRef.current = view;
    optsRef.current = opts;
  });

  const fit = size.w ? Math.min(size.w / worldW, size.h / worldH) : 1;
  const minK = fit * (opts.minFit ?? 0.95);
  const maxK = opts.max ?? 3;

  const clamp = useCallback(
    (v: View): View => {
      const k = Math.max(minK, Math.min(maxK, v.k));
      const ww = worldW * k, wh = worldH * k;
      const padX = size.w * 0.3, padY = size.h * 0.22;
      const x = ww + 2 * padX < size.w ? (size.w - ww) / 2 : Math.min(padX, Math.max(size.w - ww - padX, v.x));
      const y = wh + 2 * padY < size.h ? (size.h - wh) / 2 : Math.min(padY, Math.max(size.h - wh - padY, v.y));
      return { x, y, k };
    },
    [minK, maxK, size.w, size.h, worldW, worldH],
  );

  // measure
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // first fit once we know the size
  const placed = useRef(false);
  useEffect(() => {
    if (!size.w || placed.current) return;
    placed.current = true;
    const f = Math.min(size.w / worldW, size.h / worldH);
    const init = optsRef.current.initial?.(f, size) ?? { k: f, x: (size.w - worldW * f) / 2, y: (size.h - worldH * f) / 2 };
    const t = setTimeout(() => setView(clamp(init)), 0);
    return () => clearTimeout(t);
  }, [size, worldW, worldH, clamp]);

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number, anim = false) => {
      const v = viewRef.current;
      const k = Math.max(minK, Math.min(maxK, v.k * factor));
      const f = k / v.k;
      setAnimate(anim);
      setView(clamp({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f }));
    },
    [clamp, minK, maxK],
  );

  /** Centre the camera on a world point. */
  const flyTo = useCallback(
    (wx: number, wy: number, k?: number) => {
      const kk = Math.max(minK, Math.min(maxK, k ?? viewRef.current.k));
      setAnimate(true);
      setView(clamp({ k: kk, x: size.w / 2 - wx * kk, y: size.h * 0.52 - wy * kk }));
    },
    [clamp, minK, maxK, size.w, size.h],
  );

  const fitAll = useCallback(() => {
    setAnimate(true);
    setView(clamp({ k: fit, x: (size.w - worldW * fit) / 2, y: (size.h - worldH * fit) / 2 }));
  }, [clamp, fit, size.w, size.h, worldW, worldH]);

  // wheel (needs a non-passive listener to stop the page scrolling)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0018), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    if (pointers.current.size === 1) start.current = { x: e.clientX, y: e.clientY, moved: false };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      start.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      start.current.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      start.current.moved = true;
      box.current!.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const r = box.current!.getBoundingClientRect();
    const cur = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (pointers.current.size >= 2) {
      pointers.current.set(e.pointerId, cur);
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = start.current;
      if (s.pinch && s.mid) {
        const v = viewRef.current;
        const k = Math.max(minK, Math.min(maxK, v.k * (dist / s.pinch)));
        const f = k / v.k;
        setAnimate(false);
        setView(clamp({ k, x: mid.x - (s.mid.x - v.x) * f, y: mid.y - (s.mid.y - v.y) * f }));
      }
      s.pinch = dist;
      s.mid = mid;
      return;
    }
    if (!start.current.moved && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) < 7) return;
    if (!start.current.moved) {
      start.current.moved = true;
      box.current!.setPointerCapture(e.pointerId);
    }
    const dx = cur.x - prev.x, dy = cur.y - prev.y;
    pointers.current.set(e.pointerId, cur);
    setAnimate(false);
    setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) start.current.pinch = undefined;
  };

  /** True right after a drag, so the click that ends a drag can be ignored. */
  const dragged = () => start.current.moved;

  return [box, {
    size,
    view,
    animate,
    ready: view.k > 0,
    zoomIn: () => zoomAt(1.4, size.w / 2, size.h / 2, true),
    zoomOut: () => zoomAt(1 / 1.4, size.w / 2, size.h / 2, true),
    flyTo,
    fitAll,
    dragged,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }] as const;
}
