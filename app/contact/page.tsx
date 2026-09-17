import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata, breadcrumbLd } from "@/lib/seo";
import { COMPANY, ADDRESS_LINES, CLAIMS } from "@/lib/site";
import { JsonLd } from "@/components/layout/JsonLd";
import { ContactLanes } from "@/components/forms/ContactLanes";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Section, SectionMark, PhoneLink, Lines } from "@/components/ui/Primitives";
import { Plate } from "@/components/ui/Plate";
import { LightSweep } from "@/components/ui/LightSweep";
import { Button } from "@/components/ui/Button";
import { Closing } from "@/components/layout/Closing";

export const metadata: Metadata = pageMetadata({
  title: "Get a Quote — Contact Solidify Transport",
  description:
    "Get a vehicle shipping quote or start an OEM and dealership inquiry with Solidify Transport, an auto transport motor carrier in Tracy, California. (510) 499-4552.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />

      {/* compact typographic hero */}
      <section id="hero" data-section="hero" data-surface="deep" data-head="hero" aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-[var(--surface)] text-[var(--text-hi)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-50" />
        <div aria-hidden className="light-field opacity-35" />
        <div className="shell relative z-10 flex min-h-[70svh] flex-col justify-end gap-8 pb-[clamp(2.75rem,6vh,4.5rem)] pt-[calc(var(--nav-h)+5.5rem)]">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="flex flex-col gap-5 lg:col-span-7">
              <Reveal immediate delay={0.1} y={10}>
                <SectionMark index={1} label="Get a quote" />
              </Reveal>
              <RevealText as="h1" id="hero-title" immediate delay={0.2} className="display-lg max-w-[12ch]">
                <Lines text={["Get a quote,", "or reach the carrier."]} />
              </RevealText>
              <Reveal immediate delay={0.6}>
                <p className="lead max-w-[48ch]">Vehicle shipping quotes and OEM or dealership movement — straight to Solidify Transport, the carrier that performs the move.</p>
              </Reveal>
            </div>
            <Reveal immediate delay={0.8} y={16} className="plate plate-steel relative overflow-hidden p-6 lg:col-span-5 lg:p-7">
              <LightSweep trigger="inview" delay={1} />
              <div className="relative flex flex-col gap-3">
                <span className="label">Call the carrier</span>
                <PhoneLink className="font-display text-[clamp(1.7rem,1.15rem+1.7vw,2.7rem)] font-medium leading-none tracking-[-0.015em] text-[var(--text-hi)]" />
                <span className="spec">{COMPANY.legalName} · {COMPANY.city}, {COMPANY.state}</span>
              </div>
            </Reveal>
          </div>
          <div className="hairline-route" aria-hidden />
        </div>
      </section>

      <Section surface="navy" id="inquiry" ariaLabelledBy="inquiry-title" head="editorial">
        <div className="shell flex flex-col gap-10">
          <div className="flex items-center justify-between gap-6 border-t border-[var(--line-strong)] pt-4">
            <SectionMark index={2} label="Choose your inquiry" />
            <span aria-hidden className="hidden h-px flex-1 bg-[var(--line)] sm:block" />
            <span className="spec hidden sm:inline">{COMPANY.descriptor}</span>
          </div>
          <div className="plate relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 guides" />
            <div className="relative grid lg:grid-cols-12">
              <div className="relative flex flex-col gap-8 overflow-hidden border-b border-[var(--line)] p-6 sm:p-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:p-10">
                <div className="absolute inset-0 -z-10 opacity-30">
                  <Plate slot="contact-rail" sizes="(max-width: 1024px) 100vw, 34vw" aspect="fill" parallax={6} reveal={false} grade="deep" dim={0.6} className="!absolute inset-0 h-full w-full" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[var(--surface-raised)]/40 via-transparent to-[var(--surface-raised)]" />
                </div>
                <h2 id="inquiry-title" className="display-sm max-w-[12ch]">
                  Choose your inquiry.
                </h2>
                <p className="body max-w-[36ch]">Pick the lane that matches you. Every form reaches the carrier directly.</p>
                <Reveal as="address" className="mt-auto flex flex-col gap-5 not-italic">
                  <div className="flex flex-col gap-1">
                    <span className="label">Phone</span>
                    <PhoneLink className="font-display text-[var(--step-2)] font-medium text-[var(--text-hi)]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="label">Office</span>
                    <span className="body !text-[var(--text-hi)]">
                      {COMPANY.legalName}{" "}
                      <br />
                      {ADDRESS_LINES[0]}{" "}
                      <br />
                      {ADDRESS_LINES[1]}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="label">Business</span>
                    <span className="small">
                      {COMPANY.descriptor} · {CLAIMS.coverage} · {CLAIMS.focus}
                    </span>
                  </div>
                </Reveal>
              </div>
              <div className="p-6 sm:p-8 lg:col-span-8 lg:p-10">
                <Suspense fallback={<div className="min-h-[420px]" aria-hidden />}>
                  <ContactLanes />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Two audiences, two routes. Neither is a lane in the form above:
          one is a conversation, the other is an application. */}
      <Section surface="graphite" id="drive" ariaLabelledBy="drive-title" head="index">
        <div className="shell relative flex flex-col gap-6">
          <div className="flex items-center justify-between gap-6 border-t border-[var(--line-strong)] pt-4">
            <SectionMark index={3} label="Driving with Solidify" />
            <span aria-hidden className="hidden h-px flex-1 bg-[var(--line)] sm:block" />
          </div>
          <h2 id="drive-title" className="display-sm max-w-[24ch]">
            Two ways to run with the carrier.
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              {
                n: "01",
                mark: "Drive our equipment",
                title: "Become a driver",
                text: "For drivers who want a Truck / Power Unit provided. See what auto transport actually involves, then talk to Solidify directly.",
                href: "/become-a-driver",
                cta: "Become a driver",
              },
              {
                n: "02",
                mark: "Own your own truck",
                title: "Owner-operators",
                text: "For operators running their own Truck / Power Unit. Compensation, insurance requirements, what the application asks for, and the application itself.",
                href: "/owner-operators",
                cta: "Go to owner-operators",
              },
            ].map((c) => (
              <article key={c.n} className="plate plate-steel relative flex flex-col justify-between gap-6 overflow-hidden p-6 lg:p-8">
                <div aria-hidden className="pointer-events-none absolute inset-0 guides" />
                <LightSweep trigger="hover" />
                <div className="relative flex items-baseline justify-between">
                  <span className="index-xl !text-[clamp(1.8rem,1.3rem+1.4vw,2.8rem)]">{c.n}</span>
                  <span className="spec">{c.mark}</span>
                </div>
                <div className="relative flex flex-col gap-3">
                  <h3 className="title">{c.title}</h3>
                  <p className="body max-w-[46ch]">{c.text}</p>
                </div>
                <div className="relative">
                  <Button href={c.href} variant="steel">
                    {c.cta}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Closing compact />
    </>
  );
}
