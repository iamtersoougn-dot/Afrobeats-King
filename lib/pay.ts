"use client";

import type { Product } from "./products";

export const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
/** Which payment company the game uses: Flutterwave when NEXT_PUBLIC_PAYMENTS_PROVIDER=flutterwave, else Paystack if its key is set. */
export const PAY_PROVIDER: "flutterwave" | "paystack" | null = process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER === "flutterwave" ? "flutterwave" : PAYSTACK_PUBLIC_KEY ? "paystack" : null;
export const PAY_NAME = PAY_PROVIDER === "paystack" ? "Paystack" : "Flutterwave";
/** Lets you test the store flow without a payment account. Never enable in production. */
export const DEMO_PURCHASES = !PAY_PROVIDER && (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_PURCHASES === "true");

interface PaystackPopInstance {
  newTransaction(o: Record<string, unknown>): void;
}
declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopInstance;
  }
}

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Paystack. Check your connection."));
    document.head.appendChild(s);
  });
}

export type PayOutcome = { status: "success"; reference: string } | { status: "cancelled" } | { status: "error"; message: string };

export async function payWithPaystack(product: Product, email: string, installId: string, userId?: string): Promise<PayOutcome> {
  if (!PAYSTACK_PUBLIC_KEY) return { status: "error", message: "Payments are not configured yet." };
  try {
    await loadScript();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  const reference = `abk_${product.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve) => {
    const pop = new window.PaystackPop!();
    pop.newTransaction({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: product.priceNaira * 100,
      currency: "NGN",
      reference,
      metadata: { productId: product.id, installId, userId, custom_fields: [{ display_name: "Item", variable_name: "item", value: product.name }] },
      onSuccess: (tx: { reference: string }) => resolve({ status: "success", reference: tx.reference || reference }),
      onCancel: () => resolve({ status: "cancelled" }),
      onError: (err: { message?: string }) => resolve({ status: "error", message: err?.message ?? "Payment failed" }),
    });
  });
}

export async function verifyPurchase(reference: string, productId: string, installId: string, token?: string | null): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch("/api/paystack/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ reference, productId, installId }),
    });
    const data = await res.json();
    return { ok: !!data.ok, message: data.message };
  } catch {
    return { ok: false, message: "Network error while verifying. Your payment is safe — reopen the store to retry." };
  }
}

// ───────── Flutterwave (redirect checkout: the player pays on Flutterwave's page, then comes back) ─────────
export async function startFlutterwave(productId: string, email: string, installId: string, token?: string | null): Promise<{ ok: true; link: string; txRef: string } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/flutterwave/init", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ productId, email, installId }),
    });
    const d = await res.json();
    return d.ok ? { ok: true, link: d.link, txRef: d.txRef } : { ok: false, message: d.message ?? "Couldn't start the payment." };
  } catch {
    return { ok: false, message: "No connection. Try again when you're online." };
  }
}

export async function verifyFlutterwave(txRef: string, transactionId: string | null, installId: string, token?: string | null): Promise<{ ok: boolean; pending?: boolean; message?: string }> {
  try {
    const res = await fetch("/api/flutterwave/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ txRef, transactionId, installId }),
    });
    const d = await res.json();
    return { ok: !!d.ok, pending: !!d.pending, message: d.message };
  } catch {
    return { ok: false, pending: true, message: "Network error while confirming. Your payment is safe; we'll check again next time you open the game." };
  }
}

/** Flutterwave sends the player back to /?pay=flw&status=…&tx_ref=…&transaction_id=… */
export function readPayReturn(): { status: string; txRef: string; transactionId: string | null } | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  if (q.get("pay") !== "flw" || !q.get("tx_ref")) return null;
  const out = { status: q.get("status") ?? "", txRef: q.get("tx_ref")!, transactionId: q.get("transaction_id") };
  ["pay", "status", "tx_ref", "transaction_id"].forEach((k) => q.delete(k));
  window.history.replaceState(null, "", `${window.location.pathname}${q.toString() ? `?${q}` : ""}`);
  return out;
}
