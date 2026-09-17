"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import { gsap, EASE, MQ } from "@/lib/motion";
import { COMPANY, ADDRESS_LINES, FOOTER_LINKS, CLAIMS, CLIENT_DATA, has, CTA, SITE_CREDIT } from "@/lib/site";
import { Plate } from "@/components/ui/Plate";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { PhoneLink, Lines } from "@/components/ui/Primitives";
import { Logo } from "./Mark";
import type { MediaId } from "@/lib/media";

const WORD = "SOLIDIFY";

/**
 * S7 — the closing scene and the footer as one composition. A dusk road-light
 * frame (or a CSS light-trace field) dollies slowly under the last headline;
 * the footer plate rises over it carrying the index, the company spec and the
 * wordmark assembling from steel slats while a route hairline drives across
 * the plate's top edge. `compact` (contact) is the footer plate alone.
 */
export function Closing({
  title = ["Move it with", "the carrier."],
  lead = "Get a quote for one vehicle, or start a commercial inquiry for many.",
  primary = CTA.quote,
  secondary = CTA.oem,
  slot,
  compact = false,
}: {
  title?: string | readonly string[];
  lead?: string;
  primary?: { href: string; label: string; external?: boolean };
  secondary?: { href: string; label: string; external?: boolean };
  slot?: MediaId;
  compact?: boolean;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const slats = el.querySelectorAll<HTMLElement>("[data-slat]");
      const route = el.querySelector<SVGPathElement>("[data-foot-route]");
      const dolly = el.querySelector<HTMLElement>("[data-closing-media] [data-plate-img]");
      const reduced = window.matchMedia(MQ.reduced).matches;
      if (reduced) {
        gsap.set(slats, { clipPath: "inset(0 0 0 0)", yPercent: 0 });
        if (route) gsap.set(route, { drawSVG: "100%" });
        return;
      }
      gsap.set(slats, { clipPath: "inset(0 0 100% 0)", yPercent: 18 });
      gsap.to(slats, {
        clipPath: "inset(0 0 0% 0)",
        yPercent: 0,
        duration: 1.1,
        ease: EASE.veil,
        stagger: 0.045,
        scrollTrigger: { trigger: el.querySelector("[data-foot]"), start: "top 80%", once: true },
      });
      if (route) {
        gsap.set(route, { drawSVG: "0%" });
        gsap.to(route, { drawSVG: "100%", duration: 2.2, ease: EASE.inOut, scrollTrigger: { trigger: el.querySelector("[data-foot]"), start: "top 85%", once: true } });
      }
      if (dolly) {
        gsap.fromTo(dolly, { scale: 1.16 }, { scale: 1.04, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom bottom", scrub: 0.6 } });
      }
    },
    { scope: root },
  );

  const year = new Date().getFullYear();

  return (
    <footer ref={root} data-surface="deep" data-section="closing" className="relative isolate overflow-hidden bg-[var(--surface)] text-[var(--text-hi)]">
      {!compact && (
        <section aria-labelledby="closing-title" className="relative min-h-[82svh]">
          <div className="absolute inset-0 -z-10" data-closing-media>
            {slot ? (
              <Plate slot={slot} sizes="100vw" aspect="fill" parallax={0} reveal={false} overscan={1.0} grade="deep" dim={0.8} className="!absolute inset-0 h-full w-full" />
            ) : (
              <div className="light-field" aria-hidden />
            )}
            <div aria-hidden className="absolute inset-0 scrim-left-soft" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-[60%] scrim-bottom" />
            <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-40" />
          </div>
          <div className="shell flex min-h-[82svh] flex-col justify-center gap-8 py-[clamp(5rem,10vw,9rem)]">
            <RevealText as="h2" id="closing-title" className="display-xl max-w-[10ch]">
              <Lines text={title} />
            </RevealText>
            <Reveal>
              <p className="lead max-w-[44ch]">{lead}</p>
            </Reveal>
            <Reveal className="flex flex-wrap items-center gap-3">
              <Button href={primary.href} external={primary.external}>
                {primary.label}
              </Button>
              {secondary && (
                <Button href={secondary.href} variant="steel" external={secondary.external}>
                  {secondary.label}
                </Button>
              )}
            </Reveal>
            <Reveal className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="label">Or call</span>
              <PhoneLink className="font-display text-[var(--step-3)] font-medium leading-none tracking-[-0.015em] text-[var(--text-hi)]" />
              <span className="spec">{COMPANY.city}, {COMPANY.state}</span>
            </Reveal>
          </div>
        </section>
      )}

      {/* the footer plate */}
      <div data-foot className={clsx("relative z-10 border-t border-[var(--line-strong)] bg-[#0a0d13]", !compact && "-mt-6 rounded-t-[22px]")}>
        <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px w-full" viewBox="0 0 1000 1" preserveAspectRatio="none">
          <path data-foot-route d="M0 0.5 H1000" stroke="rgba(179,212,255,0.8)" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
        </svg>
        <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-60" />

        <div className="shell-wide relative flex flex-col gap-12 pb-8 pt-[clamp(3.5rem,6vw,5.5rem)]">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.35fr_0.85fr_0.95fr_0.8fr_1.25fr] lg:gap-8">
            <div className="flex flex-col gap-6">
              <Link href="/" className="flex w-fit items-center" aria-label={`${COMPANY.name} — home`}>
                <Logo variant="horizontal" className="w-full max-w-[288px]" />
              </Link>
              <p className="max-w-[34ch] text-[var(--step--1)] leading-relaxed text-[var(--text-mid)]">
                {COMPANY.descriptor}. {CLAIMS.coverage}, with a strong Western-US focus.
              </p>
              <Button href={CTA.quote.href} variant="steel" className="w-fit">
                {CTA.quote.label}
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              <span className="label">Services</span>
              <ul role="list" className="flex flex-col gap-3">
                {FOOTER_LINKS.services.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="foot-link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <span className="label">Company</span>
              <ul role="list" className="flex flex-col gap-3">
                {FOOTER_LINKS.company.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="foot-link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <span className="label">Legal</span>
              <ul role="list" className="flex flex-col gap-3">
                {FOOTER_LINKS.legal.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="foot-link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <address className="flex flex-col gap-4 not-italic">
              <span className="label">Contact</span>
              <dl className="flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]">
                <div className="flex flex-col gap-0.5 py-2.5">
                  <dt className="spec">Company</dt>
                  <dd className="font-medium text-[var(--text-hi)]">{COMPANY.legalName}</dd>
                </div>
                <div className="flex flex-col gap-0.5 py-2.5">
                  <dt className="spec">Location</dt>
                  <dd className="text-[var(--text-mid)]">{ADDRESS_LINES.join(", ")}</dd>
                </div>
                <div className="flex flex-col gap-0.5 py-2.5">
                  <dt className="spec">Phone</dt>
                  <dd>
                    <PhoneLink className="link-underline font-medium text-[var(--text-hi)]" />
                  </dd>
                </div>
                {has("email") && (
                  <div className="flex flex-col gap-0.5 py-2.5">
                    <dt className="spec">Email</dt>
                    <dd>
                      <a href={`mailto:${CLIENT_DATA.email}`} className="link-underline text-[var(--text-mid)]">
                        {CLIENT_DATA.email}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </address>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-6 text-[var(--step--1)] text-[var(--text-mid)] md:flex-row md:items-center md:justify-between">
            <span>
              © {year} {COMPANY.legalName}. {COMPANY.descriptor}.
              {has("usdot") && <> USDOT {CLIENT_DATA.usdot}.</>}
              {has("mc") && <> MC {CLIENT_DATA.mc}.</>}
            </span>
            <span className="flex flex-wrap items-center gap-x-6 gap-y-1">
              {FOOTER_LINKS.legal.map((l) => (
                <Link key={l.href} href={l.href} className="foot-link">
                  {l.label}
                </Link>
              ))}
              <a href={SITE_CREDIT.href} target="_blank" rel="noopener noreferrer" className="foot-link text-[var(--text-low)]" data-site-credit>
                {SITE_CREDIT.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </span>
          </div>
        </div>

        {/* wordmark from steel slats */}
        <div aria-hidden className="pointer-events-none relative -mb-[2.5vw] overflow-hidden px-[var(--spacing-gutter)]">
          <div className="flex justify-between font-display font-medium leading-[0.84] tracking-[-0.02em] text-transparent" style={{ fontSize: "clamp(3rem, 11.5vw, 12rem)" }}>
            {WORD.split("").map((ch, i) => (
              <span
                key={i}
                data-slat
                className="inline-block bg-gradient-to-b from-[#3a4250] via-[#232830] to-[#14171c] bg-clip-text [-webkit-background-clip:text]"
                style={{ clipPath: "inset(0 0 0 0)" }}
              >
                {ch}
              </span>
            ))}
          </div>
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0a0d13] to-transparent" />
        </div>
      </div>
    </footer>
  );
}
