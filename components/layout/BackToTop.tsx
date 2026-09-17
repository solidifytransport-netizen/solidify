"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, EASE, prefersReducedMotion } from "@/lib/motion";
import { useSmoothScroll } from "./SmoothScroll";

/**
 * Back to top.
 *
 * A single square button, bottom-right, in the same steel-outline idiom as the
 * menu toggle. It is not in the document until the reader is a full viewport
 * down — a button that says "back to top" while you are at the top is noise —
 * and it drops away again as the top comes back into reach.
 *
 * It scrolls through Lenis so the return feels like the rest of the page, and
 * it is a real <button>: keyboard-reachable, labeled, 44px on every side.
 * With reduced motion the jump is immediate and the button simply toggles.
 *
 * z-index sits under the header (100) and the menu panel (95), so the
 * full-screen index covers it while open and the header always wins.
 */
export function BackToTop() {
  const root = useRef<HTMLButtonElement>(null);
  const { scrollTo } = useSmoothScroll();

  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    let shown = false;

    const show = (next: boolean) => {
      if (next === shown) return;
      shown = next;
      el.setAttribute("data-shown", next ? "true" : "false");
      if (reduced) {
        gsap.set(el, { autoAlpha: next ? 1 : 0, y: 0 });
        return;
      }
      gsap.to(el, {
        autoAlpha: next ? 1 : 0,
        y: next ? 0 : 12,
        duration: next ? 0.55 : 0.35,
        ease: next ? EASE.out : "power2.in",
        overwrite: true,
      });
    };

    gsap.set(el, { autoAlpha: 0, y: 12 });
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => show(self.scroll() > window.innerHeight),
    });
  }, []);

  return (
    <button
      ref={root}
      type="button"
      onClick={() => scrollTo(0)}
      aria-label="Back to top"
      data-back-to-top
      data-shown="false"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[var(--spacing-gutter)] z-[90] flex h-11 w-11 items-center justify-center rounded-md border border-[var(--line-strong)] text-[var(--text-hi)] backdrop-blur-md transition-colors [background:color-mix(in_srgb,var(--surface)_72%,transparent)] hover:border-[rgba(127,182,255,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(127,182,255,0.8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] md:bottom-[calc(var(--spacing-gutter)*0.6)]"
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 15.5V4.5" />
        <path d="M5.25 9.25 10 4.5l4.75 4.75" />
      </svg>
    </button>
  );
}
