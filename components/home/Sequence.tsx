"use client";

import { Fragment, useRef } from "react";
import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import { gsap, ScrollTrigger, EASE, MQ } from "@/lib/motion";
import { Plate } from "@/components/ui/Plate";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Section, SectionMark, Lines, type Surface } from "@/components/ui/Primitives";
import { HOME } from "@/lib/content/home";

type Beat = (typeof HOME.sequence.beats)[number];

/**
 * S3 — Pickup → Transit → Delivery as a pinned cinematic sequence.
 * Desktop: the stage pins for three viewports; each beat's photograph wipes in
 * through a directional mask while a telemetry card beside it advances on a graphite
 * plate, the route rail fills, the numeral flips and the copy swaps.
 * Mobile: sticky media with the beats scrolling under it — no pin.
 * Reduced motion: three stacked frames with finished diagrams.
 */
export function Sequence({ id = "sequence", surface = "deep", lead }: { id?: string; surface?: Surface; lead?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const beats = HOME.sequence.beats;

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const reduced = window.matchMedia(MQ.reduced).matches;
      const frames = el.querySelectorAll<HTMLElement>("[data-beat-frame]");
      const copies = el.querySelectorAll<HTMLElement>("[data-beat-copy]");
      const nodes = el.querySelectorAll<HTMLElement>("[data-rail-node]");
      const fill = el.querySelector<HTMLElement>("[data-rail-fill]");
      const odo = el.querySelector<HTMLElement>("[data-odo]");
      const numerals = el.querySelectorAll<HTMLElement>("[data-beat-num]");
      if (!frames.length) return;

      const setActive = (i: number, instant = false) => {
        frames.forEach((f, j) => {
          const on = j === i;
          if (instant) {
            gsap.set(f, { clipPath: on ? "inset(0% 0% 0% 0%)" : j < i ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)", autoAlpha: on || j < i ? 1 : 0 });
          } else {
            gsap.to(f, {
              clipPath: on ? "inset(0% 0% 0% 0%)" : j < i ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)",
              autoAlpha: on || j < i ? 1 : 0,
              duration: 1.1,
              ease: EASE.inOut,
              overwrite: true,
            });
            const img = f.querySelector("[data-plate-img]");
            if (img && on) gsap.fromTo(img, { scale: 1.12, xPercent: 2 }, { scale: 1.04, xPercent: 0, duration: 2.6, ease: EASE.out, overwrite: true });
          }
          f.setAttribute("data-active", on ? "true" : "false");
        });
        copies.forEach((c) => {
          const on = Number(c.dataset.beatIndex) === i;
          const j = Number(c.dataset.beatIndex);
          if (instant) gsap.set(c, { autoAlpha: on ? 1 : 0, y: 0 });
          else gsap.to(c, { autoAlpha: on ? 1 : 0, y: on ? 0 : j < i ? -24 : 24, duration: 0.7, ease: EASE.out, overwrite: true });
        });
        nodes.forEach((n, j) => n.setAttribute("data-on", j <= i ? "true" : "false"));
        numerals.forEach((n, j) => n.setAttribute("data-on", j === i ? "true" : "false"));
      };

      if (reduced) {
        frames.forEach((f) => gsap.set(f, { clipPath: "none", autoAlpha: 1 }));
        copies.forEach((c) => gsap.set(c, { autoAlpha: 1 }));
        nodes.forEach((n) => n.setAttribute("data-on", "true"));
        if (fill) gsap.set(fill, { scaleX: 1 });
        return;
      }

      const mm = gsap.matchMedia();
      mm.add(MQ.desktop, () => {
        let active = -1;
        setActive(0, true);
        const stage = el.querySelector<HTMLElement>("[data-stage]");
        const st = ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: `+=${beats.length * 118}%`,
          pin: stage ?? el,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 1,
          invalidateOnRefresh: true,
          snap: {
            snapTo: (v) => Math.round(v * beats.length) / beats.length,
            duration: { min: 0.15, max: 0.4 },
            delay: 0.08,
            ease: EASE.settle,
            inertia: false,
          },
          onUpdate: (self) => {
            const p = self.progress;
            const i = Math.min(beats.length - 1, Math.floor(p * beats.length + 0.0001));
            if (i !== active) {
              const instant = active === -1;
              active = i;
              setActive(i, instant);
            }
            if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;
            if (odo) odo.textContent = `${String(Math.round(p * 100)).padStart(3, "0")}`;
          },
          onRefresh: (self) => {
            const i = Math.min(beats.length - 1, Math.floor(self.progress * beats.length + 0.0001));
            active = i;
            setActive(i, true);
          },
        });
        return () => st.kill();
      });

      mm.add(MQ.mobile, () => {
        // sticky media: the beat whose copy is nearest the viewport center is active
        let active = -1;
        setActive(0, true);
        const items = el.querySelectorAll<HTMLElement>("[data-beat-copy-m]");
        const st = ScrollTrigger.create({
          trigger: el,
          start: "top 70%",
          end: "bottom 30%",
          onUpdate: (self) => {
            const mid = window.innerHeight * 0.62;
            let best = 0;
            let bestD = Infinity;
            items.forEach((it, i) => {
              const r = it.getBoundingClientRect();
              const d = Math.abs(r.top + r.height / 2 - mid);
              if (d < bestD) {
                bestD = d;
                best = i;
              }
            });
            if (best !== active) {
              const instant = active === -1;
              active = best;
              setActive(best, instant);
            }
            if (fill) fill.style.transform = `scaleX(${self.progress.toFixed(4)})`;
          },
        });
        return () => st.kill();
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Section surface={surface} id={id} ariaLabelledBy={`${id}-title`} head="index" flush className="overflow-clip">
      <div ref={root} className="relative">
        {/* ---------------- desktop: pinned stage ---------------- */}
        <div data-stage className="relative hidden min-h-[100svh] flex-col justify-between lg:flex">
          <div className="absolute inset-0">
            {beats.map((b, i) => (
              <div key={b.slot} data-beat-frame className="absolute inset-0" style={{ clipPath: i === 0 ? "inset(0% 0% 0% 0%)" : "inset(0% 100% 0% 0%)" }}>
                <Plate slot={b.slot} sizes="100vw" aspect="fill" parallax={0} reveal={false} overscan={1.04} grade="deep" dim={0.9} className="!absolute inset-0 h-full w-full" />
              </div>
            ))}
            <div aria-hidden className="absolute inset-0 scrim-left-soft" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-[55%] scrim-bottom" />
            <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-50" />
          </div>

          <div className="shell relative z-10 flex flex-1 flex-col justify-between py-[clamp(4rem,8vh,6rem)]">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-5">
                <SectionMark index={HOME.sequence.mark.index} label={HOME.sequence.mark.label} />
                <h2 id={`${id}-title`} className="display-lg max-w-[10ch]">
                  {beats.map((b, i) => (
                    <span key={b.title} data-beat-num data-on={i === 0 ? "true" : "false"} className="mr-[0.25em] inline-block transition-colors duration-700 data-[on=false]:text-[rgba(242,245,249,0.32)]">
                      {b.title}.
                    </span>
                  ))}
                </h2>
              </div>
              <div className="plate hidden min-w-[180px] flex-col gap-1 px-5 py-4 xl:flex">
                <span className="label">Progress</span>
                <span className="numeral text-[var(--step-2)] text-[var(--text-hi)]">
                  <span data-odo>000</span>
                  <span className="text-[var(--text-low)]"> / 100</span>
                </span>
              </div>
            </div>

            <div className="grid items-end gap-10 lg:grid-cols-12">
              {/* copy */}
              <div className="relative min-h-[11rem] lg:col-span-5">
                {beats.map((b, i) => (
                  <div key={b.title} data-beat-copy data-beat-index={i} className="absolute inset-x-0 bottom-0 flex flex-col gap-4" style={{ opacity: i === 0 ? 1 : 0 }}>
                    <span className="spec !text-[rgba(179,212,255,0.9)]">{b.spec}</span>
                    <h3 className="display-sm">{b.title}</h3>
                    <p className="lead max-w-[40ch]">{b.text}</p>
                  </div>
                ))}
              </div>
              {/* movement telemetry */}
              <div className="relative lg:col-span-6 lg:col-start-7">
                <div className="plate plate-steel relative overflow-hidden">
                  <div aria-hidden className="pointer-events-none absolute inset-0 guides" />
                  <div className="relative aspect-[16/10] p-6">
                    {beats.map((b, i) => (
                      <div key={b.slot} data-beat-copy data-beat-index={i} className="absolute inset-0 flex flex-col justify-between p-6" style={{ opacity: i === 0 ? 1 : 0 }}>
                        <div className="flex items-baseline justify-between">
                          <span className="label">Movement</span>
                          <span className="numeral text-[var(--step--2)] text-[var(--text-low)]">
                            <span className="text-[var(--text-hi)]">{String(i + 1).padStart(2, "0")}</span> / {String(beats.length).padStart(2, "0")}
                          </span>
                        </div>
                        <dl className="grid grid-cols-[minmax(6rem,8rem)_1fr] gap-x-6 gap-y-3 border-y border-[var(--line)] py-5">
                          {b.readout.map((r) => (
                            <Fragment key={r.label}>
                              <dt className="spec self-center">{r.label}</dt>
                              <dd className="font-display text-[var(--step-0)] font-medium leading-snug text-[var(--text-hi)]">{r.value}</dd>
                            </Fragment>
                          ))}
                        </dl>
                        {/* Same rule as the other rails: the beat title sits
                            UNDER the line, not beside it. Beside it, each beat's
                            differently-sized title gave its own rail a different
                            width, and the nodes slid sideways during the
                            cross-fade between beats. */}
                        <div className="relative flex flex-col gap-2.5">
                          <div className="relative h-px w-full bg-[var(--line-strong)]">
                            <div
                              className="absolute inset-y-0 left-0 origin-left bg-[rgba(179,212,255,0.85)] transition-[width] duration-700"
                              style={{ width: `${(i / (beats.length - 1)) * 100}%` }}
                            />
                            {beats.map((n, j) => (
                              <span
                                key={n.title}
                                aria-hidden
                                data-on={j <= i ? "true" : "false"}
                                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(179,212,255,0.55)] bg-[var(--surface-raised)] data-[on=true]:bg-[#b3d4ff]"
                                style={{ left: `${(j / (beats.length - 1)) * 100}%` }}
                              />
                            ))}
                          </div>
                          <span className="spec">{b.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Route rail, full width on its own row. As a `flex-1` sibling of
                the lead it was giving up 673px — 45% of the shell — so the
                beat nodes sat bunched into the left half of the section. */}
            <div className="relative mt-10 flex flex-col gap-3">
              <div className="relative h-px w-full bg-[var(--line-strong)]">
                <div data-rail-fill className="absolute inset-y-0 left-0 w-full origin-left bg-[rgba(179,212,255,0.85)]" style={{ transform: "scaleX(0)" }} />
                {beats.map((b, i) => (
                  <span
                    key={b.title}
                    data-rail-node
                    data-on={i === 0 ? "true" : "false"}
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(179,212,255,0.6)] bg-[var(--surface)] transition-colors duration-500 data-[on=true]:bg-[#b3d4ff]"
                    style={{ left: `${(i / (beats.length - 1)) * 100}%` }}
                  />
                ))}
              </div>
              <span className="spec">{lead ?? HOME.sequence.lead}</span>
            </div>
          </div>
        </div>

        {/* ---------------- mobile: sticky media + scrolling beats ---------------- */}
        <div className="lg:hidden">
          <div className="shell flex flex-col gap-6 pt-[clamp(4rem,9vw,6rem)]">
            <SectionMark index={HOME.sequence.mark.index} label={HOME.sequence.mark.label} />
            <RevealText as="h2" className="display-md">
              <Lines text={HOME.sequence.title} />
            </RevealText>
            <Reveal>
              <p className="lead">{lead ?? HOME.sequence.lead}</p>
            </Reveal>
          </div>
          <div className="sticky top-[var(--nav-h)] z-[1] mt-8">
            <div className="relative h-[52svh] overflow-hidden">
              {beats.map((b, i) => (
                <div key={b.slot} data-beat-frame className="absolute inset-0" style={{ clipPath: i === 0 ? "inset(0% 0% 0% 0%)" : "inset(0% 100% 0% 0%)" }}>
                  <Plate slot={b.slot} sizes="100vw" aspect="fill" parallax={0} reveal={false} overscan={1.04} grade="deep" className="!absolute inset-0 h-full w-full" />
                </div>
              ))}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 scrim-bottom" />
              <div className="absolute inset-x-0 bottom-0 px-[var(--spacing-gutter)] pb-4">
                <div className="relative h-px bg-[var(--line-strong)]">
                  <div data-rail-fill className="absolute inset-y-0 left-0 w-full origin-left bg-[rgba(179,212,255,0.85)]" style={{ transform: "scaleX(0)" }} />
                </div>
              </div>
            </div>
          </div>
          <ol className="shell relative z-[2] flex flex-col gap-12 py-12">
            {beats.map((b, i) => (
              <li key={b.title} data-beat-copy-m className="flex flex-col gap-4">
                <span className="spec !text-[rgba(179,212,255,0.9)]">{b.spec}</span>
                <h3 className="display-sm">{b.title}</h3>
                <p className="lead">{b.text}</p>
                <dl className="plate plate-steel grid grid-cols-[minmax(5.5rem,6.5rem)_1fr] gap-x-4 gap-y-3 px-5 py-4 min-[400px]:grid-cols-[minmax(6rem,8rem)_1fr] min-[400px]:gap-x-6">
                  {b.readout.map((r) => (
                    <Fragment key={r.label}>
                      <dt className="spec self-center">{r.label}</dt>
                      <dd className="font-display text-[var(--step-0)] font-medium leading-snug text-[var(--text-hi)]">{r.value}</dd>
                    </Fragment>
                  ))}
                </dl>
                <span className="sr-only">{`Step ${i + 1} of ${beats.length}`}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
