import type { ReactNode } from "react";
import clsx from "clsx";
import { COMPANY, APPLY_URL } from "@/lib/site";

export type Surface = "deep" | "navy" | "graphite" | "gunmetal" | "steel" | "ice";

/** A themed section. Declares its surface; every child resolves colour from it. */
export function Section({
  children,
  surface = "navy",
  className,
  id,
  tight = false,
  flush = false,
  as: Tag = "section",
  ariaLabelledBy,
  head,
}: {
  children: ReactNode;
  surface?: Surface;
  className?: string;
  id?: string;
  tight?: boolean;
  flush?: boolean;
  as?: "section" | "div" | "header" | "footer";
  ariaLabelledBy?: string;
  /** Which heading pattern this section uses — QA asserts neighbours differ. */
  head?: HeadPattern;
}) {
  return (
    <Tag
      id={id}
      data-surface={surface}
      data-section={id}
      data-head={head}
      aria-labelledby={ariaLabelledBy}
      className={clsx("section", tight && "section-tight", flush && "section-flush", className)}
    >
      {children}
    </Tag>
  );
}

export function Eyebrow({ children, className, plain = false }: { children: ReactNode; className?: string; plain?: boolean }) {
  return <span className={clsx("eyebrow", plain && "eyebrow-plain", className)}>{children}</span>;
}

/** "SEC 03 / COVERAGE" — the mono section mark of the detail layer. */
export function SectionMark({ index, label, className }: { index: string | number; label: string; className?: string }) {
  return (
    <span className={clsx("section-mark", className)} aria-hidden>
      <b>{String(index).padStart(2, "0")}</b>
      <span className="h-px w-6 bg-[var(--line-strong)]" />
      <span>{label}</span>
    </span>
  );
}

export type HeadPattern = "stack" | "editorial" | "index" | "caption";

/** Render a title given as a string or as authored lines. */
export function Lines({ text }: { text: string | readonly string[] }) {
  if (typeof text === "string") return <>{text}</>;
  return (
    <>
      {text.map((line, i) => (
        <span key={i}>
          {line}
          {i < text.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

/**
 * Section header in one of three patterns (plus the legacy stack):
 *  editorial — title left, lead right on the baseline, hairline above
 *  index     — an oversized mono index anchors the title
 *  caption   — title set inside media (caller places it)
 */
export function SectionHead({
  eyebrow,
  mark,
  title,
  lead,
  className,
  size = "md",
  align = "left",
  id,
  pattern = "stack",
  index,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  mark?: { index: string | number; label: string };
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  id?: string;
  pattern?: HeadPattern;
  index?: string | number;
  as?: "h1" | "h2" | "h3";
}) {
  const cls = size === "lg" ? "display-lg" : size === "sm" ? "display-sm" : "display-md";

  if (pattern === "editorial") {
    return (
      <div className={clsx("flex flex-col gap-6", className)} data-head-pattern="editorial">
        <div className="flex items-center justify-between gap-6 border-t border-[var(--line-strong)] pt-4">
          {mark ? <SectionMark index={mark.index} label={mark.label} /> : eyebrow ? <Eyebrow plain>{eyebrow}</Eyebrow> : <span />}
          <span aria-hidden className="hidden h-px flex-1 bg-[var(--line)] sm:block" />
        </div>
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
          <Tag id={id} className={clsx(cls, "max-w-[18ch] lg:col-span-7")}>
            {title}
          </Tag>
          {lead && <p className="lead lg:col-span-5 lg:max-w-[38ch] lg:justify-self-end">{lead}</p>}
        </div>
      </div>
    );
  }

  if (pattern === "index") {
    return (
      <div className={clsx("grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-8", className)} data-head-pattern="index">
        <span className="index-xl" aria-hidden>
          {String(index ?? mark?.index ?? "01").padStart(2, "0")}
        </span>
        <div className="flex flex-col gap-5">
          {(mark || eyebrow) && <span className="label">{mark?.label ?? eyebrow}</span>}
          <Tag id={id} className={clsx(cls, "max-w-[18ch]")}>
            {title}
          </Tag>
          {lead && <p className="lead measure">{lead}</p>}
        </div>
      </div>
    );
  }

  if (pattern === "caption") {
    return (
      <div className={clsx("flex flex-col gap-4", className)} data-head-pattern="caption">
        {(mark || eyebrow) && (mark ? <SectionMark index={mark.index} label={mark.label} /> : <Eyebrow>{eyebrow}</Eyebrow>)}
        <Tag id={id} className={clsx(cls, "max-w-[16ch]")}>
          {title}
        </Tag>
        {lead && <p className="lead max-w-[46ch]">{lead}</p>}
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col gap-5", align === "center" && "items-center text-center", className)} data-head-pattern="stack">
      {mark ? <SectionMark index={mark.index} label={mark.label} /> : eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Tag id={id} className={clsx(cls, "max-w-[18ch]")}>
        {title}
      </Tag>
      {lead && <p className="lead measure">{lead}</p>}
    </div>
  );
}

export type SpecItem = { label: string; value: ReactNode; href?: string };

/** Mono label · value rows. Facts come from lib/site.ts; nothing here is prose. */
export function SpecStrip({
  items,
  className,
  layout = "list",
  tone = "default",
}: {
  items: readonly SpecItem[];
  className?: string;
  layout?: "list" | "row" | "grid";
  tone?: "default" | "quiet";
}) {
  const valueCls = clsx("font-display font-medium leading-tight tracking-[-0.01em]", tone === "quiet" ? "text-[var(--step-0)] text-[var(--text-hi)]" : "text-[var(--step-1)] text-[var(--text-hi)]");
  if (layout === "row") {
    return (
      <dl className={clsx("flex flex-wrap items-start gap-x-10 gap-y-5", className)}>
        {items.map((it) => (
          <div key={it.label} className="flex flex-col gap-1.5">
            <dt className="label">{it.label}</dt>
            <dd className={valueCls}>{it.href ? <a href={it.href} className="link-underline">{it.value}</a> : it.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (layout === "grid") {
    return (
      <dl className={clsx("grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2", className)}>
        {items.map((it) => (
          <div key={it.label} className="flex flex-col gap-2 bg-[var(--surface)] p-5">
            <dt className="label">{it.label}</dt>
            <dd className={valueCls}>{it.href ? <a href={it.href} className="link-underline">{it.value}</a> : it.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className={clsx("flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]", className)}>
      {items.map((it) => (
        <div key={it.label} className="grid gap-1 py-3.5 sm:grid-cols-[minmax(9rem,12rem)_1fr] sm:gap-6">
          <dt className="label pt-1">{it.label}</dt>
          <dd className={valueCls}>{it.href ? <a href={it.href} className="link-underline">{it.value}</a> : it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The one place the phone number is written. */
export function PhoneLink({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <a href={COMPANY.phoneHref} className={className} data-phone-link>
      {children ?? COMPANY.phone}
    </a>
  );
}

/** The one place the external application URL is written. */
export function ApplyLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <a href={APPLY_URL} target="_blank" rel="noopener noreferrer" className={className} data-apply-cta>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function Rule({ accent = false, className }: { accent?: boolean; className?: string }) {
  return <div aria-hidden className={clsx(accent ? "rule-accent" : "rule", className)} />;
}

/** Numbered index used inside lists and rails. */
export function Index({ n, className }: { n: number | string; className?: string }) {
  return (
    <span className={clsx("numeral text-[var(--step--2)] tracking-[0.14em] text-[var(--accent)]", className)}>
      {String(n).padStart(2, "0")}
    </span>
  );
}
