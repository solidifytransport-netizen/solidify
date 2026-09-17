/**
 * Hero scene masks.
 *
 * Rasterizes the polygons in lib/hero-scene.json into one small RGB PNG that
 * the WebGL hero samples per pixel:
 *   R — the hauler silhouette (steel light sweep)
 *   G — the road / ground region (light traces)
 *   B — depth: near ground bright, horizon dark, hauler lifted to mid-depth
 * Everything is blurred so parallax never shows a hard edge. No hand painting,
 * no external tool — the points live in the repo and this is reproducible.
 *
 *   node scripts/masks.mjs
 */

import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const scene = JSON.parse(readFileSync(join(ROOT, "lib", "hero-scene.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(ROOT, "lib", "images.json"), "utf8"));
const entry = manifest[scene.photo];
if (!entry) throw new Error(`masks: ${scene.photo} is not in lib/images.json — run scripts/images.mjs first`);

const W = 512;
const H = Math.round(W / entry.aspect);
const OUT_DIR = join(ROOT, "public", "media", "gen");
mkdirSync(OUT_DIR, { recursive: true });

const poly = (pts) => pts.map(([x, y]) => `${(x * W).toFixed(1)},${(y * H).toFixed(1)}`).join(" ");

/* Depth: a vertical gradient (ground near → horizon far) plus the hauler
   raised to mid depth so it separates from both the ground and the sky. */
const horizonY = scene.horizon * H;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgb(0,0,10)"/>
      <stop offset="${(scene.horizon - 0.04).toFixed(3)}" stop-color="rgb(0,0,20)"/>
      <stop offset="${scene.horizon.toFixed(3)}" stop-color="rgb(0,0,60)"/>
      <stop offset="1" stop-color="rgb(0,0,255)"/>
    </linearGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="softer" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#depth)"/>
  <g filter="url(#softer)"><polygon points="${poly(scene.hauler)}" fill="rgb(0,0,150)"/></g>
  <g filter="url(#soft)"><polygon points="${poly(scene.hauler)}" fill="rgb(255,0,0)" style="mix-blend-mode:screen"/></g>
  <g filter="url(#soft)"><polygon points="${poly(scene.road)}" fill="rgb(0,255,0)" style="mix-blend-mode:screen"/></g>
  <line x1="0" y1="${horizonY.toFixed(1)}" x2="${W}" y2="${horizonY.toFixed(1)}" stroke="rgb(0,0,80)" stroke-width="18" opacity="0.5" filter="url(#softer)"/>
</svg>`;

/* sharp renders SVG through librsvg, which supports mix-blend-mode on groups
   in recent builds; if it does not, the composite below guarantees the channels. */
const base = await sharp(Buffer.from(svg)).png().toBuffer();

// Belt and suspenders: composite pure-channel layers so R/G are exact regardless of blend support.
const layer = (pts, fill) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter></defs><g filter="url(#b)"><polygon points="${poly(pts)}" fill="${fill}"/></g></svg>`,
    ),
  )
    .png()
    .toBuffer();

const [hauler, road] = await Promise.all([layer(scene.hauler, "rgb(255,0,0)"), layer(scene.road, "rgb(0,255,0)")]);

const out = join(OUT_DIR, `mask-${scene.photo}.png`);
await sharp(base)
  .composite([
    { input: hauler, blend: "screen" },
    { input: road, blend: "screen" },
  ])
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(out);

const meta = { photo: scene.photo, width: W, height: H, focal: scene.focal, vanish: scene.vanish, horizon: scene.horizon };
writeFileSync(join(ROOT, "lib", "hero-scene.meta.json"), JSON.stringify(meta, null, 2) + "\n");
console.log(`  mask → ${out} (${W}x${H})`);
if (!existsSync(out)) process.exit(1);
