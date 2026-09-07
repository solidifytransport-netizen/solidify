/**
 * Screenshot ONE section, after its scroll animation has settled.
 *
 *   node scripts/shot.mjs <route> <#selector> [out.png] [w=1920] [h=1080]
 *   TARGET=http://localhost:3478 node scripts/shot.mjs / '#coverage' .audit/coverage.png
 *
 * `peek.mjs` walks a whole page; this exists for the tighter loop of changing
 * one section and looking at exactly that section again. It scrolls the target
 * into view, waits for GSAP to finish, and clips the shot to the element's own
 * box so successive versions are directly comparable.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const route = process.argv[2] || "/";
const sel = process.argv[3] || "#coverage";
const out = process.argv[4] || ".audit/section.png";
const W = Number(process.argv[5] || 1920);
const H = Number(process.argv[6] || 1080);
const TARGET = (process.env.TARGET || "http://localhost:3478").replace(/\/$/, "");

mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--enable-unsafe-swiftshader", "--disable-gpu", "--mute-audio"],
});
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e.message).slice(0, 200)));

  await page.goto(TARGET + route, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1200);
  const el = await page.$(sel);
  if (!el) throw new Error(`no element matched ${sel} on ${route}`);
  await el.scrollIntoViewIfNeeded();
  // the entry timeline is ~2s; give it that plus a beat for the breathing loop
  await page.waitForTimeout(3200);
  await el.screenshot({ path: out });
  console.log(`wrote ${out}${errors.length ? `  (${errors.length} console errors: ${errors[0]})` : ""}`);
} finally {
  await browser.close();
}
