import { inquirySchema, type Inquiry } from "@/lib/schemas";
import { getConfig } from "@/lib/server/config";
import { newReference } from "@/lib/server/crypto";
import { requireOrigin } from "@/lib/server/csrf";
import { AppError } from "@/lib/server/errors";
import { fail, json, limit, requireInquiryConfigured } from "@/lib/server/guards";
import { log } from "@/lib/server/log";
import { formatInquiryEmail, getMailer } from "@/lib/server/mail";
import { clientIp } from "@/lib/server/ratelimit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { readJsonLimited } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_FILL_MS = 2500;

/**
 * POST /api/inquiry  (JSON, one of the inquirySchema lanes)
 *   200 { ok: true, reference }
 *   422 { error: "validation_failed", fields }   (also the honeypot, the timing check and the bot gate)
 *   502 { error: "delivery_failed", message }
 *   503 { error: "inquiry_not_configured", message }
 *
 * Validate, then deliver. This site keeps no copy of an inquiry: the email is
 * the record, and a 200 is returned only after the provider accepted it.
 * Nothing is ever silently dropped.
 */
export async function POST(req: Request) {
  try {
    const cfgFail = requireInquiryConfigured();
    if (cfgFail) return cfgFail;
    const limited = await limit(req, "inquiry");
    if (limited) return limited;
    const originFail = requireOrigin(req);
    if (originFail) return originFail;

    const body = await readJsonLimited(req, 32 * 1024);
    const parsed = inquirySchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error, "inquiry");
    const inquiry = parsed.data;

    if (inquiry.website) {
      return json({ error: "validation_failed", fields: { website: "Invalid submission." } }, { status: 422 });
    }
    if (inquiry.startedAt !== undefined) {
      const elapsed = Date.now() - inquiry.startedAt;
      if (!(elapsed >= MIN_FILL_MS)) {
        return json(
          { error: "validation_failed", fields: { startedAt: "Please take a moment to review the form before sending." } },
          { status: 422 },
        );
      }
    }

    /* The bot gate, last of the cheap checks and before anything is sent.
       A no-op until TURNSTILE_SECRET_KEY is set; a hard refusal after. */
    const gate = await verifyTurnstile(inquiry.turnstileToken, clientIp(req));
    if (!gate.ok) {
      log.warn("inquiry: turnstile refused", { reason: gate.reason });
      return json(
        { error: "validation_failed", fields: { turnstileToken: "We could not confirm you are not a bot. Please try again." } },
        { status: 422 },
      );
    }

    const clean = stripAntiSpam(inquiry);
    const reference = newReference();
    const receivedAt = new Date().toISOString();
    const cfg = getConfig();

    const mailer = getMailer();
    if (!mailer || !cfg.inquiryToEmail) throw new AppError("inquiry_not_configured");

    const { subject, text } = formatInquiryEmail(clean, reference, receivedAt);
    try {
      await mailer.send({ to: cfg.inquiryToEmail, subject, text, replyTo: clean.email });
    } catch (err) {
      log.error("inquiry: delivery refused by provider", err instanceof Error ? err.message : "unknown");
      throw new AppError("delivery_failed");
    }

    log.info("inquiry: delivered", { reference, lane: clean.lane });
    return json({ ok: true, reference });
  } catch (err) {
    return fail(err, "inquiry");
  }
}

function stripAntiSpam(inquiry: Inquiry): Inquiry {
  const copy: Record<string, unknown> = { ...inquiry };
  delete copy.website;
  delete copy.startedAt;
  delete copy.turnstileToken;
  return copy as Inquiry;
}
