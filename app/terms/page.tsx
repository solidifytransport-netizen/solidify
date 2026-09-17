import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { COMPANY, ADDRESS_LINES } from "@/lib/site";
import { Section, SectionMark, PhoneLink } from "@/components/ui/Primitives";
import { Closing } from "@/components/layout/Closing";

/**
 * /terms — terms of use for THIS WEBSITE.
 *
 * Scope is deliberately narrow, and section 03 says so on the page: these
 * terms govern using the site, not the carriage of a vehicle. The transport
 * itself is governed by whatever Solidify and the customer sign — a rate
 * confirmation, a transportation agreement, a bill of lading — and this page
 * must never be allowed to read as though it sets those terms.
 *
 * Nothing here invents a commercial position the client has not confirmed:
 * no cancellation fees, no claims window, no liability cap on cargo, no
 * delivery commitments, no dispute-resolution or arbitration clause. Where a
 * default was unavoidable it is a jurisdiction (California, where the company
 * is formed and based) and nothing more. This is a plain-language terms of
 * use written by an engineer, and it should be reviewed by the client's
 * attorney before it is relied on.
 */

export const metadata: Metadata = pageMetadata({
  title: "Terms & Conditions — Solidify Transport",
  description:
    "The terms that apply to using the Solidify Transport website, including quotes and estimates, information you submit, the owner-operator application, and the limits of what this site does.",
  path: "/terms",
});

const EFFECTIVE = "September 2026";

type Clause = { h: string; p: readonly string[] };

const SECTIONS: readonly Clause[] = [
  {
    h: "Who these terms are from",
    p: [
      `This website is operated by ${COMPANY.legalName}, an auto transport motor carrier based at ${ADDRESS_LINES.join(", ")} ("Solidify", "we", "us").`,
      "By using this website you accept these terms. If you do not accept them, please do not use the site.",
    ],
  },
  {
    h: "What this website is",
    p: [
      "This site describes Solidify's vehicle transport services and provides forms for requesting a quote, making a commercial inquiry and inquiring about driving.",
      "The content on this site is provided for information. It is kept accurate to the best of our knowledge, but it is not professional advice and it may change without notice.",
    ],
  },
  {
    h: "Quotes, estimates and the transport itself",
    p: [
      "A quote requested through this website is an estimate based on the information you give us. It is not an offer capable of acceptance and it does not create a contract of carriage.",
      "Transport is agreed separately, in writing, once Solidify has confirmed it can perform the move. The terms of that transport — pricing, timing, cargo liability, claims and everything else to do with carrying a vehicle — are set by the transport agreement, rate confirmation and bill of lading between you and Solidify, not by this page.",
      "Where anything on this website conflicts with a signed transport agreement, the signed agreement governs.",
    ],
  },
  {
    h: "Information you submit",
    p: [
      "You are responsible for the accuracy of what you enter. Vehicle details, addresses and contact details determine whether we can quote or perform a move at all.",
      "Submissions through this site are validated and then delivered directly to Solidify over an encrypted connection. This website keeps no copy of them, and nothing is saved in your browser. How that information is handled once delivered is described in our privacy notice.",
      "Do not submit information about anyone else unless you are entitled to, and do not submit material that is unlawful or that you have no right to share.",
    ],
  },
  {
    h: "The owner-operator application",
    p: [
      "New owner-operator applications are completed through an external driver application portal, which opens in a new tab. That portal is operated independently of this website and is governed by its own terms and privacy practices. Submitting an application there does not create any agreement with Solidify.",
      "This website does not collect tax identification numbers, bank details or uploaded documents. Anything of that kind is handled with Solidify directly after approval.",
      "Completing an application does not by itself create a contract, an engagement or an entitlement to loads. Any working relationship between Solidify and an owner-operator is set out in a separate written agreement.",
    ],
  },
  {
    h: "Inquiring about driving",
    p: [
      "Sending your details through the driver form on this site is an inquiry, not an application for a specific position, and it does not create an offer of work or any obligation on either side.",
      "Terms of any driving engagement, including pay and the requirements that apply to it, are discussed and agreed directly with Solidify.",
    ],
  },
  {
    h: "Acceptable use",
    p: [
      "Use this site lawfully and for its intended purpose. Do not attempt to gain unauthorized access to any part of it, interfere with its operation or security, submit automated or fraudulent inquiries, or use it to send unsolicited commercial messages.",
      "We may restrict access where use of the site is abusive, automated or unlawful. The forms on this site are rate limited as a matter of course.",
    ],
  },
  {
    h: "Our content",
    p: [
      "The design, text, layout, code and graphics on this website belong to Solidify or its licensors and may not be copied, republished or reused without permission.",
      "Photographs on this site are licensed stock images. People appearing in them are stock subjects and are not Solidify employees, operators or customers, and nothing on this site should be read as suggesting otherwise. Vehicles and equipment shown are illustrative of the work and are not necessarily Solidify's own.",
      `${COMPANY.name} and the Solidify mark are used to identify this business. Other names, marks and liveries that appear on this site belong to their respective owners and are not affiliated with Solidify.`,
    ],
  },
  {
    h: "Links to other sites",
    p: [
      "This website links to the external driver application portal. We do not control that site or any other site we link to, and we are not responsible for their content, availability or practices. Following an external link is at your own discretion.",
    ],
  },
  {
    h: "Availability and limits",
    p: [
      "We aim to keep this website available and working, but we do not promise that it will be uninterrupted, error-free or free of every defect. The site is provided as it is, without warranties of any kind, express or implied, to the fullest extent the law allows.",
      "To the fullest extent permitted by law, Solidify is not liable for indirect or consequential loss arising from your use of this website, or for loss arising from any interruption to it. Nothing in these terms limits liability that cannot lawfully be limited — including for death or personal injury caused by negligence, or for fraud.",
      "This section is about the website. It does not affect Solidify's responsibilities as a motor carrier, which are governed by the transport agreement and by applicable federal and state transport law.",
    ],
  },
  {
    h: "Changes",
    p: [
      `We may update these terms as the site or the business changes. The version published here is the one that applies, and it was last updated in ${EFFECTIVE}.`,
    ],
  },
  {
    h: "Governing law",
    p: [
      "These website terms are governed by the laws of the State of California, without regard to its conflict-of-law rules. This does not displace any mandatory consumer protections available to you where you live, and it does not govern the transport itself, which is subject to the agreement covering it and to applicable federal transport law.",
    ],
  },
  {
    h: "Contact",
    p: [`Questions about these terms: ${COMPANY.legalName}, ${ADDRESS_LINES.join(", ")}.`],
  },
];

export default function TermsPage() {
  return (
    <>
      <Section surface="navy" id="terms" className="pt-[calc(var(--nav-h)+4rem)]" ariaLabelledBy="terms-title" head="stack">
        <div aria-hidden className="pointer-events-none absolute inset-0 guides opacity-40" />
        <div className="shell-narrow relative flex flex-col gap-12">
          <header className="flex flex-col gap-4">
            <SectionMark index={1} label="Terms & conditions" />
            <h1 id="terms-title" className="display-md">
              The terms of using this site.
            </h1>
            <p className="lead">
              Plain language, and narrow on purpose: these cover the website. Carrying a vehicle is covered by the agreement for that move.
            </p>
            <p className="spec">Last updated {EFFECTIVE}</p>
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

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 small">
            <span>
              Phone: <PhoneLink className="link-underline text-[var(--text-hi)]" />
            </span>
            <Link href="/privacy" className="link-underline text-[var(--text-hi)]">
              Privacy notice
            </Link>
          </div>
        </div>
      </Section>
      <Closing compact />
    </>
  );
}
