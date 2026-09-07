# `lib/server` — the inquiry pipeline

One thing reaches Solidify from this website: an **inquiry**. Three lanes —
vehicle shipping quote, OEM/dealership, and driving with Solidify — all
validated by the same shared schemas and all delivered the same way.

**Nothing is stored here.** No database, no object store, no encryption-at-rest
key, because there is nothing at rest. An inquiry is validated, checked, and
delivered by email. The email is the record.

## What this used to be

Until this revision the site also ran a six-step owner-operator onboarding
wizard that collected a W-9 with a taxpayer identification number, bank routing
and account numbers, a voided check and insurance certificates, and posted the
lot as one multipart request. The client does not want that form, so the whole
subsystem is gone: the wizard, `/api/onboarding/*`, the session cookie, the
magic-byte upload checks, the client-side image downscaler, the access-code
gate and the two smoke suites that covered them.

That is a deliberate reduction in scope, not an oversight. Anyone restoring it
should take the whole thing back from git rather than reviving pieces: the
guard chain, the byte budgets and the delivery guarantee were designed
together. It is at commit `ba40867`.

**Do not add file uploads or a document store to this site without restoring
that guard chain with them.** A bare upload endpoint here would have none of
the checks the old one had.

## The shape of a submission

```
POST /api/inquiry              application/json
  { lane: "vehicle" | "oem" | "driver", ...fields }
```

### The order is the guarantee

```
1  configured?                    → 503   body never read
2  rate limit                     → 429
3  origin + double-submit CSRF    → 403
4  Content-Length > 32 KiB        → 413   body never read
5  JSON parse                     → 400
6  zod (discriminated on `lane`)  → 422   fields keyed by their full path
7  honeypot + minimum fill time   → 422
8  build the email                        pure, no I/O
9  await mailer.send(…)           ←       the only gate
10 a throw here                   → 502   delivery_failed
11 resolved                       → 200   { ok, reference }
```

Steps 1–7 run before step 9, so **a rejected submission never generates an
email**, and no branch reaches 200 without a resolved send.

**No automatic retry.** A timeout can mean "delivered, reply lost", and an
automatic retry would silently duplicate the message. The visitor retries
deliberately instead; their answers are still on the page.

## Modules

| File | What it is |
| --- | --- |
| `config.ts` | One lazy, memoised pass over `process.env`. "Configured" is a hard gate with human reasons that name env vars, never values |
| `guards.ts` | The guard chain, the `AppError` → HTTP funnel, `NO_STORE_HEADERS`, and every user-facing message |
| `csrf.ts` | Origin check that fails closed; double-submit token compared in constant time |
| `crypto.ts` | Identity and signing only: random ids, constant-time compare, SHA-256, HMAC |
| `validate.ts` | `readJsonLimited` — a body-size ceiling that refuses before reading |
| `ratelimit.ts` | Memory (per warm instance) or Upstash. Upstash errors fall back to memory with a warning, never fail open silently |
| `log.ts` | JSON lines with an unconditional redactor in front: a key deny-list plus any run of ≥7 digits |
| `mail.ts` | Resend REST via `fetch`. Throws on any non-2xx — which is what makes "success only after delivery" true |
| `errors.ts` | The coded errors every layer throws |

## Security posture

Preserved from the larger system: origin checks that fail closed, double-submit
CSRF, per-route rate limits, an unconditional log redactor, nothing in
`localStorage`/`sessionStorage`, and `no-store` on every API response.

What the site no longer has to protect, because it no longer collects it: a
taxpayer identification number, bank details, or an uploaded document of any
kind. There is no `input[type=file]` anywhere on the site, and QA asserts it.

## Environment

See `.env.example`. The short version: `RESEND_API_KEY`, `MAIL_FROM_EMAIL`,
`INQUIRY_TO_EMAIL`, `NEXT_PUBLIC_SITE_URL`; optionally Upstash.
`RESEND_API_BASE` points the mailer at a local sink and is **ignored in
production** by design — which is why a delivery test has to run against
`next dev`, not `next start`.

## Testing

```
node scripts/mail-sink.mjs 3479            # a provider stand-in that answers 200
node scripts/mail-sink.mjs 3479 --fail     # …and one that answers 502
npm run env:local                          # LOCAL ONLY: .env.local pointed at the sink
npm run qa                                 # the forms are covered by the QA harness
```

`/api/health` reports whether delivery is configured and, when it is not, names
the exact missing variables. The forms read it and lock themselves honestly
rather than pretending to accept anything.
