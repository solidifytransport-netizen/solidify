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
 * NOTHING here edits the artwork. The lockups are copied byte-for-byte; the
 * icon only wraps the symbol's own markup in a square ground, because a
 * favicon has to be square and the symbol is 2.7:1.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SRC = "Solidify_Final_Blue_Assets/SVG";
const OUT = "public/brand";
mkdirSync(OUT, { recursive: true });

/* ---- the lockups, copied verbatim ------------------------------------- */
const lockups = [
  ["Solidify_Blue_Horizontal_Dark.svg", "solidify-horizontal.svg"],
  ["Solidify_Blue_Stacked_Dark.svg", "solidify-stacked.svg"],
  ["Solidify_Blue_Symbol_Dark.svg", "solidify-symbol.svg"],
];
for (const [from, to] of lockups) {
  copyFileSync(join(SRC, from), join(OUT, to));
  console.log(`  ${to}`);
}

/* ---- the square icon --------------------------------------------------- */
const symbol = readFileSync(join(SRC, "Solidify_Blue_Symbol_Dark.svg"), "utf8");

const vb = symbol.match(/viewBox="([\d.\s-]+)"/);
if (!vb) throw new Error("symbol: no viewBox");
const [, , vw, vh] = vb[1].trim().split(/\s+/).map(Number);

/* everything between the root <svg ...> and </svg> */
const inner = symbol.slice(symbol.indexOf(">", symbol.indexOf("<svg")) + 1, symbol.lastIndexOf("</svg>"));

const S = 512;
/* 78% of the tile wide, which leaves the symbol breathing room inside the
   rounded ground at 16px as well as at 512px. */
const scale = (S * 0.78) / vw;
const dx = (S - vw * scale) / 2;
const dy = (S - vh * scale) / 2;

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
