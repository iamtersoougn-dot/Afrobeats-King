"use client";

import { Component, type ReactNode } from "react";
import { useGame } from "@/lib/store";

/** If a screen crashes, show a way out instead of a blank page, and remember the error for "Report a problem". */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  componentDidCatch(e: unknown) {
    try {
      useGame.getState().logError(e instanceof Error ? `${e.message} ${e.stack?.split("\n")[1] ?? ""}` : String(e));
    } catch {
      /* ignore */
    }
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-4xl">🎚️</div>
        <h1 className="font-display text-[20px] font-bold">The beat skipped</h1>
        <p className="text-[14px] text-lilac">Something broke on this screen. Your save is safe on this phone.</p>
        <button
          className="btn btn-danfo w-full"
          onClick={() => {
            useGame.setState({ sheet: null, place: null, vignette: null, tab: "home" });
            this.setState({ error: null });
          }}
        >
          Back to the map
        </button>
        <button
          className="btn btn-ghost w-full"
          onClick={() => {
            useGame.setState({ sheet: "report", place: null, vignette: null });
            this.setState({ error: null });
          }}
        >
          Report a problem
        </button>
      </div>
    );
  }
}
