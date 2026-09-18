/**
 * SOLIDIFY — headless QA harness.
 *
 * HEADLESS ONLY. Never opens a visible browser window. Launches exactly one
 * headless Edge through playwright-core, uses one context and one page for
 * every viewport and route, and closes everything on the way out — including
 * on failure. Any orphaned automation Edge from an interrupted run is swept
 * before this one starts.
 *
 *   node scripts/qa.mjs [TARGET=http://localhost:3477] [ONLY_VIEWPORT]
 *
 * Screenshots land in qa/<viewport>/<page>/NN-<section>.png (gitignored).
 * Assertions are printed and summarized; exit 1 on any failure, 2 on a
 * harness error. Visual review of the screenshots is a SEPARATE step —
 * DOM assertions cannot see a bad crop.
 */
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const TARGET = (process.argv[2] || "http://localhost:3477").replace(/\/$/, "");
const ONLY = process.argv[3] || "";
const OUT = "qa";
const APPLY_URL = "https://account.neweratitans.com/apply/MTY0MTk=";
const PHONE = "(510) 499-4552";

const PAGES = [
  { path: "/", name: "home" },
  { path: "/car-shipping", name: "car-shipping" },
  { path: "/oem-dealerships", name: "oem-dealerships" },
  { path: "/become-a-driver", name: "become-a-driver" },
  { path: "/owner-operators", name: "owner-operators" },
  { path: "/about", name: "about" },
  { path: "/contact", name: "contact" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" },
];

const VIEWPORTS = [
  { name: "1920", w: 1920, h: 1080 },
  { name: "1536", w: 1536, h: 864 },
  { name: "1440", w: 1440, h: 900 },
  { name: "390", w: 390, h: 844, mobile: true },
].filter((v) => !ONLY || v.name === ONLY);

/* Phrases that would make Solidify read as a broker or as general freight. */
const BANNED_PHRASES = [
  "freight broker", "brokerage", "load board", "load-matching", "marketplace", "3pl", "third-party logistics",
  "we connect you", "find loads", "network of carriers", "match you with", "we arrange transport", "sourcing trucks",
  "finding capacity", "matching carriers", "dry van", "reefer", "refrigerated", "step deck", "general freight",
  "enclosed transport", "open transport", "guaranteed", "we guarantee", "real-time tracking", "live tracking",
  "track your vehicle", "expedited", "fully insured", "insured up to", "on-time", "years in business",
  "testimonial", "no forced dispatch", "under our own authority", "own operating authority",
  // weak / internal / unsupported copy retired in the overhaul
  "numbers we made up", "real company", "person answers", "hand-off", "handoff", "third-party carrier", "inoperable", "operable",
  "inspected", "condition documented", "authority to", "renegotiate", "tenth move", "guarantee", "tracking your",
  "deepest coverage", "strongest coverage", "strongest in the west", "western density", "home base",
  // V2 — claims the email-only architecture made false
  "stored encrypted",
  "never emailed",
  "encrypted at rest",
  "secure storage",
  // V2 — public photography credits are gone site-wide
  "photography credits",
  "photo credits",
  "image credits",
  "photography by",
  "photo by",
  "image source",
  "stock photography",
  "unsplash",
  "pexels",
  "wikimedia",
  "creative commons",
  // V2 — geography stays exactly "strong Western-US focus"
  "western-us + texas",
  "western us and texas",
  "western-us and texas",
];
const BANNED_WORDS = ["tractor"];

let passed = 0;
let failed = 0;
const results = [];
const notes = [];
function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    results.push(`  PASS  ${name}`);
  } else {
    failed++;
    results.push(`  FAIL  ${name}${detail ? "\n          " + String(detail).slice(0, 600) : ""}`);
  }
  return cond;
}
const note = (name, detail = "") => results.push(`  ..    ${name}${detail ? "  " + detail : ""}`);

function sweepStale() {
  if (process.platform !== "win32") return;
  try {
    const ps = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*--headless*' -and $_.CommandLine -like '*playwright*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "ignore" });
  } catch {}
}

async function settle(page) {
  await page.evaluate(async () => {
    const H = document.documentElement.scrollHeight;
    for (let y = 0; y < H; y += Math.max(240, innerHeight * 0.5)) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 45));
    }
    window.scrollTo(0, H);
    await new Promise((r) => setTimeout(r, 300));
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
}

async function shot(page, file) {
  try {
    mkdirSync(join(...file.split("/").slice(0, -1)), { recursive: true });
    await page.screenshot({ path: file });
  } catch (e) {
    notes.push(`screenshot ${file}: ${String(e.message).slice(0, 80)}`);
  }
}

function contrast(fg, bg) {
  const lum = ([r, g, b]) => {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const a = lum(fg) + 0.05;
  const b = lum(bg) + 0.05;
  return a > b ? a / b : b / a;
}

/* ── gather everything the assertions need in one evaluate ─────────────── */
const GATHER = () => {
  const de = document.documentElement;
  const imgs = [...document.querySelectorAll("img")];
  const plates = [...document.querySelectorAll("[data-slot]")].map((p) => ({
    slot: p.getAttribute("data-slot"),
    photo: p.getAttribute("data-photo"),
  }));
  const chosen = imgs
    .filter((i) => i.hasAttribute("data-plate") && i.currentSrc)
    .map((i) => {
      const u = i.currentSrc;
      const m = /\/media\/gen\/([a-z0-9-]+?)-(\d+)\.(avif|webp|jpg)/i.exec(u);
      return m ? { name: m[1], w: Number(m[2]), type: m[3], rendered: Math.round(i.getBoundingClientRect().width) } : null;
    })
    .filter(Boolean);
  const objectPositions = [...new Set(imgs.filter((i) => i.hasAttribute("data-plate")).map((i) => getComputedStyle(i).objectPosition))];
  const buttons = [...document.querySelectorAll(".btn")]
    .filter((b) => !b.hasAttribute("data-nav-cta"))
    .map((b) => ({ label: (b.textContent || "").trim().slice(0, 40), h: Math.round(b.getBoundingClientRect().height), visible: b.getClientRects().length > 0 }));
  const applyCtas = [...document.querySelectorAll(`a[href^="https://account.neweratitans.com"]`)].map((a) => ({
    href: a.getAttribute("href"),
    target: a.getAttribute("target"),
    rel: a.getAttribute("rel") || "",
  }));
  const sections = [...document.querySelectorAll("main [data-section]")].map((s) => ({
    id: s.getAttribute("data-section") || s.id || "?",
    top: Math.round(s.getBoundingClientRect().top + window.scrollY),
    h: Math.round(s.getBoundingClientRect().height),
  }));
  const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.getAttribute("content") || document.querySelector(`meta[property="${n}"]`)?.getAttribute("content") || "";
  const alts = imgs.map((i) => i.getAttribute("alt") ?? null);

  // Approximate contrast: text color vs nearest opaque ancestor background.
  const textSel = "p, li, span.label, .eyebrow, h1, h2, h3, h4, dt, dd, a, button, label, summary";
  const bad = [];
  const seen = new Set();
  const parse = (c) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
  };
  for (const el of document.querySelectorAll(textSel)) {
    const txt = (el.textContent || "").trim();
    if (!txt || txt.length < 3) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.9) continue;
    if (el.closest(".frame, [data-hero], .sr-only, canvas, svg")) continue;
    const fg = parse(cs.color);
    if (!fg || fg[3] < 0.9) continue;
    let a = el;
    let bg = null;
    while (a) {
      const b = parse(getComputedStyle(a).backgroundColor);
      if (b && b[3] >= 0.95) {
        bg = b;
        break;
      }
      if (a.classList?.contains("frame")) break;
      a = a.parentElement;
    }
    if (!bg) continue;
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const lum = ([r, g, b]) => {
      const f = (c) => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const l1 = lum(fg) + 0.05;
    const l2 = lum(bg) + 0.05;
    const ratio = l1 > l2 ? l1 / l2 : l2 / l1;
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      const key = `${el.tagName}.${el.className}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bad.push(`${key.slice(0, 50)} ${ratio.toFixed(2)}:1 "${txt.slice(0, 30)}"`);
    }
  }

  return {
    docW: de.scrollWidth,
    winW: de.clientWidth,
    docH: de.scrollHeight,
    h1s: [...document.querySelectorAll("h1")].map((h) => (h.textContent || "").trim()),
    title: document.title,
    description: meta("description"),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
    ogImage: meta("og:image"),
    broken: imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("loading") !== "lazy").map((i) => i.currentSrc || i.src).slice(0, 5),
    imgCount: imgs.length,
    plates,
    chosen,
    objectPositions,
    buttons,
    applyCtas,
    sections,
    alts,
    text: (document.body.innerText || "").toLowerCase(),
    html: document.documentElement.outerHTML.toLowerCase(),
    externalScripts: [...document.querySelectorAll("script[src]")].map((s) => s.src).filter((s) => !s.startsWith(location.origin)),
    iframes: [...document.querySelectorAll("iframe")].map((f) => f.src),
    localStorageKeys: (() => { try { return Object.keys(localStorage); } catch { return []; } })(),
    sessionStorageKeys: (() => { try { return Object.keys(sessionStorage); } catch { return []; } })(),
    triggers: window.__ST ? window.__ST.getAll().length : -1,
    reducedClass: de.classList.contains("reduced-motion"),
    canvas: document.querySelectorAll("[data-hero] canvas").length,
    contrastFailures: bad.slice(0, 12),
    linksToApi: [...document.querySelectorAll('a[href*="/api/"]')].length,
    reserved: document.querySelectorAll(".frame-reserved, [data-reserved-for]").length,
    blueprints: document.querySelectorAll("[data-blueprint]").length,
    canvases: document.querySelectorAll("canvas").length,
    creditLinks: [...document.querySelectorAll("a[href]")].filter((a) => /\/credits|#credits/i.test(a.getAttribute("href") || "")).length,
    applyLinks: document.querySelectorAll('a[href^="https://account.neweratitans.com"]').length,
    driverLinks: document.querySelectorAll('a[href^="/become-a-driver"]').length,
    laneTabs: document.querySelectorAll('[role="tab"]').length,
    // An element whose ENTIRE trimmed text is one of these is illustration
    // chrome. The words themselves stay legal: "Truck / Power Unit" is the
    // client's own terminology and must never be caught by this.
    callouts: [...document.querySelectorAll("main *")]
      .filter((el) => el.children.length === 0)
      .map((el) => (el.textContent || "").trim().toLowerCase())
      .filter((t) => ["power unit", "upper deck", "ramp · load · secure", "loaded · secured · carried"].includes(t)),
    heavy: [...document.querySelectorAll("main h1, main h2, main h3, main .display-xl, main .display-lg, main .display-md")]
      .map((el) => ({ el, cs: getComputedStyle(el) }))
      .filter(({ cs }) => Number(cs.fontWeight) > 560 || parseFloat(cs.fontSize) > 88)
      .map(({ el, cs }) => el.tagName + " " + cs.fontWeight + "/" + cs.fontSize),
    stretched: [...document.querySelectorAll("main *")].filter((el) => {
      const v = getComputedStyle(el).fontStretch;
      return v && v !== "100%" && v !== "normal";
    }).length,
    heads: [...document.querySelectorAll("main [data-section][data-head]")].map((s) => s.getAttribute("data-head")),
    blueButtons: [...document.querySelectorAll(".btn")]
      .filter((b) => {
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(b).backgroundColor);
        if (!m) return false;
        const [r, g, bl] = [+m[1], +m[2], +m[3]];
        return bl > 150 && bl - r > 80 && bl - g > 40;
      })
      .map((b) => (b.textContent || "").trim().slice(0, 30)),
    brokerCount: ((document.body.innerText || "").toLowerCase().match(/not a broker/g) || []).length,
    focusable: document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])').length,
  };
};

/* ─────────────────────────────────────────────────────────────────── main ── */
if (existsSync(OUT) && !ONLY) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
sweepStale();

let browser;
let exitCode = 0;
try {
  browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--enable-unsafe-swiftshader", "--disable-gpu", "--mute-audio", "--disable-background-networking"],
  });
  const consoleErrors = [];
  const netErrors = [];
  const attach = (p) => {
    p.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      // The unconfigured backend answers 503 by design; the browser logs that honest refusal as a resource error.
      if (/status of 503/.test(t)) return;

      consoleErrors.push(t.slice(0, 220));
    });
    p.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e.message).slice(0, 220)));
    p.on("requestfailed", (r) => {
      const u = r.url();
      if (u.startsWith(APPLY_URL)) return;
      // Route prefetches abandoned by a navigation are not failures.
      if (r.failure()?.errorText === "net::ERR_ABORTED" && /[?&]_rsc=/.test(u)) return;
      netErrors.push(`${r.failure()?.errorText} ${u.slice(0, 140)}`);
    });
    p.on("response", (r) => {
      try {
        // 503 on /api/* is the backend's honest "not configured" refusal, asserted separately by the form and gate checks.
        if (r.status() === 503 && r.url().includes("/api/")) return;

        if (r.status() >= 400 && new URL(r.url()).origin === new URL(TARGET).origin) netErrors.push(`HTTP ${r.status()} ${r.url().slice(0, 140)}`);
      } catch {}
    });
  };
  let ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1, colorScheme: "dark" });
  let page = await ctx.newPage();
  attach(page);

  const health = await fetch(`${TARGET}/api/health`).then((r) => r.json()).catch(() => null);
  note("backend health", JSON.stringify(health));
  const inquiryConfigured = !!health?.inquiry?.configured;

  const siteWidePhotoUse = {};
  let brokerTotal = 0;
  const seenTitles = new Map();
  const seenDescs = new Map();

  for (const vp of VIEWPORTS) {
    if (vp.mobile) {
      // A phone does not carry a desktop cache: a fresh context keeps srcset selection honest.
      await ctx.close();
      ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: vp.mobile ? 3 : 1, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: "dark" });
      page = await ctx.newPage();
      attach(page);
    }
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const pg of PAGES) {
      const label = `[${vp.name} ${pg.name}]`;
      const before = consoleErrors.length;
      const resp = await page.goto(`${TARGET}${pg.path}`, { waitUntil: "load", timeout: 120000 });
      check(`${label} route responds 200`, resp && resp.status() === 200, `status ${resp?.status()}`);
      await page.waitForTimeout(1200);
      await settle(page);
      const f = await page.evaluate(GATHER);

      check(`${label} no horizontal overflow`, f.docW <= f.winW + 1, `${f.docW} > ${f.winW}`);
      check(`${label} no broken images`, f.broken.length === 0, f.broken.join(", "));
      const lo = vp.mobile ? 44 : 46;
      const hi = vp.mobile ? 52 : 56;
      const visibleBtns = f.buttons.filter((b) => b.visible && b.h > 0);
      const oversized = visibleBtns.filter((b) => b.h > hi);
      const undersized = visibleBtns.filter((b) => b.h < lo);
      check(`${label} no oversized buttons (<= ${hi}px)`, oversized.length === 0, oversized.map((b) => `"${b.label}" ${b.h}px`).join(", "));
      check(`${label} no undersized buttons (>= ${lo}px)`, undersized.length === 0, undersized.map((b) => `"${b.label}" ${b.h}px`).join(", "));
      check(`${label} exactly one h1`, f.h1s.length === 1, JSON.stringify(f.h1s));
      check(`${label} sections present`, f.sections.length >= (pg.name === "privacy" || pg.name === "terms" ? 1 : pg.name === "contact" ? 2 : 3), String(f.sections.length));
      check(`${label} no dead-center focal point`, !f.objectPositions.includes("50% 50%"), f.objectPositions.join(" | "));
      check(`${label} no third-party scripts`, f.externalScripts.length === 0, f.externalScripts.join(", "));
      check(`${label} no iframes`, f.iframes.length === 0, f.iframes.join(", "));
      check(`${label} contrast >= 4.5:1 (approx)`, f.contrastFailures.length === 0, f.contrastFailures.join(" | "));
      if (vp.mobile) {
        /* The phone context has a real device pixel ratio (3), so a full-width
           image on a 390px screen legitimately wants ~1170 device pixels and
           the browser picks the 1280 rung. The ceiling is the next rung above
           width × DPR — never the 1800 or 2400 desktop variants. */
        const ceiling = vp.w * 3 <= 900 ? 900 : 1280;
        const tooBig = f.chosen.filter((c) => c.w > ceiling);
        check(`${label} no image variant above the phone ceiling (${ceiling}px at DPR 3)`, tooBig.length === 0, tooBig.map((c) => `${c.name}@${c.w}`).join(", "));
        if (f.chosen.length) check(`${label} modern formats served`, f.chosen.some((c) => c.type !== "jpg"), `${f.chosen.filter((c) => c.type !== "jpg").length}/${f.chosen.length}`);
      }
      if (vp.name === "1536") {
        // content + SEO assertions once per page
        for (const phrase of BANNED_PHRASES) check(`[${pg.name}] copy does not say "${phrase}"`, !f.text.includes(phrase));
        for (const w of BANNED_WORDS) check(`[${pg.name}] copy does not use the word "${w}"`, !new RegExp(`\\b${w}\\b`).test(f.text) && !new RegExp(`\\b${w}\\b`).test(f.alts.join(" ").toLowerCase()));
        check(`[${pg.name}] states it is a carrier`, /\bcarrier\b/.test(f.text));
        check(`[${pg.name}] no reserved / placeholder frames`, f.reserved === 0, String(f.reserved));

        // ── V2 ────────────────────────────────────────────────────────────
        // Figure chrome is banned; operational vocabulary is not.
        check(`[${pg.name}] no figure numbering`, !/\bfig\.\s*\d|\bfig\s+\d/i.test(f.text), "figure caption found");
        check(`[${pg.name}] no technical elevation chrome`, !/auto hauler ·|· elevation|hydraulic upright/i.test(f.text), "elevation chrome found");
        check(`[${pg.name}] no illustration callouts`, f.callouts.length === 0, f.callouts.join(" | "));
        check(`[${pg.name}] no blueprint drawings`, f.blueprints === 0, String(f.blueprints));
        check(
          `[${pg.name}] uses the client's own equipment wording`,
          !["owner-operators", "become-a-driver"].includes(pg.name) || /truck \/ power unit/i.test(f.text),
          "missing",
        );
        check(`[${pg.name}] display type is not overweight`, f.heavy.length === 0, f.heavy.slice(0, 4).join(" | "));
        check(`[${pg.name}] no stretched type`, f.stretched === 0, String(f.stretched));
        check(`[${pg.name}] no photography-credit links`, f.creditLinks === 0, String(f.creditLinks));
        check(`[${pg.name}] WebGL only on the home hero`, pg.name === "home" ? f.canvases <= 1 : f.canvases === 0, String(f.canvases));
        /* The scene is for pointer devices: phones get the photograph (perfTier < 2). */
        if (pg.name === "home") check(vp.mobile ? "[home] no WebGL on a phone" : "[home] the hero scene is mounted", vp.mobile ? f.canvas === 0 : f.canvas >= 1, String(f.canvas));
        if (pg.name === "owner-operators") check("[owner-operators] carries the one external portal link", f.applyLinks === 1, String(f.applyLinks));
        else check(`[${pg.name}] does not leave the domain`, f.applyLinks === 0, String(f.applyLinks));
        if (pg.name === "contact") check("[contact] three inquiry lanes", f.laneTabs === 3, String(f.laneTabs));
        check(`[${pg.name}] no blue-filled buttons`, f.blueButtons.length === 0, f.blueButtons.join(", "));
        const dupHead = f.heads.find((h, i) => i > 0 && h && h === f.heads[i - 1] && h !== "stack");
        check(`[${pg.name}] consecutive sections use different heading patterns`, !dupHead, f.heads.join(" > "));
        brokerTotal += f.brokerCount;
        check(`[${pg.name}] confirmed phone present`, f.text.includes(PHONE));
        check(`[${pg.name}] no invented phone`, !/\(800\)\s*555/.test(f.text));
        check(`[${pg.name}] no placeholder brackets`, !/\[(xx|tbd|todo|placeholder)/i.test(f.text), "");
        check(`[${pg.name}] title present`, f.title.length > 10, f.title);
        check(`[${pg.name}] meta description present`, f.description.length > 60, f.description.slice(0, 80));
        check(`[${pg.name}] canonical present`, f.canonical.startsWith("http") && f.canonical.endsWith(pg.path === "/" ? "" : pg.path) || f.canonical.endsWith(pg.path), f.canonical);
        check(`[${pg.name}] og:image present`, f.ogImage.length > 0, f.ogImage);
        check(`[${pg.name}] all images have alt`, f.alts.every((a) => a !== null), "");
        check(`[${pg.name}] no links to /api`, f.linksToApi === 0, "");
        if (seenTitles.has(f.title)) check(`[${pg.name}] title unique`, false, `duplicate of ${seenTitles.get(f.title)}`);
        else seenTitles.set(f.title, pg.name);
        if (seenDescs.has(f.description)) check(`[${pg.name}] description unique`, false, `duplicate of ${seenDescs.get(f.description)}`);
        else seenDescs.set(f.description, pg.name);
        for (const p of f.plates) {
          if (!p.photo) continue;
          (siteWidePhotoUse[p.photo] ||= new Set()).add(`${pg.name}:${p.slot}`);
        }
        if (pg.name !== "privacy" && pg.name !== "terms") {
          if (f.triggers === -1) note(`[${pg.name}] scroll animations`, "registry not exposed in production builds");
          else check(`[${pg.name}] scroll animations registered`, f.triggers > 3, String(f.triggers));
        }
        if (f.applyCtas.length) {
          check(`[${pg.name}] apply CTAs point at the application`, f.applyCtas.every((a) => a.href === APPLY_URL), f.applyCtas.map((a) => a.href).join(", "));
          check(`[${pg.name}] apply CTAs open safely`, f.applyCtas.every((a) => a.target === "_blank" && /noopener/.test(a.rel)), "");
        }
        if (pg.name === "owner-operators") {
                  check("[owner-operators] points drivers without their own truck at the other route", f.driverLinks >= 1, String(f.driverLinks));
          check(`[${pg.name}] nothing in localStorage`, f.localStorageKeys.length === 0, f.localStorageKeys.join(", "));
          check(`[${pg.name}] nothing in sessionStorage`, f.sessionStorageKeys.length === 0, f.sessionStorageKeys.join(", "));
          check(`[${pg.name}] states the confirmed insurance minimums`, f.text.includes("$500,000") && f.text.includes("$1,000,000"));
          check(`[${pg.name}] shows the certificate holder address`, f.text.includes("2455 naglee rd"));
        }
        if (pg.name === "become-a-driver") {
          check("[become-a-driver] sends drivers to the carrier, not to a portal", f.applyLinks === 0 && /talk to solidify/i.test(f.text), "");
          check("[become-a-driver] points owner-operators at their own route", f.text.includes("owner-operator"), "");
          check("[become-a-driver] cites the rule rather than inventing a policy", /49 cfr/i.test(f.text), "");
          check("[become-a-driver] publishes no pay figure", !/\$\s?\d[\d,]*\s*(per|\/)\s*(mile|week|year)/i.test(f.text), "");
        }
        if (pg.name === "terms") {
          check("[terms] says the website terms are not the transport terms", /transport agreement|contract of carriage/i.test(f.text), "");
          check("[terms] names the company", f.text.includes("solidify transport llc"), "");
          check("[terms] carries no photography credits", !/photo by|image credit/i.test(f.text), "");
        }
        if (pg.name === "home") {
          check(vp.mobile ? `[home] no WebGL canvas on a phone (motion on)` : `[home] hero WebGL canvas mounted (motion on)`, vp.mobile ? f.canvas === 0 : f.canvas >= 1, String(f.canvas));
          check(`[home] not dominated by recruiting`, (f.text.match(/owner-operator/g) || []).length <= 8, String((f.text.match(/owner-operator/g) || []).length));
        }
      }

      // Screenshots: top, each section, bottom.
      const dir = `${OUT}/${vp.name}/${pg.name}`;
      await shot(page, `${dir}/00-top.png`);
      let i = 1;
      for (const s of f.sections) {
        await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 2)), s.top);
        await page.waitForTimeout(650);
        await shot(page, `${dir}/${String(i).padStart(2, "0")}-${s.id}.png`);
        if (s.h > vp.h * 1.6) {
          const fracs = ["hero", "sequence", "road", "situations"].includes(s.id) ? [0.25, 0.5, 0.8] : [0.5];
          for (const fr of fracs) {
            await page.evaluate((y) => window.scrollTo(0, y), s.top + s.h * fr);
            await page.waitForTimeout(700);
            await shot(page, `${dir}/${String(i).padStart(2, "0")}-${s.id}-${Math.round(fr * 100)}.png`);
          }
        }
        i++;
      }
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(650);
      await shot(page, `${dir}/99-bottom.png`);
      await page.evaluate(() => window.scrollTo(0, 0));

      const newErrors = consoleErrors.slice(before);
      if (newErrors.length) note(`${label} console`, [...new Set(newErrors)].slice(0, 3).join(" | "));

      /* ---- mobile menu ---- */
      if (vp.mobile && pg.name === "home") {
        const toggle = page.locator('button[aria-controls="nav-panel"]');
        await toggle.click();
        await page.waitForTimeout(1100);
        const openState = await page.evaluate(() => {
          const p = document.getElementById("nav-panel");
          const cs = p ? getComputedStyle(p) : null;
          return { display: cs?.display, expanded: document.querySelector('button[aria-controls="nav-panel"]')?.getAttribute("aria-expanded"), inert: document.getElementById("main")?.hasAttribute("inert"), focusInside: !!document.activeElement?.closest("#nav-panel") };
        });
        check(`[390] mobile menu opens`, openState.display === "grid" && openState.expanded === "true", JSON.stringify(openState));
        check(`[390] mobile menu makes main inert + traps focus`, openState.inert && openState.focusInside, JSON.stringify(openState));
        await shot(page, `${dir}/menu-open.png`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(900);
        const closed = await page.evaluate(() => document.querySelector('button[aria-controls="nav-panel"]')?.getAttribute("aria-expanded"));
        check(`[390] mobile menu closes on Escape`, closed === "false", String(closed));
      }
    }
  }

  check("copy: \"not a broker\" appears at most twice site-wide", brokerTotal <= 2, String(brokerTotal));

  /* ---- photo reuse across the site ---- */
  const over = Object.entries(siteWidePhotoUse).filter(([, s]) => s.size > 2);
  check("images: no photograph used in more than two slots site-wide", over.length === 0, over.map(([n, s]) => `${n}: ${[...s].join(", ")}`).join(" ; "));
  note("images: distinct photographs in use", String(Object.keys(siteWidePhotoUse).length));
  note("images: slots per photo", Object.entries(siteWidePhotoUse).map(([n, s]) => `${n}=${s.size}`).join(" "));

  /* ---- keyboard: skip link + tab into contact form ---- */
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.goto(`${TARGET}/contact`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.keyboard.press("Tab");
  const skip = await page.evaluate(() => ({ isSkip: document.activeElement?.classList.contains("skip-link"), visible: document.activeElement ? getComputedStyle(document.activeElement).transform !== "matrix(1, 0, 0, 1, 0, -25.6)" : false }));
  check("keyboard: first Tab lands on the skip link", !!skip.isSkip, JSON.stringify(skip));
  let reachedInput = false;
  for (let i = 0; i < 40 && !reachedInput; i++) {
    await page.keyboard.press("Tab");
    reachedInput = await page.evaluate(() => ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName || ""));
  }
  check("keyboard: Tab reaches the inquiry form controls", reachedInput);
  const focusRing = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = el ? getComputedStyle(el) : null;
    return cs ? cs.outlineStyle !== "none" || cs.boxShadow !== "none" : false;
  });
  check("keyboard: focused control shows a visible focus indicator", focusRing);

  /* ---- quote form: validation, then honest submission outcome ---- */
  await page.goto(`${TARGET}/car-shipping#quote`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById("quote")?.scrollIntoView());
  await page.waitForTimeout(800);
  await page.click('form[data-inquiry-form="vehicle"] button[type="submit"]');
  await page.waitForTimeout(700);
  const errCount = await page.evaluate(() => document.querySelectorAll('form[data-inquiry-form="vehicle"] [role="alert"]').length);
  check("quote form: empty submit shows field errors", errCount >= 5, String(errCount));
  await shot(page, `${OUT}/forms/quote-errors.png`);
  await page.fill("#pickupCity", "Tracy");
  await page.selectOption("#pickupState", "CA");
  await page.fill("#deliveryCity", "Phoenix");
  await page.selectOption("#deliveryState", "AZ");
  await page.fill("#vehicleYear", "2021");
  await page.fill("#vehicleMake", "Toyota");
  await page.fill("#vehicleModel", "Tacoma");
  await page.fill("#name", "QA Tester");
  await page.fill("#phone", "5105551234");
  await page.fill("#email", "qa@example.com");
  await page.waitForTimeout(2700); // startedAt timing guard
  await page.click('form[data-inquiry-form="vehicle"] button[type="submit"]');
  await page.waitForTimeout(3500);
  const outcome = await page.evaluate(() => {
    const success = document.querySelector('[role="status"]')?.textContent || "";
    const alert = [...document.querySelectorAll('form[data-inquiry-form="vehicle"] [role="alert"]')].map((a) => a.textContent).join(" | ");
    return { success: success.slice(0, 120), alert: alert.slice(0, 200) };
  });
  if (inquiryConfigured) check("quote form: valid submit succeeds when backend is configured", /thank you/i.test(outcome.success), JSON.stringify(outcome));
  else check("quote form: valid submit reports the honest not-configured state (never fake success)", !/thank you/i.test(outcome.success) && /call|could not receive|not configured/i.test(outcome.alert), JSON.stringify(outcome));
  await shot(page, `${OUT}/forms/quote-outcome.png`);

  /* ---- the application panel: what replaced the onboarding form ---- */
  await page.goto(`${TARGET}/owner-operators#apply`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1500);
  const ap = await page.evaluate(() => {
    const sec = document.querySelector("#apply");
    const portal = [...document.querySelectorAll('a[href^="https://account.neweratitans.com"]')];
    return {
      section: !!sec,
      items: sec ? sec.querySelectorAll("ol li").length : 0,
      portal: portal.length,
      target: portal[0]?.getAttribute("target") || "",
      rel: portal[0]?.getAttribute("rel") || "",
      /* the wizard and every trace of it must be gone */
      wizard: document.querySelectorAll("[data-onboarding], [data-onboarding-gate], [data-onboarding-steps]").length,
      fileInputs: document.querySelectorAll('input[type="file"]').length,
      text: (document.body.innerText || "").toLowerCase(),
    };
  });
  check("owner-operators: the application section is present", ap.section);
  check("owner-operators: it lists what to have ready", ap.items >= 4, String(ap.items));
  check("owner-operators: it ends in exactly one portal button", ap.portal === 1, String(ap.portal));
  check("owner-operators: the portal button opens safely", ap.target === "_blank" && /noopener/.test(ap.rel), `${ap.target} ${ap.rel}`);
  check("owner-operators: the onboarding wizard is gone", ap.wizard === 0, String(ap.wizard));
  check("owner-operators: no file upload anywhere on the page", ap.fileInputs === 0, String(ap.fileInputs));
  check(
    "owner-operators: no W-9 / bank-detail collection copy remains",
    !/(voided check|routing number|taxpayer identification|direct deposit authorization|access code)/i.test(ap.text),
    "",
  );
  const obStorage = await page.evaluate(() => ({ l: Object.keys(localStorage).length, s: Object.keys(sessionStorage).length }));
  check("owner-operators: nothing in localStorage/sessionStorage", obStorage.l === 0 && obStorage.s === 0, JSON.stringify(obStorage));
  await shot(page, `${OUT}/forms/apply-panel.png`);

  /* ---- reduced motion ---- */
  await page.emulateMedia({ reducedMotion: "reduce" });
  const rmBefore = consoleErrors.length;
  await page.goto(`${TARGET}/`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1500);
  const rm = await page.evaluate(() => ({
    flagged: document.documentElement.classList.contains("reduced-motion"),
    h1: getComputedStyle(document.querySelector("h1")).opacity,
    canvas: document.querySelectorAll("[data-hero] canvas").length,
    hiddenReveals: [...document.querySelectorAll("[data-reveal]")].filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.9).length,
  }));
  check("reduced motion: honored by the document", rm.flagged === true);
  check("reduced motion: hero headline visible, not stuck hidden", Number(rm.h1) > 0.9, `opacity ${rm.h1}`);
  check("reduced motion: no WebGL layer mounted", rm.canvas === 0, String(rm.canvas));
  check("reduced motion: no reveal left invisible", rm.hiddenReveals === 0, String(rm.hiddenReveals));
  check("reduced motion: no console errors", consoleErrors.length === rmBefore, consoleErrors.slice(rmBefore).join(" | "));
  await shot(page, `${OUT}/reduced-motion.png`);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  /* ---- global cleanliness ---- */
  check("no console errors across the run", consoleErrors.length === 0, [...new Set(consoleErrors)].slice(0, 6).join(" | "));
  check("no failed same-origin requests", netErrors.length === 0, [...new Set(netErrors)].slice(0, 6).join(" | "));

  await ctx.close();
} catch (err) {
  console.error("\nQA harness error:", err?.stack || err?.message || err);
  exitCode = 2;
} finally {
  try {
    if (browser) await browser.close();
  } catch {}
  sweepStale();
}

console.log("\n══ assertions ══");
console.log(results.join("\n"));
if (notes.length) console.log("\nNOTES:\n  " + [...new Set(notes)].join("\n  "));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
writeFileSync(join(OUT, "report.txt"), results.join("\n") + `\n\n${passed} passed, ${failed} failed\n`);
process.exit(exitCode || (failed ? 1 : 0));
