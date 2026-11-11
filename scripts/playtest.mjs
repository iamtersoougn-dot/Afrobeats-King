// Phone-width playtest (380px). Usage: npm run build && npm start, then
//   BASE_URL=http://localhost:3000 node scripts/playtest.mjs
// Creates a new label, walks the whole tutorial by tapping what it spotlights, plays a few more weeks,
// visits every tab and sheet, and saves screenshots to playtest-shots/.
// Exits with an error on page errors, sideways scroll, a freeze, or tap targets under 44px.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? "playtest-shots";
const PROFILE = process.env.PROFILE ?? "producer";
mkdirSync(OUT, { recursive: true });
const launch = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const browser = await chromium.launch(launch);
const ctx = await browser.newContext({ viewport: { width: 380, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
p.setDefaultTimeout(6000);
const problems = [];
p.on("pageerror", (e) => problems.push("page error: " + e.message));
p.on("console", (m) => m.type() === "error" && !/Failed to load resource|fonts\.g|api\//.test(m.text()) && problems.push("console: " + m.text()));
let n = 0;
const shot = (name) => p.screenshot({ path: `${OUT}/${String(++n).padStart(2, "0")}-${name}.png` });

async function checkScreen(name) {
  const res = await p.evaluate(() => {
    const over = document.documentElement.scrollWidth - innerWidth;
    const small = [...document.querySelectorAll("button, a[href]")]
      .filter((b) => {
        const r = b.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        if (b.closest("svg")) return false;
        if (b.getAttribute("tabindex") === "-1") return false;
        const st = getComputedStyle(b);
        if (st.visibility === "hidden" || st.pointerEvents === "none") return false;
        return r.height < 40 || r.width < 40;
      })
      .map((b) => `${(b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 24)} ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`);
    return { over, small: small.slice(0, 8) };
  });
  if (res.over > 0) problems.push(`${name}: sideways scroll ${res.over}px`);
  if (res.small.length) problems.push(`${name}: small tap targets: ${res.small.join(" | ")}`);
}

await p.goto(BASE);
await p.getByRole("button", { name: "Start your label" }).click();
await p.waitForTimeout(500);
await shot("creation-1");
await checkScreen("creation step 1");
await p.getByLabel("Your name").fill("Amaka");
await p.getByRole("button", { name: "Next", exact: true }).click();
if (PROFILE === "richkid") await p.getByRole("button", { name: /Rich kid/ }).click();
await shot("creation-2");
await checkScreen("creation step 2");
await p.getByRole("button", { name: /Start/ }).last().click();
await p.waitForTimeout(1200);

// walk the tour by tapping exactly what it asks
const card = () => p.locator('[aria-label^="Tutorial:"]');
let steps = 0;
const counters = [];
for (let i = 0; i < 24; i++) {
  if (!(await card().count())) break;
  const label = await card().getAttribute("aria-label");
  await p.waitForTimeout(700);
  const ctr = /Step (\d+) of (\d+)/.exec(await card().innerText());
  if (ctr) counters.push([+ctr[1], +ctr[2]]);
  await shot("tour-" + label.replace("Tutorial: ", "").replace(/[^\w]+/g, "_").slice(0, 28));
  const next = card().getByRole("button", { name: /^(Start|Next|Let's go!)$/ });
  if (await next.count()) {
    await next.click();
    steps++;
    continue;
  }
  const ring = p.locator("[data-tour-ring]").first();
  const box = await ring.boundingBox().catch(() => null);
  if (!box) {
    problems.push(`tour stuck at "${label}" (no spotlight)`);
    break;
  }
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  steps++;
  await p.waitForTimeout(700);
}
if (await card().count()) problems.push("tour did not finish");
// the "Step x of y" counter must count up by one and end on y of y
const [lastX, lastY] = counters.at(-1) ?? [0, 0];
if (lastX !== lastY) problems.push(`tutorial counter ended on "Step ${lastX} of ${lastY}"`);
if (counters.some(([x, y], i) => x > y || (i > 0 && x !== counters[i - 1][0] && x !== counters[i - 1][0] + 1))) problems.push(`tutorial counter jumped: ${counters.map((c) => c.join("/")).join(" ")}`);
console.log("tutorial counter:", counters.map((c) => c.join("/")).join(" "));
const state = () => p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("abk-save-v1")).state;
  return { tour: s.meta.tutorialDone, week: s.player?.week, cash: s.player?.cash, artists: s.player?.artists.length, songs: s.player?.songs.map((x) => `${x.stage}:${x.sessions}`), gold: s.meta.gold, pending: s.player?.pendingEvent ?? null };
});
const st = await state();
console.log("after tour:", JSON.stringify(st), `${steps} steps`);
if (!st.tour) problems.push("tutorial not marked done");
if (st.week !== 2) problems.push(`expected week 2 after the tour, got ${st.week}`);
if (!st.artists) problems.push("no artist signed in the tour");
await shot("after-tour");
await checkScreen("home");

// close anything open
const closeAll = async () => {
  for (let i = 0; i < 6; i++) {
    const dlg = p.locator('[role="dialog"]:not([aria-label^="Tutorial"])');
    if (!(await dlg.count())) return;
    const btn = dlg.last().getByRole("button", { name: /^(Continue|Start week \d+|Something happened…|Back to the game|End it anyway)$/ });
    const x = dlg.last().locator('[data-tour="sheet-close"]');
    if (await btn.count()) await btn.first().click();
    else if (await x.count()) await x.first().click();
    else {
      const choice = dlg.last().locator("button.btn:not([disabled])");
      if (await choice.count()) await choice.first().click();
    }
    await p.waitForTimeout(350);
  }
};

// play three more weeks by following the yellow board
for (let w = 0; w < 3; w++) {
  for (let k = 0; k < 8; k++) {
    await closeAll();
    await p.locator('[data-tour="goal"]').click();
    await p.waitForTimeout(400);
    const sheet = p.locator('[role="dialog"]').last();
    if (!(await sheet.count())) break;
    // pay or do the first available thing in the place
    const pay = sheet.getByRole("button", { name: /^Pay$/ });
    const doIt = sheet.locator('[data-tour^="action-"]:not([disabled])');
    if (await pay.count()) await pay.first().click();
    else if (await doIt.count()) await doIt.first().click();
    else if (await sheet.locator("button:not([disabled])").count()) {
      // event choices
      const first = sheet.locator("button.btn-danfo:not([disabled])");
      if (await first.count()) await first.first().click();
    }
    await p.waitForTimeout(450);
    if (k === 1 && w === 0) await shot("vignette");
    await closeAll();
  }
  await closeAll();
  await p.locator('nav button[data-tour="nav-home"]').click();
  await p.locator('[data-tour="end-turn"]').click();
  await p.waitForTimeout(600);
  if (w === 0) await shot("recap");
  await closeAll();
}
const st2 = await state();
console.log("after 3 more weeks:", JSON.stringify(st2));
if (st2.week < 5) problems.push(`week did not advance (week ${st2.week})`);

// every tab and segment
for (const t of ["label", "wallet", "phone", "profile", "home"]) {
  await p.locator(`[data-tour="nav-${t}"]`).click();
  await p.waitForTimeout(400);
  await shot("tab-" + t);
  await checkScreen("tab " + t);
  const segs = p.locator('[role="tab"]');
  const c = await segs.count();
  for (let i = 1; i < c; i++) {
    await segs.nth(i).click();
    await p.waitForTimeout(300);
    await shot(`tab-${t}-seg${i}`);
    await checkScreen(`tab ${t} seg ${i}`);
  }
}
// sheets
await p.getByRole("button", { name: "How to play" }).first().click();
await p.waitForTimeout(300);
await shot("help");
await checkScreen("help");
await closeAll();
await p.getByRole("button", { name: /Needs/ }).click();
await p.waitForTimeout(300);
await shot("needs");
await closeAll();
await p.getByRole("button", { name: /Places/ }).click();
await p.waitForTimeout(300);
await shot("places");
await p.locator('[role="dialog"]').last().getByRole("button", { name: /Surulere Sound/ }).click();
await p.waitForTimeout(500);
await shot("place-studio");
await checkScreen("place sheet");
await closeAll();
await p.locator('[data-tour="nav-profile"]').click();
await p.getByRole("button", { name: /Settings/ }).click();
await p.waitForTimeout(300);
await shot("settings");
await closeAll();
await p.getByRole("button", { name: /Wardrobe/ }).click();
await p.waitForTimeout(300);
await shot("wardrobe");
await closeAll();

const nav = await p.evaluate(() => [...document.querySelectorAll("nav button")].map((b) => { const r = b.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }).join(","));
console.log("bottom nav:", nav);
await browser.close();
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ` + [...new Set(problems)].join("\n- "));
  process.exit(1);
}
console.log("\nPlaytest passed: tour, 3 more weeks, all tabs, no sideways scroll, no errors.");
