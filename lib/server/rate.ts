/** Small in-memory rate limiter (per server instance). Good enough to blunt spam on free hosting. */
const hits = new Map<string, { n: number; reset: number }>();

export function ipOf(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "anon";
}

export function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  h.n += 1;
  return h.n > max;
}

export const isUuidish = (s: unknown): s is string => typeof s === "string" && /^[\w-]{8,64}$/.test(s);
