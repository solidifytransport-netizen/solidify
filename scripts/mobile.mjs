/**
 * SOLIDIFY — phone motion suite.
 *
 *   node scripts/mobile.mjs [TARGET=http://localhost:3478]   (CPU=4 throttles)
 *
 * qa.mjs and glitches.mjs run phone WIDTHS. This runs phone CONDITIONS: a
 * real device profile (touch, mobile UA, device pixel ratio), reduced motion
 * OFF, a 4× CPU throttle, and a natural scroll down the whole page in small
 * steps with a beat between them. Then it asks whether every piece of motion
 * finished where a reader would have seen it finish.
 *
 * Why this exists: three defects reached the client from real phones that
 * every other suite passed —
 *
 *   - the home Sequence never showed a photograph on a phone (its frames were
 *     selected across both the desktop and mobile renderings, so the visible
 *     ones were parked as "future" beats: clipped, hidden, never even fetched);
 *   - the coverage map's whole motion block never ran on a phone (a
 *     gsap.matchMedia conditions object with nothing that matched a touch
 *     device without reduced motion), so no landing and no response to a tap;
 *   - the movement board drew its first route on page load, 3000px below the
 *     fold, with a mis-measured length.
 *
 * The screenshot suites had reduced motion ON — which makes every reveal
 * immediate and hides exactly this class of bug. This suite never sets it.
 *
 * Asserts, per profile × route, after the scroll-through:
 *   VEILS     no Plate curtain still covering a visible frame
 *   REVEALS   no [data-reveal] outside the hero still under opacity 0.95
 *   IMAGES    every visible image decoded (complete, naturalWidth > 0)
 *   MAP       every focus tile at full opacity and the frame marked landed;
 *             a tap on a chip lights its tile and keeps it lit
 *   BOARD     the active route fully drawn, the marker visible
 *   SEQUENCE  (home) the last beat's frame active and its image decoded
 *   HERO      (home) no WebGL canvas on a phone; the hero image decoded
 *   CONSOLE   no errors, no GSAP warnings, no failed same-origin requests
 *
 * Exit 1 on any failure.
 */
import { chromium, devices } from "playwright-core";

const TARGET = (process.argv[2] || process.env.TARGET || "http://localhost:3478").replace(/\/$/, "");
const ROUTES = ["/", "/car-shipping", "/oem-dealerships", "/become-a-driver", "/owner-operators", "/about", "/contact", "/terms", "/privacy"];
const PROFILES = [
  { name: "Pixel 5", ...devices["Pixel 5"] },
  { name: "iPhone 390", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices["iPhone 13"].userAgent },
  { name: "small 360", viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices["Pixel 5"].userAgent },
  { name: "tablet 820", viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices["iPad (gen 7)"].userAgent },
];
const CPU = Number(process.env.CPU || 4);

let pass = 0;
const fails = [];
const check = (label, ok, detail = "") => {
  if (ok) pass++;
  else fails.push(`${label}${detail ? `  — ${detail}` : ""}`);
};

const audit = () => {
  const out = { veils: [], reveals: [], imgs: [], map: null, board: null, seq: null, hero: null };
  const sec = (el) => el.closest("[data-section]")?.dataset.section || el.closest("section")?.id || "?";
  const shown = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== "none" && r.width > 0 && r.height > 0; };

  for (const v of document.querySelectorAll("[data-plate-veil]")) {
    const frame = v.closest(".frame");
    if (!frame || !shown(frame)) continue;
    const m = new DOMMatrixReadOnly(getComputedStyle(v).transform);
    const h = v.getBoundingClientRect().height;
    if (Math.abs(m.m42) < h * 0.9 && getComputedStyle(v).opacity !== "0") out.veils.push(`${sec(v)}/${frame.dataset.slot}`);
  }
  for (const el of document.querySelectorAll("[data-reveal]")) {
    if (!shown(el) || el.closest("[data-hero]")) continue;
    const o = parseFloat(getComputedStyle(el).opacity);
    if (o < 0.95) out.reveals.push(`${sec(el)}: "${(el.textContent || "").trim().slice(0, 32)}" @${o.toFixed(2)}`);
  }
  for (const img of document.querySelectorAll("main img")) {
    if (!shown(img)) continue;
    if (!img.complete || img.naturalWidth === 0) out.imgs.push(`${sec(img)}: ${(img.currentSrc || img.src || "").split("/").pop() || "(no source)"}`);
  }
  const mapFrame = document.querySelector(".map-frame");
  if (mapFrame) {
    const tiles = [...mapFrame.querySelectorAll("[data-tile]")];
    const dim = tiles.filter((t) => parseFloat(getComputedStyle(t).opacity) < 0.95).length;
    out.map = { tiles: tiles.length, dim, landed: mapFrame.dataset.landed === "true" };
  }
  const active = document.querySelector("[role='tab'][aria-selected='true']");
  const routeSvg = document.querySelector("[data-route]")?.closest("svg");
  if (routeSvg) {
    const paths = [...routeSvg.querySelectorAll("[data-route]")];
    const lit = paths.find((p) => parseFloat(getComputedStyle(p).opacity) > 0.9);
    const cs = lit ? getComputedStyle(lit) : null;
    const dash = cs ? cs.strokeDasharray : "";
    const parts = dash === "none" ? [] : dash.split(",").map((s) => parseFloat(s));
    const drawn = !!cs && (dash === "none" || (parts.length >= 2 && parts[1] <= 1 && parts[0] > 50)) && parseFloat(cs.strokeDashoffset) < 0.01;
    const marker = routeSvg.querySelector("[data-marker]");
    out.board = { activeTab: active?.textContent?.trim().slice(0, 30), drawn, dash, markerShown: marker ? getComputedStyle(marker).visibility === "visible" && parseFloat(getComputedStyle(marker).opacity) > 0.9 : null };
  }
  const stageM = document.querySelector("[data-stage-m]");
  if (stageM && shown(stageM)) {
    const frames = [...stageM.querySelectorAll("[data-beat-frame]")];
    const last = frames[frames.length - 1];
    const img = last?.querySelector("img");
    out.seq = { frames: frames.length, lastActive: last?.dataset.active === "true", lastClip: last?.style.clipPath, lastImg: !!img && img.complete && img.naturalWidth > 0 };
  }
  const hero = document.querySelector("[data-hero]");
  if (hero) {
    const img = hero.querySelector("img");
    out.hero = { canvases: hero.querySelectorAll("canvas").length, imgDecoded: !!img && img.complete && img.naturalWidth > 0 };
  }
  return out;
};

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader", "--disable-gpu", "--mute-audio"] });
try {
  for (const prof of PROFILES) {
    const { name, ...opts } = prof;
    const ctx = await browser.newContext({ ...opts, colorScheme: "dark", reducedMotion: "no-preference" });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
    const errors = [];
    const failed = [];
    page.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error") errors.push(t.slice(0, 140));
      else if (m.type() === "warning" && /gsap|ScrollTrigger|DrawSVG|SplitText|MotionPath/i.test(t)) errors.push("gsap: " + t.slice(0, 140));
    });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 140)));
    /* a route prefetch abandoned by the next navigation is not a failure */
    page.on("requestfailed", (r) => { if (r.url().startsWith(TARGET) && !/_rsc=/.test(r.url())) failed.push(r.url().slice(0, 100)); });
    page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(TARGET) && !/_rsc=/.test(r.url())) failed.push(`${r.status()} ${r.url().slice(0, 100)}`); });

    for (const route of ROUTES) {
      await page.goto(TARGET + route, { waitUntil: "load", timeout: 120000 });
      await page.waitForTimeout(1200);
      const vh = opts.viewport.height;
      let total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(vh * 0.45)) {
        await page.evaluate((yy) => window.scrollTo({ top: yy }), y);
        await page.waitForTimeout(260);
        total = await page.evaluate(() => document.documentElement.scrollHeight);
      }
      await page.waitForTimeout(2200);

      const r = await page.evaluate(audit);
      const at = `[${name} ${route}]`;
      check(`${at} no curtain left over an image`, r.veils.length === 0, r.veils.slice(0, 4).join(" | "));
      check(`${at} every reveal finished`, r.reveals.length === 0, r.reveals.slice(0, 4).join(" | "));
      check(`${at} every visible image decoded`, r.imgs.length === 0, r.imgs.slice(0, 4).join(" | "));
      if (r.map) {
        check(`${at} coverage map landed`, r.map.landed && r.map.dim === 0, `landed=${r.map.landed} dim tiles=${r.map.dim}/${r.map.tiles}`);
        /* a tap holds a state */
        const chip = page.locator(".map-frame").locator("xpath=..").locator("li span", { hasText: "Texas" }).first();
        if (await chip.count()) {
          await chip.scrollIntoViewIfNeeded();
          await chip.tap();
          await page.waitForTimeout(700);
          const on = await page.evaluate(() => [...document.querySelectorAll("[data-tile][data-on='true']")].map((t) => t.dataset.abbr));
          check(`${at} a tap on a state chip lights and holds the tile`, on.includes("TX"), JSON.stringify(on));
        }
      }
      if (r.board) check(`${at} movement board route drawn to full length`, r.board.drawn && r.board.markerShown !== false, `${r.board.activeTab}: dash "${r.board.dash}" marker=${r.board.markerShown}`);
      if (r.seq) check(`${at} sequence advanced to the last beat with its image`, r.seq.lastActive && r.seq.lastImg, JSON.stringify(r.seq));
      if (r.hero && route === "/") {
        check(`${at} hero image decoded`, r.hero.imgDecoded);
        check(`${at} no WebGL canvas on a touch device`, r.hero.canvases === 0, String(r.hero.canvases));
      }
      check(`${at} console clean`, errors.length === 0, [...new Set(errors)].slice(0, 3).join(" | "));
      check(`${at} no failed same-origin requests`, failed.length === 0, [...new Set(failed)].slice(0, 3).join(" | "));
      errors.length = 0;
      failed.length = 0;
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

for (const f of fails) console.log(`  FAIL  ${f}`);
console.log(`\n  ${pass} passed, ${fails.length} failed  (${TARGET}, CPU ×${CPU})`);
process.exit(fails.length ? 1 : 0);
