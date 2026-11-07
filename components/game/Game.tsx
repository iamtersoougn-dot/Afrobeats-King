"use client";

import { useEffect, useRef } from "react";
import { useGame } from "@/lib/store";
import { readPayReturn } from "@/lib/pay";
import ErrorBoundary from "./ErrorBoundary";
import Creation from "./Creation";
import Shell from "./Shell";

export default function Game() {
  const hydrated = useGame((s) => s.hydrated);
  const player = useGame((s) => s.player);
  const opened = useRef(false);

  useEffect(() => {
    if (!hydrated || opened.current) return;
    opened.current = true;
    const g = useGame.getState();
    g.onOpen();
    // back from Flutterwave's payment page
    const ret = readPayReturn();
    if (ret) g.finishPayReturn(ret);
    const onErr = (e: ErrorEvent) => g.logError(`${e.message} @${e.filename?.split("/").pop()}:${e.lineno}`);
    window.addEventListener("error", onErr);
    return () => window.removeEventListener("error", onErr);
  }, [hydrated]);

  if (!hydrated)
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="font-display animate-pulse text-[18px] font-bold text-danfo">Afrobeats King</div>
      </div>
    );
  return <ErrorBoundary>{player ? <Shell /> : <Creation />}</ErrorBoundary>;
}
