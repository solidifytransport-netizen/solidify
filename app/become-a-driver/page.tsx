import type { Metadata } from "next";
import { pageMetadata, breadcrumbLd, faqLd } from "@/lib/seo";
import { CLAIMS, COMPANY } from "@/lib/site";
import { JsonLd } from "@/components/layout/JsonLd";
import { PageHero } from "@/components/blocks/PageHero";
import { RoleBoard } from "@/components/driver/RoleBoard";
import { Editorial } from "@/components/ui/Editorial";
import { FormConsole } from "@/components/forms/FormConsole";
import { Faq, type FaqItem } from "@/components/blocks/Faq";
import { Closing } from "@/components/layout/Closing";
import { Section, SectionMark, Lines } from "@/components/ui/Primitives";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

/**
 * /become-a-driver — drivers who would run SOLIDIFY'S equipment.
 *
 * The page next door, /owner-operators, is for people who own their Truck /
 * Power Unit: they have an application to complete and, once approved,
 * paperwork that follows. This page is the other audience entirely, and
 * it does NOT carry the external application portal.
 *
 * CONTENT RULE, and the reason this page reads the way it does: Solidify has
 * confirmed nothing about a company-driver programme — no pay basis, no
 * experience or endorsement minimums, no benefits, no hiring areas. None of
 * that is invented here. What the page states is the company (confirmed), the
 * work (a description of the trade, not a claim), and the federal rules that
 * bind every motor carrier (49 CFR 391, cited as regulation and never dressed
 * up as Solidify policy). Everything else is a conversation, so the page ends
 * in one instead of pretending to a job posting it cannot back.
 *
 * When the client supplies those facts, they belong in lib/site.ts and slot
 * into the ledger below without a layout change.
 */

export const metadata: Metadata = pageMetadata({
  title: "Become a Driver — Drive for an Auto Transport Carrier",
  description:
    "Drive auto-transport equipment for Solidify Transport, a motor carrier moving vehicles across all 48 contiguous states with strong Western-US coverage. See what the work involves and talk to the carrier directly.",
  path: "/become-a-driver",
});

const CARRIER = [
  {
    index: 1,
    title: "You would be driving for the carrier itself",
    meta: "Who you deal with",
    text: `Solidify performs the transport itself rather than arranging it for someone else. Dispatch, paperwork and payment all run through one company, based in ${COMPANY.city}, ${COMPANY.state}.`,
  },
  {
    index: 2,
    title: "Every load is vehicles",
    meta: "What you carry",
    text: "Cars, trucks and SUVs for manufacturers, dealerships and individuals. No dry freight, no mixed commodities — auto transport is all Solidify does.",
  },
  {
    index: 3,
    title: "All 48 contiguous states",
    meta: "Where the work runs",
    text: `${CLAIMS.coverageLong}, with a strong Western-US focus.`,
  },
  {
    index: 4,
    title: "Solidify's own equipment",
    meta: "What you would run",
    text: "This route is for drivers who want a Truck / Power Unit provided. If you already own yours, the owner-operator route is the one you want instead.",
  },
];

const FAQ: readonly FaqItem[] = [
  {
    q: "Is this the same as the owner-operator route?",
    a: "No. Owner-operators run their own Truck / Power Unit and carry their own insurance, and they apply through the driver application portal. This page is for drivers who would run equipment provided by Solidify. If you own your truck, start on the Owner Operators page instead.",
  },
  {
    q: "How do I apply?",
    a: "Send your details through the form on this page, or call the office. Solidify follows up directly — there is no separate portal for this route.",
  },
  {
    q: "What licence do I need?",
    a: "Federal rules require a commercial driver's license valid for the vehicle being operated, and a current medical examiner's certificate. Which class and which endorsements apply to a given run is something Solidify confirms with you directly.",
  },
  {
    q: "What does the pay look like?",
    a: "Pay for this route is discussed directly with Solidify. Nothing is published here that has not been confirmed, so rather than post a figure we cannot stand behind, we would rather have the conversation.",
  },
  {
    q: "Where will I run?",
    a: "Solidify moves vehicles across all 48 contiguous states, with strong Western-US coverage.",
  },
  {
    q: "What happens to the details I send?",
    a: "They are sent over an encrypted connection and delivered directly to Solidify Transport. This website does not keep a copy, and nothing is saved in your browser.",
  },
];

export default function BecomeADriverPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Become a Driver", path: "/become-a-driver" },
          ]),
          faqLd([...FAQ]),
        ]}
      />

      <PageHero
        mark={{ index: 1, label: "Become a driver" }}
        title={["Drive vehicles,", "not freight."]}
        lead="Solidify Transport is an auto transport motor carrier. Every load is cars, trucks and SUVs, moved for manufacturers, dealerships and the people who own them."
        slot="driver-hero"
        grade="deep"
        primary={{ href: "#talk", label: "Talk to Solidify" }}
        secondary={{ href: "#the-work", label: "See what the work is" }}
        specs={[
          { label: "The work", value: "Auto transport only" },
          { label: "Coverage", value: CLAIMS.coverage },
          { label: "Based", value: `${COMPANY.city}, ${COMPANY.state}` },
        ]}
      />

      <RoleBoard />

      <Editorial
        id="carrier"
        layout="ledger"
        surface="navy"
        head="stack"
        mark={{ index: 3, label: "Who you would drive for" }}
        title={["One carrier,", "one kind of load."]}
        lead="Only what Solidify has confirmed. Where a figure has not been confirmed, this page asks you to talk to the carrier rather than printing a number."
        rows={CARRIER}
        route
      />

      {/* The regulatory floor — stated as regulation, never as Solidify policy. */}
      <Section surface="deep" id="qualifying" ariaLabelledBy="qualifying-title" head="index" className="relative overflow-clip">
        <div className="shell relative flex flex-col gap-10">
          <div className="flex items-center justify-between gap-6 border-t border-[var(--line-strong)] pt-4">
            <SectionMark index={4} label="Before you get in touch" />
            <span aria-hidden className="hidden h-px flex-1 bg-[var(--line)] sm:block" />
          </div>

          <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
            <RevealText as="h2" id="qualifying-title" className="display-md max-w-[16ch] lg:col-span-7" mode="lines">
              <Lines text={["What every motor", "carrier has to check."]} />
            </RevealText>
            <Reveal className="lg:col-span-5 lg:justify-self-end">
              <p className="lead lg:max-w-[38ch]">
                These are federal rules under 49 CFR Part 391 and they apply to any carrier you drive for, Solidify included.
              </p>
            </Reveal>
          </div>

          <ul role="list" className="grid gap-px overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
            {[
              { n: "01", t: "A commercial driver's license", d: "Valid for the class of vehicle being operated, and for the state you are licensed in." },
              { n: "02", t: "A current medical certificate", d: "Issued by a certified medical examiner and in date for the whole time you are driving." },
              { n: "03", t: "A driving record the carrier reviews", d: "Every motor carrier is required to obtain and review the record of each driver it puts on the road." },
            ].map((r) => (
              <li key={r.n} className="flex flex-col gap-3 bg-[var(--surface)] p-6 lg:p-8">
                <span className="numeral text-[var(--step--1)] text-[rgba(179,212,255,0.85)]">{r.n}</span>
                <h3 className="title-sm max-w-[20ch]">{r.t}</h3>
                <p className="small max-w-[36ch]">{r.d}</p>
              </li>
            ))}
          </ul>

          <Reveal>
            <p className="body measure">
              Beyond that floor, what Solidify is looking for — experience, endorsements and the runs it needs covering — is confirmed with you directly. Nothing further is published here, because nothing further has been confirmed.
            </p>
          </Reveal>
        </div>
      </Section>

      <FormConsole
        id="talk"
        lane="driver"
        mark={{ index: 5, label: "Get in touch" }}
        title={["Talk to", "Solidify."]}
        lead="Tell us how to reach you and what you drive today. The carrier follows up directly — this goes to Solidify, not to a job board."
        slot="driver-console"
        specs={[
          { label: "Goes to", value: COMPANY.legalName },
          { label: "Kept on this site", value: "Nothing" },
          { label: "Follow-up", value: "Phone or email" },
        ]}
      />

      {/* The other audience, sent somewhere useful rather than left to guess. */}
      <Section surface="graphite" id="own-truck" ariaLabelledBy="own-truck-title" tight head="caption">
        <div className="shell">
          <div className="plate plate-steel relative flex flex-col gap-5 overflow-hidden p-6 lg:flex-row lg:items-center lg:justify-between lg:p-9">
            <div aria-hidden className="pointer-events-none absolute inset-0 guides" />
            <div className="relative flex flex-col gap-3">
              <SectionMark index={6} label="Own your own truck?" />
              <h2 id="own-truck-title" className="display-sm max-w-[22ch]">
                Owner-operators have their own route through.
              </h2>
              <p className="body max-w-[54ch]">
                If you run your own Truck / Power Unit and carry your own authority and insurance, the compensation, the requirements and the application all sit on the owner-operator page.
              </p>
            </div>
            <div className="relative flex-none">
              <Button href="/owner-operators" variant="steel">
                Go to Owner Operators
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Faq mark={{ index: 7, label: "Questions" }} title="Questions before you call" items={FAQ} surface="navy" />

      <Closing
        title={["Drive for", "the carrier."]}
        lead="Send your details, or call the office and talk it through."
        primary={{ href: "#talk", label: "Talk to Solidify" }}
        secondary={{ href: "/owner-operators", label: "I own my own truck" }}
        slot="driver-closing"
      />
    </>
  );
}
