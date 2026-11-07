import { db } from "@/lib/server/db";
import { ipOf, isUuidish, limited } from "@/lib/server/rate";
import { pidOf } from "@/lib/server/live";
import { lastWinner, seasonWeek } from "@/lib/server/season";
import { SEASON_WEEK_CAP, SEASON_WIN_GOLD, CAMPS } from "@/lib/daily";
import { SCOPE } from "@/lib/live";

/**
 * Heartbeat + read for light multiplayer (everyone shares the Lagos map).
 * POST {installId, name, label, camp, place, look, level, since?, pSince?, bSince?, week, pts?, checkWin?}
 * → { configured, me, players (seen in the last 10 min), waves (to me), board }
 * Install ids never leave the server: other players only see a hashed public id.
 */
const clean = (s: unknown, max: number) => String(s ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const COLOR = /^#[0-9a-f]{6}$/i;
const WORD = /^[a-z0-9_]{1,16}$/i;
const PLACES = /^(base|studio|hub|bar|radio|law|bank|mamaput|creator|sanctuary)$/;

function safeLook(l: unknown) {
  if (!l || typeof l !== "object") return null;
  const o = l as Record<string, unknown>;
  const skin = typeof o.skin === "string" && COLOR.test(o.skin) ? o.skin : null;
  const hair = Number.isInteger(o.hair) && (o.hair as number) >= 0 && (o.hair as number) < 6 ? (o.hair as number) : null;
  const hue = Number.isFinite(o.hue) ? Math.round(o.hue as number) % 360 : null;
  if (!skin || hair === null || hue === null) return null;
  return { skin, hair, hue, outfit: typeof o.outfit === "string" && WORD.test(o.outfit) ? o.outfit : "basic", extra: typeof o.extra === "string" && WORD.test(o.extra) ? o.extra : undefined };
}

/** Seconds between heartbeats. Raise LIVE_INTERVAL_SEC in Vercel (then redeploy) to cut load on a busy day. */
const NEXT = Math.max(20, Math.min(300, Number(process.env.LIVE_INTERVAL_SEC) || 45));
const isTime = (s: unknown, floor: number): s is string => typeof s === "string" && !isNaN(Date.parse(s)) && Date.parse(s) > floor;

export async function POST(request: Request) {
  const c = db();
  // LIVE_OFF=1 switches the live map off for everyone without touching the rest of the game
  if (!c || process.env.LIVE_OFF === "1") return Response.json({ configured: false, players: [], waves: [], board: [] });
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!isUuidish(b.installId)) return Response.json({ ok: false }, { status: 400 });
  if (limited(`live:${b.installId}`, 8, 60_000) || limited(`liveip:${ipOf(request)}`, 60, 60_000)) return Response.json({ ok: false }, { status: 429 });
  const pid = pidOf(b.installId);
  const now = new Date();
  const camp = typeof b.camp === "string" && b.camp in CAMPS ? b.camp : null;

  if (b.visible !== false) {
    await c.from("abk_presence").upsert({
      pid,
      name: clean(b.name, 14) || "Boss",
      label: clean(b.label, 24),
      camp,
      place: typeof b.place === "string" && PLACES.test(b.place) ? b.place : "base",
      look: safeLook(b.look),
      level: Math.max(0, Math.min(4, Math.round(Number(b.level) || 0))),
      updated_at: now.toISOString(),
    });
  } else {
    await c.from("abk_presence").delete().eq("pid", pid);
  }

  // weekly genre-camp season: accept the phone's points, but never more than +80 per heartbeat
  const week = seasonWeek(now);
  let seasonReward = false;
  try {
    if (camp && b.week === week && b.pts !== undefined && b.pts !== null && Number.isFinite(Number(b.pts))) {
      const { data: cur } = await c.from("abk_season_scores").select("pts").eq("week", week).eq("pid", pid).maybeSingle();
      const pts = Math.max(cur?.pts ?? 0, Math.min(Math.round(Number(b.pts)), (cur?.pts ?? 0) + 80, SEASON_WEEK_CAP));
      if (!cur || pts !== cur.pts) await c.from("abk_season_scores").upsert({ week, pid, camp, pts, updated_at: now.toISOString() });
    }
    // last week's winners collect their gold once (checked once per session)
    const lw = b.checkWin ? await lastWinner(c, now) : { winner: null, week: "" };
    if (lw.winner) {
      const { data: mine } = await c.from("abk_season_scores").select("camp, pts").eq("week", lw.week).eq("pid", pid).maybeSingle();
      if (mine && mine.camp === lw.winner.camp && mine.pts > 0) {
        const { error } = await c.from("abk_season_claims").insert({ week: lw.week, pid });
        if (!error) {
          await c.from("abk_rewards").insert({ install_id: b.installId, gold: SEASON_WIN_GOLD, reason: `${CAMPS[lw.winner.camp as keyof typeof CAMPS]?.name ?? lw.winner.camp} won the week (${lw.week}). Well played!` });
          seasonReward = true;
        }
      }
    }
  } catch {
    /* season tables not created yet: multiplayer still works */
  }

  const tenMin = new Date(now.getTime() - 10 * 60_000).toISOString();
  const since = isTime(b.since, now.getTime() - 15 * 60_000) ? b.since : new Date(now.getTime() - 15 * 60_000).toISOString();
  // after the first beat the phone asks only for what changed since its last one
  const pSince = isTime(b.pSince, now.getTime() - 10 * 60_000) ? b.pSince : null;
  const bSince = isTime(b.bSince, now.getTime() - 7 * 86_400_000) ? b.bSince : null;
  let bq = c.from("abk_board_posts").select("id, pid, name, msg, created_at").eq("scope", SCOPE);
  if (bSince) bq = bq.gt("created_at", bSince);
  const [players, waves, board] = await Promise.all([
    c.from("abk_presence").select("pid, name, label, camp, place, look, level, updated_at").gte("updated_at", pSince ?? tenMin).neq("pid", pid).order("updated_at", { ascending: false }).limit(40),
    c.from("abk_waves").select("id, from_name, from_label, emoji, created_at").eq("to_pid", pid).gt("created_at", since).order("created_at", { ascending: false }).limit(10),
    bq.order("created_at", { ascending: false }).limit(20),
  ]);
  const ago = (t: string) => Math.max(0, Math.round((now.getTime() - Date.parse(t)) / 1000));
  return Response.json({
    configured: true,
    me: pid,
    seasonReward,
    now: now.toISOString(),
    next: players.error || board.error ? Math.min(300, NEXT * 2) : NEXT,
    fullPlayers: !pSince,
    fullBoard: !bSince,
    players: (players.data ?? []).map((r) => ({ pid: r.pid, name: r.name, label: r.label, camp: r.camp, place: r.place, look: r.look, level: r.level, ago: ago(r.updated_at) })),
    waves: (waves.data ?? []).map((w) => ({ id: w.id, name: w.from_name, label: w.from_label, emoji: w.emoji, ago: ago(w.created_at) })),
    board: (board.data ?? []).map((p) => ({ id: p.id, name: p.name, msg: p.msg, ago: ago(p.created_at), mine: p.pid === pid })),
  });
}
