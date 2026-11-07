import crypto from "crypto";

/**
 * Flutterwave (v3 Standard checkout) on the server.
 * Keys live only in Vercel: FLW_SECRET_KEY (Dashboard → Settings → API keys) and
 * FLW_SECRET_HASH (Dashboard → Settings → Webhooks → Secret hash, any long random text you choose).
 */
// FLW_API_BASE is only for local tests against a stand-in server; leave it unset in Vercel.
const API = process.env.FLW_API_BASE || "https://api.flutterwave.com/v3";
export const flwSecret = () => process.env.FLW_SECRET_KEY ?? "";
export const flwConfigured = () => !!flwSecret();

/** Game purchases: abk-<product>-<time>-<rand>. Billboards: abkad-<request id>-<time>-<rand>. */
export const newTxRef = (kind: "abk" | "abkad", id: string | number) => `${kind}-${id}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
export const productOfRef = (ref: string) => /^abk-([a-z0-9_]+)-\d+-[0-9a-f]+$/.exec(ref)?.[1] ?? null;
export const adRequestOfRef = (ref: string) => {
  const m = /^abkad-(\d+)-\d+-[0-9a-f]+$/.exec(ref);
  return m ? Number(m[1]) : null;
};
export const validRef = (ref: unknown): ref is string => typeof ref === "string" && ref.length <= 100 && /^abk(ad)?-[a-z0-9_]+-\d+-[0-9a-f]+$/.test(ref);

/** Where Flutterwave sends the player back. Uses NEXT_PUBLIC_SITE_URL if set, else the request's own address. */
export function siteUrl(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const u = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? u.host;
  const proto = request.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function createPayment(o: {
  txRef: string;
  amount: number;
  email: string;
  name?: string;
  redirectUrl: string;
  title: string;
  description: string;
  meta: Record<string, string | number | null | undefined>;
}): Promise<{ link: string } | { error: string }> {
  try {
    const res = await fetch(`${API}/payments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${flwSecret()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: o.txRef,
        amount: o.amount,
        currency: "NGN",
        redirect_url: o.redirectUrl,
        payment_options: "card,banktransfer,ussd",
        customer: { email: o.email, ...(o.name ? { name: o.name } : {}) },
        customizations: { title: o.title, description: o.description },
        meta: Object.fromEntries(Object.entries(o.meta).filter(([, v]) => v !== null && v !== undefined)),
      }),
      cache: "no-store",
    });
    const j = (await res.json().catch(() => ({}))) as { status?: string; message?: string; data?: { link?: string } };
    if (j.status === "success" && j.data?.link) return { link: j.data.link };
    return { error: j.message ?? "Couldn't start the payment. Try again in a minute." };
  } catch {
    return { error: "Couldn't reach Flutterwave. Check your connection and try again." };
  }
}

export interface FlwTx {
  id: number;
  tx_ref: string;
  status: string;
  amount: number;
  currency: string;
  customer?: { email?: string; name?: string };
  meta?: Record<string, unknown> | null;
}

/** Asks Flutterwave directly what happened. By transaction id when we have it, else by our reference. */
export async function verifyTx(by: { id?: string | number | null; txRef?: string | null }): Promise<FlwTx | null> {
  const url = by.id && /^\d{1,20}$/.test(String(by.id)) ? `${API}/transactions/${by.id}/verify` : by.txRef ? `${API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(by.txRef)}` : null;
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${flwSecret()}` }, cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { status?: string; data?: FlwTx };
    return j.status === "success" && j.data ? j.data : null;
  } catch {
    return null;
  }
}

/** True when Flutterwave says it's paid in full, in naira, for exactly this reference. */
export const paidInFull = (tx: FlwTx | null, txRef: string, naira: number): boolean => !!tx && tx.status === "successful" && tx.currency === "NGN" && tx.tx_ref === txRef && tx.amount >= naira;

/** Webhook check: the "verif-hash" header must equal our secret hash (or, on newer accounts, an HMAC signature). */
export function webhookTrusted(raw: string, headers: Headers): boolean {
  const hash = process.env.FLW_SECRET_HASH ?? "";
  if (!hash) return false;
  const eq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  const verif = headers.get("verif-hash");
  if (verif) return eq(verif, hash);
  const sig = headers.get("flutterwave-signature");
  if (sig) return eq(sig, crypto.createHmac("sha256", hash).update(raw).digest("base64"));
  return false;
}
