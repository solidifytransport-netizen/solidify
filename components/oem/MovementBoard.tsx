"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import { gsap, EASE, MQ } from "@/lib/motion";
import { Plate } from "@/components/ui/Plate";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Section, SectionMark, Lines, SpecStrip, type Surface } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import type { MediaId } from "@/lib/media";

/**
 * S5 — the OEM page's one interaction. A generic dealer-network board:
 * storage lot, two stores, a customer address. Each movement type draws its
 * route (DrawSVG) and runs a carrier marker along it (MotionPath) while a
 * spec card describes the movement in plain words. Generic labels only —
 * never a lane, a volume or a client.
 */

type NodeId = "lot" | "storeA" | "storeB" | "customer" | "port";

const NODES: Record<NodeId, { x: number; y: number; label: string; kind: "lot" | "store" | "home" | "port" }> = {
  port: { x: 90, y: 300, label: "Rail / port yard", kind: "port" },
  lot: { x: 300, y: 130, label: "Storage lot", kind: "lot" },
  storeA: { x: 560, y: 260, label: "Store A", kind: "store" },
  storeB: { x: 860, y: 120, label: "Store B", kind: "store" },
  customer: { x: 1010, y: 330, label: "Customer address", kind: "home" },
};

type Movement = {
  id: string;
  label: string;
  short: string;
  route: NodeId[];
  path: string;
  text: string;
  specs: readonly { label: string; value: string }[];
};

const MOVEMENTS: readonly Movement[] = [
  {
    id: "transfer",
    label: "Dealer-to-dealer transfer",
    short: "Transfer",
    route: ["storeA", "storeB"],
    path: "M 560 260 C 660 250, 740 150, 860 120",
    text: "A vehicle sold at one store and sitting at another. The carrier picks it up and delivers it to the selling dealership.",
    specs: [
      { label: "From", value: "Store A" },
      { label: "To", value: "Store B" },
      { label: "Cadence", value: "As sold, or on a schedule" },
    ],
  },
  {
    id: "relocation",
    label: "Inventory relocation",
    short: "Relocation",
    route: ["port", "lot", "storeA"],
    path: "M 90 300 C 150 220, 220 160, 300 130 S 480 220, 560 260",
    text: "Moving units between yards, storage and stores as demand shifts across regions.",
    specs: [
      { label: "From", value: "Rail / port yard · Storage lot" },
      { label: "To", value: "Stores across the region" },
      { label: "Cadence", value: "Recurring schedule" },
    ],
  },
  {
    id: "retail",
    label: "Retail delivery",
    short: "Delivery",
    route: ["storeB", "customer"],
    path: "M 860 120 C 900 200, 940 300, 1010 330",
    text: "Delivering a sold vehicle to the customer's address — the last step of the sale, carried by the carrier.",
    specs: [
      { label: "From", value: "Store B" },
      { label: "To", value: "Customer address" },
      { label: "Cadence", value: "Per sale" },
    ],
  },
];

export function MovementBoard({
  id = "movement",
  surface = "graphite",
  mark = { index: 2, label: "What we move" },
  title = ["The movements a dealership", "actually needs."],
  lead = "Commercial vehicle transport is a set of repeatable movements. Solidify runs them as the carrier. Select one to see it on the board.",
  backdrop,
  teaser = false,
  action,
}: {
  id?: string;
  surface?: Surface;
  mark?: { index: string | number; label: string };
  title?: string | readonly string[];
  lead?: string;
  backdrop?: MediaId;
  /** Home: one movement auto-cycles; no tabs. */
  teaser?: boolean;
  action?: { href: string; label: string };
}) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const movement = MOVEMENTS[active];

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const reduced = window.matchMedia(MQ.reduced).matches;
      const routes = el.querySelectorAll<SVGPathElement>("[data-route]");
      const marker = el.querySelector<SVGGElement>("[data-marker]");
      const nodes = el.querySelectorAll<SVGGElement>("[data-node]");
      const activePath = el.querySelector<SVGPathElement>(`[data-route="${movement.id}"]`);
      nodes.forEach((n) => n.setAttribute("data-on", movement.route.includes(n.dataset.node as NodeId) ? "true" : "false"));

      if (reduced) {
        routes.forEach((r) => gsap.set(r, { drawSVG: "100%", opacity: r === activePath ? 1 : 0.35 }));
        if (marker && activePath) gsap.set(marker, { motionPath: { path: activePath, align: activePath, alignOrigin: [0.5, 0.5], start: 1, end: 1 }, autoAlpha: 1 });
        return;
      }
      routes.forEach((r) => {
        if (r === activePath) return;
        gsap.to(r, { opacity: 0.18, duration: 0.5, overwrite: "auto" });
      });
      if (activePath) {
        gsap.set(activePath, { drawSVG: "0%", opacity: 1 });
        const tl = gsap.timeline();
        tl.to(activePath, { drawSVG: "100%", duration: 1.5, ease: EASE.inOut });
        if (marker) {
          gsap.set(marker, { autoAlpha: 0 });
          tl.to(marker, { autoAlpha: 1, duration: 0.3 }, 0.2).to(
            marker,
            { motionPath: { path: activePath, align: activePath, alignOrigin: [0.5, 0.5], autoRotate: true }, duration: 2.2, ease: EASE.inOut },
            0.2,
          );
        }
      }
    },
    { scope: root, dependencies: [active] },
  );

  // teaser: auto-cycle
  useGSAP(
    () => {
      if (!teaser) return;
      if (window.matchMedia(MQ.reduced).matches) return;
      const t = gsap.delayedCall(4.5, () => setActive((a) => (a + 1) % MOVEMENTS.length));
      return () => {
        t.kill();
      };
    },
    { dependencies: [active, teaser] },
  );

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") setActive((a) => (a + 1) % MOVEMENTS.length);
    if (e.key === "ArrowLeft") setActive((a) => (a - 1 + MOVEMENTS.length) % MOVEMENTS.length);
  };

  return (
    <Section surface={surface} id={id} ariaLabelledBy={`${id}-title`} head="editorial" className="overflow-clip">
      {backdrop && (
        <div className="absolute inset-0 -z-10 opacity-[0.22]">
          <Plate slot={backdrop} sizes="100vw" aspect="fill" parallax={14} reveal={false} grade="deep" dim={0.7} className="!absolute inset-0 h-full w-full" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[var(--surface)] via-transparent to-[var(--surface)]" />
        </div>
      )}
      <div className="shell relative flex flex-col gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-6 border-t border-[var(--line-strong)] pt-4">
            <SectionMark index={mark.index} label={mark.label} />
            <span aria-hidden className="hidden h-px flex-1 bg-[var(--line)] sm:block" />
            <span className="spec hidden sm:inline">Movement board</span>
          </div>
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
            <RevealText as="h2" id={`${id}-title`} className="display-md max-w-[16ch] lg:col-span-7">
              <Lines text={title} />
            </RevealText>
            <Reveal className="lg:col-span-5 lg:justify-self-end">
              <p className="lead lg:max-w-[38ch]">{lead}</p>
            </Reveal>
          </div>
        </div>

        <div ref={root} className="plate plate-steel relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 guides" />
          <div className="relative grid lg:grid-cols-12">
            {/* tabs + card */}
            <div className="flex flex-col gap-6 border-b border-[var(--line)] p-6 lg:col-span-4 lg:border-b-0 lg:border-r lg:p-8">
              {!teaser ? (
                <div role="tablist" aria-label="Movement type" onKeyDown={onKey} className="flex flex-col gap-2">
                  {MOVEMENTS.map((m, i) => (
                    <button
                      key={m.id}
                      role="tab"
                      type="button"
                      aria-selected={active === i}
                      aria-controls={`${id}-panel`}
                      onClick={() => setActive(i)}
                      className="seg"
                    >
                      <span className="flex items-center gap-3 text-[var(--step--1)] font-semibold">
                        <span className="numeral text-[var(--step--2)] text-[var(--text-low)]">{String(i + 1).padStart(2, "0")}</span>
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {MOVEMENTS.map((m, i) => (
                    <span key={m.id} className={clsx("spec transition-colors duration-500", active === i ? "!text-[var(--text-hi)]" : "!text-[var(--text-low)]")}>
                      {String(i + 1).padStart(2, "0")} · {m.label}
                    </span>
                  ))}
                </div>
              )}
              <div id={`${id}-panel`} role="tabpanel" aria-live="polite" className="flex flex-col gap-4" key={movement.id}>
                <h3 className="title">{movement.label}</h3>
                <p className="body">{movement.text}</p>
                <SpecStrip items={movement.specs} tone="quiet" />
              </div>
              {action && (
                <div className="pt-2">
                  <Button href={action.href} variant="steel">
                    {action.label}
                  </Button>
                </div>
              )}
            </div>

            {/* the board */}
            <div className="relative p-4 lg:col-span-8 lg:p-6">
              <svg viewBox="0 0 1100 420" className="w-full" role="img" aria-label={`Board showing the ${movement.label} route`}>
                <defs>
                  <pattern id="bp-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  </pattern>
                  <radialGradient id="bp-node" cx="50%" cy="50%" r="50%">
                    <stop offset="0" stopColor="#b3d4ff" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#b3d4ff" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="1100" height="420" fill="url(#bp-grid)" />
                {/* all routes, faint */}
                {MOVEMENTS.map((m) => (
                  <path key={m.id} data-route={m.id} d={m.path} fill="none" stroke="#b3d4ff" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={m.id === movement.id ? undefined : "4 6"} opacity={m.id === movement.id ? 1 : 0.18} vectorEffect="non-scaling-stroke" />
                ))}
                {/* nodes */}
                {(Object.keys(NODES) as NodeId[]).map((k) => {
                  const n = NODES[k];
                  return (
                    <g key={k} data-node={k} data-on="false" className="transition-opacity duration-500 data-[on=false]:opacity-50">
                      <circle cx={n.x} cy={n.y} r="26" fill="url(#bp-node)" />
                      <NodeGlyph kind={n.kind} x={n.x} y={n.y} />
                      <text x={n.x} y={n.y + 44} textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" letterSpacing="1.5" fill="#aab3c0" style={{ textTransform: "uppercase" }}>
                        {n.label.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
                {/* carrier marker */}
                <g data-marker>
                  <rect x="-16" y="-6" width="32" height="12" rx="2" fill="#0b0f18" stroke="#b3d4ff" strokeWidth="1.2" />
                  <rect x="-16" y="-9" width="10" height="7" rx="1.5" fill="#0b0f18" stroke="#b3d4ff" strokeWidth="1.2" />
                  <circle cx="-9" cy="7" r="2.2" fill="#b3d4ff" />
                  <circle cx="9" cy="7" r="2.2" fill="#b3d4ff" />
                </g>
              </svg>
              <div className="mt-2 flex items-center justify-between">
                <span className="spec">Generic network · not a lane map</span>
                <span className="spec !text-[var(--text-low)]">{String(active + 1).padStart(2, "0")} / {String(MOVEMENTS.length).padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function NodeGlyph({ kind, x, y }: { kind: "lot" | "store" | "home" | "port"; x: number; y: number }) {
  const s = "#e3e8ee";
  if (kind === "store")
    return (
      <g stroke={s} strokeWidth="1.4" fill="none" transform={`translate(${x - 12} ${y - 10})`}>
        <path d="M0 8 L12 0 L24 8 V20 H0 Z" />
        <path d="M9 20 V12 H15 V20" />
      </g>
    );
  if (kind === "home")
    return (
      <g stroke={s} strokeWidth="1.4" fill="none" transform={`translate(${x - 11} ${y - 11})`}>
        <path d="M0 10 L11 0 L22 10" />
        <path d="M3 8 V22 H19 V8" />
        <path d="M9 22 V14 H13 V22" />
      </g>
    );
  if (kind === "port")
    return (
      <g stroke={s} strokeWidth="1.4" fill="none" transform={`translate(${x - 13} ${y - 9})`}>
        <path d="M0 18 H26" />
        <path d="M2 18 V6 H10 V18 M16 18 V10 H24 V18" />
        <path d="M6 6 V0 M20 10 V4" />
      </g>
    );
  return (
    <g stroke={s} strokeWidth="1.4" fill="none" transform={`translate(${x - 14} ${y - 8})`}>
      <rect x="0" y="0" width="28" height="16" rx="1" />
      <path d="M7 0 V16 M14 0 V16 M21 0 V16" opacity="0.7" />
    </g>
  );
}
