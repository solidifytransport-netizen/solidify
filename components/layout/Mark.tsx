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
 * Intrinsic width/height are the masters' own, so the aspect is reserved
 * before the SVG loads and nothing shifts. Size with a height class and leave
 * the width to `w-auto`.
 */

const LOCKUPS = {
  /** symbol + wordmark on one row — the header and footer lockup. 5.10:1 */
  horizontal: { src: "/brand/solidify-horizontal.svg", w: 1837, h: 360 },
  /** symbol over wordmark. 1.94:1 */
  stacked: { src: "/brand/solidify-stacked.svg", w: 1609, h: 831 },
  /** the symbol alone. 2.69:1 — it is NOT square, so it cannot go in a square box. */
  symbol: { src: "/brand/solidify-symbol.svg", w: 1440, h: 536 },
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
      className={clsx("block w-auto", className)}
    />
  );
}
