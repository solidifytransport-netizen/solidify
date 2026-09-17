/**
 * SOLIDIFY — media registry.
 *
 * Every photograph on the site is addressed by SLOT id, never by path. A
 * section asks for `media("hero-carrier")`; what that resolves to is decided
 * here and nowhere else. When Solidify supplies its own photography, this is
 * the only file that changes.
 *
 * PHOTOS are the vetted masters in assets/media/ (see assets/media/CREDITS.txt
 * for provenance and the vetting record). Every photo was opened at full
 * resolution and examined through magnified crops for competitor livery, US
 * origin and identifiable people before it was admitted.
 *
 * LICENSE — Pexels / Unsplash licenses and CC0: free for commercial use, no
 * model or property release. A person shown in any frame is a stock subject,
 * NOT a Solidify employee, operator or customer, and copy must never imply
 * otherwise.
 *
 * A public slot must resolve to a vetted photograph — nothing reserved ever
 * ships. Each photograph carries at most two page:slot uses (QA-enforced).
 */

import manifest from "./images.json";

export type Tone = "dark" | "light";

export type Photo = {
  /** Basename in assets/media, without extension. */
  file: string;
  alt: string;
  /** Focal point as [x%, y%] — the subject, measured, never dead-center. */
  focal: [number, number];
  tone: Tone;
  /** Where it came from — for the credits record. */
  source: string;
  showsPerson?: boolean;
};

export type SlotDef = {
  photo: string;
  /** width / height the layout reserves. */
  aspect: number;
  tone: Tone;
  /** What this slot shows, for the handover record. */
  role: string;
};

/* ───────────────────────────────────────────────────────────── the photos ── */

export const PHOTOS: Record<string, Photo> = {
  /* -- the carrier, loaded and moving ---------------------------------- */

  "carrier-corvettes-highway": {
    file: "carrier-corvettes-highway",
    alt: "A loaded auto-transport carrier on a highway, sports cars under white transit covers strapped across its upper and lower decks.",
    focal: [58, 42],
    tone: "light",
    source: "Unsplash BSL-V0TRSSo - Roger Starnes Sr (I-71, Ohio; bottom strip cropped)",
  },
  "carrier-deck-wide": {
    file: "carrier-deck-wide",
    alt: "The upper and lower decks of a loaded car carrier running against open sky, covered vehicles held between the uprights.",
    focal: [55, 46],
    tone: "light",
    source: "Unsplash BSL-V0TRSSo - Roger Starnes Sr (letterbox crop across the decks)",
  },
  "deck-corvette-detail": {
    file: "deck-corvette-detail",
    alt: "Two sports cars under fitted transit covers secured side by side on the upper deck of a car carrier, orange uprights framing them.",
    focal: [46, 52],
    tone: "light",
    source: "Unsplash BSL-V0TRSSo - Roger Starnes Sr (upper-deck crop of the same frame)",
  },
  "carrier-deck-socal": {
    file: "carrier-deck-socal",
    alt: "An SUV and a four-door off-roader loaded on the deck of a car carrier against an open sky.",
    focal: [52, 48],
    tone: "light",
    source: "Unsplash LrDsApWs3C0 - Craig Marolf (Southern California; upper deck crop)",
  },
  "deck-jeep-portrait": {
    file: "deck-jeep-portrait",
    alt: "A four-door off-roader standing on the upper deck of a car carrier, wheels seated on the steel grating against clear sky.",
    focal: [50, 54],
    tone: "light",
    source: "Unsplash LrDsApWs3C0 - Craig Marolf (upright crop on the loaded vehicle)",
  },
  "deck-socal-detail": {
    file: "deck-socal-detail",
    alt: "Three vehicles standing on the upper deck of a car carrier, wheels seated on the steel grating.",
    focal: [45, 56],
    tone: "light",
    source: "Unsplash LrDsApWs3C0 - Craig Marolf (deck-level crop of the same frame)",
  },
  "carrier-interstate-transit": {
    file: "carrier-interstate-transit",
    alt: "Covered vehicles riding on a car carrier in transit, deck rails and tie-downs visible along the trailer.",
    focal: [37, 64],
    tone: "light",
    source: "Unsplash RQlbiwT4Zgs - Roger Starnes Sr (I-71; right-side crop)",
  },

  /* -- loading, securing, the equipment -------------------------------- */

  "deck-strapped-sedan": {
    file: "deck-strapped-sedan",
    alt: "A new sedan standing on the angled deck of a car carrier, its wheels held by a ratchet strap over the steel grating.",
    focal: [62, 48],
    tone: "light",
    source: "Pexels 29566910 - Ivan Zhukevich (cropped to the deck; no lettering in frame)",
  },
  "supra-trailer-straps": {
    file: "supra-trailer-straps",
    alt: "A sports car secured on a transport deck, wheel straps drawn tight through the tie-down rails.",
    focal: [50, 38],
    tone: "dark",
    source: "Pexels 12330350 - Jacob Moore (Colorado)",
  },
  "supra-deck-wide": {
    file: "supra-deck-wide",
    alt: "A sports car standing on a transport deck seen across its rear quarter, the tie-down rails running away beneath it.",
    focal: [40, 46],
    tone: "dark",
    source: "Pexels 12330350 - Jacob Moore (letterbox crop of the same frame)",
  },
  "strap-wheel-detail": {
    file: "strap-wheel-detail",
    alt: "A wheel strap ratcheted down to the deck rail beside a loaded vehicle, the trailer's marker tape below.",
    focal: [42, 56],
    tone: "dark",
    source: "Pexels 12330350 - Jacob Moore (tie-down crop of the same frame)",
  },
  "deck-aerial-yard": {
    file: "deck-aerial-yard",
    alt: "A car carrier's decks and loading ramps seen from directly above, grating and tie-down rails running the length of the trailer.",
    focal: [42, 38],
    tone: "light",
    source: "Wikimedia Commons 'Car carrier trailer 2' - Wikideas1, CC0 (cropped)",
  },
  "deck-ramp-detail": {
    file: "deck-ramp-detail",
    alt: "The ramps and upper deck of a car carrier from above, hydraulic rams and walkway grating in close detail.",
    focal: [38, 42],
    tone: "light",
    source: "Wikimedia Commons 'Car carrier trailer 2' - Wikideas1, CC0 (ramp crop of the same frame)",
  },

  /* -- inventory, yards and destinations -------------------------------- */

  "lot-chattanooga-aerial": {
    file: "lot-chattanooga-aerial",
    alt: "Rows of new vehicles staged in a distribution yard, seen from the air.",
    focal: [56, 46],
    tone: "light",
    source: "Pexels 4204153 - K (Chattanooga, TN)",
  },
  "lot-rows-detail": {
    file: "lot-rows-detail",
    alt: "Ranks of new vehicles standing nose to tail in a staging yard, seen from above.",
    focal: [52, 46],
    tone: "light",
    source: "Pexels 4204153 - K (Chattanooga, TN; tighter crop of the same frame)",
  },
  "lot-chevrolet-covers": {
    file: "lot-chevrolet-covers",
    alt: "New vehicles in a staging lot with white transit roof covers and window stickers still fitted.",
    focal: [55, 52],
    tone: "light",
    source: "Unsplash 1h491Giz9CU - Rob Dean (new-vehicle staging lot)",
  },
  "covers-column": {
    file: "covers-column",
    alt: "New vehicles ranked in a staging lot under white transit roof covers, seen down the length of the rows.",
    focal: [52, 46],
    tone: "light",
    source: "Unsplash 1h491Giz9CU - Rob Dean (upright crop of the same frame)",
  },
  "lot-covers-detail": {
    file: "lot-covers-detail",
    alt: "Transit covers and factory window stickers on new vehicles waiting to be moved.",
    focal: [54, 44],
    tone: "light",
    source: "Unsplash 1h491Giz9CU - Rob Dean (detail crop of the same frame)",
  },
  "lot-dealer-row": {
    file: "lot-dealer-row",
    alt: "Vehicles lined up on the ground at their destination, ready to be handed over.",
    focal: [46, 44],
    tone: "dark",
    source: "Unsplash NFz9uZ8CtKM - Koons Automotive (Virginia / Maryland)",
  },
  /* -- the rig itself: a loaded US auto hauler, on the road -------------- */

  "hauler-solidify-highway": {
    file: "hauler-solidify-highway",
    alt: "An auto hauler in Solidify Transport blue livery on a highway, six vehicles loaded across both decks behind the cab, mountains and a lake beyond.",
    focal: [70, 52],
    tone: "light",
    source: "Client-supplied render (Truck Main.png, 1672x941; upscaled to 2400 - see CREDITS.txt)",
  },
  "hauler-texas-road": {
    file: "hauler-texas-road",
    alt: "A loaded auto-transport rig on the road at golden hour, cars stacked across both decks behind a conventional cab.",
    focal: [62, 54],
    tone: "light",
    source: "Pixabay 6839728 - car transporter rig, Houston TX (Texas plate in frame; cropped)",
  },
  "hauler-texas-front": {
    file: "hauler-texas-front",
    alt: "A loaded auto-transport rig head-on on a highway, vehicles filling both decks of the trailer behind it.",
    focal: [56, 58],
    tone: "light",
    source: "Pixabay 6839726 - car transporter rig, Houston TX (Texas plate in frame; cropped)",
  },
  "deck-texas-load": {
    file: "deck-texas-load",
    alt: "The upper and lower decks of a loaded car carrier, saloons and SUVs racked nose to tail between the uprights.",
    focal: [52, 48],
    tone: "light",
    source: "Pixabay 6839728 - deck crop of the same frame",
  },
  "deck-texas-upper": {
    file: "deck-texas-upper",
    alt: "New vehicles standing on the upper deck of a car carrier, held on the steel rails above the cab.",
    focal: [58, 50],
    tone: "light",
    source: "Pixabay 6839726 - upper-deck crop of the same frame",
  },
  "cab-texas-front": {
    file: "cab-texas-front",
    alt: "The chrome grille and lit headlamps of a conventional truck pulling a loaded car carrier.",
    focal: [50, 56],
    tone: "dark",
    source: "Pixabay 6839726 - cab crop of the same frame",
  },

    "dealer-amg-detail": {
    file: "dealer-amg-detail",
    alt: "The rear quarter of a delivered performance saloon standing on a dealership lot, tail light and exhaust in close detail.",
    focal: [48, 34],
    tone: "dark",
    source: "Unsplash NFz9uZ8CtKM - Koons Automotive (upright detail crop of the same frame)",
  },
  "ramp-upright": {
    file: "ramp-upright",
    alt: "The loading ramps, grating and tie-down rails of a car carrier seen from above, running the length of the trailer.",
    focal: [50, 44],
    tone: "light",
    source: "Wikimedia Commons 'Car carrier trailer 2' - Wikideas1, CC0 (upright crop along the trailer)",
  },
  "corvette-upright": {
    file: "corvette-upright",
    alt: "Covered sports cars stacked on the upper and lower decks of a car carrier, an orange upright framing the load.",
    focal: [52, 46],
    tone: "light",
    source: "Unsplash BSL-V0TRSSo - Roger Starnes Sr (upright crop across both decks)",
  },
};

/* --------------------------------------------------------- the slots -- */
/**
 * One slot, one place. No photograph carries more than two page:slot uses,
 * which is the ceiling QA enforces - nothing on this site repeats a third time.
 *
 * The strongest frames sit where they are seen most. The frames that read as
 * documentation rather than as advertising - the empty deck from above, the
 * gray transit shot - are used where the layout wants ground rather than
 * subject: dimmed rails, a backdrop behind a board, the loading beat of a
 * sequence. That ordering is the art direction of this file.
 */

export const SLOTS = {
  /* Home */
  "hero-carrier": { photo: "hauler-solidify-highway", aspect: 16 / 9, tone: "dark", role: "HERO - the client's own rig in Solidify livery; the WebGL scene is built on this exact file." },
  "lane-consumer": { photo: "deck-jeep-portrait", aspect: 4 / 5, tone: "dark", role: "Lanes - one customer vehicle, loaded and standing on the deck." },
  "lane-oem": { photo: "covers-column", aspect: 4 / 5, tone: "light", role: "Lanes - new-vehicle inventory under transit covers." },
  "lane-operator": { photo: "cab-texas-front", aspect: 4 / 5, tone: "dark", role: "Lanes - the truck an owner-operator runs." },
  statement: { photo: "hauler-texas-front", aspect: 2, tone: "dark", role: "Statement - the loaded rig, full-bleed." },
  "seq-pickup": { photo: "deck-strapped-sedan", aspect: 16 / 9, tone: "dark", role: "Sequence 01 - the vehicle going onto the deck." },
  "seq-transit": { photo: "deck-texas-load", aspect: 16 / 9, tone: "dark", role: "Sequence 02 - loaded and moving." },
  "seq-delivery": { photo: "lot-dealer-row", aspect: 16 / 9, tone: "dark", role: "Sequence 03 - at the destination." },
  "home-oem": { photo: "lot-chattanooga-aerial", aspect: 16 / 11, tone: "light", role: "Home OEM feature - staged inventory from above." },
  "home-sheet": { photo: "deck-texas-upper", aspect: 4 / 3, tone: "dark", role: "Carrier sheet - the upper deck, close." },
  closing: { photo: "carrier-deck-wide", aspect: 16 / 9, tone: "dark", role: "Closing scene - the loaded decks." },

  /* Car shipping */
  "cs-hero": { photo: "carrier-deck-wide", aspect: 16 / 9, tone: "dark", role: "Car-shipping hero - the loaded decks." },
  "cs-situation-1": { photo: "deck-strapped-sedan", aspect: 4 / 5, tone: "light", role: "Scenario - relocating: the vehicle going up the ramp." },
  "cs-situation-2": { photo: "dealer-amg-detail", aspect: 4 / 5, tone: "dark", role: "Scenario - buying out of state: the car as it arrives." },
  "cs-situation-3": { photo: "supra-trailer-straps", aspect: 4 / 5, tone: "dark", role: "Scenario - seasonal moves: a car secured for the run." },
  "cs-situation-4": { photo: "deck-jeep-portrait", aspect: 4 / 5, tone: "dark", role: "Scenario - students and military: one vehicle on the deck." },
  "cs-situation-5": { photo: "lot-chevrolet-covers", aspect: 4 / 5, tone: "light", role: "Scenario - family vehicles: new vehicles ready to move." },
  "cs-situation-6": { photo: "lot-rows-detail", aspect: 4 / 5, tone: "light", role: "Scenario - dealer transfers: dealer inventory ready to move." },
  "quote-ground": { photo: "deck-aerial-yard", aspect: 21 / 9, tone: "dark", role: "Quote console rail - the trailer from above, dimmed." },

  /* OEM & dealerships */
  "oem-hero": { photo: "lot-chattanooga-aerial", aspect: 16 / 9, tone: "dark", role: "OEM hero - vehicles staged for transport." },
  "oem-role": { photo: "lot-chevrolet-covers", aspect: 2, tone: "dark", role: "Role statement - inventory with transit covers, full-bleed." },
  "oem-board": { photo: "lot-covers-detail", aspect: 16 / 9, tone: "dark", role: "Movement board backdrop - inventory depth behind the network." },

  /* Owner-operators */
  "oo-hero": { photo: "hauler-texas-front", aspect: 16 / 9, tone: "dark", role: "Owner-operator hero - the rig, head-on." },
  "road-1": { photo: "deck-ramp-detail", aspect: 16 / 10, tone: "light", role: "Road 01 - the decks and ramps you run." },
  "road-2": { photo: "deck-aerial-yard", aspect: 16 / 10, tone: "light", role: "Road 03 - the trailer you run, end to end." },
  "oo-apply": { photo: "carrier-corvettes-highway", aspect: 4 / 3, tone: "dark", role: "Application panel - a loaded deck on the road." },
  "oo-closing": { photo: "carrier-deck-socal", aspect: 16 / 9, tone: "dark", role: "Owner-operator closing - a loaded deck against open sky." },

  /* Become a driver */
  "driver-hero": { photo: "hauler-texas-road", aspect: 16 / 9, tone: "dark", role: "Driver hero - the rig you would drive." },
  "driver-work-1": { photo: "ramp-upright", aspect: 4 / 5, tone: "light", role: "The work 01 - the ramps and decks you operate." },
  "driver-work-2": { photo: "strap-wheel-detail", aspect: 4 / 5, tone: "dark", role: "The work 02 - the tie-down that holds a vehicle." },
  "driver-work-3": { photo: "covers-column", aspect: 4 / 5, tone: "light", role: "The work 03 - new vehicles, where condition is the job." },
  "driver-work-4": { photo: "lot-dealer-row", aspect: 4 / 5, tone: "dark", role: "The work 04 - the destination you deliver to." },
  "driver-console": { photo: "cab-texas-front", aspect: 4 / 5, tone: "dark", role: "Driver console rail - the cab, dimmed behind the form." },
  "driver-closing": { photo: "deck-texas-upper", aspect: 16 / 9, tone: "dark", role: "Driver closing - the load you carry." },

  /* About */
  "about-hero": { photo: "deck-texas-load", aspect: 16 / 10, tone: "dark", role: "About hero - vehicles are the whole business." },
  "about-identity": { photo: "supra-trailer-straps", aspect: 4 / 5, tone: "dark", role: "Identity plate - a vehicle secured for transport." },

  /* Contact */
  "contact-rail": { photo: "carrier-interstate-transit", aspect: 4 / 5, tone: "dark", role: "Contact console rail - the carrier in transit, heavily dimmed." },
} as const satisfies Record<string, SlotDef>;

export type MediaId = keyof typeof SLOTS;

export type ManifestEntry = {
  width: number;
  height: number;
  aspect: number;
  widths: number[];
  formats: string[];
};

export type ResolvedMedia = {
  id: MediaId;
  photo: Photo | null;
  manifest: ManifestEntry | null;
  aspect: number;
  tone: Tone;
  role: string;
};

const MANIFEST = manifest as Record<string, ManifestEntry>;

/** Resolve a slot. Unknown ids and missing masters throw — a typo cannot ship. */
export function media(id: MediaId): ResolvedMedia {
  const slot = SLOTS[id] as SlotDef | undefined;
  if (!slot) throw new Error(`media(): unknown slot "${id}"`);
  const photo = PHOTOS[slot.photo] ?? null;
  const entry = photo ? (MANIFEST[photo.file] ?? null) : null;
  if (!photo || !entry) throw new Error(`media(): slot "${id}" → "${slot.photo}" has no master in lib/images.json (run npm run images)`);
  return { id, photo, manifest: entry, aspect: slot.aspect, tone: slot.tone, role: slot.role };
}

/** How many slots each photo carries — the QA harness enforces max two page:slot uses. */
export const photoUsage = () => {
  const counts: Record<string, MediaId[]> = {};
  for (const id of Object.keys(SLOTS) as MediaId[]) {
    const p = SLOTS[id].photo;
    (counts[p] ||= []).push(id);
  }
  return counts;
};

/** Photographs with no slot — kept as masters, not served. */
export const unusedPhotos = () => {
  const used = new Set<string>(Object.values(SLOTS).map((s) => s.photo as string));
  return Object.keys(PHOTOS).filter((p) => !used.has(p));
};
