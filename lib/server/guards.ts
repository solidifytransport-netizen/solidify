/**
 * Route-handler guards. Each returns a NextResponse to send, or null/value
 * to proceed. Order in every write chain:
 *
 *   configured → rate limit → csrf/origin → body
 *
 * `fail()` is the single place an exception becomes an HTTP response. It
 * logs message + stack, never a body, and its client-facing messages say
 * plainly whether anything was stored (it was not).
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { fieldErrors } from "@/lib/schemas";
import { getConfig } from "./config";
import { isAppError } from "./errors";
import { log } from "./log";
import { clientIp, getRateLimiter, LIMITS, type LimitBucket } from "./ratelimit";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
} as const;

export const MESSAGES = {
  backendNotConfigured:
    "This form is not accepting submissions yet because delivery is not configured on this server. Nothing you enter here is saved or sent. Please contact Solidify Transport directly.",
  inquiryNotConfigured: "We could not receive your request online right now. Please call (510) 499-4552.",
  deliveryFailed:
    "We could not deliver your submission, so it was not accepted. Nothing was saved anywhere. Your answers and documents are still on this page — press submit again, or call (510) 499-4552.",
  serverError: "That did not send. Nothing was saved — please try again.",
  rateLimited: "Too many attempts. Please wait a few minutes and try again.",
} as const;

export interface JsonInit {
  status?: number;
  headers?: Record<string, string>;
  cookies?: string[];
}

/** JSON response with no-store headers and optional Set-Cookie lines. */
export function json(body: unknown, init: JsonInit = {}): NextResponse {
  const res = NextResponse.json(body, { status: init.status ?? 200, headers: { ...NO_STORE_HEADERS, ...(init.headers ?? {}) } });
  for (const c of init.cookies ?? []) res.headers.append("Set-Cookie", c);
  return res;
}

export function fail(err: unknown, where: string): NextResponse {
  if (err instanceof ZodError) {
    return json({ error: "validation_failed", fields: fieldErrors(err) }, { status: 422 });
  }
  if (isAppError(err)) {
    switch (err.code) {
      case "validation_failed":
        return json({ error: "validation_failed", fields: err.fields ?? {} }, { status: 422 });
      case "backend_not_configured":
        log.warn(`${where}: refused, backend not configured`);
        return json({ error: "backend_not_configured", message: MESSAGES.backendNotConfigured }, { status: 503 });
      case "inquiry_not_configured":
        log.warn(`${where}: refused, inquiry pipeline not configured`);
        return json({ error: "inquiry_not_configured", message: MESSAGES.inquiryNotConfigured }, { status: 503 });
      case "delivery_failed":
        log.error(`${where}: delivery failed`);
        return json({ error: "delivery_failed", message: MESSAGES.deliveryFailed }, { status: 502 });
      case "payload_too_large":
      case "file_too_large":
        return json({ error: "payload_too_large", message: "That request is too large." }, { status: 413 });
      case "bad_json":
        return json({ error: "bad_json", message: "Request body must be JSON." }, { status: 400 });
      case "rate_limited":
        return json(
          { error: "rate_limited", message: MESSAGES.rateLimited, retryAfter: err.retryAfterSec ?? 60 },
          { status: 429, headers: { "Retry-After": String(err.retryAfterSec ?? 60) } },
        );
      case "not_found":
        return json({ error: "not_found" }, { status: 404 });
      case "incomplete":
        return json({ error: "incomplete", missing: err.missing ?? [] }, { status: 409 });
    }
  }
  log.error(`${where}: unhandled error`, err);
  return json({ error: "server_error", message: MESSAGES.serverError }, { status: 500 });
}


/** 503 unless inquiries can be stored or mailed. */
export function requireInquiryConfigured(): NextResponse | null {
  const cfg = getConfig();
  if (cfg.inquiryConfigured) return null;
  log.warn("inquiry: request refused, not configured", { reasons: cfg.inquiryReasons });
  return json({ error: "inquiry_not_configured", message: MESSAGES.inquiryNotConfigured }, { status: 503 });
}

/** 429 when `key` has exceeded `max` hits in `windowMs`. */
export async function withLimit(req: Request, key: string, max: number, windowMs: number): Promise<NextResponse | null> {
  const ip = clientIp(req);
  const { ok, retryAfterSec } = await getRateLimiter().hit(`${key}:${ip}`, max, windowMs);
  if (ok) return null;
  return json(
    { error: "rate_limited", message: MESSAGES.rateLimited, retryAfter: retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

/** `withLimit` using one of the named buckets in LIMITS. */
export function limit(req: Request, bucket: LimitBucket): Promise<NextResponse | null> {
  const { max, windowMs } = LIMITS[bucket];
  return withLimit(req, bucket, max, windowMs);
}

