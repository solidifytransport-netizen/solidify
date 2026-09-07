"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import { gsap, EASE } from "@/lib/motion";
import { Plate, type Grade } from "@/components/ui/Plate";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { SectionMark, Lines, PhoneLink } from "@/components/ui/Primitives";
import { LightSweep } from "@/components/ui/LightSweep";
import { CLAIMS, COMPANY } from "@/lib/site";
import type { MediaId } from "@/lib/media";

type ActionDef = { href: string; label: string; external?: boolean };

/**
 * Inner-page hero. The photograph arrives through a diagonal mask; the H1
 * sits on the left in authored lines; the lead and actions live on a steel
 * plate at the lower right; a spec rail runs along the foot. One soft left
 * scrim only — the photograph is allowed to be a photograph.
 */
export function PageHero({
  id = "hero",
  mark,
  eyebrow,
  title,
  lead,
  slot,
  grade = "cool",
  primary,
  secondary,
  compact = false,
  children,
  specs,
}: {
  id?: string;
  mark?: { index: string | number; label: string };
  eyebrow?: string;
  title: string | readonly string[];
  lead: string;
  slot?: MediaId;
  grade?: Grade;
  primary?: ActionDef;
  secondary?: ActionDef;
  compact?: boolean;
  children?: ReactNode;
  specs?: readonly { label: string; value: string }[];
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mask = el.querySelector<HTMLElement>("[data-hero-mask]");
      const rail = el.querySelector<HTMLElement>("[data-hero-rail]");
      if (!mask) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(mask, { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" });
        if (rail) gsap.set(rail, { scaleX: 1 });
        return;
      }
      const tl = gsap.timeline({ delay: 0.05 });
      tl.fromTo(
        mask,
        { clipPath: "polygon(0 0, 18% 0, 0 32%, 0 0)" },
        { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", duration: 1.5, ease: EASE.inOut },
      );
      if (rail) tl.fromTo(rail, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: EASE.out }, 0.6);
    },
    { scope: root },
  );

  const railSpecs = specs ?? [
    { label: "Coverage", value: CLAIMS.coverage },
    { label: "Focus", value: CLAIMS.focus },
    { label: "Base", value: `${COMPANY.city}, ${COMPANY.state}` },
  ];

  return (
    <section
      ref={root}
      id={id}
      data-section={id}
      data-surface="deep"
      data-head="hero"
      aria-labelledby={`${id}-title`}
      className={clsx("relative isolate flex flex-col justify-end overflow-hidden bg-[var(--surface)] text-[var(--text-hi)]", compact ? "min-h-[74svh]" : "min-h-[94svh]")}
    >
      <div className="absolute inset-0 -z-10">
        <div data-hero-mask className="absolute inset-0" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}>
          {slot ? (
            <Plate slot={slot} sizes="100vw" priority aspect="fill" grade={grade} parallax={8} reveal={false} overscan={1.12} dim={0.88} className="!absolute inset-0 h-full w-full" />
          ) : (
            <div className="light-field" aria-hidden />
          )}
          <div aria-hidden className="absolute inset-0 scrim-left-soft" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[55%] scrim-bottom" />
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-50" />
      </div>

      <div className="shell relative z-10 flex flex-col gap-10 pb-[clamp(2.75rem,6vh,4.5rem)] pt-[calc(var(--nav-h)+6rem)]">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <Reveal immediate delay={0.15} y={10}>
              {mark ? <SectionMark index={mark.index} label={mark.label} /> : <span className="eyebrow">{eyebrow}</span>}
            </Reveal>
            <RevealText as="h1" id={`${id}-title`} immediate delay={0.3} className="display-lg max-w-[14ch]">
              <Lines text={title} />
            </RevealText>
          </div>

          <Reveal immediate delay={0.7} y={18} className="plate plate-steel relative overflow-hidden p-6 lg:col-span-5 lg:col-start-8 lg:p-7">
            <LightSweep trigger="inview" delay={0.9} />
            <div className="flex flex-col gap-6">
              <p className="lead">{lead}</p>
              {(primary || secondary) && (
                <div className="flex flex-wrap gap-3">
                  {primary && (
                    <Button href={primary.href} external={primary.external}>
                      {primary.label}
                    </Button>
                  )}
                  {secondary && (
                    <Button href={secondary.href} variant="steel" external={secondary.external}>
                      {secondary.label}
                    </Button>
                  )}
                </div>
              )}
              <p className="small !text-[var(--text-low)]">
                Or call <PhoneLink className="link-underline font-medium text-[var(--text-hi)]" />
              </p>
            </div>
          </Reveal>
        </div>

        <div className="relative">
          <div data-hero-rail aria-hidden className="hairline-route origin-left" style={{ transform: "scaleX(0)" }} />
          <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
            {railSpecs.map((s) => (
              <div key={s.label} className="flex items-baseline gap-3">
                <dt className="label">{s.label}</dt>
                <dd className="spec !text-[var(--text-hi)]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {children}
      </div>
    </section>
  );
}
