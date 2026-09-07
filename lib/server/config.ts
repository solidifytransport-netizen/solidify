/**
 * Server configuration, read from the environment lazily and memoised.
 *
 * Nothing here runs at module import. The first request that needs config
 * pays for one pass over `process.env`; everything after reuses it. This
 * matters on Vercel, where a cold start evaluates every imported module and
 * where env is injected per deployment, never mutated in flight.
 *
 * "Configured" is a hard, honest gate. If it is false, the write endpoints
 * answer 503 and deliver nothing. There is no degraded mode that pretends.
 *
 * This site keeps no submission record: there is no object store, no database
 * and no encryption-at-rest key here, because there is nothing at rest. What
 * configuration remains is what it takes to deliver a
 * submission to Solidify.
 */

export interface ServerConfig {
  isVercel: boolean;
  isProd: boolean;

  /** The public origin, when set. */
  siteOrigin: string | null;
  /** Every origin a same-site POST may come from. */
  allowedOrigins: string[];


  /** Per document, after any client-side reduction. */
  /** Every document in one submission, added together. */

  inquiryToEmail: string | null;
  mailFromEmail: string;
  resendApiKey: string | null;
  /** Non-production only: point the mailer at a local sink for tests. */
  resendApiBase: string;
  mailConfigured: boolean;

  upstash: { url: string; token: string } | null;

  inquiryConfigured: boolean;
  inquiryReasons: string[];
}

const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MiB per document
const DEFAULT_MAX_TOTAL_UPLOAD_BYTES = 3.5 * 1024 * 1024; // 3.5 MiB per submission
const DEFAULT_FROM = "quotes@solidifytransport.com";
const DEFAULT_RESEND_BASE = "https://api.resend.com";
const MIN_SESSION_SECRET_CHARS = 32;

let cached: ServerConfig | undefined;

function env(name: string): string | null {
  const v = process.env[name];
  if (v === undefined) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function intEnv(name: string, fallback: number, reasons: string[]): number {
  const raw = env(name);
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    reasons.push(`${name} must be a positive integer (got a non-integer); using default ${fallback}`);
    return fallback;
  }
  return n;
}

function parseOrigin(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** Deliberately loose: enough to catch a typo, not to police the RFC. */
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(s);

function build(): ServerConfig {
  const isVercel = env("VERCEL") !== null;
  const isProd = process.env.NODE_ENV === "production";

  /* ── origins ─────────────────────────────────────────────────────────── */
  const siteOrigin = parseOrigin(env("NEXT_PUBLIC_SITE_URL"));
  const allowed = new Set<string>();
  if (siteOrigin) allowed.add(siteOrigin);
  // Vercel-provided hosts are platform-set, never attacker-controlled, so
  // preview deployments and the production alias are allowed as well.
  for (const name of ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) {
    const host = env(name);
    if (host) {
      const o = parseOrigin(host.startsWith("http") ? host : `https://${host}`);
      if (o) allowed.add(o);
    }
  }
  if (!isProd) {
    const port = env("PORT") ?? "3000";
    for (const p of new Set([port, "3000"])) {
      allowed.add(`http://localhost:${p}`);
      allowed.add(`http://127.0.0.1:${p}`);
    }
  }
  const allowedOrigins = [...allowed];

  /* ── delivery ────────────────────────────────────────────────────────── */
  const mailReasons: string[] = [];
  const resendApiKey = env("RESEND_API_KEY");
  if (resendApiKey === null) mailReasons.push("RESEND_API_KEY is not set");
  const inquiryToEmail = env("INQUIRY_TO_EMAIL");

  const mailFromEmail = env("MAIL_FROM_EMAIL") ?? env("INQUIRY_FROM_EMAIL") ?? DEFAULT_FROM;
  if (!looksLikeEmail(mailFromEmail)) mailReasons.push("MAIL_FROM_EMAIL must be a valid address");
  const mailConfigured = resendApiKey !== null && looksLikeEmail(mailFromEmail);

  const resendApiBase = (!isProd && parseOrigin(env("RESEND_API_BASE")) ? env("RESEND_API_BASE")!.replace(/\/+$/, "") : DEFAULT_RESEND_BASE);

  /* ── rate limiting ───────────────────────────────────────────────────── */
  const upstashUrl = env("UPSTASH_REDIS_REST_URL");
  const upstashToken = env("UPSTASH_REDIS_REST_TOKEN");
  const upstash = upstashUrl && upstashToken && parseOrigin(upstashUrl) ? { url: upstashUrl.replace(/\/+$/, ""), token: upstashToken } : null;

  /* ── verdicts ────────────────────────────────────────────────────────── */
  const originReasons = allowedOrigins.length === 0 ? ["no allowed origin: set NEXT_PUBLIC_SITE_URL to the public https origin"] : [];


  const inquiryConfigured = mailConfigured && inquiryToEmail !== null && allowedOrigins.length > 0;
  const inquiryReasons = inquiryConfigured ? [] : [...mailReasons, ...(inquiryToEmail === null ? ["INQUIRY_TO_EMAIL is not set"] : []), ...originReasons];

  return {
    isVercel,
    isProd,
    siteOrigin,
    allowedOrigins,
    inquiryToEmail,
    mailFromEmail,
    resendApiKey,
    resendApiBase,
    mailConfigured,
    upstash,
    inquiryConfigured,
    inquiryReasons,
  };
}

/** Memoised. First call reads the environment; later calls are free. */
export function getConfig(): ServerConfig {
  if (!cached) cached = build();
  return cached;
}
