"use client";

import { useState } from "react";
import { useGame, vipOn } from "@/lib/store";
import { netWorth } from "@/lib/game/engine";
import { chillOn } from "@/lib/game/select";
import { naira } from "@/lib/game/util";
import { OFFERS, PRODUCTS, REFILL, productById, type Product } from "@/lib/products";
import { DEMO_PURCHASES, PAY_NAME, PAY_PROVIDER } from "@/lib/pay";
import { lagosDay } from "@/lib/daily";
import { useNow } from "@/components/world/useEnv";
import { Chip, Section, Segments, Sheet } from "../ui";

type Seg = "money" | "shop";

export default function WalletTab() {
  const seg = (useGame((s) => s.seg.wallet) as Seg) ?? "money";
  const setSeg = useGame((s) => s.setSeg);
  return (
    <div className="scroll-y h-full px-3 pb-6 pt-3">
      <Segments<Seg> value={seg} onChange={(v) => setSeg("wallet", v)} options={[{ id: "money", label: "Money" }, { id: "shop", label: "Shop" }]} />
      {seg === "money" ? <Money /> : <Shop />}
    </div>
  );
}

function Money() {
  const p = useGame((s) => s.player)!;
  const setTab = useGame((s) => s.setTab);
  const openPlace = useGame((s) => s.openPlace);
  const r = p.recap;
  const go = (id: "hub" | "bar" | "bank") => {
    setTab("home");
    openPlace(id);
  };
  const owed = p.obligations.filter((o) => o.amount > 0).reduce((t, o) => t + o.amount, 0);
  return (
    <div>
      <div className="mt-3 rounded-[20px] bg-night-2 p-4">
        <div className="text-[12.5px] text-lilac">Cash</div>
        <div className={`font-display text-[30px] font-black ${p.cash < 0 ? "text-okada" : "text-danfo"}`}>{naira(p.cash, false)}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-xl bg-night-3 px-3 py-2">
            <div className="text-lilac">Net worth</div>
            <div className="font-bold">{naira(netWorth(p))}</div>
          </div>
          <div className="rounded-xl bg-night-3 px-3 py-2">
            <div className="text-lilac">Bills to pay</div>
            <div className="font-bold">{naira(owed)}</div>
          </div>
          {p.loan > 0 && (
            <div className="col-span-2 rounded-xl bg-night-3 px-3 py-2">
              <div className="text-lilac">Loan left</div>
              <div className="font-bold">{naira(p.loan)}</div>
            </div>
          )}
        </div>
      </div>
      {r && (
        <Section title={`Last week (week ${r.week})`}>
          <div className="flex justify-between rounded-2xl bg-night-3 px-3 py-2 text-[14px] font-bold">
            <span className="text-lagoon">In {naira(r.income)}</span>
            <span className="text-okada">Out {naira(r.expenses)}</span>
          </div>
        </Section>
      )}
      <Section title="Need cash fast?">
        <div className="grid gap-2">
          {[
            { id: "hub" as const, icon: "💿", t: "Sell beats or mix for artists", s: "Yaba Hub · better with a good 🎧 Ear" },
            { id: "bar" as const, icon: "🪩", t: "DJ the night", s: "Open-mic bar · pays more with 🧢 street cred" },
            { id: "bank" as const, icon: "🏦", t: "Take a loan", s: "Bank · paid back weekly" },
          ].map((x) => (
            <button key={x.id} className="flex min-h-[56px] items-center gap-3 rounded-2xl bg-night-3 px-3 text-left" onClick={() => go(x.id)}>
              <span className="text-2xl">{x.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold">{x.t}</span>
                <span className="block text-[12px] text-lilac">{x.s}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-lilac">Each hustle pays less if you repeat it the same week, and has a weekly limit. Streams and shows are the real money.</p>
      </Section>
      {chillOn(p) && <p className="mt-3 rounded-2xl bg-lagoon/15 px-3 py-2 text-[13px] text-lagoon">🌿 Chill mode: being broke won&apos;t end your label.</p>}
    </div>
  );
}

function Shop() {
  const meta = useGame((s) => s.meta);
  const tour = useGame((s) => s.tour);
  const openSheet = useGame((s) => s.openSheet);
  const refill = useGame((s) => s.refillEnergy);
  const retry = useGame((s) => s.retryPending);
  const now = useNow();
  const [buying, setBuying] = useState<Product | null>(null);
  const today = lagosDay(new Date(now));
  const vip = vipOn(meta);
  const offers = Object.entries(meta.offers)
    .filter(([, until]) => until > now)
    .map(([id, until]) => ({ def: OFFERS.find((o) => o.id === id)!, until }))
    .filter((o) => o.def && !meta.bought.includes(o.def.productId));
  const regular = PRODUCTS.filter((x) => !x.offer && !(x.oncePerAccount && meta.bought.includes(x.id)));
  return (
    <div>
      <div className="mt-3 flex items-center gap-3 rounded-[20px] bg-night-2 p-4">
        <span className="text-3xl">🪙</span>
        <div className="flex-1">
          <div className="font-display text-[24px] font-black text-danfo">{meta.gold}</div>
          <div className="text-[12.5px] text-lilac">Gold buys looks and small extras. Never streams or chart spots.</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {tour === null && (
          <button className="btn btn-ghost min-h-[52px] text-[13.5px]" onClick={() => openSheet("ad")}>
            📺 Watch for gold
          </button>
        )}
        <button className="btn btn-ghost min-h-[52px] text-[13.5px]" disabled={meta.refill === today} onClick={refill}>
          ⚡ +{REFILL.energy} energy · {REFILL.gold}🪙
        </button>
        <button className="btn btn-ghost col-span-2 min-h-[48px] text-[13.5px]" onClick={() => openSheet("wardrobe")}>
          🧥 Wardrobe, studio looks and rides
        </button>
      </div>
      {vip && <p className="mt-3 rounded-2xl bg-danfo/15 px-3 py-2 text-[13px] text-danfo">👑 Odogwu Pass active until {new Date(meta.vipUntil).toLocaleDateString("en-NG")}.</p>}
      {offers.length > 0 && (
        <Section title="Limited offers">
          <div className="grid gap-2">
            {offers.map(({ def, until }) => {
              const prod = productById(def.productId)!;
              const hrs = Math.max(1, Math.round((until - now) / 3_600_000));
              return (
                <div key={def.id} className="rounded-2xl border border-danfo/60 bg-night-3 p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-[14.5px] font-bold">{def.title}</span>
                    <Chip tone="bad">{hrs}h left</Chip>
                  </div>
                  <p className="mt-1 text-[13px] text-lilac">{def.pitch} {prod.desc}</p>
                  <button className="btn btn-danfo mt-2 w-full" onClick={() => setBuying(prod)}>
                    ₦{prod.priceNaira.toLocaleString()}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}
      <Section title="Gold, passes and extras">
        <div className="grid gap-2">
          {regular.map((x) => (
            <div key={x.id} className="flex items-center gap-3 rounded-2xl bg-night-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[14.5px] font-bold">{x.name}</span>
                  {x.badge && <Chip tone="good">{x.badge}</Chip>}
                </div>
                <div className="text-[12.5px] text-lilac">{x.desc}</div>
              </div>
              <button className="btn btn-danfo shrink-0 px-3 text-[14px]" onClick={() => setBuying(x)} disabled={x.removeAds && meta.noAds}>
                ₦{x.priceNaira.toLocaleString()}
              </button>
            </div>
          ))}
        </div>
        <button className="mt-3 min-h-[44px] w-full text-[13px] font-bold text-lilac underline" onClick={retry}>
          Restore purchases
        </button>
        <p className="mt-1 text-[12px] text-lilac">
          {DEMO_PURCHASES ? "Test mode: purchases are free and nothing is charged." : PAY_PROVIDER ? `Payments by ${PAY_NAME}. Card, bank transfer or USSD. Each purchase is checked by our server before it's added.` : "The shop opens soon."}
        </p>
      </Section>
      {buying && <BuySheet product={buying} onClose={() => setBuying(null)} />}
    </div>
  );
}

function BuySheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const buy = useGame((s) => s.buy);
  const saved = useGame((s) => s.meta.email);
  const [email, setEmail] = useState(saved);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const go = async () => {
    setBusy(true);
    setMsg(null);
    const r = await buy(product.id, email.trim());
    setBusy(false);
    if (r.redirect) {
      window.location.href = r.redirect;
      return;
    }
    if (r.ok) onClose();
    else setMsg(r.message ?? "Something went wrong.");
  };
  return (
    <Sheet title={product.name} onClose={onClose}>
      <div className="grid gap-3 pb-4">
        <p className="text-[14px]">{product.desc}</p>
        <div className="font-display text-[26px] font-black text-danfo">₦{product.priceNaira.toLocaleString()}</div>
        {!DEMO_PURCHASES && (
          <label className="grid gap-1 text-[13px] font-bold">
            Email for your receipt
            <input className="min-h-[46px] rounded-2xl bg-night-3 px-3 text-[15px] font-normal outline-none" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
        )}
        {msg && <p className="text-[13px] text-okada">{msg}</p>}
        <button className="btn btn-danfo min-h-[50px]" disabled={busy || (!DEMO_PURCHASES && !ok)} onClick={go}>
          {busy ? "One moment…" : DEMO_PURCHASES ? "Get it (test mode)" : `Pay with ${PAY_NAME}`}
        </button>
        <p className="text-[12px] text-lilac">Refunds: see the terms. Problems with a payment? Settings → Report a problem.</p>
      </div>
    </Sheet>
  );
}
