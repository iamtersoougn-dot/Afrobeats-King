import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * Server-side Supabase client (service role). Returns null when not configured, and every route then
 * answers "not configured" so the game keeps working offline.
 * All tables start with abk_ so this game can share a free Supabase project with the owner's other games.
 */
export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

/** Records a verified payment (once per reference). */
export async function logPurchase(row: { reference: string; productId: string; amountKobo: number; email: string | null; source: string; installId?: string | null }) {
  const c = db();
  if (!c) return;
  try {
    const rec: Record<string, unknown> = { reference: row.reference, product_id: row.productId, amount_kobo: row.amountKobo, email: row.email, source: row.source };
    if (row.installId) rec.install_id = row.installId;
    await c.from("abk_purchases").upsert(rec, { onConflict: "reference", ignoreDuplicates: false });
  } catch {
    /* logging must never break a purchase */
  }
}

/** Who a payment reference already belongs to (grant-once check). */
export async function purchaseOwner(reference: string): Promise<string | null | undefined> {
  const c = db();
  if (!c) return undefined;
  const { data } = await c.from("abk_purchases").select("install_id").eq("reference", reference).maybeSingle();
  return data ? (data.install_id ?? null) : undefined;
}
