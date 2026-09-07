import type { Metadata } from "next";
import { pageMetadata, serviceLd, breadcrumbLd, faqLd } from "@/lib/seo";
import { CTA } from "@/lib/site";
import { JsonLd } from "@/components/layout/JsonLd";
import { PageHero } from "@/components/blocks/PageHero";
import { Editorial } from "@/components/ui/Editorial";
import { Situations } from "@/components/car/Situations";
import { CoverageMap } from "@/components/blocks/CoverageMap";
import { FormConsole } from "@/components/forms/FormConsole";
import { RouteMap } from "@/components/car/RouteMap";
import { Faq, type FaqItem } from "@/components/blocks/Faq";
import { Closing } from "@/components/layout/Closing";

export const metadata: Metadata = pageMetadata({
  title: "Car Shipping — Nationwide Vehicle Transport by the Carrier",
  description:
    "Ship a car, truck or SUV anywhere in the 48 contiguous states with Solidify Transport, an auto transport motor carrier. A clear quote and a clear process from pickup to delivery.",
  path: "/car-shipping",
});

const FAQ: readonly FaqItem[] = [
  {
    q: "Is Solidify the carrier?",
    a: "Yes. Solidify Transport is the motor carrier that moves your vehicle.",
  },
  {
    q: "Where do you ship vehicles?",
    a: "Across all 48 contiguous states, with strong Western-US coverage — California, Oregon, Washington, Nevada, Arizona, Utah, Idaho, Montana, Wyoming, Colorado, New Mexico and Texas.",
  },
  {
    q: "What do I need to give you for a quote?",
    a: "Pickup and delivery locations, the vehicle's year, make and model, its condition, a preferred date, and your contact details.",
  },
  {
    q: "What happens at pickup and delivery?",
    a: "At pickup the vehicle is loaded and secured on the carrier. At delivery it is unloaded and handed over at the address you gave us.",
  },
  {
    q: "How do I get a price?",
    a: "Use the quote form on this page or call us. Every quote is prepared by the carrier for your specific route and vehicle.",
  },
];

export default function CarShippingPage() {
  return (
    <>
      <JsonLd
        data={[
          serviceLd({
            name: "Car shipping",
            description: "Nationwide vehicle shipping for individuals and businesses, performed by Solidify Transport as the motor carrier.",
            path: "/car-shipping",
          }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Car Shipping", path: "/car-shipping" },
          ]),
          faqLd([...FAQ]),
        ]}
      />
      <PageHero
        mark={{ index: 1, label: "Car shipping" }}
        title={["Car shipping", "by the carrier,", "coast to coast."]}
        lead="Solidify Transport moves cars, trucks and SUVs across all 48 contiguous states as the motor carrier. Tell us the route and the vehicle; we come back with a quote and a pickup window."
        slot="cs-hero"
        grade="cool"
        primary={{ href: "#quote", label: "Get a vehicle shipping quote" }}
        secondary={{ href: "#sequence", label: "How it works" }}
      />

      <Editorial
        id="what"
        layout="feature"
        surface="graphite"
        head="index"
        mark={{ index: 3, label: "What vehicle transport is" }}
        title={["Your vehicle rides", "on a car carrier."]}
        lead="Vehicle transport means your car is loaded onto a purpose-built car carrier at pickup, secured, driven to the destination on the carrier, and unloaded at delivery — with no miles added."
        media={{ slot: "cs-hero", aspect: 16 / 10, grade: "cool", caption: "Vehicles on the deck, secured for the run" }}
        bullets={["Loaded, secured and unloaded by the carrier", "Carried on the carrier from pickup to delivery", "No miles added to your vehicle"]}
      />

      <Situations />

      <Editorial
        id="sequence"
        layout="ledger"
        surface="deep"
        head="stack"
        mark={{ index: 4, label: "How vehicle transport works" }}
        title={["One vehicle,", "one process."]}
        lead="The same three movements every time, whether it is your car or a dealer's inventory."
        rows={[
          { index: 1, title: "Pickup", meta: "Loaded and secured", text: "The vehicle is loaded and secured on the carrier at the agreed pickup point." },
          { index: 2, title: "Transit", meta: "On the carrier", text: "It travels on the carrier to the destination — on the deck it was loaded on, with one contact for the whole move." },
          { index: 3, title: "Delivery", meta: "Handed over", text: "It is unloaded and handed over at the delivery address by the same carrier that collected it." },
        ]}
      />

      <CoverageMap
        id="coverage"
        mark={{ index: 5, label: "Coverage" }}
        title="All 48 contiguous states. Strong Western-US focus."
        lead="Wherever the route runs in the contiguous United States, the carrier handles it, with strong Western-US coverage on both ends."
        surface="navy"
      />

      <FormConsole
        id="quote"
        lane="vehicle"
        mark={{ index: 6, label: "Get a quote" }}
        title={["Tell the carrier", "about the move."]}
        lead="Four things and we can quote it: the route, the vehicle, the timing and how to reach you."
        specs={[
          { label: "Route", value: "Pickup and delivery, city and state" },
          { label: "Vehicle", value: "Year, make, model and condition" },
          { label: "Timing", value: "A preferred date or window" },
          { label: "Contact", value: "So the carrier can confirm with you" },
        ]}
        slot="quote-ground"
        rail={<RouteMap />}
      />

      <Faq mark={{ index: 7, label: "Questions" }} title="Questions about car shipping" items={FAQ} surface="graphite" />
      <Closing title={["One vehicle.", "One carrier."]} lead="Request a quote and the carrier comes back to you directly." primary={{ href: "#quote", label: "Get a vehicle shipping quote" }} secondary={CTA.oem} />
    </>
  );
}
