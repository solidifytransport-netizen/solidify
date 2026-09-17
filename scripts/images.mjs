/**
 * Responsive image generator.
 *
 * Reads every JPEG master in assets/media/ and writes an AVIF / WebP / JPEG
 * ladder into public/media/gen/, plus lib/images.json — a manifest of
 * MEASURED intrinsic dimensions. Nobody types a width or height by hand, so
 * the layout can never shift under a photograph whose declared size drifted
 * from its real one.
 *
 * Masters live outside public/ so the originals are never served.
 *
 *   node scripts/images.mjs            # incremental (mtime-based)
 *   node scripts/images.mjs --force    # rebuild everything
 */

import sharp from "sharp";
import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "assets", "media");
const PUBLIC_OUT = join(ROOT, "public", "media", "gen");
const MANIFEST = join(ROOT, "lib", "images.json");

/*
 * On Vercel the ladder is written into .next/cache, which persists between
 * builds, and mirrored into public/. The mtime skip below then makes every
 * build after the first take seconds instead of minutes. `--cache` opts into
 * the same behavior locally.
 */
const useCache = Boolean(process.env.VERCEL) || process.argv.includes("--cache");
const OUT = useCache ? join(ROOT, ".next", "cache", "media-gen") : PUBLIC_OUT;

/* The ladder stops where the layout stops caring. Never upscaled. */
const WIDTHS = [400, 640, 900, 1280, 1800, 2400];
const FORMATS = [
  // AVIF effort 4 is visually indistinguishable from 6 at this quality and
  // encodes several times faster — the difference between a 15-minute and a
  // 4-minute cold build.
  { ext: "avif", opts: { quality: 50, effort: 4 } },
  { ext: "webp", opts: { quality: 74, effort: 5 } },
  { ext: "jpg", opts: { quality: 78, mozjpeg: true, progressive: true } },
];

const force = process.argv.includes("--force");
mkdirSync(OUT, { recursive: true });
mkdirSync(SRC, { recursive: true });

const masters = readdirSync(SRC).filter((f) => /\.jpe?g$/i.test(f));
const manifest = {};
let written = 0;
let skipped = 0;

for (const file of masters) {
  const name = file.replace(/\.jpe?g$/i, "");
  const srcPath = join(SRC, file);
  const meta = await sharp(srcPath).metadata();
  const srcMtime = statSync(srcPath).mtimeMs;

  const widths = WIDTHS.filter((w) => w <= meta.width);
  if (!widths.includes(meta.width) && meta.width <= 3200) widths.push(meta.width);
  if (!widths.length) widths.push(meta.width);

  for (const w of widths) {
    for (const { ext, opts } of FORMATS) {
      const out = join(OUT, `${name}-${w}.${ext}`);
      if (!force && existsSync(out) && statSync(out).mtimeMs > srcMtime) {
        skipped++;
        continue;
      }
      await sharp(srcPath)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .toFormat(ext === "jpg" ? "jpeg" : ext, opts)
        .toFile(out);
      written++;
    }
  }

  manifest[name] = {
    width: meta.width,
    height: meta.height,
    aspect: +(meta.width / meta.height).toFixed(4),
    widths,
    formats: FORMATS.map((f) => f.ext),
  };
  console.log(`  ${name.padEnd(22)} ${meta.width}x${meta.height}  →  ${widths.join(", ")}`);
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

if (useCache) {
  mkdirSync(PUBLIC_OUT, { recursive: true });
  cpSync(OUT, PUBLIC_OUT, { recursive: true });
  console.log(`  mirrored cache → public/media/gen`);
}
console.log(`\n  wrote ${written} variants, reused ${skipped}`);
console.log(`  manifest: lib/images.json (${Object.keys(manifest).length} images)`);
