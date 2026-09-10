import clsx from "clsx";

/**
 * The Solidify lockups.
 *
 * These are the client's approved vector masters, installed by
 * `node scripts/brand.mjs` from Solidify_Final_Blue_Assets. The artwork is not
 * edited here or anywhere else: white letterforms and symbol with the #147EB3
 * accent on the lower carrier rail, which is the dark-ground variant and the
 * only one this site needs.
 *
 * Served as `<img>` rather than inlined for two reasons. The horizontal lockup
 * is ~13 KB of path data that would otherwise ship in the HTML of every page,
 * and the files carry a `<pattern id="railTrim">` — inlining two lockups on
 * one page would collide those ids and the rail would take the wrong fill.
 *
 * Size it on ONE axis and let the other follow. Which axis depends on what
 * constrains the placement: the header bar constrains height, so it sets
 * `h-… w-auto`; the footer's grid column constrains width, so it sets
 * `w-full max-w-…`. Nothing here presets an axis, because a `w-auto` in the
 * base class collides with a caller's `w-full` and which one wins is then down
 * to stylesheet order rather than intent — and when width loses, the SVG
 * letterboxes inside its box and the artwork shrinks again.
 *
 * The height, where it is used, is the height of the
 * height of the ARTWORK, because brand.mjs re-frames each master onto its own
 * bounding box. The masters ship with a great deal of padding — the horizontal
 * lockup is 54.5% empty vertically — so before that re-framing a 40px box drew
 * an 18px logo, and the header mark read as smaller than the nav beside it.
 *
 * The numbers below are the re-framed viewBoxes, printed by brand.mjs. They are
 * here so the aspect is reserved before the SVG loads and nothing shifts; if
 * the masters are ever reinstalled, re-run the script and copy them across.
 */

const LOCKUPS = {
  /** symbol + wordmark on one row — the header and footer lockup. 9.48:1 */
  horizontal: { src: "/brand/solidify-horizontal.svg", w: 1650, h: 174 },
  /** symbol over wordmark. 2.12:1 */
  stacked: { src: "/brand/solidify-stacked.svg", w: 1476, h: 698 },
  /** the symbol alone. 3.23:1 — it is NOT square, so it cannot go in a square box. */
  symbol: { src: "/brand/solidify-symbol.svg", w: 1308, h: 405 },
} as const;

export type LogoVariant = keyof typeof LOCKUPS;

export function Logo({
  variant = "horizontal",
  className,
  priority = false,
  /**
   * Empty when the logo sits inside a link that already carries an
   * aria-label, which is every current use — otherwise it is announced twice.
   */
  alt = "",
}: {
  variant?: LogoVariant;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const l = LOCKUPS[variant];
  return (
    <img
      src={l.src}
      width={l.w}
      height={l.h}
      alt={alt}
      aria-hidden={alt === "" ? true : undefined}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={clsx("block", className)}
    />
  );
}
