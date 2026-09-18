"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

/**
 * The single place GSAP is configured. Every animated component imports from
 * here so plugins register exactly once and the whole site shares one
 * choreography vocabulary — the same eases, durations and stagger rhythm.
 *
 * Three ease tiers, mirrored as --ease-* in globals.css:
 *   arrive — every reveal, clip sweep, type uncover
 *   track  — transits: section inversions, layer transforms
 *   servo  — camera: heavy launch, dead-stop landing, no overshoot ever
 * Steel does not bounce.
 */

let registered = false;

if (typeof window !== "undefined" && !registered) {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, CustomEase, DrawSVGPlugin, Flip, MotionPathPlugin);

  CustomEase.create("arrive", "0.16, 1, 0.3, 1");
  CustomEase.create("track", "0.83, 0, 0.17, 1");
  CustomEase.create("servo", "0.33, 0, 0, 1");
  CustomEase.create("airbrake", "0.22, 1, 0.36, 1");
  CustomEase.create("veil", "0.62, 0.02, 0.14, 1");

  gsap.defaults({ ease: "arrive", duration: 0.9 });

  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
  }

  registered = true;

  if (process.env.NODE_ENV !== "production") {
    (window as unknown as Record<string, unknown>).__ST = ScrollTrigger;
  }
}

export { gsap, ScrollTrigger, SplitText, CustomEase, Flip, MotionPathPlugin };

export const EASE = {
  out: "arrive",
  inOut: "track",
  servo: "servo",
  settle: "airbrake",
  veil: "veil",
} as const;

/** Five durations exist. */
export const DUR = {
  micro: 0.18,
  element: 0.42,
  base: 0.9,
  section: 1.2,
  camera: 1.8,
} as const;

/** Stagger is 40, 80 or 120ms — always ordered by direction of travel. */
export const STAGGER = {
  tight: 0.04,
  base: 0.08,
  wide: 0.12,
  line: 0.09,
  word: 0.035,
} as const;

/** Reveal threshold used site-wide so every section enters at the same scroll point. */
export const REVEAL_START = "top 84%";

export const MQ = {
  desktop: "(min-width: 1024px)",
  mobile: "(max-width: 1023.98px)",
  fine: "(hover: hover) and (pointer: fine)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

/**
 * Start loading every image inside `el` once it is within `start` of the
 * viewport, instead of when each image individually intersects.
 *
 * Browsers lazy-load by intersection with the viewport, and a card sitting
 * off to the right in a horizontal track — or a beat frame that is clipped
 * and hidden until its turn — never intersects until the moment it is
 * needed, so it arrives as an empty frame and fills in a beat later. One
 * ScrollTrigger on the track, a viewport and a half early, flips the images
 * to eager; setting `loading` to eager starts the fetch at once. Returns the
 * trigger so the caller can kill it with everything else.
 */
export function preloadImagesNear(el: Element, ahead = 1.5): ScrollTrigger | null {
  const go = () => el.querySelectorAll<HTMLImageElement>("img[loading='lazy']").forEach((img) => { img.loading = "eager"; });
  /* Already within range at creation — the section just under the hero, say.
     ScrollTrigger does not fire onEnter for a range you are already inside
     when it is created, so that case is handled here, synchronously. */
  const r = el.getBoundingClientRect();
  if (r.top < window.innerHeight * ahead && r.bottom > 0) {
    go();
    return null;
  }
  return ScrollTrigger.create({ trigger: el, start: `top ${Math.round(ahead * 100)}%`, once: true, onEnter: go });
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MQ.reduced).matches;
}

export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Frame-rate-independent lerp factor. */
export const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);
export const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  outMin + ((clamp(v, inMin, inMax) - inMin) / (inMax - inMin)) * (outMax - outMin);

/** Device performance tier 0–3. 0 = no WebGL. Drives DPR cap and particle counts. */
export function perfTier(): number {
  if (typeof window === "undefined") return 0;
  if (!supportsWebGL()) return 0;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  if (touch || mem <= 4 || cores <= 4) return 1;
  if (mem >= 8 && cores >= 8) return 3;
  return 2;
}

export function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export const dprCap = (max = 2) =>
  typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, max);
