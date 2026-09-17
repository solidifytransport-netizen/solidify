"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import { gsap, ScrollTrigger, EASE, MQ } from "@/lib/motion";
import { Plate } from "@/components/ui/Plate";
import { Section, SectionMark, SpecStrip, Lines } from "@/components/ui/Primitives";
import { RevealText, Reveal } from "@/components/ui/Reveal";
import { COMPENSATION, INSURANCE } from "@/lib/site";

/**
 * S6 — the owner-operator road: a pinned horizontal sequence of four frames
 * (the equipment · the terms · the insurance · the hauler drawn), with a
 * route hairline along the base and a mono odometer. Native scroll-snap on
 * touch; a vertical stack under reduced motion.
 */
export function Road({ id = "road" }: { id?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const reduced = window.matchMedia(MQ.reduced).matches;
      const track = el.querySelector<HTMLElement>("[data-track]");
      const frames = el.querySelectorAll<HTMLElement>("[data-frame]");
      const odo = el.querySelector<HTMLElement>("[data-odo]");
      const fill = el.querySelector<HTMLElement>("[data-fill]");
      if (!track || !frames.length || reduced) return;

      const mm = gsap.matchMedia();
      mm.add(MQ.desktop, () => {
        const distance = () => track.scrollWidth - el.clientWidth;
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${distance() + frames.length * 200 + window.innerHeight * 0.4}`,
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: 1,
            invalidateOnRefresh: true,
            snap: {
              snapTo: (v) => Math.round(v * (frames.length - 1)) / (frames.length - 1),
              duration: { min: 0.15, max: 0.45 },
              delay: 0.06,
              ease: EASE.settle,
              inertia: false,
            },
            onUpdate: (self) => {
              if (odo) odo.textContent = String(Math.round(self.progress * 100)).padStart(3, "0");
              if (fill) fill.style.transform = `scaleX(${self.progress.toFixed(4)})`;
              const center = el.clientWidth / 2;
              frames.forEach((f) => {
                const r = f.getBoundingClientRect();
                const c = r.left + r.width / 2;
                f.setAttribute("data-centered", Math.abs(c - center) < r.width * 0.55 ? "true" : "false");
              });
            },
          },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Section surface="deep" id={id} ariaLabelledBy={`${id}-title`} head="index" flush className="overflow-clip">
      <div ref={root} data-road-stage className="relative lg:min-h-[100svh] lg:overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-40" />
        <div className="shell relative z-10 flex items-end justify-between gap-6 pt-[clamp(4rem,8vw,6rem)] lg:absolute lg:inset-x-0 lg:top-0 lg:pt-[calc(var(--nav-h)+1.5rem)]">
          <div className="flex flex-col gap-4">
            <SectionMark index={2} label="Why run with Solidify" />
            <RevealText as="h2" id={`${id}-title`} className="display-sm max-w-[22ch]">
              <Lines text={["Equipment, terms, coverage."]} />
            </RevealText>
          </div>
          <div className="plate hidden min-w-[160px] flex-col gap-1 px-5 py-4 lg:flex">
            <span className="label">Road</span>
            <span className="numeral text-[var(--step-2)] text-[var(--text-hi)]">
              <span data-odo>000</span>
              <span className="text-[var(--text-low)]"> / 100</span>
            </span>
          </div>
        </div>

        {/* The clearance below is FIXED px, not an svh fraction: the heading
            above is absolutely positioned and its height comes from type and
            --nav-h, so it measures the same at every viewport. A fraction
            under-shoots on a short laptop and the cards ride up over it. */}
        <div
          data-track
          className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[var(--spacing-gutter)] pb-8 [scrollbar-width:none] lg:mt-0 lg:items-stretch lg:overflow-visible lg:pb-[5.75rem] lg:pt-[calc(var(--nav-h)+8.25rem)] [&::-webkit-scrollbar]:hidden"
        >
          {/* 01 equipment */}
          <Frame index="01" label="The equipment" wide>
            <div className="absolute inset-0">
              <Plate slot="road-1" sizes="(max-width: 1024px) 88vw, 60vw" aspect="fill" parallax={0} reveal={false} overscan={1.04} grade="cool" className="!absolute inset-0 h-full w-full" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(5,7,11,0.9)] via-[rgba(5,7,11,0.25)] to-transparent" />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 lg:p-8">
              <h3 className="display-sm max-w-[14ch]">A car hauler's decks and ramps, from above.</h3>
              <p className="body max-w-[44ch] !text-[rgba(242,245,249,0.85)]">Your Truck / Power Unit and trailer are identified by VIN, make, model, year and capacity when you apply.</p>
            </div>
          </Frame>

          {/* 02 terms */}
          <Frame index="02" label="The terms">
            <div className="flex flex-1 flex-col justify-between gap-8 p-6 lg:p-8">
              <h3 className="display-sm max-w-[12ch]">Paid on the line haul. Net 30.</h3>
              <SpecStrip
                items={[
                  { label: "Compensation", value: COMPENSATION.basis },
                  { label: "Payment terms", value: COMPENSATION.terms },
                ]}
                tone="quiet"
              />
            </div>
          </Frame>

          {/* 03 insurance */}
          <Frame index="03" label="The coverage you carry" wide>
            <div className="flex flex-1 flex-col justify-between gap-3 p-6 lg:p-8">
              <div className="flex flex-col gap-2">
                <h3 className="title max-w-[16ch]">Coverage every operator carries.</h3>
                <p className="small max-w-[52ch]">Sent by your insurance agent, at these minimums.</p>
              </div>
              <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
                {INSURANCE.requirements.map((r) => (
                  <div key={r.id} className="flex flex-col gap-0.5 bg-[var(--surface-raised)] p-3">
                    <span className="label">{r.label}</span>
                    <span className="numeral text-[var(--step-1)] font-medium text-[var(--text-hi)]">{r.limit}</span>
                    <span className="spec !text-[var(--text-low)]">{r.note}</span>
                  </div>
                ))}
              </div>
              {/* One line, not three. This card carries the most content on the
                  track and therefore sets the height for all four; stacking the
                  holder address cost ~50px that a 768px-tall laptop does not
                  have. The address itself is unchanged and still verbatim. */}
              <div className="flex flex-col gap-0.5">
                <span className="label">Certificate holder · additional insured</span>
                <span className="small !text-[var(--text-hi)]">{INSURANCE.certificateHolder.join(", ")}</span>
              </div>
            </div>
          </Frame>

          {/* 04 the load */}
          <Frame index="04" label="The load" wide>
            <div className="absolute inset-0">
              <Plate slot="road-2" sizes="(max-width: 1024px) 88vw, 62vw" aspect="fill" parallax={0} reveal={false} overscan={1.04} grade="deep" className="!absolute inset-0 h-full w-full" />
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,11,0.15),rgba(5,7,11,0.9))]" />
            </div>
            <div className="relative flex flex-1 flex-col justify-end gap-4 p-6 lg:p-8">
              <h3 className="display-sm max-w-[16ch]">Every vehicle strapped down and carried.</h3>
              <p className="small max-w-[52ch]">Vehicle loads across all 48 contiguous states, with strong Western-US coverage. Review the opportunity and requirements, then continue to the driver application.</p>
            </div>
          </Frame>
        </div>

        {/* route hairline */}
        <div className="shell relative z-10 pb-10 lg:absolute lg:inset-x-0 lg:bottom-0 lg:pb-8">
          <div className="relative h-px bg-[var(--line-strong)]">
            <div data-fill className="absolute inset-y-0 left-0 w-full origin-left bg-[rgba(179,212,255,0.85)]" style={{ transform: "scaleX(0)" }} />
          </div>
          <Reveal className="mt-3 flex justify-between">
            <span className="spec">Equipment · Terms · Coverage · The hauler</span>
            <span className="spec !text-[var(--text-low)]">Scroll</span>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

function Frame({ index, label, wide = false, children }: { index: string; label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <article
      data-frame
      data-centered="false"
      className={clsx(
        "plate plate-steel relative flex flex-none snap-center flex-col overflow-hidden transition-[filter,opacity] duration-700 data-[centered=false]:lg:opacity-70",
        wide ? "w-[88vw] lg:w-[62vw]" : "w-[88vw] lg:w-[40vw]",
        "lg:min-h-0",
      )}
      style={{ minHeight: "clamp(440px, 55svh, 600px)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 guides" />
      <div className="absolute inset-x-0 top-0 z-[2] flex items-center justify-between p-5 lg:p-6">
        <span className="index-xl !text-[clamp(1.4rem,1.1rem+0.9vw,2rem)]">{index}</span>
        <span className="spec">{label}</span>
      </div>
      <div className="relative flex flex-1 flex-col pt-[3.25rem]">{children}</div>
    </article>
  );
}
