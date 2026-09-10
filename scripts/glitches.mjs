/**
 * SOLIDIFY — layout glitch sweep.
 *
 *   node scripts/glitches.mjs [TARGET=http://localhost:3478]
 *
 * qa.mjs checks what the page SAYS. This checks how it SITS, and it is scoped
 * deliberately tightly to the defects that actually reached the client by eye:
 *
 *   TRACK HEIGHTS  cards in a horizontal track that do not share a height.
 *                  The owner-operator "Why run with Solidify" track ran a
 *                  169px spread on every laptop viewport because one card
 *                  carried an insurance grid the others did not, and the track
 *                  was `items-center`, so it also sat 60-85px higher.
 *   CARD GRIDS     the same thing in a multi-column grid of <article> cards.
 *   RAIL WIDTH     a scroll-progress rail whose width is set by a sibling.
 *                  Both pinned rails were `flex-1` next to a nowrap label whose
 *                  text changed with the active step, so the line and its nodes
 *                  shifted sideways as you scrolled and never sat centred.
 *   PAGE WIDTH     anything forcing a horizontal scrollbar.
 *
 * An earlier version compared every flex/grid row on the page and drowned the
 * real findings in ~70 false positives: a two-column editorial split with a
 * text column and a media column is SUPPOSED to have unequal heights, and
 * `.frame` clips an intentionally overscanned image. Only tracks and card
 * grids are compared now, because only there is equal height the intent.
 *
 * Headless Edge, one browser, closed in `finally`. Exit 1 on any failure.
 */
import { chromium } from "playwright-core";

const TARGET = (process.argv[2] || process.env.TARGET || "http://localhost:3478").replace(/\/$/, "");
const ROUTES = ["/", "/car-shipping", "/oem-dealerships", "/become-a-driver", "/owner-operators", "/about", "/contact", "/terms", "/privacy"];
const VIEWPORTS = [
  [1920, 1080],
  [1680, 1050],
  [1536, 864],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [390, 844],
];

/** Every horizontal card track in the codebase. Add new ones here. */
const TRACKS = "[data-frame], [data-sit], [data-stage-card], [data-lane]";

let pass = 0;
const fails = [];
const check = (label, ok, detail = "") => {
  if (ok) pass++;
  else fails.push(`${label}${detail ? `  — ${detail}` : ""}`);
};

const audit = (trackSel) => {
  const out = { tracks: [], grids: [], rails: [], page: null };
  out.page = { scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth };

  const groupOf = (el) => el.closest("[data-section]")?.dataset.section || el.parentElement?.id || "?";

  /* ---- horizontal card tracks ------------------------------------------ */
  const byParent = new Map();
  for (const card of document.querySelectorAll(trackSel)) {
    const p = card.parentElement;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(card);
  }
  for (const [parent, cards] of byParent) {
    if (cards.length < 2) continue;
    const hs = cards.map((c) => Math.round(c.getBoundingClientRect().height));
    const spread = Math.max(...hs) - Math.min(...hs);
    if (spread > 2) out.tracks.push({ where: groupOf(cards[0]), heights: hs, spread, align: getComputedStyle(parent).alignItems });
  }

  /* ---- multi-column grids of cards ------------------------------------- */
  for (const grid of document.querySelectorAll("main div, main ul, main ol")) {
    const cs = getComputedStyle(grid);
    if (cs.display !== "grid") continue;
    if (cs.gridTemplateColumns.split(" ").filter(Boolean).length < 2) continue;
    const kids = [...grid.children].filter((k) => k.tagName === "ARTICLE" || (k.tagName === "LI" && k.querySelector("h2, h3, h4")));
    if (kids.length < 2 || kids.length !== grid.children.length) continue;
    const rows = new Map();
    for (const k of kids) {
      const r = k.getBoundingClientRect();
      const key = Math.round(r.top / 8);
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(Math.round(r.height));
    }
    for (const hs of rows.values()) {
      if (hs.length < 2) continue;
      const spread = Math.max(...hs) - Math.min(...hs);
      if (spread > 2) out.grids.push({ where: groupOf(kids[0]), heights: hs, spread });
    }
  }

  /* ---- progress rails --------------------------------------------------- */
  for (const rail of document.querySelectorAll("main div")) {
    const r = rail.getBoundingClientRect();
    if (r.height > 3 || r.width < 120) continue;
    const nodes = [...rail.children].filter((c) => getComputedStyle(c).position === "absolute");
    if (nodes.length < 3) continue;
    const parent = rail.parentElement;
    const ps = getComputedStyle(parent);
    const inRow = ps.display === "flex" && ps.flexDirection === "row" && parent.children.length > 1;
    const shortfall = Math.round(parent.getBoundingClientRect().width - r.width);
    if (inRow || shortfall > 4) {
      out.rails.push({ where: groupOf(rail), railW: Math.round(r.width), parentW: Math.round(parent.getBoundingClientRect().width), shortfall, inRow });
    }
  }
  return out;
};

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader", "--disable-gpu", "--mute-audio"] });
try {
  for (const [w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: "dark", isMobile: w < 500 });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      await page.goto(TARGET + route, { waitUntil: "load", timeout: 120000 });
      await page.waitForTimeout(800);
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(h * 0.8)) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page.waitForTimeout(140);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(600);

      const r = await page.evaluate(audit, TRACKS);
      const at = `[${w} ${route}]`;
      check(`${at} no horizontal scrollbar`, r.page.scroll <= r.page.client + 1, `${r.page.scroll} > ${r.page.client}`);
      check(`${at} track cards share a height`, r.tracks.length === 0, r.tracks.map((x) => `${x.where}: [${x.heights}] spread ${x.spread} (${x.align})`).join(" | "));
      check(`${at} card grids share a row height`, r.grids.length === 0, r.grids.map((x) => `${x.where}: [${x.heights}] spread ${x.spread}`).join(" | "));
      check(`${at} rails are not sized by a sibling`, r.rails.length === 0, r.rails.map((x) => `${x.where}: rail ${x.railW} of ${x.parentW} (${x.shortfall} short${x.inRow ? ", in a flex row" : ""})`).join(" | "));
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

for (const f of fails) console.log(`  FAIL  ${f}`);
console.log(`\n  ${pass} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
