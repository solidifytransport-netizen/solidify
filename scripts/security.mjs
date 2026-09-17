/**
 * SOLIDIFY — security regression suite.
 *
 *   node scripts/security.mjs [TARGET=http://localhost:3478]
 *
 * Plain fetch, no browser. Asserts the things README.md claims about the
 * site's posture, against whatever is actually running — run it against
 * production after every deploy, because a header that is set in code and
 * missing on the CDN is missing.
 *
 *   HEADERS     on the HTML: a nonce CSP with strict-dynamic and no
 *               unsafe-inline in script-src, frame-ancestors 'none',
 *               base-uri 'none', object-src 'none', form-action 'self';
 *               nosniff, X-Frame-Options, Referrer-Policy, COOP, CORP,
 *               Permissions-Policy, DNS-prefetch off; HSTS on https; no
 *               X-Powered-By, no Server fingerprint beyond the platform's.
 *   NONCES      every inline <script> in the HTML carries the response's
 *               nonce, so the CSP is enforcing rather than decorative.
 *   API         GET on the write endpoint is refused; a POST with a foreign
 *               Origin is 403; a POST with no Origin and no Sec-Fetch-Site is
 *               403; the honeypot is 422; a too-fast fill is 422; a JSON body
 *               over the cap is 413; a non-JSON body is 400; an unknown /api
 *               path is a JSON 404 on GET and POST; /api/health names env
 *               vars, never values, and carries no-store.
 *   RATE LIMIT  the ninth inquiry attempt inside ten minutes is 429 with
 *               Retry-After. Skipped when the target already answers 503
 *               (delivery unconfigured) because the limiter sits behind that
 *               gate by design.
 *   ROBOTS      /api/ is disallowed; the sitemap is declared.
 *   COOKIES     any Set-Cookie on an HTML response is Secure + SameSite.
 *
 * Exit 1 on any failure.
 */

const TARGET = (process.argv[2] || process.env.TARGET || "http://localhost:3478").replace(/\/$/, "");
const https = TARGET.startsWith("https://");

let pass = 0;
const fails = [];
const check = (label, ok, detail = "") => {
  if (ok) pass++;
  else fails.push(`${label}${detail ? `  — ${detail}` : ""}`);
};

const get = (path, init = {}) => fetch(TARGET + path, { redirect: "manual", ...init });

/* ---- headers on the document ------------------------------------------- */
{
  const res = await get("/");
  const h = res.headers;
  check("html: 200", res.status === 200, String(res.status));

  const csp = h.get("content-security-policy") || "";
  const dir = (name) => (csp.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + " ") || s === name) || "").slice(name.length).trim();
  check("csp: present", csp.length > 0);
  check("csp: script-src carries a nonce", /'nonce-[A-Za-z0-9+/=]+'/.test(dir("script-src")), dir("script-src"));
  check("csp: script-src is strict-dynamic", dir("script-src").includes("'strict-dynamic'"), dir("script-src"));
  check("csp: script-src has no unsafe-inline", !dir("script-src").includes("'unsafe-inline'"), dir("script-src"));
  check("csp: script-src has no unsafe-eval in production", !dir("script-src").includes("'unsafe-eval'") || TARGET.includes("localhost:3000"), dir("script-src"));
  check("csp: frame-ancestors 'none'", dir("frame-ancestors") === "'none'", dir("frame-ancestors"));
  check("csp: base-uri 'none'", dir("base-uri") === "'none'", dir("base-uri"));
  check("csp: object-src 'none'", dir("object-src") === "'none'", dir("object-src"));
  check("csp: form-action 'self'", dir("form-action") === "'self'", dir("form-action"));
  check("csp: connect-src is 'self' only (no analytics, ever)", dir("connect-src") === "'self'", dir("connect-src"));
  const frame = dir("frame-src");
  check("csp: frame-src is 'none' or Turnstile only", frame === "'none'" || frame === "https://challenges.cloudflare.com", frame);
  check("csp: upgrade-insecure-requests", csp.includes("upgrade-insecure-requests"));

  check("header: X-Content-Type-Options nosniff", h.get("x-content-type-options") === "nosniff");
  check("header: X-Frame-Options DENY", h.get("x-frame-options") === "DENY", h.get("x-frame-options") || "(none)");
  check("header: Referrer-Policy", /strict-origin-when-cross-origin|no-referrer/.test(h.get("referrer-policy") || ""), h.get("referrer-policy") || "(none)");
  check("header: Cross-Origin-Opener-Policy same-origin", h.get("cross-origin-opener-policy") === "same-origin");
  check("header: Cross-Origin-Resource-Policy same-origin", h.get("cross-origin-resource-policy") === "same-origin");
  const pp = h.get("permissions-policy") || "";
  check("header: Permissions-Policy switches off camera, microphone, geolocation, payment", ["camera=()", "microphone=()", "geolocation=()", "payment=()"].every((k) => pp.includes(k)), pp);
  check("header: X-DNS-Prefetch-Control off", h.get("x-dns-prefetch-control") === "off");
  check("header: no X-Powered-By", h.get("x-powered-by") === null, h.get("x-powered-by") || "");
  if (https) {
    const hsts = h.get("strict-transport-security") || "";
    check("header: HSTS with a year and includeSubDomains", /max-age=(\d{8,})/.test(hsts) && hsts.includes("includeSubDomains"), hsts || "(none)");
  }

  /* every inline script carries the nonce */
  const html = await res.text();
  const nonce = (dir("script-src").match(/'nonce-([^']+)'/) || [])[1];
  const inline = [...html.matchAll(/<script\b([^>]*)>/gi)].map((m) => m[1]).filter((a) => !/\bsrc=/.test(a) && !/type="application\/ld\+json"/.test(a) && !/type="application\/json"/.test(a));
  const unnonced = inline.filter((a) => !a.includes(`nonce="${nonce}"`));
  check("nonces: every inline script carries the response nonce", inline.length > 0 && unnonced.length === 0, `${unnonced.length} of ${inline.length} without it`);

  /* cookies, if any */
  const cookies = h.getSetCookie ? h.getSetCookie() : [];
  for (const c of cookies) check(`cookie: ${c.split("=")[0]} is Secure and SameSite`, (!https || /;\s*Secure/i.test(c)) && /SameSite=(Strict|Lax)/i.test(c), c);
}

/* ---- the write endpoint refuses what it should --------------------------- */
{
  const post = (body, headers = {}, raw = false) =>
    get("/api/inquiry", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: raw ? body : JSON.stringify(body) });

  const g = await get("/api/inquiry");
  check("api: GET /api/inquiry is refused", g.status === 405 || g.status === 404, String(g.status));

  const foreign = await post({ lane: "driver" }, { origin: "https://evil.example" });
  check("api: cross-origin POST is 403", foreign.status === 403 || foreign.status === 503, String(foreign.status));

  const bare = await post({ lane: "driver" });
  check("api: origin-less POST is 403", bare.status === 403 || bare.status === 503, String(bare.status));

  const configured = foreign.status !== 503;
  /* A fresh forwarded address per run keeps a local server's in-memory
     limiter from carrying over between runs. Vercel overwrites the header
     with the real address, so on production a second run inside ten minutes
     meets an already-tripped limiter; those checks then report it. */
  const same = { origin: TARGET, "sec-fetch-site": "same-origin", "x-forwarded-for": "203.0.113." + Math.floor(Math.random() * 250 + 1) };
  const tripped = (r) => r.status === 429;
  if (!configured) {
    console.log("  (delivery is not configured on this target: the honeypot, timing, size and rate-limit checks sit behind that gate and are skipped)");
  } else {
    const valid = { lane: "driver", name: "Security Suite", email: "security-suite@example.com", phone: "5104994552", cdl: "class-a", experience: "3-5", basedIn: "Tracy, CA", startedAt: Date.now() - 10000, website: "" };

    const honey = await post({ ...valid, website: "http://spam.example" }, same);
    const honeyBody = await honey.json().catch(() => ({}));
    check("api: honeypot hit is 422", (honey.status === 422 && honeyBody.error === "validation_failed") || tripped(honey), `${honey.status} ${JSON.stringify(honeyBody).slice(0, 80)}`);
    if (tripped(honey)) console.log("  (the limiter was already tripped for this address from an earlier run; the 422 checks below are reported as 429)");

    const fast = await post({ ...valid, startedAt: Date.now() }, same);
    const fastBody = await fast.json().catch(() => ({}));
    check("api: too-fast fill is 422", (fast.status === 422 && !!fastBody.fields?.startedAt) || tripped(fast), `${fast.status} ${JSON.stringify(fastBody).slice(0, 80)}`);

    const big = await post(JSON.stringify({ ...valid, notes: "x".repeat(40 * 1024) }), same, true);
    check("api: oversize body is 413", big.status === 413 || tripped(big), String(big.status));

    const notJson = await post("name=x&email=y", same, true);
    check("api: non-JSON body is 400", notJson.status === 400 || tripped(notJson), String(notJson.status));

    /* rate limit: the bucket allows 8 in 10 minutes; the honeypot hits above
       count, so a few more valid-shaped attempts must tip it over */
    let status = 0;
    for (let i = 0; i < 10 && status !== 429; i++) {
      const r = await post({ ...valid, website: "http://spam.example" }, same);
      status = r.status;
      if (status === 429) check("api: rate limit answers Retry-After", /^\d+$/.test(r.headers.get("retry-after") || ""), r.headers.get("retry-after") || "(none)");
    }
    check("api: the inquiry bucket rate-limits", status === 429, `last status ${status}`);
  }

  const u1 = await get("/api/definitely-not-a-route");
  const u2 = await get("/api/onboarding/step", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  check("api: unknown path is a JSON 404 on GET", u1.status === 404 && /json/.test(u1.headers.get("content-type") || ""), `${u1.status} ${u1.headers.get("content-type")}`);
  check("api: unknown path is a JSON 404 on POST", u2.status === 404 && /json/.test(u2.headers.get("content-type") || ""), `${u2.status} ${u2.headers.get("content-type")}`);

  const health = await get("/api/health");
  const hb = await health.json().catch(() => ({}));
  const text = JSON.stringify(hb);
  check("api: /api/health is no-store", /no-store/.test(health.headers.get("cache-control") || ""), health.headers.get("cache-control") || "(none)");
  check("api: /api/health never carries a value that looks like a key", !/re_[A-Za-z0-9]{10,}|0x[0-9a-f]{20,}|[A-Za-z0-9_-]{40,}/.test(text), text.slice(0, 120));
  check("api: /api/health reports the bot gate", typeof hb.botGate?.configured === "boolean", text.slice(0, 120));
}

/* ---- robots ---------------------------------------------------------------- */
{
  const r = await get("/robots.txt");
  const t = await r.text();
  check("robots: /api/ disallowed", /Disallow:\s*\/api\//.test(t), t.slice(0, 120).replace(/\n/g, " | "));
  check("robots: sitemap declared", /Sitemap:\s*https?:\/\//.test(t));
}

for (const f of fails) console.log(`  FAIL  ${f}`);
console.log(`\n  ${pass} passed, ${fails.length} failed  (${TARGET})`);
process.exit(fails.length ? 1 : 0);
