"use client";

import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import { gsap, ScrollTrigger, Flip, EASE, MQ } from "@/lib/motion";
import { Plate } from "@/components/ui/Plate";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Section, SectionMark, Lines } from "@/components/ui/Primitives";
import type { MediaId } from "@/lib/media";

type Panel = {
  title: string;
  text: string;
  slot: MediaId;
  kicker?: string;
};

/**
 * Why a vehicle moves — a cinematic horizontal media story.
 *
 * Six photographic panels on one pinned stage. Vertical scroll drives the
 * strip sideways; the panel nearest the reading line expands (GSAP Flip),
 * its photograph settles from a slow push-in, and the neighbours compress
 * and cool. A route line under the strip carries one node per panel.
 *
 * Every panel is a photograph. Nothing here is a drawing.
 *
 * Touch: a snap carousel with the same active state, no pin.
 * Reduced motion: a static grid, every frame legible.
 */
/** Scroll travel each panel owns, in px, on top of the horizontal distance. */
const SETTLE = 190;

const PANELS: readonly Panel[] = [
  { title: "Relocating", text: "Moving across the state or across the country, and one vehicle needs to arrive with you.", slot: "cs-situation-1" },
  { title: "Buying out of state", text: "Found the right vehicle in another state. The carrier picks it up and delivers it to your door.", slot: "cs-situation-2" },
  { title: "Seasonal moves", text: "A vehicle that spends part of the year somewhere else, moved each way by the same carrier.", slot: "cs-situation-3" },
  { title: "Students and military", text: "A car that needs to be at a campus or a new duty station without adding miles to get there.", slot: "cs-situation-4" },
  { title: "Family vehicles", text: "Sending a car to a family member, or bringing one home.", slot: "cs-situation-5" },
  { title: "Dealer transfers", text: "Dealerships move vehicles the same way. See how we work with OEMs and dealerships.", slot: "cs-situation-6", kicker: "Commercial" },
];

export function Situations() {
  const root = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  /** Flip the strip to the new active index without re-rendering the photographs. */
  const flipTo = useCallback((next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = gsap.utils.toArray<HTMLElement>("[data-sit]", track);
    if (!cards.length) return;
    const state = Flip.getState(cards);
    cards.forEach((el, i) => el.setAttribute("data-on", i === next ? "true" : "false"));
    Flip.from(state, { duration: 0.85, ease: EASE.inOut, nested: true, absolute: false });
    cards.forEach((el, i) => {
      const img = el.querySelector<HTMLElement>("[data-plate-img]");
      if (img) gsap.to(img, { scale: i === next ? 1.0 : 1.08, duration: 1.4, ease: EASE.out, overwrite: "auto" });
    });
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      const track = trackRef.current;
      if (!el || !track) return;
      const fill = el.querySelector<HTMLElement>("[data-fill]");
      const reduced = window.matchMedia(MQ.reduced).matches;
      if (reduced) {
        if (fill) gsap.set(fill, { scaleX: 1 });
        return;
      }

      const mm = gsap.matchMedia();

      mm.add(MQ.desktop, () => {
        const distance = () => Math.max(0, track.scrollWidth - el.clientWidth);
        const st = ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: () => "+=" + (distance() + PANELS.length * SETTLE + window.innerHeight * 0.5),
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 1,
          invalidateOnRefresh: true,
          snap: {
            snapTo: (v) => Math.round(v * (PANELS.length - 1)) / (PANELS.length - 1),
            duration: { min: 0.15, max: 0.45 },
            delay: 0.06,
            ease: EASE.settle,
            inertia: false,
          },
          onUpdate: (self) => {
            const p = self.progress;
            gsap.set(track, { x: -p * distance() });
            if (fill) fill.style.transform = `scaleX(${p})`;
            /* Active comes from progress, not from whichever panel happens to
               be nearest a fixed reading line. The line version made panel 02
               active at progress 0 — the section opened already scrolled. */
            const best = Math.round(p * (PANELS.length - 1));
            if (best !== activeRef.current) {
              activeRef.current = best;
              setActive(best);
              flipTo(best);
            }
          },
        });
        return () => st.kill();
      });

      mm.add(MQ.mobile, () => {
        const io = new IntersectionObserver(
          (entries) => {
            const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (!hit) return;
            const i = Number((hit.target as HTMLElement).dataset.index ?? 0);
            if (i !== activeRef.current) {
              activeRef.current = i;
              setActive(i);
            }
          },
          { root: track, threshold: [0.6] },
        );
        gsap.utils.toArray<HTMLElement>("[data-sit]", track).forEach((c) => io.observe(c));
        return () => io.disconnect();
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [flipTo] },
  );

  return (
    <Section surface="navy" id="situations" ariaLabelledBy="situations-title" head="editorial" flush className="overflow-clip">
      <div ref={root} className="relative flex min-h-[100svh] flex-col justify-center gap-10 py-[clamp(4rem,8vh,6rem)] lg:gap-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-40" />

        <div className="shell relative flex flex-col gap-7">
          <div className="flex items-center gap-5">
            <SectionMark index={2} label="Why a vehicle moves" />
            <span aria-hidden className="h-px flex-1 bg-[var(--line)]" />
            <span className="spec hidden sm:block">Six situations</span>
          </div>
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
            <RevealText as="h2" id="situations-title" className="display-md max-w-[15ch] lg:col-span-7" mode="lines">
              <Lines text={["Common reasons", "people ship a vehicle."]} />
            </RevealText>
            <Reveal className="lg:col-span-5 lg:justify-self-end">
              <p className="lead lg:max-w-[38ch]">
                Whatever the reason, the vehicle rides on a car carrier — loaded, secured and unloaded by the carrier — with no miles added.
              </p>
            </Reveal>
          </div>
        </div>

        {/* the strip */}
        <div className="relative w-full overflow-hidden">
          <div
            ref={trackRef}
            className="-mx-[var(--spacing-gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-gutter pb-3 [scrollbar-width:none] lg:mx-0 lg:snap-none lg:overflow-visible lg:pl-gutter lg:pr-[38vw]"
          >
            {PANELS.map((p, i) => (
              <article
                key={p.title}
                data-sit
                data-index={i}
                data-on={i === 0 ? "true" : "false"}
                className={clsx(
                  "group relative flex w-[80vw] flex-none snap-center flex-col justify-end overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] transition-[border-color] duration-500",
                  "min-h-[clamp(400px,62svh,600px)] sm:w-[56vw]",
                  "lg:w-[26vw] lg:data-[on=true]:w-[36vw] lg:data-[on=false]:opacity-[0.68] lg:data-[on=true]:border-[rgba(179,212,255,0.35)]",
                )}
              >
                <Plate
                  slot={p.slot}
                  sizes="(max-width: 640px) 80vw, (max-width: 1024px) 56vw, 36vw"
                  aspect="fill"
                  parallax={0}
                  reveal={false}
                  overscan={1.08}
                  grade="deep"
                  className="!absolute inset-0 h-full w-full"
                />
                <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,11,0.62)_0%,rgba(5,7,11,0.12)_34%,rgba(5,7,11,0.93)_100%)]" />
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-data-[on=true]:opacity-100 group-data-[on=true]:[background:radial-gradient(120%_80%_at_20%_100%,rgba(79,151,255,0.16),transparent_62%)]" />

                <div className="relative flex items-start justify-between p-5 lg:p-6">
                  <span className="numeral text-[clamp(1.6rem,1.2rem+1.2vw,2.4rem)] leading-none text-[rgba(242,245,249,0.72)] transition-colors duration-500 group-data-[on=true]:text-[rgba(179,212,255,0.95)]">{String(i + 1).padStart(2, "0")}</span>
                  {p.kicker ? <span className="spec">{p.kicker}</span> : null}
                </div>

                <div className="relative mt-auto flex flex-col gap-3 p-5 lg:p-6">
                  <span aria-hidden className="h-px w-10 bg-[rgba(179,212,255,0.8)] transition-all duration-700 group-data-[on=true]:w-20" />
                  <h3 className="display-sm max-w-[13ch]">{p.title}</h3>
                  <p className="body max-w-[36ch] !text-[rgba(242,245,249,0.85)] lg:max-h-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-700 lg:group-data-[on=true]:max-h-40 lg:group-data-[on=true]:opacity-100">
                    {p.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* The rail gets its own row at full shell width, with the readout on a
            line beneath it.

            It used to be `flex-1` next to a `whitespace-nowrap` label whose
            text changes with the active step. A fixed-width sibling in a flex
            row sets the rail's width, so every step change re-measured the
            rail and shifted the nodes, the fill and the travelling head
            sideways — and the line never sat centred in the section, because
            the label was eating the right fifth of it. The readout is now
            left-aligned under the rail, so it grows rightward from a fixed
            origin and moves nothing. */}
        {/* One node per situation. */}
        <div className="shell relative flex flex-col gap-3">
          <div className="relative h-px w-full bg-[var(--line-strong)]">
            <div data-fill className="absolute inset-y-0 left-0 w-full origin-left bg-[rgba(179,212,255,0.85)]" style={{ transform: "scaleX(0)" }} />
            {PANELS.map((p, i) => (
              <span
                key={p.title}
                aria-hidden
                data-on={i <= active ? "true" : "false"}
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(179,212,255,0.55)] bg-[var(--surface)] transition-colors duration-500 data-[on=true]:bg-[#b3d4ff]"
                style={{ left: `${(i / (PANELS.length - 1)) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex items-baseline justify-between gap-6">
            <span className="spec" aria-live="polite">
              {String(active + 1).padStart(2, "0")} / {String(PANELS.length).padStart(2, "0")} · {PANELS[active].title}
            </span>
            <span className="spec !text-[var(--text-low)]">Scroll</span>
          </div>
        </div>
      </div>
    </Section>
  );
}
