import { NextResponse, type NextRequest } from "next/server";

/**
 * Content Security Policy with a per-request nonce.
 *
 * `connect-src 'self'` is the no-analytics guarantee: nothing on this site —
 * and structurally nothing on the onboarding UI that handles a TIN and bank
 * details — can talk to a third-party origin. There is no analytics or
 * session replay anywhere, and this makes adding one to the sensitive route
 * a CSP violation rather than a policy reminder.
 *
 * Fonts are self-hosted by next/font, so font-src is 'self' as well.
 *
 * The one third-party origin, and only when it is configured: Cloudflare
 * Turnstile, the bot gate on the forms. It needs script-src for its loader
 * and frame-src for the widget. It does NOT need connect-src — the widget's
 * own traffic happens inside its iframe, under its own policy — so the
 * no-analytics guarantee above still holds with it in place.
 */
const TURNSTILE = "https://challenges.cloudflare.com";
const turnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${turnstile ? ` ${TURNSTILE}` : ""}${dev ? " 'unsafe-eval'" : ""}`,
    `frame-src ${turnstile ? TURNSTILE : "'none'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "media-src 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|media/|brand/|favicon.ico|icon.png|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
