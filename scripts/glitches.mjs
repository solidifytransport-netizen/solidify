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
 *                  shifted sideways as you scrolled and never sat centered.
 *   RAIL BREAKS    a rail with a chunk of the section's own background
 *                  painted over it. One was deliberate — it marked where the
 *                  owner-operator route leaves Solidify's systems — but it
 *                  read as a broken line and was reported as a defect twice.
 *   BAR FIT        two items in the nav bar with no gap between them. Five
 *                  nav labels, the quote button and the lockup do not fit a
 *                  932px bar, so at 1024 "About" sat on the quote button and
 *                  the wordmark ran into "Car Shipping".
 *   LOCKUP BOX     a brand lockup whose box is a different shape from the
 *                  artwork, so the SVG letterboxes and draws smaller than the
 *                  space reserved for it. This is how a 40px header mark came
 *                  to render 18px of logo.
 *   PAGE WIDTH     anything forcing a horizontal scrollbar.
 *   CLIPPED TEXT   a text-bearing element whose box runs past the right edge
 *                  of the viewport, or whose own text is wider than its
 *                  overflow-hidden box with no ellipsis to say so. The page
 *                  can pass the scrollbar check and still be cutting words
 *                  off, because sections clip their own overflow.
 *   TOO WIDE       any element wider than the viewport itself.
 *   TAP TARGETS    on phones, a link, button or field smaller than 24px on
 *                  either side (WCAG 2.5.8). 44px is the comfortable size and
 *                  is reported as a count, not a failure.
 *   TINY TEXT      on phones, visible text computed below 12px.
 *
 * Nineteen viewports, 320 to 2560 wide, because "responsive" means every
 * width in between the ones a designer checked, not the four in a spec.
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
  [2560, 1440],
  [1920, 1080],
  [1680, 1050],
  [1536, 864],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1180, 820],
  [1024, 768],
  [912, 1368],
  [820, 1180],
  [768, 1024],
  [600, 960],
  [540, 720],
  [430, 932],
  [414, 896],
  [390, 844],
  [375, 667],
  [360, 740],
  [320, 568],
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
  const out = { tracks: [], grids: [], rails: [], breaks: [], bar: [], lockups: [], clipped: [], wide: [], taps: [], tiny: [], comfy: 0, page: null };
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
    /* A child filled with the section's own background is a hole punched in
       the line. Nodes are small and round; a mask is a wide opaque block. */
    const ground = getComputedStyle(rail.closest("[data-surface]") || document.body).backgroundColor;
    for (const c of nodes) {
      const ccs = getComputedStyle(c);
      const cw = c.getBoundingClientRect().width;
      if (ccs.backgroundColor === ground && cw > 12) {
        out.breaks.push({ where: groupOf(rail), width: Math.round(cw), fill: ccs.backgroundColor });
      }
    }
  }
  /* ---- the nav bar fits ------------------------------------------------- */
  const bar = document.querySelector("[data-nav-bar]");
  if (bar) {
    const boxes = [...bar.children]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter((b) => b.r.width > 0 && getComputedStyle(b.el).display !== "none")
      .sort((a, b) => a.r.left - b.r.left);
    for (let i = 1; i < boxes.length; i++) {
      const gap = Math.round(boxes[i].r.left - boxes[i - 1].r.right);
      if (gap < 16) out.bar.push({ gap, after: boxes[i - 1].el.tagName.toLowerCase(), before: boxes[i].el.tagName.toLowerCase() });
    }
  }

  /* ---- brand lockups draw at the size they reserve ----------------------- */
  for (const img of document.querySelectorAll('img[src^="/brand/"]')) {
    if (!img.naturalWidth || !img.naturalHeight) continue;
    const r = img.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const intrinsic = img.naturalWidth / img.naturalHeight;
    const drawn = r.width / r.height;
    const off = Math.abs(drawn / intrinsic - 1);
    if (off > 0.03) out.lockups.push({ src: img.getAttribute("src"), box: [Math.round(r.width), Math.round(r.height)], off: `${Math.round(off * 100)}%` });
  }

  /* ---- clipped text, over-wide boxes, tap targets, tiny text ------------ */
  const vw = document.documentElement.clientWidth;
  const phone = vw < 500;
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 1);
  const label = (el) => (el.textContent || el.getAttribute("aria-label") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 40);
  /* a card in a pinned horizontal track sits off-screen until the pin scrolls
     it in; that is the choreography, and the track has its own checks above */
  const inTrack = (el) => el.closest(trackSel) !== null;
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll") return true;
    }
    return false;
  };
  const decorative = (el) => el.closest("[aria-hidden='true'], svg, canvas, [data-slat], picture, .frame") !== null;
  /* visually-hidden text is clipped on purpose: that is the technique */
  const srOnly = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const c = getComputedStyle(p);
      if (p.classList.contains("sr-only") || (c.position === "absolute" && parseFloat(c.width) <= 1 && parseFloat(c.height) <= 1) || c.clip === "rect(0px, 0px, 0px, 0px)") return true;
    }
    return false;
  };
  const isScroller = (el) => /auto|scroll/.test(getComputedStyle(el).overflowX);
  /* WCAG 2.5.8: a link inside a sentence is constrained by the line height of the text around it */
  const inSentence = (el) => getComputedStyle(el).display === "inline" && [...el.parentElement.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 1);
  /* a radio or checkbox is tapped through its label */
  const target = (el) => (/^(radio|checkbox)$/.test(el.type) && (el.labels?.[0] || el.closest("label"))) || el;

  for (const el of document.querySelectorAll("main *, header *, footer *")) {
    if (!visible(el) || decorative(el) || srOnly(el)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);

    if (hasOwnText(el)) {
      /* clipped by an ancestor that hides overflow: the plate, not the viewport */
      if (!inScroller(el) && !inTrack(el)) {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const pc = getComputedStyle(p);
          if (/hidden|clip/.test(pc.overflowX)) {
            const pr = p.getBoundingClientRect();
            const over = Math.round(r.right - pr.right);
            if (over > 1) out.clipped.push({ where: groupOf(el), text: label(el), by: over, kind: `clipped by <${p.tagName.toLowerCase()} class="${(p.className || "").toString().slice(0, 30)}">` });
            break;
          }
        }
      }
      if (r.right > vw + 1 && !inScroller(el) && !inTrack(el)) out.clipped.push({ where: groupOf(el), text: label(el), by: Math.round(r.right - vw), kind: "past the viewport edge" });
      if (cs.overflowX === "hidden" && cs.textOverflow !== "ellipsis" && el.scrollWidth > el.clientWidth + 2 && cs.whiteSpace === "nowrap")
        out.clipped.push({ where: groupOf(el), text: label(el), by: el.scrollWidth - el.clientWidth, kind: "wider than its box" });
      if (phone && parseFloat(cs.fontSize) < 12 && !el.closest(".sr-only")) out.tiny.push({ where: groupOf(el), text: label(el), size: cs.fontSize });
    }
    if (r.width > vw + 2 && !inScroller(el) && !isScroller(el) && cs.position !== "fixed") out.wide.push({ where: groupOf(el), tag: el.tagName.toLowerCase(), cls: (el.className?.baseVal ?? el.className ?? "").toString().slice(0, 40), width: Math.round(r.width) });
  }
  if (phone) {
    for (const el of document.querySelectorAll("main a, main button, main input, main select, main textarea, main [role='button'], header a, header button, footer a, footer button")) {
      if (!visible(el) || srOnly(el) || inSentence(el)) continue;
      const r = target(el).getBoundingClientRect();
      if (r.width < 24 || r.height < 24) out.taps.push({ where: groupOf(el), text: label(el), size: `${Math.round(r.width)}x${Math.round(r.height)}` });
      else if (r.width >= 44 && r.height >= 44) out.comfy++;
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
      check(`${at} rails are continuous`, r.breaks.length === 0, r.breaks.map((x) => `${x.where}: ${x.width}px of ${x.fill} painted over the line`).join(" | "));
      check(`${at} nav bar items keep a gap`, r.bar.length === 0, r.bar.map((x) => `${x.after} → ${x.before}: ${x.gap}px`).join(" | "));
      check(`${at} brand lockups fill their box`, r.lockups.length === 0, r.lockups.map((x) => `${x.src} drawn in ${x.box[0]}x${x.box[1]}, ${x.off} off its aspect`).join(" | "));
      check(`${at} no text is clipped`, r.clipped.length === 0, r.clipped.slice(0, 4).map((x) => `${x.where}: "${x.text}" ${x.kind} by ${x.by}px`).join(" | ") + (r.clipped.length > 4 ? ` (+${r.clipped.length - 4})` : ""));
      check(`${at} nothing is wider than the viewport`, r.wide.length === 0, r.wide.slice(0, 4).map((x) => `${x.where}: <${x.tag} class="${x.cls}"> ${x.width}px`).join(" | ") + (r.wide.length > 4 ? ` (+${r.wide.length - 4})` : ""));
      if (w < 500) {
        check(`${at} tap targets are at least 24px`, r.taps.length === 0, r.taps.slice(0, 4).map((x) => `${x.where}: "${x.text}" ${x.size}`).join(" | ") + (r.taps.length > 4 ? ` (+${r.taps.length - 4})` : ""));
        check(`${at} no text below 12px`, r.tiny.length === 0, r.tiny.slice(0, 4).map((x) => `${x.where}: "${x.text}" ${x.size}`).join(" | ") + (r.tiny.length > 4 ? ` (+${r.tiny.length - 4})` : ""));
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

for (const f of fails) console.log(`  FAIL  ${f}`);
console.log(`\n  ${pass} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
