/**
 * Screenshot the VIEWPORT at points inside a pinned section's scroll range.
 *
 *   node scripts/pinshot.mjs <route> <#selector> <outPrefix> [steps=4] [w] [h]
 *   TARGET=http://localhost:3478 node scripts/pinshot.mjs /owner-operators '#road' .audit/road
 *
 * `shot.mjs` clips to the element's box, which for a pinned section is the pin
 * spacer — several thousand px of mostly-empty scroll runway. This walks the
 * runway instead and captures what the viewer actually sees at each point.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const route = process.argv[2] || "/";
const sel = process.argv[3] || "#road";
const prefix = process.argv[4] || ".audit/pin";
const STEPS = Number(process.argv[5] || 4);
const W = Number(process.argv[6] || 1920);
const H = Number(process.argv[7] || 1080);
const TARGET = (process.env.TARGET || "http://localhost:3478").replace(/\/$/, "");

mkdirSync(dirname(prefix), { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader", "--disable-gpu", "--mute-audio"] });
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e.message).slice(0, 200)));

  await page.goto(TARGET + route, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1500);

  const range = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    return { top, height: r.height };
  }, sel);
  if (!range) throw new Error(`no element matched ${sel}`);

  for (let i = 0; i <= STEPS; i++) {
    const y = Math.round(range.top + ((range.height - H) * i) / STEPS);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${prefix}-${String(i).padStart(2, "0")}.png` });
  }
  console.log(`wrote ${prefix}-00..${String(STEPS).padStart(2, "0")}.png${errors.length ? `  (${errors.length} console errors: ${errors[0]})` : ""}`);
} finally {
  await browser.close();
}
