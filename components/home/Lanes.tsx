"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import { gsap, Flip, EASE, MQ } from "@/lib/motion";
import { Plate } from "@/components/ui/Plate";
import { RevealText, Reveal } from "@/components/ui/Reveal";
import { Section, SectionMark, Lines } from "@/components/ui/Primitives";
import { LightSweep } from "@/components/ui/LightSweep";
import { useTilt } from "@/components/ui/Tilt";
import { HOME } from "@/lib/content/home";

type Item = (typeof HOME.lanes.items)[number];

/**
 * S2 — audience paths as three dimensional panels. The active panel grows
 * (GSAP Flip), the others compress and cool; the active photograph settles
 * from a slow dolly and takes a light sweep. Arrow keys move the focus.
 * On touch it is a snap carousel and the panel in view is the active one.
 * The section rises over the pinned hero under an opening clip-path.
 */
export function Lanes() {
  const root = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const items = HOME.lanes.items;

  /* ---- entrance: the section opens over the hero ---- */
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const reduced = window.matchMedia(MQ.reduced).matches;
      if (reduced) {
        gsap.set(el, { clipPath: "inset(0% 0% 0% 0% round 0px)" });
        return;
      }
      gsap.fromTo(
        el,
        { clipPath: "inset(0% 3% 0% 3% round 22px)" },
        { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top 12%", scrub: 0.5 } },
      );
    },
    { scope: root },
  );

  /* ---- Flip between layouts on desktop ---- */
  useGSAP(
    () => {
      const el = row.current;
      if (!el) return;
      const panels = Array.from(el.querySelectorAll<HTMLElement>("[data-lane]"));
      if (!panels.length) return;
      const reduced = window.matchMedia(MQ.reduced).matches;
      const desktop = window.matchMedia(MQ.desktop).matches;
      if (!desktop) return;
      const state = Flip.getState(panels);
      panels.forEach((p, i) => {
        p.setAttribute("data-active", engaged && i === active ? "true" : "false");
        p.setAttribute("data-dim", engaged && i !== active ? "true" : "false");
      });
      if (reduced) return;
      Flip.from(state, { duration: 0.9, ease: EASE.inOut, absolute: false, nested: true });
      panels.forEach((p, i) => {
        const img = p.querySelector("[data-plate-img]");
        if (!img) return;
        gsap.to(img, { scale: engaged && i === active ? 1.0 : 1.06, duration: 1.4, ease: EASE.out, overwrite: "auto" });
      });
    },
    { scope: row, dependencies: [active, engaged] },
  );

  /* ---- touch: the panel in view is the active one ---- */
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    if (window.matchMedia(MQ.desktop).matches) return;
    const panels = Array.from(el.querySelectorAll<HTMLElement>("[data-lane]"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const i = panels.indexOf(e.target as HTMLElement);
            if (i >= 0) {
              setActive(i);
              setEngaged(true);
            }
          }
        });
      },
      { root: el, threshold: [0.6] },
    );
    panels.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, []);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (active + 1) % items.length : (active - 1 + items.length) % items.length;
    setActive(next);
    setEngaged(true);
    row.current?.querySelectorAll<HTMLAnchorElement>("[data-lane-link]")[next]?.focus();
  };

  return (
    <Section surface="navy" id="lanes" ariaLabelledBy="lanes-title" head="editorial" className="relative z-[2] overflow-clip">
      <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-70" />
      <div className="shell relative flex flex-col gap-10 lg:gap-12">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-6 border-t border-[var(--line-strong)] pt-4">
            <SectionMark index={HOME.lanes.mark.index} label={HOME.lanes.mark.label} />
            <span aria-hidden className="hidden h-px flex-1 bg-[var(--line)] sm:block" />
            <span className="spec hidden sm:inline">Select a lane</span>
          </div>
          <RevealText as="h2" id="lanes-title" className="display-md max-w-[16ch]">
            <Lines text={HOME.lanes.title} />
          </RevealText>
        </div>

        <div
          ref={row}
          role="list"
          aria-label="Ways to work with Solidify"
          onKeyDown={onKey}
          onPointerLeave={() => setEngaged(false)}
          className="-mx-[var(--spacing-gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--spacing-gutter)] pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-[1fr_1fr_1fr] lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((it, i) => (
            <Lane key={it.href} item={it} i={i} onEnter={() => { setActive(i); setEngaged(true); }} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function Lane({ item, i, onEnter }: { item: Item; i: number; onEnter: () => void }) {
  const card = useRef<HTMLElement>(null);
  /* The Flip transition owns flex-basis; the tilt owns rotation and z, so the
     two never write the same property. */
  useTilt(card, { max: 5, lift: 18 });

  return (
    <article
      ref={card}
      role="listitem"
      data-lane
      data-active="false"
      data-dim="false"
      onPointerEnter={onEnter}
      onFocus={onEnter}
      className={clsx(
        "group/lane relative isolate w-[84vw] flex-none snap-center overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-raised)] steel-edge transition-[filter] duration-700 lg:w-auto lg:flex-auto",
        "lg:[flex-basis:33.333%] lg:data-[active=true]:[flex-basis:50%] lg:data-[dim=true]:[flex-basis:25%]",
        "lg:data-[dim=true]:saturate-[.55] lg:data-[dim=true]:brightness-[.72]",
      )}
      style={{ minHeight: "clamp(440px, 62svh, 640px)" }}
    >
      <Plate slot={item.slot} sizes="(max-width: 1024px) 84vw, 40vw" aspect="fill" parallax={0} reveal={false} overscan={1.06} grade="cool" className="!absolute inset-0 h-full w-full" />
      <div aria-hidden className="absolute inset-0 z-[1] bg-gradient-to-t from-[rgba(5,7,11,0.92)] via-[rgba(5,7,11,0.35)] to-transparent" />
      {/* The index and the kicker sit over whatever the photograph happens to
          be doing at the top of the frame. On the bright inventory frames that
          was white type on white roofs, so the top gets its own ground. */}
      <div aria-hidden className="absolute inset-x-0 top-0 z-[1] h-[34%] bg-gradient-to-b from-[rgba(5,7,11,0.72)] via-[rgba(5,7,11,0.28)] to-transparent" />
      <div aria-hidden className="absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-[rgba(179,212,255,0.5)] to-transparent opacity-0 transition-opacity duration-500 group-data-[active=true]/lane:opacity-100" />
      <LightSweep trigger="hover" className="z-[1]" />

      <div className="absolute inset-x-0 top-0 z-[2] flex items-start justify-between p-5 lg:p-6">
        <span className="index-xl !text-[clamp(1.8rem,1.4rem+1.4vw,2.6rem)] !text-[rgba(242,245,249,0.85)]" aria-hidden>
          {item.index}
        </span>
        <span className="spec !text-[rgba(242,245,249,0.8)]">{item.kicker}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-3 p-5 lg:p-6">
        <span aria-hidden className="h-px w-10 bg-[rgba(179,212,255,0.7)] transition-[width] duration-700 group-data-[active=true]/lane:w-20" />
        <h3 className="display-sm max-w-[12ch] text-[var(--text-hi)]">{item.title}</h3>
        <p className="body max-w-[38ch] !text-[rgba(242,245,249,0.82)] lg:max-h-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-700 lg:group-data-[active=true]/lane:max-h-40 lg:group-data-[active=true]/lane:opacity-100">
          {item.text}
        </p>
        <Link data-lane-link href={item.href} className="link-trace w-fit !text-[var(--text-hi)]" aria-label={`${item.title} — ${item.cta}`}>
          {item.cta}
        </Link>
      </div>
      <Link href={item.href} aria-hidden tabIndex={-1} className="absolute inset-0 z-[1]" />
    </article>
  );
}
