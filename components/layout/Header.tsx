"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import { gsap, ScrollTrigger, EASE } from "@/lib/motion";
import { NAV, CTA, COMPANY } from "@/lib/site";
import { useSmoothScroll } from "./SmoothScroll";
import { Logo } from "./Mark";
import { PhoneLink } from "@/components/ui/Primitives";

/**
 * The navigation. Transparent over a hero, a condensed glass bar once the
 * hero has been left behind. It mirrors the surface of the section beneath
 * it so its type always resolves against what it is floating over. On
 * mobile it becomes a full-screen index with a real focus trap.
 */
export function Header() {
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { lock, unlock } = useSmoothScroll();

  useEffect(() => setOpen(false), [pathname]);

  /* ---- condense on scroll + surface mirroring + progress ---- */
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      let condensed: boolean | null = null;
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const next = self.scroll() > 60;
          if (next !== condensed) {
            condensed = next;
            el.setAttribute("data-condensed", next ? "true" : "false");
          }
          if (progress.current) progress.current.style.transform = `scaleX(${self.progress.toFixed(4)})`;
        },
      });

      // Mirror the surface of whichever section sits under the bar.
      const sections = Array.from(document.querySelectorAll<HTMLElement>("main [data-surface]"));
      const first = sections[0]?.dataset.surface;
      if (first) el.setAttribute("data-surface", first);
      const spies = sections.map((sec) =>
        ScrollTrigger.create({
          trigger: sec,
          start: "top 60px",
          end: "bottom 60px",
          onToggle: (self) => {
            if (self.isActive) el.setAttribute("data-surface", sec.dataset.surface ?? "navy");
          },
        }),
      );
      return () => {
        st.kill();
        spies.forEach((s) => s.kill());
      };
    },
    { scope: root, dependencies: [pathname] },
  );

  /* ---- mobile panel ---- */
  useGSAP(
    () => {
      const el = panel.current;
      if (!el) return;
      const items = el.querySelectorAll("[data-nav-item]");
      const foot = el.querySelectorAll("[data-nav-foot]");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (open) {
        lock();
        gsap.set(el, { display: "grid" });
        if (reduced) {
          gsap.set(el, { clipPath: "inset(0 0 0% 0)" });
          gsap.set(items, { yPercent: 0 });
          gsap.set(foot, { autoAlpha: 1, y: 0 });
          return;
        }
        gsap
          .timeline()
          .fromTo(el, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: EASE.inOut })
          .fromTo(items, { yPercent: 118 }, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: EASE.veil }, 0.2)
          .fromTo(foot, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06 }, 0.45);
      } else {
        unlock();
        if (reduced) {
          gsap.set(el, { clipPath: "inset(0 0 100% 0)", display: "none" });
          return;
        }
        gsap.to(el, {
          clipPath: "inset(0 0 100% 0)",
          duration: 0.6,
          ease: EASE.inOut,
          onComplete: () => gsap.set(el, { display: "none" }),
        });
      }
    },
    { dependencies: [open], scope: panel },
  );

  /* ---- modal semantics: focus trap, inert main, Escape, focus return ---- */
  useEffect(() => {
    if (!open) return;
    const el = panel.current;
    if (!el) return;
    const opener = document.activeElement as HTMLElement | null;
    const main = document.getElementById("main");
    main?.setAttribute("inert", "");
    const focusables = () =>
      Array.from(el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(
        (n) => n.getClientRects().length > 0,
      );
    const raf = requestAnimationFrame(() => focusables()[0]?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      main?.removeAttribute("inert");
      opener?.focus?.();
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header
        ref={root}
        data-condensed="false"
        data-surface="deep"
        className="group/nav fixed inset-x-0 top-0 z-[100] text-[var(--text-hi)]"
      >
        <div
          aria-hidden
          className="absolute inset-0 border-b border-[var(--line)] opacity-0 backdrop-blur-xl transition-opacity duration-500 group-data-[condensed=true]/nav:opacity-100 [background:color-mix(in_srgb,var(--surface)_78%,transparent)]"
        />

        <div
          className="shell-wide relative flex items-center justify-between transition-[height] duration-500 ease-[var(--ease-arrive)]"
          style={{ height: "var(--nav-h)" }}
          data-nav-bar
        >
          <Link href="/" aria-label={`${COMPANY.name} — home`} className="relative z-10 flex min-h-11 shrink-0 items-center">
            <Logo variant="horizontal" priority className="h-[22px] w-auto min-[400px]:h-[26px] md:h-[30px] xl:h-[34px]" />
          </Link>

          {/* The inline nav needs 1280, not 1024.

              Five labels measure ~575px, the quote button ~117px and the
              lockup ~323px: 1015px of content, which needs roughly 1130px of
              bar before the gaps read as gaps. At 1024 the bar is 932px, so
              "About" sat hard against the quote button and the wordmark ran
              into "Car Shipping" — a collision that predates the lockup
              change and that a smaller logo only hid. Below xl the full-screen
              index takes over, which is a better answer at that width than
              five cramped labels. */}
          <nav aria-label="Primary" className="hidden xl:block">
            <ul role="list" className="flex items-center gap-[clamp(1.05rem,1.7vw,2.1rem)]">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className="nav-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link href={CTA.quoteShort.href} className="btn btn-metal btn-sm hidden md:inline-flex" data-nav-cta>
              {CTA.quoteShort.label}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="nav-panel"
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-md border border-[var(--line-strong)] transition-colors hover:border-[rgba(127,182,255,0.7)] xl:hidden"
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <span aria-hidden className="relative block h-[10px] w-[20px]">
                <span
                  className={clsx(
                    "absolute left-0 block h-px w-full bg-current transition-all duration-500",
                    open ? "top-1/2 rotate-45" : "top-0",
                  )}
                />
                <span
                  className={clsx(
                    "absolute left-0 block h-px bg-current transition-all duration-500",
                    open ? "top-1/2 w-full -rotate-45" : "bottom-0 w-2/3",
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px origin-left bg-[var(--accent)] opacity-70" ref={progress} style={{ transform: "scaleX(0)" }} />
      </header>

      <div
        id="nav-panel"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        data-surface="deep"
        className="fixed inset-0 z-[95] hidden grid-rows-[1fr_auto] bg-[var(--surface)] px-[var(--spacing-gutter)] pb-[var(--spacing-gutter)] pt-[calc(var(--nav-h)+1.5rem)] text-[var(--text-hi)]"
        style={{ clipPath: "inset(0 0 100% 0)" }}
      >
        <nav aria-label="Site index" className="flex flex-col justify-center">
          <ul role="list" className="flex flex-col">
            {[...NAV, { href: "/contact", label: "Get a Quote" }].map((item, i) => (
              <li key={item.href} className="mask-line border-b border-[var(--line)] py-[clamp(0.6rem,1.8vh,1.1rem)]">
                <Link data-nav-item href={item.href} className="flex items-baseline gap-5 py-1" onClick={() => setOpen(false)}>
                  <span className="numeral text-[var(--step--2)] text-[var(--text-low)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="display-sm">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-5 pt-8">
          <Link data-nav-foot href={CTA.quote.href} className="btn btn-metal w-fit" onClick={() => setOpen(false)}>
            {CTA.quote.label}
          </Link>
          <div data-nav-foot className="flex flex-wrap items-center gap-x-6 gap-y-2 small">
            <PhoneLink className="link-underline text-[var(--text-hi)]" />
            <span className="text-[var(--text-low)]">{COMPANY.descriptor}</span>
          </div>
        </div>
      </div>
    </>
  );
}
