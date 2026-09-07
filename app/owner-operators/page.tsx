import type { Metadata } from "next";
import { pageMetadata, breadcrumbLd, faqLd } from "@/lib/seo";
import { COMPENSATION, INSURANCE, CLAIMS } from "@/lib/site";
import { JsonLd } from "@/components/layout/JsonLd";
import { PageHero } from "@/components/blocks/PageHero";
import { Road } from "@/components/operators/Road";
import { ApplicationRoute, ApplyPanel } from "@/components/operators/Apply";
import { Editorial } from "@/components/ui/Editorial";
import { Faq, type FaqItem } from "@/components/blocks/Faq";
import { Closing } from "@/components/layout/Closing";

/**
 * /owner-operators — the page for people who own their Truck / Power Unit.
 *
 * It runs the whole relationship end to end and is the ONLY page that leaves
 * the domain: the application route explains the seven stages, the application
 * panel says what to have ready and then opens it. There is no onboarding
 * form on this website any more: tax and payment details are handled with
 * Solidify directly after approval. Drivers who would run Solidify's own
 * equipment are a different audience and have their own page.
 */

export const metadata: Metadata = pageMetadata({
  title: "Owner-Operators — Run Your Truck With an Auto Transport Carrier",
  description:
    "Run your Truck / Power Unit with Solidify Transport, an auto transport motor carrier. Compensation based on a percentage of line-haul revenue, Net 30 terms, all 48 contiguous states with strong Western-US coverage. See what the application asks for, then apply.",
  path: "/owner-operators",
});

const holder = INSURANCE.certificateHolder.join(", ");

const REQUIREMENTS = [
  {
    index: 1,
    title: "Your Truck / Power Unit and licensing",
    meta: "Equipment",
    text: "The VIN, year, make and model of your Truck / Power Unit, your licensing details, and the service areas you want to run.",
  },
  {
    index: 2,
    title: "Cargo insurance — $500,000 minimum",
    meta: "Insurance",
    text: `The certificate is sent from your insurance agent and must show ${holder} as certificate holder and additional insured.`,
  },
  {
    index: 3,
    title: "Commercial automobile liability — $1,000,000 combined single limit",
    meta: "Insurance",
    text: "Carried continuously while you run with the carrier.",
  },
  {
    index: 4,
    title: "General liability — $1,000,000 each occurrence, $1,000,000 aggregate",
    meta: "Insurance",
    text: "Shown on the same certificate as the cover above.",
  },
  {
    index: 5,
    title: "Tax and payment details",
    meta: "Paperwork",
    text: "Handled directly with Solidify once you are approved. They are not collected anywhere on this website.",
  },
];

const FAQ: readonly FaqItem[] = [
  { q: "How am I paid?", a: `${COMPENSATION.basis} Payment terms are ${COMPENSATION.terms}.` },
  {
    q: "What insurance do I need?",
    a: `Cargo at $500,000 minimum; commercial automobile liability at $1,000,000 combined single limit; general liability at $1,000,000 each occurrence and $1,000,000 general aggregate. The certificate is sent from your insurance agent and must show ${holder} as certificate holder and additional insured.`,
  },
  {
    q: "How do I apply?",
    a: "Start with the application section on this page. It lists what to have to hand, then opens the external driver application portal in a new tab.",
  },
  {
    q: "What happens after I am approved?",
    a: "Solidify contacts you directly to complete the operator agreement, the paperwork and your first dispatch. None of that is handled on this website.",
  },
  {
    q: "Does this website collect my tax or bank details?",
    a: "No. This site carries no onboarding form. Tax and payment details are handled directly with Solidify after approval, and nothing of that kind is entered here or stored here.",
  },
  {
    q: "I do not own a truck. Can I still drive?",
    a: "Yes — that is a different route. The Become a Driver page covers driving Solidify's own equipment, and the carrier follows up with you directly.",
  },
  { q: "Where will I run?", a: "Solidify moves vehicles across all 48 contiguous states, with strong Western-US coverage." },
];

export default function OwnerOperatorsPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Owner Operators", path: "/owner-operators" },
          ]),
          faqLd([...FAQ]),
        ]}
      />
      <PageHero
        mark={{ index: 1, label: "Owner-operators" }}
        title={["Run your Truck /", "Power Unit with an", "auto transport carrier."]}
        lead={`${COMPENSATION.basis} Payment terms are ${COMPENSATION.terms}. Vehicle loads across all 48 contiguous states, with strong Western-US coverage.`}
        slot="oo-hero"
        grade="deep"
        primary={{ href: "#apply", label: "Start your application" }}
        secondary={{ href: "#requirements", label: "See what you need" }}
        specs={[
          { label: "Compensation", value: COMPENSATION.basisShort },
          { label: "Terms", value: COMPENSATION.terms },
          { label: "Coverage", value: CLAIMS.coverage },
        ]}
      />

      <Road />

      <Editorial
        id="requirements"
        layout="ledger"
        surface="graphite"
        head="editorial"
        mark={{ index: 2, label: "What you need" }}
        title={["Before you", "apply."]}
        lead="Have these ready. The insurance limits and the certificate holder below are exactly what the carrier requires."
        rows={REQUIREMENTS}
        route
      />

      <ApplicationRoute />

      <ApplyPanel />


      <Faq mark={{ index: 6, label: "Questions" }} title="Questions from owner-operators" items={FAQ} surface="graphite" />

      <Closing
        title={["Run with", "the carrier."]}
        lead="Check the requirements, then start your application."
        primary={{ href: "#apply", label: "Start your application" }}
        secondary={{ href: "/become-a-driver", label: "I do not own a truck" }}
        slot="oo-closing"
      />
    </>
  );
}
