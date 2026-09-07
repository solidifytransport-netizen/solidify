import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { COMPANY, ADDRESS_LINES } from "@/lib/site";
import { Section, SectionMark, PhoneLink } from "@/components/ui/Primitives";
import { Closing } from "@/components/layout/Closing";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Notice — Solidify Transport",
  description: "How Solidify Transport LLC handles the information submitted through this website, and why this site keeps no copy of it.",
  path: "/privacy",
});

const SECTIONS = [
  {
    h: "What this notice covers",
    p: [`This notice describes how ${COMPANY.legalName} ("Solidify", "we") handles information submitted through this website. It is written to be read, not to be skipped.`],
  },
  {
    h: "Information we collect",
    p: [
      "Quote and contact inquiries: the route, vehicle, timing and contact details you provide, together with the free-text notes you choose to add.",
      "Driver enquiries: your name, contact details, the licence you hold and whatever you choose to tell us about your driving.",
      "Technical information needed to serve the site securely, such as the IP address a request came from, used for rate limiting and abuse prevention.",
    ],
  },
  {
    h: "Why we collect it",
    p: [
      "To respond to your inquiry, prepare a quote and, if you proceed, perform the transport.",
      "To follow up with drivers and owner-operators who get in touch.",
      "To keep the site secure and available.",
    ],
  },
  {
    h: "What happens to what you send",
    p: [
      "Everything you submit through this website — quote, commercial and driver inquiries — is validated, then delivered directly to Solidify over an encrypted connection.",
      "This website does not keep a copy. There is no submissions database and no document store behind it; once a submission has been delivered, nothing about it remains on the site. Nothing is saved in your browser either, and sensitive values are masked on screen while you type them.",
      "If delivery does not succeed, the submission is not accepted and you are told so plainly — the site never reports a success it did not receive.",
      "This website collects no tax identification numbers, no bank details and no uploaded documents of any kind. The owner-operator application is completed on an external portal, and anything after approval is handled with Solidify directly.",
    ],
  },
  {
    h: "Retention and deletion",
    p: [
      "Because this website keeps no copy of your submission, there is nothing here to retain or delete. Solidify keeps the delivered information for the period required to respond to your inquiry, maintain the operator relationship and meet tax and record-keeping obligations.",
      "You can ask us to delete information we hold about you by contacting us using the details below. We will confirm what we can delete and what we are required to retain.",
    ],
  },
  {
    h: "Third parties",
    p: [
      "This site does not use third-party analytics, advertising trackers or session-recording tools.",
      "New owner-operator applications are completed through an external driver application portal. That portal is governed by its own privacy terms, and information you enter there is not collected by this website.",
      "We use infrastructure providers to host this website and to deliver submissions to Solidify. They process information on our behalf and under our instructions.",
    ],
  },
  {
    h: "Contact",
    p: [`Questions about this notice or about your information: ${COMPANY.legalName}, ${ADDRESS_LINES.join(", ")}.`],
  },
] as const;

export default function PrivacyPage() {
  return (
    <>
      <Section surface="navy" id="privacy" className="pt-[calc(var(--nav-h)+4rem)]" ariaLabelledBy="privacy-title" head="stack">
        <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-40" />
        <div className="shell-narrow relative flex flex-col gap-12">
          <header className="flex flex-col gap-4">
            <SectionMark index={1} label="Privacy notice" />
            <h1 id="privacy-title" className="display-md">
              How we handle your information.
            </h1>
            <p className="lead">Plain language, covering every form on this site.</p>
          </header>
          <div className="flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {SECTIONS.map((s, i) => (
              <section key={s.h} className="grid gap-3 py-8 sm:grid-cols-[4rem_1fr] sm:gap-6">
                <span className="numeral text-[var(--step--1)] text-[var(--text-low)]">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex flex-col gap-3">
                  <h2 className="title-sm">{s.h}</h2>
                  {s.p.map((para) => (
                    <p key={para} className="body">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p className="small">
            Phone: <PhoneLink className="link-underline text-[var(--text-hi)]" />
          </p>

          </div>
      </Section>
      <Closing compact />
    </>
  );
}
