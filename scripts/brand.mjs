/**
 * SOLIDIFY — install the brand lockups.
 *
 *   node scripts/brand.mjs
 *
 * Takes the client's approved vector masters out of Solidify_Final_Blue_Assets
 * and produces everything the site actually serves:
 *
 *   public/brand/solidify-horizontal.svg   symbol + wordmark, one row
 *   public/brand/solidify-stacked.svg      symbol over wordmark
 *   public/brand/solidify-symbol.svg       the symbol alone
 *   app/icon.svg                           square favicon, symbol on the ground
 *   app/apple-icon.png                     180px, same composition
 *
 * The DARK variants are the ones used: their artwork is white with the #147EB3
 * accent on the lower carrier rail, which is what a dark site needs. The Light
 * variants are black artwork for light grounds — the site has no light surface,
 * so they are not shipped. If one ever appears, ship the Light pair too and
 * switch on the surface rather than recolouring these.
 *
 * NOTHING here edits the artwork. Paths and transforms are untouched; all this
 * changes is the viewBox, which is a window onto them.
 *
 * That window matters more than it sounds. The masters carry a lot of dead
 * space — the horizontal lockup is 54.5% vertical padding, so at a CSS height
 * of 40px the actual logo rendered 18px tall, smaller than the 16px nav text
 * beside it. Every lockup is therefore re-framed to its own alpha bounding box
 * plus a small optical margin, measured by rendering and trimming rather than
 * assumed. A CSS height then means the height of the artwork, which is what a
 * layout is really asking for.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

/**
 * The bounding box of the visible artwork, in viewBox units.
 *
 * Rendered and alpha-trimmed rather than derived from the transforms: the
 * files nest several translate/scale groups and a `<pattern>`, and reading the
 * geometry back out of that is guesswork. Pixels are not.
 */
async function contentBox(svg, viewBox) {
  const [, , vw, vh] = viewBox;
  const png = await sharp(svg, { density: 288 }).png().toBuffer();
  const meta = await sharp(png).metadata();
  const { info } = await sharp(png).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const sx = vw / meta.width;
  const sy = vh / meta.height;
  return {
    x: -(info.trimOffsetLeft ?? 0) * sx,
    y: -(info.trimOffsetTop ?? 0) * sy,
    w: info.width * sx,
    h: info.height * sy,
  };
}

/** Re-frame an SVG onto its artwork, keeping every path exactly as it is. */
async function reframe(src) {
  const raw = readFileSync(src, "utf8");
  const vb = raw.match(/viewBox="([\d.\s-]+)"/)[1].trim().split(/\s+/).map(Number);
  const box = await contentBox(readFileSync(src), vb);
  /* 3% of the artwork height all round: enough that antialiased edges and the
     accent rail are never clipped, small enough to read as no padding. */
  const m = box.h * 0.03;
  const x = (box.x - m).toFixed(3);
  const y = (box.y - m).toFixed(3);
  const w = (box.w + m * 2).toFixed(3);
  const h = (box.h + m * 2).toFixed(3);
  const inner = raw.slice(raw.indexOf(">", raw.indexOf("<svg")) + 1, raw.lastIndexOf("</svg>"));
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">${inner}</svg>
`,
    w: Number(w),
    h: Number(h),
  };
}

const SRC = "Solidify_Final_Blue_Assets/SVG";
const OUT = "public/brand";
mkdirSync(OUT, { recursive: true });

/* ---- the lockups, re-framed onto their artwork ------------------------- */
const lockups = [
  ["Solidify_Blue_Horizontal_Dark.svg", "solidify-horizontal.svg"],
  ["Solidify_Blue_Stacked_Dark.svg", "solidify-stacked.svg"],
  ["Solidify_Blue_Symbol_Dark.svg", "solidify-symbol.svg"],
];
const ratios = {};
for (const [from, to] of lockups) {
  const r = await reframe(join(SRC, from));
  writeFileSync(join(OUT, to), r.svg);
  ratios[to] = r;
  console.log(`  ${to}  ${r.w.toFixed(0)}x${r.h.toFixed(0)}  (${(r.w / r.h).toFixed(3)}:1)`);
}
console.log("  Put these intrinsic sizes in components/layout/Mark.tsx:");
for (const [k, v] of Object.entries(ratios)) console.log(`    ${k}  w=${Math.round(v.w)} h=${Math.round(v.h)}`);

/* ---- the square icon --------------------------------------------------- */
/* Built from the RE-FRAMED symbol, not the master: the master's padding would
   otherwise be baked into the tile a second time and the glyph would sit tiny
   in the middle of it. The symbol is 3.2:1, so it is a band in a square tile
   however it is scaled — that is the mark's proportion, not a placement bug. */
const sym = ratios["solidify-symbol.svg"];
const symVb = sym.svg.match(/viewBox="([\d.\s-]+)"/)[1].trim().split(/\s+/).map(Number);
const [sx0, sy0, vw, vh] = symVb;
const inner = sym.svg.slice(sym.svg.indexOf(">", sym.svg.indexOf("<svg")) + 1, sym.svg.lastIndexOf("</svg>"));

const S = 512;
/* 80% of the tile wide, which keeps a clear margin inside the rounded ground
   at 16px as well as at 512px. */
const scale = (S * 0.8) / vw;
const dx = (S - vw * scale) / 2 - sx0 * scale;
const dy = (S - vh * scale) / 2 - sy0 * scale;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
<title>Solidify Transport</title>
<rect width="${S}" height="${S}" rx="116" fill="#0b0f18"/>
<rect x="1" y="1" width="${S - 2}" height="${S - 2}" rx="115" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="2"/>
<g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${scale.toFixed(6)})">${inner}</g>
</svg>
`;
writeFileSync("app/icon.svg", icon);
console.log("  app/icon.svg");

const png = await sharp(Buffer.from(icon), { density: 384 }).resize(180, 180).png().toBuffer();
writeFileSync("app/apple-icon.png", png);
console.log("  app/apple-icon.png (180x180)");
