import { markAdPaid } from "@/lib/server/adPay";
import { adRequestOfRef, flwConfigured, validRef, verifyTx } from "@/lib/server/flutterwave";
import { ipOf, limited } from "@/lib/server/rate";

/** Called when an advertiser comes back from Flutterwave: confirms and marks the booking paid. */
export async function POST(request: Request) {
  if (!flwConfigured()) return Response.json({ ok: false }, { status: 503 });
  if (limited(`adverify:${ipOf(request)}`, 20, 60_000)) return Response.json({ ok: false }, { status: 429 });
  let b: { txRef?: string; transactionId?: string | number };
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!validRef(b.txRef)) return Response.json({ ok: false }, { status: 400 });
  const id = adRequestOfRef(b.txRef);
  if (id === null) return Response.json({ ok: false }, { status: 400 });
  const tx = await verifyTx({ id: b.transactionId, txRef: b.txRef });
  const ok = !!tx && tx.status === "successful" && tx.currency === "NGN" && tx.tx_ref === b.txRef && (await markAdPaid(id, tx));
  return Response.json({ ok, pending: !tx });
}
