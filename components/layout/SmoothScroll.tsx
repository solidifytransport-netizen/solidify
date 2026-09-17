"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/motion";

type Ctx = {
  scrollTo: (target: string | number | HTMLElement, opts?: Record<string, unknown>) => void;
  lock: () => void;
  unlock: () => void;
  refreshLayout: () => void;
};

const LOCK_CLASS = "scroll-locked";

const SmoothCtx = createContext<Ctx>({
  scrollTo: () => {},
  lock: () => {},
  unlock: () => {},
  refreshLayout: () => {},
});

export const useSmoothScroll = () => useContext(SmoothCtx);

/**
 * Lenis drives document scrolling; GSAP's ticker drives Lenis. ScrollTrigger
 * therefore reads positions in the same frame Lenis writes them, which is what
 * removes the half-frame lag between pinned elements and the content moving
 * past them. Under reduced motion Lenis never exists and scrolling is native.
 *
 * Also owns: the live prefers-reduced-motion flag on <html>, the
 * html.reduced-motion / html.no-webgl hooks, and one ordered ScrollTrigger
 * refresh after structural changes.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    root.classList.toggle("reduced-motion", mql.matches);
    root.classList.remove("no-js");

    // Honor a change mid-session: park every infinite tween at its start.
    const onChange = (e: MediaQueryListEvent) => {
      root.classList.toggle("reduced-motion", e.matches);
      if (!e.matches) return;
      gsap.globalTimeline
        .getChildren(true, true, false)
        .filter((t) => typeof (t as gsap.core.Tween).repeat === "function" && (t as gsap.core.Tween).repeat() === -1)
        .forEach((t) => t.pause(0));
    };
    mql.addEventListener("change", onChange);

    if (mql.matches) {
      root.style.scrollBehavior = "auto";
      return () => mql.removeEventListener("change", onChange);
    }

    /* Slightly longer glide and a slightly shorter wheel step than the
       defaults: the pinned sections are scrubbed, and a fast wheel step made
       them arrive before the eye did. `prevent` keeps the wheel out of Lenis
       while a pinned track or a select is being scrolled inside itself. */
    const lenis = new Lenis({
      duration: 1.3,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
      syncTouch: false,
      autoRaf: false,
      prevent: (node) => node.hasAttribute?.("data-lenis-prevent") ?? false,
    });
    lenisRef.current = lenis;
    if (root.classList.contains(LOCK_CLASS)) lenis.stop();

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      mql.removeEventListener("change", onChange);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // A route change lands at the top, with every trigger re-measured.
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    const t = setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => clearTimeout(t);
  }, [pathname]);

  const scheduled = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshLayout = useCallback(() => {
    if (scheduled.current) clearTimeout(scheduled.current);
    scheduled.current = setTimeout(() => {
      scheduled.current = null;
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    }, 160);
  }, []);

  useEffect(() => {
    const first = setTimeout(refreshLayout, 200);
    document.fonts?.ready.then(refreshLayout).catch(() => {});
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      refreshLayout();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("load", refreshLayout);
    return () => {
      clearTimeout(first);
      if (scheduled.current) clearTimeout(scheduled.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", refreshLayout);
    };
  }, [refreshLayout]);

  const value = useMemo<Ctx>(
    () => ({
      scrollTo: (target, opts) => {
        const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 84;
        const lenis = lenisRef.current;
        if (lenis) {
          lenis.scrollTo(target, { duration: 1.3, offset: -navH * 0.6, ...opts });
          return;
        }
        if (typeof target === "string") {
          document.querySelector(target)?.scrollIntoView({ behavior: "auto", block: "start" });
        } else if (typeof target === "number") {
          window.scrollTo(0, target);
        } else {
          target.scrollIntoView({ behavior: "auto", block: "start" });
        }
      },
      lock: () => {
        document.documentElement.classList.add(LOCK_CLASS);
        lenisRef.current?.stop();
      },
      unlock: () => {
        document.documentElement.classList.remove(LOCK_CLASS);
        lenisRef.current?.start();
      },
      refreshLayout,
    }),
    [refreshLayout],
  );

  return <SmoothCtx.Provider value={value}>{children}</SmoothCtx.Provider>;
}
