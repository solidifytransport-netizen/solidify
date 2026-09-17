/**
 * Cloudflare Turnstile — the bot gate on every form.
 *
 * The honeypot and the time-to-fill check catch dumb bots; they do not catch
 * a scripted client that reads the form and waits three seconds. Turnstile
 * does, without a puzzle for the person: the widget runs its checks in an
 * iframe and hands the page a one-time token, and this module asks
 * Cloudflare whether that token is real.
 *
 * Env-gated, and fail-closed once configured:
 *
 *   TURNSTILE_SECRET_KEY             server, verifies tokens
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY   client, renders the widget
 *
 * With neither set, the forms rely on the honeypot, the timing check and the
 * rate limit, and /api/health says so. With the secret set, a submission
 * without a valid token is refused — a half-configured deployment therefore
 * shows up as forms that refuse, not as forms that quietly skip the check.
 *
 * The verify call is server-to-server and never touches the browser's CSP.
 * A token is single-use and bound to the visitor's address when we pass it.
 */

import { getConfig } from "./config";
import { log } from "./log";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 6000;

export type TurnstileVerdict = { ok: true } | { ok: false; reason: string };

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<TurnstileVerdict> {
  const cfg = getConfig();
  if (!cfg.turnstileSecret) return { ok: true };
  if (!token || token.length > 2048) return { ok: false, reason: "missing_token" };

  const body = new URLSearchParams({ secret: cfg.turnstileSecret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      log.warn("turnstile: verify endpoint answered", res.status);
      return { ok: false, reason: `verify_http_${res.status}` };
    }
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success === true) return { ok: true };
    return { ok: false, reason: (data["error-codes"] ?? ["unknown"]).join(",") };
  } catch (err) {
    /* A timeout or network fault must not become an open gate. */
    log.warn("turnstile: verify call failed", err instanceof Error ? err.message : "unknown");
    return { ok: false, reason: "verify_unreachable" };
  }
}
