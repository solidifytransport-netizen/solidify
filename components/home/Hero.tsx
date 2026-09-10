"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { Plate } from "@/components/ui/Plate";
import { Button } from "@/components/ui/Button";
import { RevealText, Reveal } from "@/components/ui/Reveal";
import { Lines } from "@/components/ui/Primitives";
import { HOME } from "@/lib/content/home";
import { gsap, ScrollTrigger, SplitText, EASE, supportsWebGL, MQ } from "@/lib/motion";

const HeroScene = dynamic(() => import("@/components/webgl/HeroScene").then((m) => m.HeroScene), { ssr: false });

/**
 * S1 — the signature hero. Photograph → WebGL scene → type choreography →
 * pinned scroll in which the load dollies forward, the type leaves, and the
 * next section rises over it. The <picture> and the type are complete on
 * their own: without WebGL or under reduced motion this is a still frame.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const scrollRef = useRef(0);
  const [gl, setGl] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(MQ.reduced).matches;
    setGl(!reduced && supportsWebGL());
  }, []);

  const h = HOME.hero;

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const spec = el.querySelector<HTMLElement>("[data-hero-spec]");
      const reduced = window.matchMedia(MQ.reduced).matches;

      if (reduced) return;

      /* ---- arrival: the mono spec line types itself ---- */
      let split: SplitText | null = null;
      if (spec) {
        split = new SplitText(spec, { type: "chars" });
        gsap.set(spec, { opacity: 1 });
        gsap.from(split.chars, { opacity: 0, duration: 0.02, stagger: 0.022, delay: 0.35, ease: "none" });
      }
      /* ---- the pinned scroll: the load advances, the type leaves ---- */
      const titleEl = el.querySelector<HTMLElement>("#hero-title");
      const exitTargets = el.querySelectorAll<HTMLElement>("[data-hero-exit]");
      const mm = gsap.matchMedia();
      mm.add(
        { desktop: MQ.desktop, mobile: MQ.mobile },
        (ctx) => {
          const isDesktop = ctx.conditions?.desktop;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: isDesktop ? "+=100%" : "+=80%",
              pin: true,
              pinSpacing: false,
              scrub: 0.6,
              onUpdate: (self) => {
                scrollRef.current = self.progress;
              },
            },
          });
          if (titleEl) tl.fromTo(titleEl, { y: 0, opacity: 1 }, { y: -90, opacity: 0, ease: "none", immediateRender: false }, 0);
          tl.fromTo(exitTargets, { y: 0, opacity: 1 }, { y: -60, opacity: 0, stagger: 0.04, ease: "none", immediateRender: false }, 0.05)
            .to(el.querySelector("[data-hero-rail]"), { opacity: 0, ease: "none" }, 0.2);
          return () => {
            scrollRef.current = 0;
          };
        },
      );

      return () => {
        split?.revert();
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="hero"
      data-section="hero"
      data-surface="deep"
      data-head="hero"
      data-hero
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[var(--surface)] text-[var(--text-hi)]"
      style={{ zIndex: 0 }}
    >
      {/* the scene */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: sceneReady ? 0 : 1 }}>
          <Plate slot="hero-carrier" sizes="100vw" priority aspect="fill" parallax={0} reveal={false} overscan={1.06} dim={0.88} grade="deep" className="!absolute inset-0 h-full w-full" />
        </div>
        {gl && <HeroScene className="absolute inset-0" scrollRef={scrollRef} onReady={() => setSceneReady(true)} />}
        <div aria-hidden className="absolute inset-0 scrim-left-soft opacity-90" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[52%] scrim-bottom" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[rgba(5,7,11,0.6)] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-40" />
      </div>

      <div className="shell relative z-10 flex flex-col gap-4 pb-[clamp(1.5rem,4vh,3rem)] pt-[calc(var(--nav-h)+1rem)] lg:gap-6 lg:pt-[calc(var(--nav-h)+2rem)]">
        <p data-hero-spec data-hero-exit className="spec flex flex-wrap gap-x-3 gap-y-1 !text-[var(--text-mid)] opacity-0" aria-label={h.spec}>
          {h.spec.split(" · ").map((part, i) => (
            <span key={part} className="whitespace-nowrap">
              {i > 0 && <span aria-hidden className="mr-3 text-[var(--text-low)]">·</span>}
              {part}
            </span>
          ))}
        </p>

        <RevealText as="h1" id="hero-title" immediate delay={0.25} className="display-xl max-w-[13ch]" mode="lines">
          <Lines text={h.title} />
        </RevealText>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end">
          <Reveal immediate delay={0.75} y={18}>
            <p data-hero-exit className="lead max-w-[50ch] !text-[clamp(1rem,0.9rem+0.5vw,1.35rem)] !leading-[1.45]">
              {h.lead}
            </p>
          </Reveal>

          <Reveal immediate delay={0.9} y={18} className="flex flex-col gap-4 lg:items-end">
            <div data-hero-exit className="flex flex-wrap gap-3">
              <Button href={h.primary.href}>{h.primary.label}</Button>
              <Button href={h.secondary.href} variant="steel">
                {h.secondary.label}
              </Button>
            </div>
            <Link data-hero-exit href={h.tertiary.href} className="link-trace hidden w-fit sm:inline-flex">
              {h.tertiary.label}
            </Link>
          </Reveal>
        </div>

        <Reveal immediate delay={1.1} y={14}>
          <div data-hero-rail className="relative mt-1 border-t border-[var(--line-strong)] pt-3 lg:pt-4">
            <span aria-hidden className="hairline-route absolute -top-px left-0 w-[38%]" />
            <dl className="grid grid-cols-3 gap-4 md:max-w-[70ch] md:gap-8">
              {h.claims.map((c) => (
                <div key={c.label} className="flex flex-col gap-1.5">
                  <dt className="sr-only">{c.label}</dt>
                  <dd className="font-display text-[var(--step-3)] font-medium leading-none tracking-[-0.015em]">{c.value}</dd>
                  <dd className="spec !text-[var(--text-low)]">{c.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
