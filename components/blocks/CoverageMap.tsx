"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { useInViewOnce } from "@/lib/hooks";
import clsx from "clsx";
import { gsap, EASE, DUR, STAGGER, MQ, prefersReducedMotion } from "@/lib/motion";
import { STATE_NAMES } from "@/lib/schemas";
import { FOCUS_NAMES, US_MAP_VIEWBOX, WEST, loadUsMap, type St, type UsMap } from "@/lib/us-map";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Section, Eyebrow, SectionMark, type Surface } from "@/components/ui/Primitives";

/* Geometry — 48 outlines, 134 KB — is loaded by lib/us-map.ts when the map
   is near, and derived there (sweep order, paint order, true centers). */

/**
 * Padded frame. Required, not cosmetic: a focus state at hover scale plus its
 * wall offset reaches past the original viewBox (Texas clips at the bottom),
 * and the section carries `overflow-clip` so `overflow: visible` would spill
 * onto the next grid column instead. The aspect shifts 1.598 → 1.568.
 */
const [VX, VY, VW, VH] = US_MAP_VIEWBOX.split(/[\s,]+/).map(Number);
const PAD = 16;
const FRAME = `${VX - PAD} ${VY - PAD} ${VW + PAD * 2} ${VH + PAD * 2}`;
const FRAME_ASPECT = `${VW + PAD * 2} / ${VH + PAD * 2}`;

type Params = { rest: number; hot: number; wx: number; wy: number; hwx: number; hwy: number };

/**
 * S4 — Coverage: the 48 contiguous states, with the focus states raised off
 * the board and lit.
 *
 * The emphasis is carried by GEOMETRY and LIGHT, in that order. Each focus
 * state scales about its own center, so it visibly overlaps its neighbors —
 * that overlap is the only thing that actually reads as "bigger" in a still
 * frame; scaling the region as one plate changes no internal relationship and
 * the eye sees nothing. Under each raised state a dark wall slides out, and a
 * single blurred union of the twelve casts a shadow across the plains behind
 * them.
 *
 * The face is gunmetal, the same material as `.plate-steel`. Every blue is
 * additive light OUTSIDE the geometry: one `userSpaceOnUse` lamp screened over
 * the tiles so the falloff is continuous across all twelve rather than twelve
 * separate fills, a rim gradient on each edge, the ambient underglow, and the
 * pointer light. Screen cannot darken a channel, which is the house rule
 * enforced by the compositing mode rather than by discipline.
 *
 * Coverage only — never a lane, volume or comparative claim. Decorative to
 * assistive tech; the text beside it carries the same facts.
 */
export function CoverageMap({
  id = "coverage",
  eyebrow,
  mark,
  title,
  lead,
  surface = "navy",
}: {
  id?: string;
  eyebrow?: string;
  mark?: { index: string | number; label: string };
  title: string;
  lead: string;
  surface?: Surface;
}) {
  const root = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Pick<St, "abbr" | "name"> | null>(null);
  /** Written by matchMedia, read by the hover effect. */
  const cfg = useRef<Params | null>(null);
  /** The entry timeline owns the tiles until it finishes. */
  const landed = useRef(false);
  /* The map is ~500 SVG nodes with blur filters, and it sits below the fold
     on every page. Mounting it a viewport and a half before it is reached
     keeps it out of hydration — on a phone that was a measurable slice of a
     1.2 s long task — without ever letting the reader see it arrive late.
     The placeholder reserves the exact aspect, so nothing shifts. */
  const [nearRef, near] = useInViewOnce<HTMLDivElement>("150% 0px");
  const [data, setData] = useState<UsMap | null>(null);
  useEffect(() => {
    if (!near) return;
    let live = true;
    loadUsMap().then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, [near]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || !data) return;
      const q = gsap.utils.selector(el);
      const groundStrokes = q("[data-ground-stroke]");
      const cast = q("[data-cast]")[0];
      const glow = q("[data-west-glow]")[0];
      /* Built in SWEEP order by abbr, not document order — document order is
         PAINT (reversed), and the stagger must run north-west to south-east. */
      const tiles = data.sweep.map((s) => el.querySelector<SVGGElement>(`[data-abbr="${s.abbr}"]`)!).filter(Boolean);
      const walls = tiles.map((t) => t.querySelector("[data-wall]")!);
      const edges = tiles.map((t) => t.querySelector("[data-tile-edge]")!);

      const mm = gsap.matchMedia();

      /* Every viewport must match SOMETHING here. gsap.matchMedia runs a
         conditions-object callback only when at least one condition is true,
         and the earlier pair — desktop, reduced — left a phone with no
         reduced-motion preference matching neither. The whole block was
         skipped on phones: no entry animation, `landed` never set, `cfg`
         null, so every tap on a state was ignored too. `isMobile` is the
         complement of `isDesktop`, so the callback now always runs. */
      mm.add({ isDesktop: MQ.desktop, isMobile: MQ.mobile, isReduced: MQ.reduced }, (ctx) => {
        const { isDesktop, isReduced } = ctx.conditions as { isDesktop: boolean; isMobile: boolean; isReduced: boolean };
        /* Mobile scales harder: at 390px the map renders at ~0.35 CSS px per
           user unit, so a 5% lip is under two pixels and reads as nothing. */
        const P: Params = isDesktop
          ? { rest: 1.055, hot: 1.105, wx: 2.4, wy: 3.8, hwx: 4.4, hwy: 6.6 }
          : { rest: 1.08, hot: 1.115, wx: 4.0, wy: 6.5, hwx: 6.0, hwy: 9.0 };
        cfg.current = P;

        tiles.forEach((t) => gsap.set(t, { svgOrigin: `${t.dataset.ox} ${t.dataset.oy}` }));

        if (isReduced) {
          gsap.set([...groundStrokes, ...edges], { drawSVG: "100%" });
          gsap.set(tiles, { scale: P.rest, opacity: 1 });
          gsap.set(walls, { x: P.wx, y: P.wy });
          gsap.set(cast, { opacity: 0.5 });
          gsap.set(glow, { opacity: 0.6 });
          landed.current = true;
          el.dataset.landed = "true";
          return;
        }

        gsap.set([...groundStrokes, ...edges], { drawSVG: "0%" });
        gsap.set(tiles, { scale: 0.94, opacity: 0 });
        gsap.set(walls, { x: 0, y: 0 });
        gsap.set([cast, glow], { opacity: 0 });
        landed.current = false;

        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top 72%", once: true },
          onComplete: () => {
            landed.current = true;
            el.dataset.landed = "true"; /* read by scripts/mobile.mjs */
          },
        });
        tl.to(groundStrokes, { drawSVG: "100%", duration: DUR.camera, ease: EASE.inOut, stagger: { each: 0.012, from: "start" } })
          .to(tiles, { scale: P.rest, opacity: 1, duration: DUR.base, ease: EASE.settle, stagger: STAGGER.tight }, "-=1.0")
          .to(walls, { x: P.wx, y: P.wy, duration: DUR.base, ease: EASE.settle, stagger: STAGGER.tight }, "<")
          .to(cast, { opacity: 0.5, duration: DUR.section, ease: EASE.out }, "<0.15")
          .to(edges, { drawSVG: "100%", duration: DUR.section, ease: EASE.out, stagger: STAGGER.tight }, "<")
          .to(glow, { opacity: 0.6, duration: DUR.camera, ease: EASE.out }, "<");

        // Slow breathing on the Western glow — the only infinite tween here.
        gsap.to(glow, { opacity: 0.4, duration: 3.2, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 3.4 });

        return () => {
          tl.kill();
          gsap.killTweensOf(glow);
        };
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [data] },
  );

  /* Hover, in one place, so the map and the chips beside it drive the same
     behavior. Gated on `landed`: a chip hover while the map is still below
     the fold would otherwise overwrite the entry tween and strand a tile at
     opacity 0. */
  useEffect(() => {
    const el = root.current;
    const P = cfg.current;
    if (!el || !P || !landed.current) return;
    const d = prefersReducedMotion() ? 0 : DUR.element;
    el.querySelectorAll<SVGGElement>("[data-tile]").forEach((t) => {
      const on = t.dataset.abbr === hover?.abbr;
      t.dataset.on = String(on);
      gsap.to(t, { scale: on ? P.hot : P.rest, duration: d, ease: EASE.settle, overwrite: "auto" });
      gsap.to(t.querySelector("[data-wall]"), { x: on ? P.hwx : P.wx, y: on ? P.hwy : P.wy, duration: d, ease: EASE.settle, overwrite: "auto" });
    });
  }, [hover]);

  /* Hover is a mouse idea. On touch, pointerenter and pointerleave fire in
     the same tap, so a state lit and unlit before it could be seen. A tap now
     holds the state (tap again, or tap another, to change it) and the leave
     events are ignored for touch. */
  const isTouch = (e: React.PointerEvent) => e.pointerType === "touch" || e.pointerType === "pen";
  const enter = (s: Pick<St, "abbr" | "name">) => (e: React.PointerEvent) => {
    if (isTouch(e)) return;
    setHover(s);
  };
  const leave = (e: React.PointerEvent) => {
    if (isTouch(e)) return;
    setHover(null);
  };
  const tap = (s: Pick<St, "abbr" | "name">) => (e: React.PointerEvent) => {
    if (!isTouch(e)) return;
    setHover((prev) => (prev?.abbr === s.abbr ? null : s));
  };

  // Pointer-following light — the map reads as lit, not painted.
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (light.current) light.current.style.background = `radial-gradient(closest-side at ${x.toFixed(1)}% ${y.toFixed(1)}%, rgba(179,212,255,0.20), transparent 70%)`;
  };

  const westList = FOCUS_NAMES;
  const focus = data?.sweep ?? [];
  const ground = data ? data.states.filter((s) => !WEST.has(s.abbr)) : [];
  const origin = data?.origin ?? {};
  /* The hovered tile paints last so it rises above its neighbors — SVG has no
     z-index. React MOVES the keyed node rather than recreating it, so the
     inline GSAP transform survives; the key must stay `s.abbr`. */
  const hovered = hover && data ? data.states.find((s) => s.abbr === hover.abbr) : undefined;
  const painted = data ? (hovered && WEST.has(hovered.abbr) ? [...data.paint.filter((s) => s.abbr !== hovered.abbr), hovered] : data.paint) : [];

  return (
    <Section surface={surface} id={id} ariaLabelledBy={`${id}-title`} head="stack" className="overflow-clip">
      <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-50" />
      <div className="shell relative grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Reveal y={10}>{mark ? <SectionMark index={mark.index} label={mark.label} /> : <Eyebrow>{eyebrow ?? "Coverage"}</Eyebrow>}</Reveal>
          <RevealText as="h2" id={`${id}-title`} className="display-md max-w-[16ch]">
            {title}
          </RevealText>
          <Reveal>
            <p className="lead">{lead}</p>
          </Reveal>
          <Reveal className="flex flex-col gap-3 pt-2">
            <span className="label">Western focus</span>
            <ul role="list" className="flex flex-wrap gap-2">
              {westList.map((s) => (
                <li key={s.abbr}>
                  <span
                    onPointerEnter={enter(s)}
                    onPointerLeave={leave}
                    onPointerDown={tap(s)}
                    className={clsx(
                      "spec inline-flex min-h-[38px] items-center rounded-[4px] border px-3 !text-[var(--step--2)] transition-colors duration-300",
                      hover?.abbr === s.abbr
                        ? "border-[rgba(179,212,255,0.7)] bg-[color-mix(in_srgb,#7fb6ff_10%,transparent)] !text-[var(--text-hi)]"
                        : "border-[var(--line-strong)] !text-[var(--text-mid)]",
                    )}
                  >
                    {s.name}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div ref={root} onPointerMove={onMove} onPointerDown={onMove} className="map-frame relative lg:col-span-7">
          <div aria-hidden className="pointer-events-none absolute -inset-[10%] -z-10 rounded-full blur-3xl [background:radial-gradient(closest-side,rgba(26,63,112,0.6),transparent_70%)]" />

          <div ref={nearRef} style={{ aspectRatio: FRAME_ASPECT }}>
            {data && (
          <svg viewBox={FRAME} className="w-full" aria-hidden onPointerLeave={leave}>
            <defs>
              <radialGradient id="west-glow" cx="22%" cy="45%" r="42%">
                <stop offset="0%" stopColor="#4f97ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#4f97ff" stopOpacity="0" />
              </radialGradient>

              {/* Every material layer is a <use> of these, so the focus path
                  data ships twice rather than five times. */}
              {focus.map((s) => (
                <path key={`def-${s.abbr}`} id={`p-${s.abbr}`} d={s.d} />
              ))}

              {/* Gunmetal, per tile, so twelve faces read as milled plate
                  rather than one poured region. objectBoundingBox by default. */}
              <linearGradient id="tile-face" x1="0.15" y1="0" x2="0.85" y2="1">
                <stop offset="0%" stopColor="#32445f" />
                <stop offset="45%" stopColor="#1d2b40" />
                <stop offset="100%" stopColor="#121a27" />
              </linearGradient>

              {/* The side wall is the absence of light, not a color. */}
              <linearGradient id="tile-wall" x1="0" y1="0" x2="0.6" y2="1">
                <stop offset="0%" stopColor="#0b1220" />
                <stop offset="100%" stopColor="#02040a" />
              </linearGradient>

              {/* ONE lamp in user space, so the falloff is continuous across
                  all twelve states instead of twelve identical ramps. r is set
                  so Texas still sits well inside the lit radius. */}
              <radialGradient id="focus-lamp" gradientUnits="userSpaceOnUse" cx="235" cy="245" r="560">
                <stop offset="0%" stopColor="#b6d6ff" stopOpacity="0.46" />
                <stop offset="50%" stopColor="#6cadff" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#3f8bff" stopOpacity="0.34" />
              </radialGradient>

              <linearGradient id="edge-light" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eaf3ff" stopOpacity="0.98" />
                <stop offset="38%" stopColor="#7fb6ff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#4f97ff" stopOpacity="0.2" />
              </linearGradient>

              {/* The only filter in the map. */}
              <filter id="lift-drop" x="-12%" y="-12%" width="126%" height="130%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>

            <rect data-west-glow width="100%" height="100%" fill="url(#west-glow)" />

            {/* The 36. Flat, matte, and a little dimmer than before — widening
                the material gap does half the emphasis for free.
                NOTE: no layer group here may carry a transform of its own.
                `svgOrigin` resolves in the SVG root's user space and will
                silently misplace every tile if a wrapper gains one. */}
            <g data-ground>
              {ground.map((s) => (
                <path
                  key={`f-${s.abbr}`}
                  d={s.d}
                  fill={hover?.abbr === s.abbr ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.045)"}
                  className="transition-[fill] duration-300"
                  onPointerEnter={enter(s)}
                  onPointerDown={tap(s)}
                />
              ))}
              {ground.map((s) => (
                <path
                  key={`s-${s.abbr}`}
                  d={s.d}
                  data-ground-stroke
                  fill="none"
                  stroke={hover?.abbr === s.abbr ? "#b3d4ff" : "rgba(255,255,255,0.22)"}
                  strokeWidth={hover?.abbr === s.abbr ? 1.4 : 0.85}
                  strokeLinejoin="round"
                  className="pointer-events-none transition-[stroke] duration-300"
                />
              ))}
            </g>

            {/* One blurred union of the twelve, sitting ABOVE the 36 so the
                shadow genuinely falls on the plains behind them. Only its
                opacity is ever tweened, so the filter rasterizes once. */}
            <g data-cast opacity="0" filter="url(#lift-drop)" pointerEvents="none">
              <g transform="translate(6 10)">
                {focus.map((s) => {
                  const { ox, oy } = origin[s.abbr];
                  return (
                    <use
                      key={`c-${s.abbr}`}
                      href={`#p-${s.abbr}`}
                      fill="#02040a"
                      transform={`translate(${((1 - 1.055) * ox).toFixed(2)} ${((1 - 1.055) * oy).toFixed(2)}) scale(1.055)`}
                    />
                  );
                })}
              </g>
            </g>

            <g data-tiles>
              {painted.map((s) => {
                const { ox, oy } = origin[s.abbr];
                return (
                  <g key={s.abbr} data-tile data-abbr={s.abbr} data-ox={ox} data-oy={oy} onPointerEnter={enter(s)} onPointerDown={tap(s)}>
                    <use data-wall href={`#p-${s.abbr}`} fill="url(#tile-wall)" />
                    {/* Opaque: this is what makes the shingled overlap read as
                        deliberate instead of as doubled seams where two
                        translucent faces cross. */}
                    <use href={`#p-${s.abbr}`} fill="url(#tile-face)" />
                    <use className="tile-lamp" href={`#p-${s.abbr}`} fill="url(#focus-lamp)" />
                    {/* A real <path>, not a <use> — DrawSVG cannot measure a
                        <use> and would silently no-op. */}
                    <path data-tile-edge className="tile-edge" d={s.d} fill="none" stroke="url(#edge-light)" strokeWidth={1.35} strokeLinejoin="round" pointerEvents="none" />
                    <text className="tile-abbr" x={s.cx} y={s.cy} textAnchor="middle" dominantBaseline="middle">
                      {s.abbr}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
            )}
          </div>

          {/* After the svg: the opaque faces would otherwise hide the pointer
              light exactly where it matters. Auto z-index, so it paints in DOM
              order between the map and the readout plate. */}
          <div ref={light} aria-hidden className="map-light pointer-events-none absolute inset-0" />

          {/* Below the map on a phone, over it from `sm` up: at 390px a
              230px-wide plate absolutely positioned bottom-right covers most
              of the board it is describing. */}
          <div
            className="plate plate-steel mt-4 flex w-full flex-col gap-1 px-4 py-3 sm:absolute sm:bottom-3 sm:right-3 sm:mt-0 sm:w-auto sm:min-w-[230px] sm:max-w-[calc(100%-1.5rem)]"
            aria-live="polite"
          >
            <span className="label">{hover ? (WEST.has(hover.abbr) ? "Western focus" : "Coverage") : "Coverage"}</span>
            <span className="font-display text-[var(--step-1)] font-medium leading-tight">{hover ? hover.name : "48 contiguous states"}</span>
            <span className="small !text-[var(--text-low)]">{hover ? (WEST.has(hover.abbr) ? "Western focus" : "Served") : "Strong Western-US coverage"}</span>
          </div>
        </div>
      </div>
      <p className="sr-only">
        Solidify serves all 48 contiguous states, with a strong Western-US focus across{" "}
        {westList.map((s) => STATE_NAMES[s.abbr as keyof typeof STATE_NAMES]).join(", ")}.
      </p>
    </Section>
  );
}
