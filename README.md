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
npm run glitches     # layout + responsiveness sweep, 19 viewports 320-2560 (see below)
npm run spelling     # every rendered word + source copy against en_US; British spellings flagged
npm run security     # headers, CSP nonces, API refusals, rate limit, robots — run it on production
npm run mobile       # phone CONDITIONS: touch profiles, reduced motion off, 4x CPU — every reveal, image, map, board
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
  about that program — no pay basis, no experience or endorsement minimums,
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

### Brand

The lockups are the client's approved vector masters in
`Solidify_Final_Blue_Assets`, installed by `node scripts/brand.mjs` into
`public/brand/` plus `app/icon.svg` and `app/apple-icon.png`. **The artwork is
never edited** — every path and transform is carried across untouched. What the
script does change is the **viewBox**, which is a window onto them, not a
modification of them.

That re-framing is the point of the script. The masters carry a great deal of
padding: the horizontal lockup is 54.5% empty vertically, so a 40px box drew an
18px logo and the header mark read as smaller than the nav beside it. Each
lockup is re-framed onto its own alpha bounding box (measured by rendering and
trimming with `sharp`, because the files nest several groups and a `<pattern>`
and reading the geometry back out is guesswork) plus a 3% optical margin. A CSS
size then means the size of the artwork. Re-running the script prints the new
intrinsic dimensions to paste into `Mark.tsx`.

The DARK variants are the ones shipped: white artwork with the #147EB3 accent
on the lower carrier rail. The Light variants are black artwork for light
grounds and this site has no light surface. If one ever appears, ship the Light
pair and switch on the surface rather than recolouring these.

`components/layout/Mark.tsx` serves them as `<img>`, not inline SVG: the
horizontal lockup is ~13 KB of path data that would otherwise ship in every
page's HTML, and the files carry a `<pattern id="railTrim">` that would collide
if two lockups were inlined on one page. Intrinsic width/height are the
re-framed ones, so nothing shifts while they load.

**Size a lockup on the axis its placement constrains, and let the other
follow.** The header bar constrains height, so it sets `h-… w-auto`; the
footer's grid column constrains width, so it sets `w-full max-w-…`. Getting
this backwards does not overflow — the SVG letterboxes inside its box and the
artwork silently shrinks again, which is the original defect. `npm run
glitches` asserts every `/brand/` image draws at its own aspect ratio.

The horizontal lockup is 9.5:1, so it takes real width: 323px at the header's
34px. Five nav labels, the quote button and that lockup need about 1130px of
bar, which is why the inline nav is `xl:` (1280) rather than `lg:` — below that
the full-screen index takes over. `npm run glitches` also asserts the nav bar's
items keep a gap at every viewport.

### WebGL

**The hero scene** (`components/webgl/HeroScene.tsx`, three.js) is the only
canvas on the site: the loaded rig on a fullscreen quad with mask-driven depth
parallax, a scroll dolly and a five-slat reveal. Home only. The road-light
traces and the specular steel sweep were **removed at the client's call**:
fanned over the current hero photograph they read as scratches across the truck
and straight through the call-to-action buttons. Bringing them back needs a
vanishing point and a road mask authored for whatever photograph is actually in
place. Only the mask's B (depth) channel is sampled now. The masks are rasterized from hand-authored
polygons in `lib/hero-scene.json` by `scripts/masks.mjs`, so **changing the
hero photograph means re-authoring those polygons**; the texture width is
clamped to the ladder the master actually produced, and the texture is WebP.

**The scene is for pointer devices.** `Hero.tsx` mounts it only when
`perfTier() >= 2` — not on touch, not on modest hardware. Its pointer
parallax cannot happen on a phone, and what remained was not worth a 517 KB
three.js chunk, a 200 KB texture and a 44 KB mask on a mobile connection:
Lighthouse put mobile total blocking time at 3.4 s with it and 0.5 s without.
Phones get the graded photograph, which is the LCP element either way.

### Mobile performance, and why it is shaped this way

Lighthouse (mobile / desktop): performance **53 → 73–77 / 95 → 98**,
accessibility 100, total blocking time 3,440 → 580 ms, main-thread work
14.1 → 4.1 s, first-load weight 1,136 → 689 KB. Real LCP on a Pixel 5 profile
at 4× CPU throttle is 1.9 s and equals first paint; Lighthouse's simulated
slow-4G LCP of ~3.9 s is its model of the webfont chain, which `font-display:
swap` on the display face is a deliberate trade against a fallback-font hero.

What made the difference, each a rule now:

- **No WebGL below tier 2** (above).
- **Below-the-fold SVG mounts late.** The coverage map (~500 nodes, blur
  filters) and the quote console's route map render only within 1.5
  viewports (`useInViewOnce`), behind an aspect-ratio placeholder so nothing
  shifts, and `lib/us-map.json` (134 KB) is loaded by `lib/us-map.ts` on
  demand instead of shipping in every page's bundle.
- **SplitText waits until a heading is near.** `RevealText` splits within a
  viewport of arriving, not at boot; the hero (`immediate`) splits at once.
- **Hero type is visible from first paint on touch.** `[data-hero]
  [data-reveal]` is opacity 1 under `(hover: none) and (pointer: coarse)`
  and `Reveal.tsx` skips the entrance for it, so the LCP element never waits
  for JavaScript on a phone.
- **Track images preload.** `preloadImagesNear(el)` (lib/motion.ts) flips a
  track's lazy images to eager 1.5 viewports early — a card off to the right,
  or a beat frame that is clipped and hidden until its turn, is never
  intersecting when a browser decides what to lazy-load, and would otherwise
  arrive as an empty frame.

### Motion rules learned on real phones

Three defects reached the client from phones that every width-based suite
passed. Each is a rule and each is asserted by `npm run mobile`:

- **Scope selectors to the rendering that is displayed.** A section that
  renders a desktop and a mobile variant must not `querySelectorAll` across
  both: the desktop nodes come first in document order, so on a phone the
  Sequence lit a `display:none` frame and parked the visible three as
  "future" beats — clipped, `visibility:hidden`, never even fetched.
- **A `gsap.matchMedia` conditions object needs a condition for every
  device.** The callback runs only when at least one matches; `{ isDesktop,
  isReduced }` matched nothing on a phone without reduced motion, so the
  coverage map's entire motion block was skipped there. Include the
  complement (`isMobile`).
- **Draw on entry, not on mount.** The movement board drew its first route on
  page load, 3,000 px below the fold. Anything that animates once should be
  gated on a `once: true` ScrollTrigger.
- **No `vector-effect: non-scaling-stroke` on a path DrawSVG measures.**
  DrawSVG derives a non-scaling path's on-screen length from its bounding box
  and a near-flat route breaks that (the opening route was drawn to a 9 px
  dash). Measure in user units and scale the stroke by CSS.
- **Hover is a mouse idea.** On touch, `pointerenter` and `pointerleave`
  fire in the same tap; the map now holds a state on tap and ignores the
  leave for touch.

Two things have been tried in other sections and removed, both at the client's
call — do not reintroduce either without asking:

- Three abstract shader fields (traveling trails, a node field, drifting
  volume) behind page sections. An ambient light field says nothing about the
  business.
- A three.js coverage board: the 48 states extruded from the SVG map's own
  path data, lit and raycast for hover. The flat SVG map reads better, and it
  is what ships.

Rules, QA-asserted or built into the runtime:

- **At most one canvas per route**, and only home has one.
- Painting only while on screen and the tab is visible; one GSAP-ticker
  subscription shared with Lenis; DPR capped by device tier; complete disposal
  including `forceContextLoss`.
- Nothing mounts under reduced motion.

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

Three layout rules that `npm run glitches` enforces, all of which reached the
client by eye before it existed:

- **A line break inside a heading is `{" "}<br />`, never a bare `<br />`.**
  `Lines` does this; do not hand-roll one. Without the space the element's
  textContent runs the lines together, and SplitText copies textContent into
  the aria-label it adds for screen readers — every hero heading was being
  read as "Nationwide autotransport,carrier-direct." `npm run spelling` is
  what caught it, and it fails on any rendered word that is not a word.

- **A horizontal card track is `items-stretch`, never `items-center`.** One
  card with more content than the rest then sets one height for all of them.
  Centring instead let the odd card both grow AND sit higher than its
  neighbors — the owner-operator track ran a 169px spread on every laptop
  viewport.
- **A progress rail gets its own row.** As a `flex-1` sibling of a label whose
  text changes with the active step, the rail is re-measured on every step and
  its nodes slide sideways; with a static but long label it silently gives up
  half the shell. The readout goes on a line beneath, left-aligned so it grows
  from a fixed origin.

Responsiveness is asserted, not eyeballed. `npm run glitches` loads every
route at nineteen widths from 320 to 2560 and fails on a horizontal scrollbar,
any element wider than the viewport, any text run past the viewport edge or
past its own overflow-hidden box, and — on phones — any tap target under 24px
or any text under 12px, alongside the track-height, rail, nav-bar and lockup
checks. The four QA viewports are where the design was drawn; the other
fifteen are where it has to hold.

Pinned sections own an explicit scroll budget — a per-panel `SETTLE` distance
plus a landing allowance — and snap to panel centers. Deriving the distance
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
response.

Against spam, four layers, cheapest first: a honeypot field, a time-to-fill
floor (2.5 s), the per-address rate limit, and — once
`TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are set — a
Cloudflare Turnstile challenge verified server-side before anything is
delivered. The gate is fail-closed: with the secret set, a submission without
a valid token is refused. Turnstile is the one third-party origin the CSP
admits, and only for `script-src` and `frame-src`; `connect-src` stays
`'self'`, so nothing on this site can talk to a third party from the page.

Headers, on every response: a per-request-nonce CSP with `strict-dynamic`,
`frame-ancestors 'none'`, `base-uri 'none'`, `object-src 'none'` and
`form-action 'self'`; HSTS with preload; `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, COOP, CORP, a Permissions-Policy
that switches off every sensor, `X-DNS-Prefetch-Control: off` and no
`X-Powered-By`. `npm run security` asserts all of it against a running
target, plus the refusals: a cross-origin POST is 403, an origin-less POST is
403, a honeypot hit is 422, a too-fast submission is 422, the ninth attempt in
ten minutes is 429, an unknown API path is a JSON 404, and `/api/health`
names env vars but never values. **The only route to a 200 is a 2xx from the mail provider**; a
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
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Recommended: the Cloudflare Turnstile bot gate on every form (free; both keys required) |
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
reduced-motion behavior, and console/network cleanliness. Screenshots land in
`qa/` (gitignored) — including mid-states of the pinned sections — for the
visual review that DOM assertions cannot replace.

Three more suites sit beside it, each against a running target:

- `npm run glitches` — layout and responsiveness, nineteen viewports (above).
- `npm run spelling` — every text node, attribute, title, description and
  JSON-LD string on every route, plus string literals and JSX copy in source,
  checked against Hunspell en_US. A word that is in en_GB but not en_US is a
  British spelling and fails; so do "whilst", "towards", "grey" and the rest
  of the words both dictionaries accept but a US reader would not. Proper
  nouns go in `scripts/spelling-allow.txt`, never as a way to silence a
  finding. American English is the house style, dates included.
- `npm run security` — the posture, proven: every header, that every inline
  script carries the CSP nonce, the API's refusals (cross-origin 403,
  origin-less 403, honeypot 422, too-fast 422, oversize 413, non-JSON 400,
  unknown path JSON 404), the rate limiter tripping with Retry-After, robots
  disallowing /api, and /api/health naming env vars but never values.
- `npm run mobile` — phone conditions rather than phone widths: four touch
  profiles (Pixel 5, a 390 iPhone, a 360 small phone, an 820 tablet), reduced
  motion OFF, a 4× CPU throttle and a natural scroll down every route. Then:
  no Plate curtain left over an image, every reveal finished, every visible
  image decoded, the coverage map landed and a tap holding a state, the
  movement board drawn to full length, the Sequence on its last beat with its
  image, no WebGL canvas on touch, no console errors or GSAP warnings. The
  screenshot suites run with reduced motion on, which makes every reveal
  immediate — this one never does, because that is exactly what hid three
  real defects.
