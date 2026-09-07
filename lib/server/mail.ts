/**
 * Outbound mail — the only way anything submitted to this site reaches
 * Solidify.
 *
 * This module used to be inquiry-only, with a standing rule that the
 * onboarding pipeline was never allowed to import it because a TIN or a bank number
 * must never sit in a mailbox. That rule no longer holds: the client
 * requires that this website keep no submission record, so email IS the
 * record, onboarding included. Do not "restore" the old rule — restoring it
 * would leave approved-driver submissions with nowhere to go.
 *
 * What still holds: nothing built here is ever passed to a logger, and the
 * message body is the only place a secret appears.
 *
 * Resend REST API via fetch. No SDK.
 */

import type { Inquiry } from "@/lib/schemas";
import { getConfig } from "./config";
import { redactString } from "./log";

export interface MailAttachment {
  /** Server-generated. Never a byte of the uploader's own filename. */
  filename: string;
  /** base64 of the file's bytes. */
  content: string;
  /** From the sniffed type, never the declared one. */
  contentType: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export interface Mailer {
  send(msg: MailMessage): Promise<{ id: string | null }>;
}

class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly base: string,
  ) {}

  async send(msg: MailMessage): Promise<{ id: string | null }> {
    const res = await fetch(`${this.base}/emails`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        ...(msg.attachments?.length
          ? { attachments: msg.attachments.map((a) => ({ filename: a.filename, content: a.content, content_type: a.contentType })) }
          : {}),
      }),
      // Attachments make the request an order of magnitude larger; give it room.
      signal: AbortSignal.timeout(msg.attachments?.length ? 25_000 : 10_000),
    });
    if (!res.ok) {
      let detail = "";
      try {
        const body = (await res.json()) as { message?: string; name?: string };
        detail = body.message ?? body.name ?? "";
      } catch {
        /* body not JSON */
      }
      // The provider can echo request content back in an error; redact before it
      // reaches a caller or a log.
      throw new Error(redactString(`resend responded ${res.status}${detail ? `: ${detail}` : ""}`));
    }
    const body = (await res.json()) as { id?: string };
    return { id: typeof body.id === "string" ? body.id : null };
  }
}

let mailer: Mailer | null | undefined;

export function getMailer(): Mailer | null {
  if (mailer !== undefined) return mailer;
  const cfg = getConfig();
  mailer = cfg.mailConfigured && cfg.resendApiKey ? new ResendMailer(cfg.resendApiKey, cfg.mailFromEmail, cfg.resendApiBase) : null;
  return mailer;
}

const LANE_LABEL: Record<Inquiry["lane"], string> = {
  vehicle: "Vehicle shipping quote",
  oem: "OEM / dealership inquiry",
  driver: "Driver enquiry",
};

/** Nothing built in this module is ever logged; this is here to say so once. */
export const NEVER_LOG_THIS = true;

const FIELD_LABEL: Record<string, string> = {
  pickupCity: "Pickup city",
  pickupState: "Pickup state",
  deliveryCity: "Delivery city",
  deliveryState: "Delivery state",
  vehicleYear: "Vehicle year",
  vehicleMake: "Vehicle make",
  vehicleModel: "Vehicle model",
  operable: "Operable",
  preferredDate: "Preferred date",
  name: "Name",
  phone: "Phone",
  email: "Email",
  notes: "Notes",
  company: "Company",
  role: "Role",
  orgType: "Organization type",
  originRegion: "Origin region",
  destinationRegion: "Destination region",
  volume: "Approximate volume",
  homeBase: "Home base",
  equipment: "Equipment",
};

/** Plain-text body. Fields in schema order, blanks omitted, anti-spam fields dropped. */
export function formatInquiryEmail(inquiry: Inquiry, reference: string, receivedAt: string): { subject: string; text: string } {
  const lines: string[] = [];
  lines.push(`${LANE_LABEL[inquiry.lane]} — reference ${reference}`);
  lines.push(`Received ${receivedAt}`);
  lines.push("");
  for (const [key, value] of Object.entries(inquiry)) {
    if (key === "lane" || key === "website" || key === "startedAt") continue;
    if (value === undefined || value === null || String(value).trim() === "") continue;
    const label = FIELD_LABEL[key] ?? key;
    const text = String(value).replace(/\r?\n/g, "\n    ");
    lines.push(`${label}: ${text}`);
  }
  lines.push("");
  lines.push("Sent by the Solidify Transport website inquiry form.");
  return {
    subject: `[Solidify] ${LANE_LABEL[inquiry.lane]} — ${inquiry.name} (${reference})`,
    text: lines.join("\n"),
  };
}
