/**
 * Things sold for real naira (shared by browser and server, so the server can check the price paid)
 * and things bought with gold. Vanity first: gold never buys streams, hype, chart spots or artists.
 */
export interface Product {
  id: string;
  name: string;
  priceNaira: number;
  gold: number;
  vipDays?: number;
  removeAds?: boolean;
  cash?: number; // in-game naira bonus (small, once)
  items?: string[]; // cosmetics unlocked
  pass?: boolean; // premium Tour Pass for the current month
  passTiers?: number;
  badge?: string;
  desc: string;
  oncePerAccount?: boolean;
  offer?: boolean; // only sold through time-limited offer cards
}

export const PRODUCTS: Product[] = [
  { id: "starter", name: "Bedroom starter pack", priceNaira: 500, gold: 150, cash: 50_000, items: ["snapback"], badge: "One-time · best value", desc: "150 gold, ₦50k in-game cash and a studio snapback", oncePerAccount: true },
  { id: "gold_s", name: "Small change", priceNaira: 500, gold: 80, desc: "80 gold" },
  { id: "gold_m", name: "Show money", priceNaira: 1_500, gold: 280, badge: "Popular", desc: "280 gold (+17% bonus)" },
  { id: "gold_l", name: "Tour budget", priceNaira: 4_000, gold: 850, desc: "850 gold (+33% bonus)" },
  { id: "gold_xl", name: "Label vault", priceNaira: 10_000, gold: 2_400, badge: "Biggest bonus", desc: "2,400 gold (+50% bonus)" },
  { id: "vip30", name: "Odogwu Pass", priceNaira: 1_500, gold: 100, vipDays: 30, items: ["gold_agbada"], badge: "VIP · 30 days", desc: "+25 gold daily, double daily rewards, no interstitial ads, rewarded ads skip the wait, gold agbada" },
  { id: "pass", name: "Tour Pass (this month)", priceNaira: 1_500, gold: 0, pass: true, badge: "Season pass", desc: "Unlock the premium track: 500+ gold, tour jacket and gold mic chain" },
  { id: "pass_plus", name: "Tour Pass + 10 tiers", priceNaira: 3_500, gold: 0, pass: true, passTiers: 10, badge: "Skip ahead", desc: "Premium track plus 10 tiers unlocked now" },
  { id: "noads", name: "Remove ads forever", priceNaira: 2_000, gold: 0, removeAds: true, desc: "No more interstitial ads. Rewarded ads stay optional.", oncePerAccount: true },
  { id: "offer_sapa", name: "Sapa relief pack", priceNaira: 300, gold: 60, cash: 30_000, offer: true, desc: "60 gold + ₦30,000 in-game cash. Sapa no go kill your label.", oncePerAccount: true },
  { id: "offer_no1", name: "Number One bundle", priceNaira: 1_000, gold: 300, items: ["crown"], offer: true, desc: "300 gold + the crown, for your first No. 1", oncePerAccount: true },
  { id: "offer_level", name: "Level-up bundle", priceNaira: 1_500, gold: 400, vipDays: 7, offer: true, desc: "400 gold + 7 days of the Odogwu Pass", oncePerAccount: true },
  { id: "offer_comeback", name: "Welcome back bundle", priceNaira: 700, gold: 200, offer: true, desc: "200 gold to pick up where you left off", oncePerAccount: true },
];
export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);

export interface OfferDef {
  id: string;
  productId: string;
  title: string;
  pitch: string;
  hours: number;
}
export const OFFERS: OfferDef[] = [
  { id: "sapa", productId: "offer_sapa", title: "🫙 Sapa relief", pitch: "Your label is broke. Small help for a small price.", hours: 12 },
  { id: "no1", productId: "offer_no1", title: "👑 Number One!", pitch: "You topped the chart. Wear the crown.", hours: 24 },
  { id: "level", productId: "offer_level", title: "🎉 Level up special", pitch: "Your label just grew. Celebrate with gold and VIP.", hours: 24 },
  { id: "comeback", productId: "offer_comeback", title: "👋🏾 Welcome back", pitch: "We missed you! A little boost to get going again.", hours: 24 },
];

export const DAILY_REWARDS = [10, 15, 20, 25, 35, 45, 100];
export const MAX_ADS_PER_DAY = 10;
export const AD_GOLD = 6;
/** Gold conveniences (small, capped). */
export const REFILL = { gold: 30, energy: 40 }; // once per real day

// ───────── Gold shop: looks only ─────────
export type ItemSlot = "outfit" | "extra" | "studio" | "ride";
export interface ShopItem {
  id: string;
  slot: ItemSlot;
  name: string;
  icon: string;
  gold: number; // 0 = only from packs, the pass or achievements
  hue?: number; // outfit colour
}
export const SHOP: ShopItem[] = [
  { id: "basic", slot: "outfit", name: "Plain tee", icon: "👕", gold: 0, hue: 285 },
  { id: "drip", slot: "outfit", name: "Drip jacket", icon: "🧥", gold: 120, hue: 330 },
  { id: "ankara", slot: "outfit", name: "Ankara suit", icon: "🎽", gold: 180, hue: 25 },
  { id: "tracksuit", slot: "outfit", name: "Green-white tracksuit", icon: "🟩", gold: 90, hue: 140 },
  { id: "tour_jacket", slot: "outfit", name: "Tour jacket", icon: "🎟️", gold: 0, hue: 200 },
  { id: "gold_agbada", slot: "outfit", name: "Gold agbada", icon: "✨", gold: 0, hue: 45 },
  { id: "shades", slot: "extra", name: "Dark shades", icon: "🕶️", gold: 60 },
  { id: "chain", slot: "extra", name: "Iced chain", icon: "⛓️", gold: 150 },
  { id: "snapback", slot: "extra", name: "Studio snapback", icon: "🧢", gold: 50 },
  { id: "headphones", slot: "extra", name: "Studio headphones", icon: "🎧", gold: 80 },
  { id: "gold_mic", slot: "extra", name: "Gold mic chain", icon: "🎤", gold: 0 },
  { id: "crown", slot: "extra", name: "The crown", icon: "👑", gold: 0 },
  { id: "neon", slot: "studio", name: "Neon studio lights", icon: "🟣", gold: 100 },
  { id: "gold_room", slot: "studio", name: "Gold plaque wall", icon: "🏅", gold: 250 },
  { id: "keke", slot: "ride", name: "Keke Napep", icon: "🛺", gold: 80 },
  { id: "tokunbo", slot: "ride", name: "Tokunbo Corolla", icon: "🚗", gold: 200 },
  { id: "gwagon", slot: "ride", name: "G-Wagon", icon: "🚙", gold: 600 },
];
export const itemById = (id: string) => SHOP.find((i) => i.id === id);
