# Solidify Transport

The website of **Solidify Transport LLC**, an auto transport motor carrier moving
vehicles for OEMs, dealerships and consumers across all 48 contiguous states,
with strong Western-US coverage.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · GSAP (ScrollTrigger,
SplitText, DrawSVG, Flip, MotionPath) + Lenis · Three.js (hero only) · Zod ·
react-hook-form · Playwright (headless QA).

```bash
npm install
npm run dev          # http://localhost:3000 (this machine uses -p 3477)
npm run images       # AVIF/WebP/JPEG ladder from assets/media (build runs this)
npm run masks        # hero scene masks from lib/hero-scene.json (build runs this)
npm run build        # production build
npm start
npm run typecheck
npm run qa           # headless multi-viewport QA (see below) — needs a running server
node scripts/peek.mjs car-shipping 1536 864 8   # quick headless look at one route
node scripts/mail-sink.mjs 3479          # a local stand-in for the mail provider
node scripts/mail-sink.mjs 3479 --fail   # …that refuses, to prove a failed send is reported
npm run env:local    # LOCAL ONLY: writes a gitignored .env.local pointed at the sink
npm run shaders      # renders any shader programs on their own to .audit/
npm run imagery:derive <src> <name> <l> <t> <w> <h>   # cut a new master from an existing one
```

Local verification, end to end: start the mail sink, run `npm run env:local`
(it writes a gitignored `.env.local` pointed at the sink), restart **`next
dev`**, then run `npm run qa`. Remove it again with
`npm run env:local -- --remove`. It has to be `next dev`, not `next start`:
`RESEND_API_BASE` is ignored when `NODE_ENV=production`, by design, so a
production build cannot be pointed at a local sink and will honestly report a
failed delivery instead.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage — hero scene, audience lanes, statement, pickup→transit→delivery sequence, coverage, carrier sheet, closing |
| `/car-shipping` | Consumer + commercial vehicle shipping, situations strip, quote console with route map, FAQ |
| `/oem-dealerships` | OEM, dealership and dealer-group transport, the movement board, commercial inquiry |
| `/owner-operators` | **Owner-operators — people who own their Truck / Power Unit.** Recruiting road, requirements, the five-stage application route, and the application itself. The only route that leaves the domain |
| `/become-a-driver` | **Drivers who would run Solidify's own equipment.** What auto transport actually involves, who the carrier is, the federal qualification floor, and a direct line to Solidify. No portal, no invented pay figures |
| `/about` | Company identity, coverage, how it operates |
| `/contact` | Three separated inquiry lanes (vehicle · OEM · driving), contact details, and both driver routes |
| `/terms` | Terms of use for the website. Deliberately narrow — the transport itself is governed by the agreement for that move |
| `/privacy` | Privacy notice |
| `/api/*` | The inquiry pipeline — see `lib/server/README.md` |

## The two driver audiences

They are different people and the site never mixes them, because the paperwork
does not:

- **Owner-operators** own their Truck / Power Unit and carry their own
  insurance. `/owner-operators` covers the compensation, the requirements, what
  the application will ask for, and then opens it. Anything after approval is
  handled with Solidify directly, off this website.
- **Drivers** would run Solidify's equipment. Solidify has confirmed nothing
  about that programme — no pay basis, no experience or endorsement minimums,
  no benefits, no hiring areas — so `/become-a-driver` states the company, the
  work and the federal floor under 49 CFR 391, and then asks for a
  conversation. It publishes no figure it cannot stand behind, and QA fails
  the build if a per-mile/week/year rate appears there.

When the client supplies those facts they go in `lib/site.ts` and slot into
the existing ledger without a layout change.

## Frontend system

Signature experiences carry the bespoke motion; everything else is built from
one editorial system so secondary sections stay consistent without looking
identical.

| Signature | Where | File |
| --- | --- | --- |
| Hero scene (the only WebGL) | `/` | `components/home/Hero.tsx`, `components/webgl/HeroScene.tsx`, masks from `lib/hero-scene.json` via `scripts/masks.mjs` |
| Lanes (Flip) | `/` | `components/home/Lanes.tsx` |
| Sequence (pinned, three beats) | `/`, `/car-shipping` | `components/home/Sequence.tsx` |
| Coverage map (DrawSVG, pointer light) | `/`, `/car-shipping`, `/oem-dealerships`, `/about` | `components/blocks/CoverageMap.tsx` |
| Movement board (DrawSVG + MotionPath) | `/oem-dealerships` | `components/oem/MovementBoard.tsx` |
| Road (pinned horizontal) | `/owner-operators` | `components/operators/Road.tsx` |
| Application route (pinned horizontal, with the hand-off break) | `/owner-operators` | `components/operators/Apply.tsx` |
| Role board (pinned split — wiping photo column + expanding list) | `/become-a-driver` | `components/driver/RoleBoard.tsx` |
| Scenario story (pinned, Flip, six photographic panels) | `/car-shipping` | `components/car/Situations.tsx` |
| Closing (CTA + footer as one scene) | every page | `components/layout/Closing.tsx` |

### WebGL and 3D

Two three.js surfaces, both of which show something real:

- **The hero scene** (`components/webgl/HeroScene.tsx`) — the loaded rig on a
  fullscreen quad with mask-driven depth parallax, a scroll dolly, road-light
  traces confined to the road and a five-slat reveal. Home only. The masks are
  rasterised from hand-authored polygons in `lib/hero-scene.json` by
  `scripts/masks.mjs`, so **changing the hero photograph means re-authoring
  those polygons**; the texture width is clamped to the ladder the master
  actually produced.
- **The coverage board** (`components/webgl/CoverageScene.tsx`) — the 48
  contiguous states extruded from the same path data the SVG map uses, lit with
  a key/rim/hemisphere rig, raycast for hover, and risen out of the ground west
  to east on scroll-in. Focus states stand taller and carry emissive light.
  Shown on every route with a coverage section; the SVG stays underneath as the
  fallback and keeps the column's height.

An earlier revision put three abstract shader fields behind sections instead
(travelling trails, a node field, drifting volume). They were removed: an
ambient light field says nothing about the business, and coverage — which is a
fact you can point at — does.

Rules, QA-asserted or built into the runtime:

- **At most one canvas per route, two on home** (hero + coverage board).
- Painting only while on screen and the tab is visible; one GSAP-ticker
  subscription shared with Lenis; DPR capped by device tier; raycasting
  throttled to ~20/s; complete disposal including `forceContextLoss`.
- Neither mounts under reduced motion, and the board also sits out on the
  lowest device tier.

### Interaction

`components/ui/Tilt.tsx` exposes `useTilt`, which gives a card real perspective
— rotation about its own axes, a lift toward the viewer, and a specular
highlight that tracks the pointer — through `gsap.quickTo`. A hook rather than
a wrapper because several targets are flex or Flip children whose own classes
control their layout. Fine pointers only; nothing under reduced motion.

Editorial system: `components/ui/Editorial.tsx` (`feature` · `statement` ·
`plate` · `ledger`), `SectionHead` patterns (`editorial` · `index` · `caption` ·
`stack`), `SpecStrip`, `LightSweep`, `PageHero`, `FormConsole`. Consecutive
sections must not repeat a heading pattern (`data-head`, QA-asserted).

There is no drawing system. An earlier version carried the loading, unloading
and equipment beats with a line-drawn auto hauler; it became the brand rather
than a support to it, so it was retired. Where a photograph does not exist,
the answer is a composition built from photography — a graded crop, a mask, a
route line, a telemetry card — never line art, and never a figure caption.

Type: **Inter Tight** for display (500–550, never stretched), **Manrope** for
body and UI, IBM Plex Mono for functional metadata only. QA fails any display
element computing a weight above 560, any `font-stretch` other than 100%, and
any `h1` above 88px. The navigation and the footer are sized on their own
ramps (`.nav-link`, `.foot-link`) rather than borrowing the body's, because
both had gone quiet enough to read as unfinished.

Pinned sections own an explicit scroll budget — a per-panel `SETTLE` distance
plus a landing allowance — and snap to panel centres. Deriving the distance
from track width alone gave roughly 290px per panel at 1920, which is fast
enough that panels went past unread.

Palette: midnight grounds, graphite/gunmetal plates, brushed-steel and ice
controls; blue exists only as light (`glow-*` at alpha). No control has a blue
fill (QA-asserted). Tokens live in `app/globals.css`.

## What may be said on this site

Solidify is a **motor carrier that transports vehicles**. Not a broker, not a
marketplace, not a load board, not a general-freight carrier. Copy that implies
Solidify arranges transport rather than performs it is a defect, and the QA
harness fails the build on broker phrasing. "Not a broker" appears at most
twice site-wide.

Geography is always **"strong Western-US focus / coverage"** — never
"deepest", "strongest", "density" or any comparative. Nothing is inferred from
the address ("company location", never "home base").

Every company fact lives in `lib/site.ts` and nowhere else. Confirmed:

| Fact | Value |
| --- | --- |
| Legal name | Solidify Transport LLC |
| Address | 2455 Naglee Rd. #314, Tracy, CA 95304 |
| Phone | (510) 499-4552 |
| Coverage | All 48 contiguous states; strong Western-US focus |
| Owner-operator compensation | A percentage of line-haul revenue (**the percentage is not public — never invent it**) |
| Payment terms | Net 30 |
| Insurance minimums | Cargo $500,000 · Commercial auto liability $1,000,000 CSL · GL $1,000,000 each occurrence / $1,000,000 general aggregate; certificate holder shown as **additional insured**, sent from the insurance agent |
| Certificate holder | Solidify Transport LLC, 2455 Naglee Rd. #314, Tracy, CA 95304 |
| Driver application | `APPLY_URL` (external New Era Titans portal) |

Not supplied, therefore not rendered anywhere (`CLIENT_DATA` nulls): USDOT and
MC numbers, a public email address. Nothing on the site asserts fleet size,
years in business, safety ratings, transit guarantees, tracking, open/enclosed
equipment, operable/inoperable capability, inspection procedures, on-time
figures, testimonials or awards. The insurance PDF carries a "$2,000,000"
annotation beside the GL aggregate line; the confirmed $1,000,000 is used.

## Onboarding (from the client's three PDFs)

Profile and Equipment mirror the Carrier Profile Information Sheet ("Truck /
Power Unit", never "tractor"; the sheet's rate and payment lines are shown
read-only). Insurance carries the Insurance Instructions verbatim in substance
(certificate holder as additional insured, sent from the agent, the four
minimums). The W-9 is upload-only against the official IRS form. Direct deposit
collects every field on the Direct Deposit Authorization form, with the
authorization statement verbatim (deposits **and** debits / corrective
actions), stores the exact text and version consented to, and only makes a
field mandatory where the form or the ACH workflow requires it.

## Photography

Masters live in `assets/media/` (committed, never served). `npm run images`
writes the responsive ladder to `public/media/gen/` (gitignored) and a
manifest of **measured** dimensions to `lib/images.json`. Every image reaches
the page through `<Plate slot="…">`, which resolves a slot in `lib/media.ts`.
**A public slot must resolve to a vetted photograph — nothing reserved ever
ships**; a slot without one throws. Each photograph carries at most two
page:slot uses (QA-asserted).

`assets/media/CREDITS.txt` records provenance and the vetting evidence for
every frame: no competitor livery, US origin positively established, no
renders. People in frames are stock subjects and are never captioned as
Solidify staff.

**That file is internal.** There is no public photography-credit page, section
or link anywhere on the site, and QA fails the build if a credit string or a
`#credits` link reappears. The shoot brief for Solidify's own photography (a
loaded hauler with its own livery, loading, unloading, a driver at the
equipment, a handover) is at the end of that file.

## Security posture (short version)

**This site keeps no submission record and collects no documents.** The three
inquiry lanes are validated, checked and delivered to Solidify by email. There
is no database, no object store and no encryption key, because there is nothing
at rest. The email is the record.

Preserved: origin checks that fail closed, double-submit CSRF, per-route rate
limits, an unconditional log redactor, nothing in
`localStorage`/`sessionStorage`/IndexedDB, and `no-store` on every API
response. **The only route to a 200 is a 2xx from the mail provider**; a
refused delivery answers 502 and says plainly that nothing was saved. If
delivery is not configured, every write returns 503 and the forms lock
themselves — they never simulate success.

The owner-operator onboarding wizard — six steps, a W-9 with a taxpayer
identification number, bank routing and account numbers, a voided check and
insurance certificates — **has been removed at the client's request**, together
with its API, its session cookie, its magic-byte upload checks and its access
gate. There is no `input[type=file]` anywhere on this site and QA asserts it.
Tax and payment details are handled with Solidify directly after approval.
Full contract: `lib/server/README.md`; the removed subsystem is at commit
`ba40867` if it is ever wanted back.

## What remains to configure for production

Copy `.env.example` to `.env.local` (or the host's environment) and set:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin (also the CSRF origin allowlist) — change when the custom domain is attached |
| `RESEND_API_KEY` | Mail delivery. Without it nothing can be submitted at all |
| `MAIL_FROM_EMAIL` | From address on a domain verified with the provider |
| `INQUIRY_TO_EMAIL` | Where quote and dealership inquiries go |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional durable rate limiting across serverless instances |

Until delivery is configured, `/api/health` reports the exact reasons — env
var names only, never values — and the forms show honest,
phone-number-first fallbacks.

Deploys are CLI-only (`npx vercel --prod --yes`) until the Vercel GitHub
integration is installed for the team; `.vercelignore` keeps uploads to source.

## QA

`npm run qa [url]` is **headless only** — it never opens a visible browser. It
launches one headless Edge via `playwright-core`, reuses one context and one
page across 9 routes × 4 viewports (1920×1080, 1536×864, 1440×900, 390×844),
and closes everything on the way out. It asserts carrier positioning and
banned claims (including the retired weak copy and any geography comparative),
"not a broker" ≤ 2 site-wide, no reserved frames, no blue-filled buttons,
non-repeating heading patterns, image reuse (max two slots per photograph),
measured focal points, button sizing, unique titles/descriptions/canonicals,
apply-CTA targets, mobile menu focus trapping, keyboard reachability, the
quote form's honest outcome, the application panel and storage hygiene,
reduced-motion behaviour, and console/network cleanliness. Screenshots land in
`qa/` (gitignored) — including mid-states of the pinned sections — for the
visual review that DOM assertions cannot replace.
