"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, EASE, MQ } from "@/lib/motion";
import { Plate } from "@/components/ui/Plate";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Section, SectionMark, Lines } from "@/components/ui/Primitives";
import type { MediaId } from "@/lib/media";

type Beat = { title: string; meta: string; text: string; slot: MediaId };

/**
 * "What the job actually is" — the signature interaction of /become-a-driver.
 *
 * Deliberately a different geometry from every other pinned section on the
 * site: the application route on /owner-operators runs horizontally, the home
 * sequence is a three-beat scrub with a telemetry card, and this is a split —
 * a tall photographic column on the left that wipes between crops, and an
 * expanding list on the right where only the live beat carries its body copy.
 * Same vocabulary, different sentence.
 *
 * Everything below describes the trade, not a Solidify policy. Loading on
 * ramps, strapping through the rails and walking a vehicle round at both ends
 * is what moving cars on a hauler is; none of it is a claim about pay, hours
 * or hiring criteria, none of which have been confirmed.
 */
const BEATS: readonly Beat[] = [
  {
    title: "You load and unload it yourself",
    meta: "On the deck",
    text: "Auto transport is not drop-and-hook. You run the ramps and the hydraulic decks, and you place each vehicle by inches — angles, clearances and the order they come off in are all decided by you before the first one goes on.",
    slot: "driver-work-1",
  },
  {
    title: "Every vehicle is secured by hand",
    meta: "Tie-downs",
    text: "Wheel straps run through the tie-down rails on every unit, drawn tight and checked before you roll. They are checked again at every stop, because a strap that was right at the yard is not automatically right two hundred miles later.",
    slot: "driver-work-2",
  },
  {
    title: "The condition travels with the load",
    meta: "At both ends",
    text: "A walk-around at pickup and another at delivery, recorded either side. On a load of new vehicles the difference between the two is the entire job, which is why the paperwork on an auto-transport run carries more weight than it does hauling boxes.",
    slot: "driver-work-3",
  },
  {
    title: "You deliver to people, not docks",
    meta: "The destination",
    text: "Dealership lots, staging yards and ordinary residential streets, inside the window that was promised to whoever is waiting. Getting a full-length hauler into a tight delivery and back out again is a real part of the skill.",
    slot: "driver-work-4",
  },
];

/** Scroll travel per beat, in px, on top of the pin's own landing allowance. */
const SETTLE = 300;

export function RoleBoard() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const frames = gsap.utils.toArray<HTMLElement>("[data-beat-frame]", el);
      const fill = el.querySelector<HTMLElement>("[data-rail-fill]");

      if (window.matchMedia(MQ.reduced).matches) {
        gsap.set(frames, { clipPath: "inset(0% 0 0 0)", autoAlpha: 1 });
        if (fill) gsap.set(fill, { scaleY: 1 });
        return;
      }

      /* Only the live frame is painted; the rest are wiped shut from the top
         so the change reads as one image replacing another, not a dissolve. */
      const show = (next: number) => {
        frames.forEach((f, i) => {
          const on = i === next;
          gsap.to(f, {
            clipPath: on ? "inset(0% 0 0% 0)" : i < next ? "inset(0% 0 100% 0)" : "inset(100% 0 0% 0)",
            duration: 0.85,
            ease: EASE.veil,
            overwrite: "auto",
          });
          gsap.to(f.querySelector("[data-plate-img]"), {
            scale: on ? 1.02 : 1.1,
            duration: 1.4,
            ease: EASE.out,
            overwrite: "auto",
          });
        });
      };

      gsap.set(frames, (i: number) => ({ clipPath: i === 0 ? "inset(0% 0 0% 0)" : "inset(100% 0 0% 0)" }));

      const setActiveIndex = (i: number) => {
        const clamped = Math.max(0, Math.min(BEATS.length - 1, i));
        if (clamped === activeRef.current) return;
        activeRef.current = clamped;
        setActive(clamped);
        show(clamped);
      };

      const mm = gsap.matchMedia();

      mm.add(MQ.desktop, () => {
        const st = ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: () => "+=" + (BEATS.length * SETTLE + window.innerHeight * 0.6),
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 1,
          invalidateOnRefresh: true,
          snap: {
            snapTo: (v) => Math.round(v * (BEATS.length - 1)) / (BEATS.length - 1),
            duration: { min: 0.15, max: 0.45 },
            delay: 0.06,
            ease: EASE.settle,
            inertia: false,
          },
          onUpdate: (self) => {
            if (fill) fill.style.transform = `scaleY(${self.progress})`;
            setActiveIndex(Math.round(self.progress * (BEATS.length - 1)));
          },
        });
        return () => st.kill();
      });

      mm.add(MQ.mobile, () => {
        const io = new IntersectionObserver(
          (entries) => {
            const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (!hit) return;
            setActiveIndex(Number((hit.target as HTMLElement).dataset.index ?? 0));
          },
          { threshold: [0.5] },
        );
        gsap.utils.toArray<HTMLElement>("[data-beat-row]", el).forEach((r) => io.observe(r));
        return () => io.disconnect();
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Section surface="graphite" id="the-work" ariaLabelledBy="the-work-title" head="caption" flush className="overflow-clip">
      <div ref={root} className="relative flex min-h-[100svh] flex-col justify-center py-[clamp(4rem,8vh,6rem)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-40" />

        <div className="shell relative grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
          {/* the column */}
          <div className="hidden lg:col-span-5 lg:block">
            {/* Sized to the pinned stage rather than to an aspect ratio: a 4:5
                box left a band of empty section under the list at 1080p. */}
            <div className="relative h-[clamp(420px,70svh,780px)] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)]">
              {BEATS.map((b, i) => (
                <div key={b.slot} data-beat-frame className="absolute inset-0" style={{ zIndex: BEATS.length - i }}>
                  <Plate slot={b.slot} sizes="40vw" aspect="fill" parallax={0} reveal={false} overscan={1.02} grade="cool" dim={0.9} className="!absolute inset-0 h-full w-full" />
                  <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(5,7,11,0.78))]" />
                </div>
              ))}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-baseline justify-between p-6">
                <span className="spec !text-[var(--text-hi)]">{BEATS[active].meta}</span>
                <span className="numeral text-[var(--step--1)] text-[rgba(179,212,255,0.9)]">
                  {String(active + 1).padStart(2, "0")} / {String(BEATS.length).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          {/* the list */}
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div className="flex flex-col gap-5">
              <SectionMark index={2} label="The work" />
              <RevealText as="h2" id="the-work-title" className="display-md max-w-[17ch]" mode="lines">
                <Lines text={["Moving cars is", "its own trade."]} />
              </RevealText>
              <Reveal>
                <p className="lead">
                  If you have run dry freight, this is a different job with the same license. Four things make it different, and all four are yours to get right.
                </p>
              </Reveal>
            </div>

            <div className="relative flex gap-6 lg:gap-8">
              {/* vertical rail */}
              <div aria-hidden className="relative w-px flex-none bg-[var(--line-strong)]">
                <div data-rail-fill className="absolute inset-x-0 top-0 h-full origin-top bg-[rgba(179,212,255,0.85)]" style={{ transform: "scaleY(0)" }} />
                {BEATS.map((b, i) => (
                  <span
                    key={b.slot}
                    data-on={i <= active ? "true" : "false"}
                    className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-[rgba(179,212,255,0.55)] bg-[var(--surface)] transition-colors duration-500 data-[on=true]:bg-[#b3d4ff]"
                    style={{ top: `${(i / (BEATS.length - 1)) * 100}%` }}
                  />
                ))}
              </div>

              <ol role="list" className="flex flex-1 flex-col">
                {BEATS.map((b, i) => (
                  <li
                    key={b.slot}
                    data-beat-row
                    data-index={i}
                    data-on={i === active ? "true" : "false"}
                    className="group border-b border-[var(--line)] py-5 last:border-b-0"
                  >
                    <div className="flex items-baseline gap-4">
                      <span className="numeral text-[var(--step--2)] text-[var(--text-low)] transition-colors duration-500 group-data-[on=true]:text-[rgba(179,212,255,0.9)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="title-sm flex-1 text-[var(--text-mid)] transition-colors duration-500 group-data-[on=true]:text-[var(--text-hi)]">{b.title}</h3>
                    </div>
                    {/* the live beat is the only one carrying body copy */}
                    <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-700 ease-[var(--ease-arrive)] group-data-[on=true]:grid-rows-[1fr]">
                      <div className="overflow-hidden">
                        <p className="body max-w-[52ch] pl-9 pt-3 opacity-0 transition-opacity duration-500 group-data-[on=true]:opacity-100">{b.text}</p>
                      </div>
                    </div>
                    {/* mobile carries its own frame, since the column is desktop-only */}
                    <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-[var(--radius-card)] pl-0 lg:hidden">
                      <Plate slot={b.slot} sizes="92vw" aspect="fill" parallax={5} reveal={false} overscan={1.06} grade="cool" dim={0.9} className="!absolute inset-0 h-full w-full" />
                      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(5,7,11,0.7))]" />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
