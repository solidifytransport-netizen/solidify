/**
 * SOLIDIFY — photography acquisition and vetting tools.
 *
 * Nothing is adopted sight-unseen. The workflow:
 *
 *   node scripts/fetch-imagery.mjs sheet <list.json> [name]
 *       Download every candidate in the list at 480px and tile them into a
 *       numbered contact sheet at .audit/<name>.png (+ .json index) so a
 *       reviewer can LOOK at forty frames at once.
 *
 *   node scripts/fetch-imagery.mjs full <src> <id> [name]
 *       Download one candidate at full resolution into .imagery-cache/.
 *
 *   node scripts/fetch-imagery.mjs crops <file> [cols=3] [rows=3]
 *       Cut a full-resolution file into a magnified grid of tiles at
 *       .audit/crops/<file>/r{y}c{x}.png so cab doors, deck rails, trailer
 *       flanks, mud flaps and plates can be examined for livery and origin.
 *       A thumbnail is not evidence. This is the only check that works.
 *
 *   node scripts/fetch-imagery.mjs adopt <file> <name>
 *       Copy a vetted .imagery-cache file into assets/media/<name>.jpg as a
 *       JPEG master (max 2400px wide, quality 92).
 *
 * Candidate list format (JSON array):
 *   [{ "src": "pexels", "id": "34539243", "note": "car carrier on road" },
 *    { "src": "unsplash", "id": "q36Yp9RpHa0", "note": "..." }]
 *
 * LICENSE: Pexels and Unsplash licenses are free for commercial use with no
 * attribution required, and grant NO model/property release. People shown
 * are stock subjects and must never be captioned as Solidify staff.
 */

import sharp from "sharp";
import { writeFileSync, mkdirSync, existsSync, readFileSync, copyFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".imagery-cache");
const AUDIT = join(ROOT, ".audit");
const MASTERS = join(ROOT, "assets", "media");
mkdirSync(CACHE, { recursive: true });
mkdirSync(AUDIT, { recursive: true });
mkdirSync(MASTERS, { recursive: true });

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

function urlFor(src, id, w) {
  if (src === "pexels") {
    return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
  }
  if (src === "unsplash") {
    // Public download endpoint — redirects to the CDN with the requested width.
    return `https://unsplash.com/photos/${id}/download?force=true&w=${w}`;
  }
  throw new Error(`unknown source ${src}`);
}

async function download(src, id, w) {
  const file = join(CACHE, `${src}-${id}-${w}.jpg`);
  if (existsSync(file)) return file;
  const res = await fetch(urlFor(src, id, w), { headers: { "user-agent": UA, accept: "image/*,*/*" }, redirect: "follow" });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 4000) return null;
  // Normalize to JPEG so downstream tooling is uniform.
  try {
    await sharp(buf).rotate().jpeg({ quality: 92 }).toFile(file);
  } catch {
    return null;
  }
  return file;
}

async function sheet(listPath, name = "contact-sheet") {
  const list = JSON.parse(readFileSync(listPath, "utf8"));
  const COLS = 5;
  const CELL = 420;
  const found = [];
  for (const c of list) {
    process.stdout.write(`  ${c.src}:${c.id} … `);
    const f = await download(c.src, c.id, 480);
    if (!f) {
      console.log("MISS");
      continue;
    }
    const meta = await sharp(f).metadata();
    found.push({ ...c, file: f, w: meta.width, h: meta.height });
    console.log(`ok ${meta.width}x${meta.height}`);
  }
  const rows = Math.ceil(found.length / COLS);
  const W = COLS * CELL;
  const H = rows * (CELL + 34);
  const composites = [];
  for (let i = 0; i < found.length; i++) {
    const e = found[i];
    const s = Math.min(CELL / e.w, CELL / e.h);
    const dw = Math.max(1, Math.round(e.w * s));
    const dh = Math.max(1, Math.round(e.h * s));
    const buf = await sharp(e.file).resize(dw, dh).toBuffer();
    const cx = (i % COLS) * CELL + Math.floor((CELL - dw) / 2);
    const cy = Math.floor(i / COLS) * (CELL + 34) + Math.floor((CELL - dh) / 2);
    composites.push({ input: buf, left: cx, top: cy });
    const label = Buffer.from(
      `<svg width="${CELL}" height="34"><rect width="100%" height="100%" fill="#0e1729"/><text x="8" y="23" font-family="Arial" font-size="18" fill="#fff">#${i}  ${e.src}:${e.id}</text></svg>`,
    );
    composites.push({ input: label, left: (i % COLS) * CELL, top: Math.floor(i / COLS) * (CELL + 34) + CELL });
  }
  const out = join(AUDIT, `${name}.png`);
  await sharp({ create: { width: W, height: H, channels: 3, background: "#04070d" } })
    .composite(composites)
    .png()
    .toFile(out);
  writeFileSync(
    join(AUDIT, `${name}.json`),
    JSON.stringify(
      found.map(({ src, id, note, w, h }, i) => ({ cell: i, src, id, note, w, h })),
      null,
      2,
    ),
  );
  console.log(`\n${found.length}/${list.length} candidates → .audit/${name}.png (${COLS} per row, labels below each)`);
}

async function full(src, id, name) {
  const f = await download(src, id, 2400);
  if (!f) {
    console.log("MISS");
    process.exit(1);
  }
  const meta = await sharp(f).metadata();
  const target = name ? join(CACHE, `${name}.jpg`) : f;
  if (name) copyFileSync(f, target);
  console.log(`${target}  ${meta.width}x${meta.height}`);
}

async function crops(file, cols = 3, rows = 3) {
  const src = existsSync(file) ? file : join(CACHE, file);
  const meta = await sharp(src).metadata();
  const dir = join(AUDIT, "crops", basename(src).replace(/\.\w+$/, ""));
  mkdirSync(dir, { recursive: true });
  const tw = Math.floor(meta.width / cols);
  const th = Math.floor(meta.height / rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const out = join(dir, `r${y}c${x}.png`);
      await sharp(src)
        .extract({ left: x * tw, top: y * th, width: tw, height: th })
        .resize({ width: Math.min(1400, tw * 2) })
        .png()
        .toFile(out);
    }
  }
  console.log(`${cols * rows} tiles → ${dir}`);
}

async function adopt(file, name) {
  const src = existsSync(file) ? file : join(CACHE, file);
  const out = join(MASTERS, `${name}.jpg`);
  await sharp(src).rotate().resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 92, mozjpeg: true }).toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`adopted → assets/media/${name}.jpg  ${meta.width}x${meta.height}`);
}

const [mode, a, b, c] = process.argv.slice(2);
if (mode === "sheet") await sheet(a, b);
else if (mode === "full") await full(a, b, c);
else if (mode === "crops") await crops(a, Number(b) || 3, Number(c) || 3);
else if (mode === "adopt") await adopt(a, b);
else console.log("usage: sheet <list.json> [name] | full <src> <id> [name] | crops <file> [cols] [rows] | adopt <file> <name>");
