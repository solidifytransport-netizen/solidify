import { getConfig } from "@/lib/server/config";
import { json, withLimit } from "@/lib/server/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * { ok, inquiry: { configured, reasons? }, botGate: { configured } }
 *
 * Reasons are developer-facing and name env vars, never their values.
 *
 * Configured is derived from environment presence alone — deliberately no
 * round trip to the mail provider. Every page boot calls this to decide
 * whether the inquiry forms can accept anything, and pinging a third party
 * per visitor would be slow and a rate-limit hazard. A bad API key is not
 * silent either way: it surfaces as an honest 502 at submit. Do not add a
 * deep probe here.
 */
export async function GET(req: Request) {
  const limited = await withLimit(req, "health", 30, 10 * 60 * 1000);
  if (limited) return limited;

  const cfg = getConfig();
  return json({
    ok: true,
    inquiry: { configured: cfg.inquiryConfigured, ...(cfg.inquiryReasons.length ? { reasons: cfg.inquiryReasons } : {}) },
    botGate: { configured: cfg.turnstileConfigured },
  });
}
