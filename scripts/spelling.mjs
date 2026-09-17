/**
 * SOLIDIFY — spelling and American-English audit.
 *
 *   node scripts/spelling.mjs [TARGET=http://localhost:3478] [--source-only]
 *
 * Two passes over everything a reader can meet, checked against Hunspell
 * en_US via nspell:
 *
 *   RENDERED   every text node on every route (hidden ones included — the
 *              menu index, collapsed FAQ answers, sr-only labels), plus alt,
 *              aria-label, title and placeholder attributes, the <title>, the
 *              meta descriptions and the JSON-LD strings.
 *   SOURCE     string literals and JSX text in the files that hold copy which
 *              only renders behind an interaction: validation messages, the
 *              email subjects and bodies, the per-route metadata. Class lists,
 *              paths, selectors, log lines and code-shaped strings are
 *              filtered out by shape, not by hand.
 *
 * Three kinds of finding:
 *
 *   MISSPELLED   not in en_US, not in en_GB, not in the allowlist.
 *   BRITISH      not in en_US but in en_GB (colour, organise, travelled…), or
 *                on the explicit list of words both dictionaries accept but
 *                that read British (whilst, amongst, towards, grey, licence…).
 *   STYLE        British date order ("17 September 2026") and single-quote
 *                quotation marks used as primary quotes.
 *
 * Proper nouns and trade terms live in scripts/spelling-allow.txt, one per
 * line. Add to it only for words that are genuinely correct; never to make a
 * finding go away. Exit 1 on any finding, so it can gate a build.
 *
 * The first run of this found something the eye never would: every heading
 * built from <Lines> had a textContent with the lines run together —
 * "Nationwide autotransport,carrier-direct." — because there was no
 * whitespace before the <br>. SplitText copies textContent into the
 * aria-label it adds, so that is what screen readers were being given.
 * Fixed in Lines; this keeps it fixed.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import nspell from "nspell";
import en from "dictionary-en";
import gb from "dictionary-en-gb";

const args = process.argv.slice(2);
const sourceOnly = args.includes("--source-only");
const TARGET = (args.find((a) => !a.startsWith("--")) || process.env.TARGET || "http://localhost:3478").replace(/\/$/, "");
const ROUTES = ["/", "/car-shipping", "/oem-dealerships", "/become-a-driver", "/owner-operators", "/about", "/contact", "/terms", "/privacy"];

const us = nspell(en);
const uk = nspell(gb);
const allow = new Set(
  readFileSync("scripts/spelling-allow.txt", "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l && !l.startsWith("#")),
);

/**
 * Words en_US accepts that still read as British, with the American form.
 * en_US takes "towards", "grey" and "licence" without complaint; a reader in
 * California does not. Keys are built from stems so this file never has to
 * carry the British spellings itself (a sweep that converts the codebase
 * would otherwise convert this list too — it did, once).
 */
const B = (ukForm, usForm) => [ukForm, usForm];
const BRITISH = Object.fromEntries([
  B("whilst", "while"), B("amongst", "among"), B("towards", "toward"), B("gr" + "ey", "gray"), B("gr" + "eys", "grays"),
  B("licen" + "ce", "license"), B("licen" + "ces", "licenses"), B("licen" + "ced", "licensed"),
  B("che" + "que", "check"), B("che" + "ques", "checks"), B("ty" + "re", "tire"), B("ty" + "res", "tires"), B("ke" + "rb", "curb"),
  B("program" + "me", "program"), B("program" + "mes", "programs"), B("sto" + "rey", "story"), B("sto" + "reys", "stories"),
  B("enqui" + "ry", "inquiry"), B("enqui" + "ries", "inquiries"), B("enqui" + "re", "inquire"), B("enqui" + "ring", "inquiring"),
  B("lea" + "rnt", "learned"), B("sp" + "elt", "spelled"), B("dre" + "amt", "dreamed"),
  B("ful" + "fil", "fulfill"), B("en" + "rol", "enroll"), B("enrol" + "ment", "enrollment"), B("instal" + "ment", "installment"),
  B("ski" + "lful", "skillful"), B("wi" + "lful", "willful"), B("arte" + "fact", "artifact"), B("arte" + "facts", "artifacts"),
  B("age" + "ing", "aging"), B("co" + "sy", "cozy"), B("sce" + "ptical", "skeptical"), B("jewel" + "lery", "jewelry"),
  B("drau" + "ght", "draft"), B("alumin" + "ium", "aluminum"), B("aero" + "plane", "airplane"),
  B("catalog" + "ue", "catalog"), B("catalog" + "ues", "catalogs"), B("judge" + "ment", "judgment"), B("acknowledge" + "ment", "acknowledgment"),
  B("practi" + "se", "practice"), B("practi" + "sed", "practiced"), B("practi" + "sing", "practicing"),
  B("thea" + "tre", "theater"), B("cen" + "tre", "center"), B("cen" + "tres", "centers"), B("cen" + "tred", "centered"),
  B("me" + "tre", "meter"), B("me" + "tres", "meters"), B("li" + "tre", "liter"), B("fi" + "bre", "fiber"), B("cali" + "bre", "caliber"),
  B("haul" + "ier", "hauler"), B("haul" + "iers", "haulers"), B("lor" + "ry", "truck"), B("lor" + "ries", "trucks"),
  B("motor" + "way", "highway"), B("motor" + "ways", "highways"), B("pet" + "rol", "gas"), B("wind" + "screen", "windshield"),
  B("bon" + "net", "hood"), B("ma" + "ths", "math"), B("fort" + "night", "two weeks"), B("orient" + "ated", "oriented"),
  B("mou" + "ld", "mold"), B("plou" + "gh", "plow"),
  B("fav" + "our", "favor"), B("fav" + "ours", "favors"), B("fav" + "ourite", "favorite"), B("hon" + "our", "honor"), B("hon" + "oured", "honored"),
  B("lab" + "our", "labor"), B("neighb" + "our", "neighbor"), B("neighb" + "ours", "neighbors"), B("behavi" + "our", "behavior"),
  B("behavi" + "ours", "behaviors"), B("flav" + "our", "flavor"), B("harb" + "our", "harbor"), B("hum" + "our", "humor"),
  B("arm" + "our", "armor"), B("endeav" + "our", "endeavor"), B("rum" + "our", "rumor"), B("vap" + "our", "vapor"), B("od" + "our", "odor"),
  B("col" + "our", "color"), B("col" + "ours", "colors"), B("col" + "oured", "colored"),
  B("defen" + "ce", "defense"), B("offen" + "ce", "offense"), B("preten" + "ce", "pretense"),
  B("manoeuv" + "re", "maneuver"), B("analy" + "se", "analyze"), B("analy" + "sed", "analyzed"), B("analy" + "sing", "analyzing"),
  B("travel" + "led", "traveled"), B("travel" + "ling", "traveling"), B("travel" + "ler", "traveler"), B("travel" + "lers", "travelers"),
  B("cancel" + "led", "canceled"), B("cancel" + "ling", "canceling"), B("label" + "led", "labeled"), B("label" + "ling", "labeling"),
  B("model" + "led", "modeled"), B("model" + "ling", "modeling"), B("signal" + "led", "signaled"), B("signal" + "ling", "signaling"),
  B("total" + "led", "totaled"), B("total" + "ling", "totaling"), B("fuel" + "led", "fueled"), B("fuel" + "ling", "fueling"),
  B("level" + "led", "leveled"), B("level" + "ling", "leveling"), B("channel" + "led", "channeled"), B("marshal" + "led", "marshaled"),
  B("counsel" + "lor", "counselor"), B("jewel" + "ler", "jeweler"), B("focus" + "sed", "focused"), B("focus" + "sing", "focusing"),
  B("unauthori" + "sed", "unauthorized"), B("authori" + "sed", "authorized"), B("organi" + "se", "organize"), B("recogni" + "se", "recognize"),
  B("reali" + "se", "realize"), B("prioriti" + "se", "prioritize"), B("minimi" + "se", "minimize"), B("optimi" + "se", "optimize"),
  B("customi" + "se", "customize"), B("utili" + "se", "utilize"), B("speciali" + "se", "specialize"), B("summari" + "se", "summarize"),
  B("normali" + "se", "normalize"), B("rasteri" + "se", "rasterize"), B("rasteri" + "ses", "rasterizes"), B("rasteri" + "sed", "rasterized"),
]);
const BRITISH_PHRASES = [
  [/\bnumber plates?\b/i, "license plate"], [/\bpost ?codes?\b/i, "ZIP code"], [/\bcar parks?\b/i, "parking lot"],
  [/\bgive way\b/i, "yield"], [/\bsat ?nav\b/i, "GPS"], [/\bdifferent to\b/i, "different from"],
  [/\bat (the )?weekends?\b/i, "on weekends"], [/\bin hospital\b/i, "in the hospital"], [/\bfull stop\b/i, "period"],
];
const BRITISH_DATE = /\b\d{1,2}(st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/;

/* ---- word checking ------------------------------------------------------ */
/* words, with internal apostrophes and hyphens kept so "off-roader" and
   "you'd" are judged whole before they are judged in pieces */
const WORD = /[A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z]/g;

const inUs = (w) => us.correct(w) || us.correct(w.toLowerCase()) || us.correct(w[0].toUpperCase() + w.slice(1).toLowerCase());
const inUk = (w) => uk.correct(w) || uk.correct(w.toLowerCase());

function classify(raw) {
  let w = raw.replace(/’/g, "'").replace(/'s$/i, "").replace(/^['-]+|['-]+$/g, "");
  if (!w || w.length < 2) return null;
  const lower = w.toLowerCase();
  if (allow.has(lower)) return null;
  if (BRITISH[lower]) return { kind: "BRITISH", word: w, fix: BRITISH[lower] };
  /* acronyms and their plurals: USDOT, MC, LLC, VIN, EIN, CSL, OEMs, SUVs */
  if (/^[A-Z][A-Z0-9]{0,6}s?$/.test(w)) return null;
  if (inUs(w)) return null;
  /* a hyphenated compound: judge the pieces */
  if (w.includes("-")) {
    const parts = w.split("-").filter(Boolean);
    const bad = parts.map(classify).filter(Boolean);
    return bad[0] || null;
  }
  /* a contraction hunspell does not carry: "you'd", "we'll" */
  if (w.includes("'")) {
    const parts = w.split("'");
    if (parts.every((p) => !p || inUs(p) || /^(d|ll|re|ve|m|t|s)$/i.test(p))) return null;
  }
  if (inUk(w)) return { kind: "BRITISH", word: w, fix: us.suggest(lower)[0] || "?" };
  return { kind: "MISSPELLED", word: w, fix: us.suggest(lower).slice(0, 3).join(", ") || "?" };
}

const ENTITIES = { "&apos;": "'", "&#39;": "'", "&quot;": '"', "&amp;": "&", "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…", "&lt;": "<", "&gt;": ">" };
const clean = (t) =>
  t
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, " ")
    .replace(/\b[\w-]+\.(png|jpg|jpeg|svg|webp|avif|pdf|json|mjs|tsx?)\b/gi, " ");

const findings = [];
const seen = new Set();
const snippet = (t, i) => t.slice(Math.max(0, i - 40), i + 50).replace(/\s+/g, " ").trim();
function checkText(raw, where) {
  if (!raw) return;
  const text = clean(raw);
  for (const m of text.matchAll(WORD)) {
    const c = classify(m[0]);
    if (!c) continue;
    const key = `${c.kind}:${c.word.toLowerCase()}:${where}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({ ...c, where, context: snippet(text, m.index) });
  }
  for (const [re, fix] of BRITISH_PHRASES) {
    const m = text.match(re);
    if (m) findings.push({ kind: "BRITISH", word: m[0], fix, where, context: snippet(text, m.index) });
  }
  const d = text.match(BRITISH_DATE);
  if (d) findings.push({ kind: "STYLE", word: d[0], fix: "Month D, YYYY", where, context: snippet(text, d.index) });
  const q = text.match(/‘[^’]{12,}’/);
  if (q) findings.push({ kind: "STYLE", word: q[0].slice(0, 30), fix: "double quotation marks", where, context: snippet(text, q.index) });
}

/* ---- pass 1: rendered ---------------------------------------------------- */
if (!sourceOnly) {
  const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader", "--disable-gpu", "--mute-audio"] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      await page.goto(TARGET + route, { waitUntil: "load", timeout: 120000 });
      await page.waitForTimeout(600);
      const texts = await page.evaluate(() => {
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) => (n.parentElement?.closest("script, style, noscript, template, code, pre") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
        });
        let n;
        while ((n = walker.nextNode())) if (n.nodeValue.trim()) out.push(n.nodeValue);
        for (const el of document.querySelectorAll("[alt], [aria-label], [title], [placeholder]")) {
          for (const a of ["alt", "aria-label", "title", "placeholder"]) if (el.getAttribute(a)) out.push(el.getAttribute(a));
        }
        out.push(document.title);
        for (const m of document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]')) out.push(m.getAttribute("content") || "");
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
          /* values only, never @type / @context identifiers or URL fields */
          const walk = (v) => {
            if (typeof v === "string") out.push(v);
            else if (Array.isArray(v)) v.forEach(walk);
            else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!k.startsWith("@") && !/url|image|logo|sameAs|target/i.test(k)) walk(x);
          };
          try { walk(JSON.parse(s.textContent)); } catch {}
        }
        return out;
      });
      for (const t of texts) checkText(t, route);
    }
    await ctx.close();
  } finally {
    await browser.close();
  }
}

/* ---- pass 2: source ------------------------------------------------------ */
const files = [];
const walkDir = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walkDir(p);
    else if (/\.(ts|tsx)$/.test(f)) files.push(p);
  }
};
for (const d of ["components", "lib", "app"]) walkDir(d);

/** A string is copy if it is at least three tokens and nearly all of them are plain words. */
const isProse = (s) => {
  if (/[[\]{}=;*<>|\\]|\$\{/.test(s)) return false;
  if (/^(https?:|\/|\.\/|@\/|#|--)/.test(s)) return false;
  const toks = s.trim().split(/\s+/);
  if (toks.length < 3) return false;
  /* class lists and header values are mostly hyphenated tokens; prose is not */
  if (toks.filter((t) => t.includes("-")).length / toks.length > 1 / 3) return false;
  const wordy = toks.filter((t) => /^[("“]?[A-Za-z][A-Za-z'’-]*[.,;:!?)"”]*$/.test(t)).length;
  return wordy / toks.length >= 0.75;
};

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const where = f.replace(/\\/g, "/");
  const lines = src.split("\n");
  let inComment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    /* block comments are not content; a British spelling there is caught by
       the codebase sweep in .audit, not by this pass */
    const wasIn = inComment;
    const opens = line.indexOf("/*");
    const closes = line.lastIndexOf("*/");
    if (opens !== -1 && closes < opens) inComment = true;
    if (closes !== -1 && closes >= opens) inComment = false;
    if (wasIn || opens !== -1) continue;
    /* provenance notes and log lines are not copy */
    if (/^\s*source:|\blog\.(info|warn|error|debug)\(|console\.(log|warn|error)\(/.test(line)) continue;
    for (const m of line.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
      const s = m[2];
      if (s.length >= 8 && isProse(s)) checkText(s, where);
    }
    /* JSX text on its own line — the shape of authored copy in this codebase */
    const t = line.trim();
    if (/^[A-Z“"(][^{}<>;=*]*$/.test(t) && !/^\/\//.test(t) && isProse(t) && /\.tsx$/.test(f)) checkText(t, where);
  }
}

/* ---- report -------------------------------------------------------------- */
const order = { MISSPELLED: 0, BRITISH: 1, STYLE: 2 };
findings.sort((a, b) => order[a.kind] - order[b.kind] || a.word.localeCompare(b.word));
const byWord = new Map();
for (const f of findings) {
  const k = `${f.kind}:${f.word.toLowerCase()}`;
  if (!byWord.has(k)) byWord.set(k, { ...f, places: new Set() });
  byWord.get(k).places.add(f.where);
}
for (const f of byWord.values()) {
  console.log(`  ${f.kind.padEnd(10)} ${f.word.padEnd(22)} → ${String(f.fix).padEnd(24)} ${[...f.places].slice(0, 4).join(", ")}${f.places.size > 4 ? ` (+${f.places.size - 4})` : ""}`);
  console.log(`             …${f.context}…`);
}
console.log(`\n  ${byWord.size} finding${byWord.size === 1 ? "" : "s"} (${findings.length} occurrences) across ${sourceOnly ? "" : `${ROUTES.length} routes + `}${files.length} source files`);
process.exit(byWord.size ? 1 : 0);
