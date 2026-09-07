import { CLAIMS, CTA, COMPENSATION, COMPANY } from "@/lib/site";

/**
 * Homepage copy. Every claim traces to lib/site.ts or the client's paperwork.
 * Geography is always "strong Western-US focus / coverage" — never a comparative.
 */
export const HOME = {
  hero: {
    spec: `${COMPANY.city.toUpperCase()}, ${COMPANY.state} · 48 CONTIGUOUS STATES · WESTERN US`,
    eyebrow: "Auto transport motor carrier",
    title: ["Nationwide auto", "transport,", "carrier-direct."],
    lead: "Solidify Transport is an auto transport motor carrier. We move vehicles for OEMs, dealerships and consumers across all 48 contiguous states, with strong Western-US coverage — and you work directly with the carrier.",
    primary: CTA.quote,
    secondary: CTA.oem,
    tertiary: CTA.drive,
    claims: [
      { value: "48", label: "Contiguous states" },
      { value: "West", label: "Western-US focus" },
      { value: `${COMPANY.city}, ${COMPANY.state}`, label: "Company location" },
    ],
  },

  lanes: {
    mark: { index: 1, label: "Who we move vehicles for" },
    title: ["Three ways to work", "with the carrier."],
    items: [
      {
        slot: "lane-consumer",
        index: "01",
        kicker: "Consumers",
        title: "Ship a vehicle",
        text: "Relocating, bought a car out of state, or need a vehicle moved across the country. Get a quote from the carrier that moves it.",
        href: "/car-shipping",
        cta: "Car shipping",
      },
      {
        slot: "lane-oem",
        index: "02",
        kicker: "OEMs & dealerships",
        title: "Commercial vehicle movement",
        text: "Inventory relocation, dealer-to-dealer transfers and retail delivery, run by a motor carrier built around vehicles.",
        href: "/oem-dealerships",
        cta: "OEM & dealerships",
      },
      {
        slot: "lane-operator",
        index: "03",
        kicker: "Owner-operators",
        title: "Drive with Solidify",
        text: `Run your Truck / Power Unit with an auto transport carrier. ${COMPENSATION.basisShort}, ${COMPENSATION.terms} terms.`,
        href: "/owner-operators",
        cta: "Owner operators",
      },
    ],
  },

  statement: {
    mark: { index: 2, label: "What Solidify does" },
    title: ["A motor carrier", "built around vehicles."],
    lead: "Solidify Transport transports vehicles. Cars, trucks and SUVs for manufacturers, dealerships and individuals — that is the whole business.",
    slot: "statement",
    specs: [
      { label: "Business", value: COMPANY.descriptor },
      { label: "Coverage", value: CLAIMS.coverage },
      { label: "Focus", value: CLAIMS.focus },
    ],
  },

  sequence: {
    mark: { index: 3, label: "How vehicle transport works" },
    title: ["Pickup.", "Transit.", "Delivery."],
    lead: "The same process whether it is one vehicle or a dealer's inventory.",
    beats: [
      {
        slot: "seq-pickup",
        title: "Pickup",
        text: "The vehicle is loaded and secured on the carrier at the agreed pickup point.",
        spec: "01 · LOADED AND SECURED",
        readout: [
          { label: "Where", value: "The agreed pickup point" },
          { label: "What happens", value: "Loaded and secured on the carrier" },
          { label: "Who", value: "The carrier's own driver" },
        ],
      },
      {
        slot: "seq-transit",
        title: "Transit",
        text: "It travels on the carrier to the destination.",
        spec: "02 · ON THE CARRIER",
        readout: [
          { label: "Where", value: "On the carrier, en route" },
          { label: "What happens", value: "It travels on the deck it was loaded on" },
          { label: "Who", value: "One contact for the whole move" },
        ],
      },
      {
        slot: "seq-delivery",
        title: "Delivery",
        text: "It is unloaded and handed over at the delivery address.",
        spec: "03 · HANDED OVER",
        readout: [
          { label: "Where", value: "The delivery address" },
          { label: "What happens", value: "Unloaded and handed over" },
          { label: "Who", value: "The same carrier that collected it" },
        ],
      },
    ],
  },

  carShipping: {
    mark: { index: 4, label: "Car shipping" },
    title: ["Vehicle shipping", "for people, not pallets."],
    lead: "Moving across the country, buying a car in another state, sending a vehicle to a family member — Solidify moves it as the carrier, with a clear quote and a clear process.",
    specs: [
      { label: "Route", value: "Pickup and delivery, city and state" },
      { label: "Vehicle", value: "Year, make and model" },
      { label: "Timing", value: "A preferred date or window" },
      { label: "Contact", value: "So the carrier can confirm with you" },
    ],
    href: "/car-shipping#quote",
    cta: "Get a vehicle shipping quote",
  },

  oem: {
    mark: { index: 5, label: "OEM & dealerships" },
    title: ["Commercial vehicle movement,", "operated by the carrier."],
    lead: "For OEMs, dealerships and dealer groups: inventory relocation, dealer-to-dealer transfers and retail delivery, run by a motor carrier whose only cargo is vehicles.",
    bullets: ["Dealer-to-dealer transfers", "Inventory relocation between lots, storage and stores", "Retail delivery to the customer's address"],
    href: "/oem-dealerships",
    cta: "OEM & dealership solutions",
    slot: "home-oem",
  },

  coverage: {
    mark: { index: 6, label: "Coverage" },
    eyebrow: "Coverage",
    title: "All 48 contiguous states. Strong Western-US focus.",
    lead: "Solidify moves vehicles across the contiguous United States, with strong Western-US coverage — California, Oregon, Washington, Nevada, Arizona, Utah, Idaho, Montana, Wyoming, Colorado, New Mexico and Texas.",
  },

  sheet: {
    mark: { index: 7, label: "The carrier" },
    title: ["Solidify Transport,", "in specifics."],
    lead: "No numbers we cannot stand behind. The company, where it is based, what it moves and where.",
    specs: [
      { label: "Company", value: COMPANY.legalName },
      { label: "Business", value: COMPANY.descriptor },
      { label: "Location", value: `${COMPANY.street}, ${COMPANY.city}, ${COMPANY.state} ${COMPANY.zip}` },
      { label: "Coverage", value: CLAIMS.coverage },
      { label: "Focus", value: CLAIMS.focus },
      { label: "Phone", value: COMPANY.phone, href: COMPANY.phoneHref },
    ],
  },

  operator: {
    mark: { index: 8, label: "Owner-operators" },
    title: ["Run your Truck / Power Unit", "with an auto transport carrier."],
    lead: `${COMPENSATION.basis} Payment terms are ${COMPENSATION.terms}. See what the application asks for, then apply through the driver application portal.`,
    specs: [
      { label: "Compensation", value: COMPENSATION.basisShort },
      { label: "Payment terms", value: COMPENSATION.terms },
      { label: "Cargo insurance", value: "$500,000 minimum" },
    ],
    href: "/owner-operators",
    cta: CTA.drive.label,
  },

  closing: {
    title: ["Move it with", "the carrier."],
    lead: "Get a quote for one vehicle, or start a commercial inquiry for many.",
  },
} as const;
