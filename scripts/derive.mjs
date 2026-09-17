/**
 * SOLIDIFY — derive a new master by cropping an existing one.
 *
 *   node scripts/derive.mjs <source-name> <new-name> <left> <top> <width> <height>
 *
 * Box values are FRACTIONS of the source (0..1), so a crop can be reasoned
 * about from a contact sheet rather than from pixel arithmetic. Output is a
 * JPEG master in assets/media at quality 92, capped at 2400px wide — the same
 * shape `fetch-imagery.mjs adopt` produces, so the image ladder treats it
 * identically.
 *
 * A derived crop is a NEW photograph for the purposes of the two-uses-per-
 * photograph rule, and rightly so: a portrait crop of one vehicle on a deck is
 * a different picture from the wide frame it came out of. It is not a license
 * to run the same composition twice under two names.
 */
import sharp from "sharp";
import { join } from "node:path";

const [src, name, l, t, w, h] = process.argv.slice(2);
if (!src || !name || [l, t, w, h].some((v) => v === undefined)) {
  console.error("usage: derive.mjs <source> <new-name> <left> <top> <width> <height>   (fractions)");
  process.exit(1);
}

const dir = join(process.cwd(), "assets", "media");
const from = join(dir, `${src}.jpg`);
const to = join(dir, `${name}.jpg`);

const meta = await sharp(from).metadata();
const W = meta.width ?? 0;
const H = meta.height ?? 0;

const box = {
  left: Math.round(Number(l) * W),
  top: Math.round(Number(t) * H),
  width: Math.round(Number(w) * W),
  height: Math.round(Number(h) * H),
};
box.width = Math.min(box.width, W - box.left);
box.height = Math.min(box.height, H - box.top);
if (box.width < 40 || box.height < 40) {
  console.error("crop is degenerate:", box);
  process.exit(1);
}

const pipe = sharp(from).extract(box);
if (box.width > 2400) pipe.resize({ width: 2400 });
await pipe.jpeg({ quality: 92, mozjpeg: true }).toFile(to);

const out = await sharp(to).metadata();
console.log(`${name}.jpg  ${out.width}x${out.height}  from ${src} ${JSON.stringify(box)}`);
