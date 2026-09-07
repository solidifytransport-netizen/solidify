"use client";

import { useEffect, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * Pointer-driven depth on a card.
 *
 * The element rotates about its own X and Y axes and lifts toward the viewer,
 * and a specular highlight tracks the pointer across its face, so the surface
 * reads as something with a sheen rather than a flat rectangle. Both run
 * through `gsap.quickTo`, which keeps the work on GSAP's ticker with the rest
 * of the site instead of writing transforms on every pointer event.
 *
 * A hook rather than a wrapper component on purpose: several of these cards
 * are flex or Flip targets whose own classes control their layout, and
 * wrapping them in another element would break that. Perspective is applied to
 * the parent from here, so the caller's markup does not change at all.
 *
 * Fine pointers only — on touch there is no hover to answer, and a card that
 * tilts under a tap just feels loose. Nothing runs under reduced motion.
 */
export function useTilt(
  ref: RefObject<HTMLElement | null>,
  { max = 6, lift = 14, sheen = true, enabled = true }: { max?: number; lift?: number; sheen?: boolean; enabled?: boolean } = {},
) {
  useEffect(() => {
    const card = ref.current;
    if (!card || !enabled || prefersReducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const parent = card.parentElement;
    const prevPerspective = parent?.style.perspective ?? "";
    if (parent) parent.style.perspective = "1200px";
    card.style.transformStyle = "preserve-3d";

    let glare: HTMLSpanElement | null = null;
    if (sheen) {
      glare = document.createElement("span");
      glare.setAttribute("aria-hidden", "true");
      glare.style.cssText =
        "position:absolute;inset:0;z-index:6;pointer-events:none;opacity:0;border-radius:inherit;mix-blend-mode:screen;transition:opacity .45s cubic-bezier(0.16,1,0.3,1)";
      card.appendChild(glare);
    }

    const rx = gsap.quickTo(card, "rotationX", { duration: 0.55, ease: "power3.out" });
    const ry = gsap.quickTo(card, "rotationY", { duration: 0.55, ease: "power3.out" });
    const tz = gsap.quickTo(card, "z", { duration: 0.55, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / Math.max(r.width, 1);
      const py = (e.clientY - r.top) / Math.max(r.height, 1);
      ry((px - 0.5) * 2 * max);
      rx(-(py - 0.5) * 2 * max);
      tz(lift);
      if (glare) {
        glare.style.background = `radial-gradient(120% 90% at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(179,212,255,0.22), rgba(179,212,255,0.06) 38%, transparent 66%)`;
      }
    };
    const onEnter = () => {
      if (glare) glare.style.opacity = "1";
    };
    const onLeave = () => {
      rx(0);
      ry(0);
      tz(0);
      if (glare) glare.style.opacity = "0";
    };

    card.addEventListener("pointermove", onMove, { passive: true });
    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("pointerleave", onLeave);

    return () => {
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(card);
      gsap.set(card, { clearProps: "rotationX,rotationY,z" });
      glare?.remove();
      card.style.transformStyle = "";
      if (parent) parent.style.perspective = prevPerspective;
    };
  }, [ref, max, lift, sheen, enabled]);
}
