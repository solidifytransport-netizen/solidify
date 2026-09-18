"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { useInViewOnce } from "@/lib/hooks";
import { gsap, EASE, MQ } from "@/lib/motion";
import { US_MAP_VIEWBOX, loadUsMap, type St, type UsMap } from "@/lib/us-map";
import { FOCUS_STATES } from "@/lib/site";

const VIEWBOX = US_MAP_VIEWBOX;
const VIEWBOX_ASPECT = (() => {
  const [, , w, h] = VIEWBOX.split(/\s+/).map(Number);
  return `${w} / ${h}`;
})();
const WEST = new Set<string>(FOCUS_STATES);

export type RouteDetail = { pickupState?: string; deliveryState?: string };
export const ROUTE_EVENT = "solidify:route";

/**
 * The quote console's mini map: highlights the pickup and delivery states as
 * the form is filled and draws the route between their centroids. Reuses the
 * coverage geometry; states only — never a lane claim.
 */
export function RouteMap() {
  const root = useRef<HTMLDivElement>(null);
  const [route, setRoute] = useState<RouteDetail>({});
  /* 48 state outlines, mounted only when the quote console is near. */
  const [nearRef, near] = useInViewOnce<HTMLDivElement>("150% 0px");
  const [data, setData] = useState<UsMap | null>(null);
  useEffect(() => {
    if (!near) return;
    let live = true;
    loadUsMap().then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, [near]);
  const STATES: St[] = data?.states ?? [];

  useEffect(() => {
    const on = (e: Event) => setRoute((e as CustomEvent<RouteDetail>).detail ?? {});
    window.addEventListener(ROUTE_EVENT, on);
    return () => window.removeEventListener(ROUTE_EVENT, on);
  }, []);

  const from = STATES.find((s) => s.abbr === route.pickupState);
  const to = STATES.find((s) => s.abbr === route.deliveryState);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const line = el.querySelector<SVGPathElement>("[data-route-line]");
      const dot = el.querySelector<SVGCircleElement>("[data-route-dot]");
      if (!line) return;
      if (window.matchMedia(MQ.reduced).matches) {
        gsap.set(line, { drawSVG: "100%" });
        if (dot) gsap.set(dot, { autoAlpha: 1 });
        return;
      }
      gsap.set(line, { drawSVG: "0%" });
      const tl = gsap.timeline();
      tl.to(line, { drawSVG: "100%", duration: 1.2, ease: EASE.inOut });
      if (dot) tl.fromTo(dot, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.9);
    },
    { scope: root, dependencies: [from?.abbr, to?.abbr, data] },
  );

  const path = from && to ? `M ${from.cx} ${from.cy} Q ${(from.cx + to.cx) / 2} ${Math.min(from.cy, to.cy) - 60} ${to.cx} ${to.cy}` : null;

  return (
    <div ref={root} className="flex flex-col gap-3" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="label">Route</span>
        <span className="spec !text-[var(--text-low)]">
          {from ? from.abbr : "—"} → {to ? to.abbr : "—"}
        </span>
      </div>
      <div ref={nearRef} style={{ aspectRatio: VIEWBOX_ASPECT }}>
        {data && (
      <svg viewBox={VIEWBOX} className="w-full" aria-hidden>
        {STATES.map((s) => {
          const on = s.abbr === from?.abbr || s.abbr === to?.abbr;
          return (
            <path
              key={s.abbr}
              d={s.d}
              fill={on ? "rgba(179,212,255,0.55)" : WEST.has(s.abbr) ? "rgba(79,151,255,0.16)" : "rgba(255,255,255,0.05)"}
              stroke={on ? "#b3d4ff" : "rgba(255,255,255,0.22)"}
              strokeWidth={on ? 1.4 : 0.7}
              strokeLinejoin="round"
              className="transition-[fill,stroke] duration-500"
            />
          );
        })}
        {path && (
          <>
            {/* No non-scaling-stroke: DrawSVG measures such a path from its
                on-screen box and a near-horizontal route breaks that. In user
                units the length is exact; the stroke scales by CSS instead. */}
            <path key={path} data-route-line d={path} fill="none" stroke="#b3d4ff" strokeLinecap="round" className="[stroke-width:3] lg:[stroke-width:2]" />
            <circle cx={from!.cx} cy={from!.cy} r="4" fill="#b3d4ff" />
            <circle data-route-dot cx={to!.cx} cy={to!.cy} r="4" fill="#b3d4ff" />
          </>
        )}
      </svg>
        )}
      </div>
      <p className="sr-only">
        {from && to ? `Route from ${from.name} to ${to.name}.` : "Select a pickup and delivery state to see the route."}
      </p>
    </div>
  );
}
