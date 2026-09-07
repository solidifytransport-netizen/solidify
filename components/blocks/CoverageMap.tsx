"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import { gsap, EASE } from "@/lib/motion";
import { FOCUS_STATES } from "@/lib/site";
import { STATE_NAMES } from "@/lib/schemas";
import map from "@/lib/us-map.json";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Section, Eyebrow, SectionMark, type Surface } from "@/components/ui/Primitives";

type St = { id: string; abbr: string; name: string; d: string; cx: number; cy: number };
const STATES = (map as { viewBox: string; states: St[] }).states;
const VIEWBOX = (map as { viewBox: string }).viewBox;
const WEST = new Set<string>(FOCUS_STATES);

/**
 * S4 — Coverage: the 48 contiguous states drawn on as you arrive, the Western
 * states lit with light (not paint), a pointer-following glow, and a live
 * readout on hover. Coverage only — never a lane, volume or route claim.
 * Decorative to assistive tech; the text beside it carries the same facts.
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
  const [hover, setHover] = useState<St | null>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const strokes = el.querySelectorAll<SVGPathElement>("[data-state-stroke]");
      const west = el.querySelectorAll<SVGPathElement>("[data-west-fill]");
      const glow = el.querySelector<SVGElement>("[data-west-glow]");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(strokes, { drawSVG: "100%" });
        gsap.set(west, { opacity: 1 });
        if (glow) gsap.set(glow, { opacity: 0.55 });
        return;
      }
      gsap.set(strokes, { drawSVG: "0%" });
      gsap.set(west, { opacity: 0 });
      if (glow) gsap.set(glow, { opacity: 0 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 72%", once: true } });
      tl.to(strokes, { drawSVG: "100%", duration: 1.8, ease: EASE.inOut, stagger: { each: 0.012, from: "start" } })
        .to(west, { opacity: 1, duration: 1.1, ease: EASE.out, stagger: 0.05 }, "-=0.9")
        .to(glow, { opacity: 0.55, duration: 1.4, ease: EASE.out }, "-=0.8");
      // Slow breathing on the Western glow — the only infinite tween here.
      if (glow) {
        gsap.to(glow, { opacity: 0.35, duration: 3.2, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 3 });
      }
    },
    { scope: root },
  );

  // Pointer-following light on the glow — the map reads as lit, not painted.
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (light.current) light.current.style.background = `radial-gradient(closest-side at ${x.toFixed(1)}% ${y.toFixed(1)}%, rgba(179,212,255,0.16), transparent 70%)`;
  };

  const westList = STATES.filter((s) => WEST.has(s.abbr)).sort((a, b) => a.name.localeCompare(b.name));

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
                    onPointerEnter={() => setHover(s)}
                    onPointerLeave={() => setHover(null)}
                    className={clsx(
                      "spec inline-flex min-h-[38px] items-center rounded-[4px] border px-3 !text-[var(--step--2)] transition-colors duration-300",
                      hover?.abbr === s.abbr ? "border-[rgba(179,212,255,0.7)] bg-[color-mix(in_srgb,#7fb6ff_10%,transparent)] !text-[var(--text-hi)]" : "border-[var(--line-strong)] !text-[var(--text-mid)]",
                    )}
                  >
                    {s.name}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div ref={root} onPointerMove={onMove} className="relative lg:col-span-7">
          <div aria-hidden className="pointer-events-none absolute -inset-[10%] -z-10 rounded-full blur-3xl [background:radial-gradient(closest-side,rgba(26,63,112,0.55),transparent_70%)]" />
          <div ref={light} aria-hidden className="pointer-events-none absolute inset-0 -z-[5] transition-[background] duration-300" />
          <svg viewBox={VIEWBOX} className="w-full" aria-hidden onPointerLeave={() => setHover(null)}>
            <defs>
              <radialGradient id="west-glow" cx="22%" cy="45%" r="42%">
                <stop offset="0%" stopColor="#4f97ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#4f97ff" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="west-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4f97ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#7fb6ff" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <rect data-west-glow width="100%" height="100%" fill="url(#west-glow)" />
            {STATES.map((s) => {
              const west = WEST.has(s.abbr);
              const active = hover?.abbr === s.abbr;
              return (
                <path
                  key={`f-${s.abbr}`}
                  d={s.d}
                  data-west-fill={west ? "" : undefined}
                  fill={west ? "url(#west-fill)" : active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}
                  className="transition-[fill] duration-300"
                  onPointerEnter={() => setHover(s)}
                  style={{ opacity: west ? undefined : 1 }}
                />
              );
            })}
            {STATES.map((s) => (
              <path
                key={`s-${s.abbr}`}
                d={s.d}
                data-state-stroke
                fill="none"
                stroke={hover?.abbr === s.abbr ? "#b3d4ff" : WEST.has(s.abbr) ? "rgba(179,212,255,0.8)" : "rgba(255,255,255,0.3)"}
                strokeWidth={hover?.abbr === s.abbr ? 1.6 : 0.9}
                strokeLinejoin="round"
                className="pointer-events-none transition-[stroke] duration-300"
              />
            ))}
            {STATES.filter((s) => WEST.has(s.abbr)).map((s) => (
              <text key={`t-${s.abbr}`} x={s.cx} y={s.cy} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontFamily="var(--font-mono)" fill="rgba(242,245,249,0.9)" className="pointer-events-none">
                {s.abbr}
              </text>
            ))}
          </svg>

          <div className="plate plate-steel absolute bottom-3 right-3 flex min-w-[230px] flex-col gap-1 px-4 py-3" aria-live="polite">
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
