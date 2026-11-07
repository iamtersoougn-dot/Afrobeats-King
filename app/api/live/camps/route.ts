import { db } from "@/lib/server/db";
import { seasonWeek, weekTable } from "@/lib/server/season";

/** This week's genre-camp table. Cached at the edge for a minute. */
export async function GET() {
  const c = db();
  if (!c) return Response.json({ configured: false, rows: [] });
  try {
    const rows = await weekTable(c, seasonWeek(new Date()));
    return Response.json({ configured: true, rows }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch {
    return Response.json({ configured: true, rows: [] });
  }
}
