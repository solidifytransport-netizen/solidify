/**
 * Write a gitignored .env.local that configures the onboarding and inquiry
 * pipelines for local testing.
 *
 * There is no store and no encryption key any more — this site keeps no
 * submission record. What a local run needs is an access code, a session
 * secret, and somewhere for mail to go. RESEND_API_BASE points the mailer at
 * a local sink (see scripts/mail-sink.mjs), which is honored in
 * non-production only, so "delivery succeeded" still means a real 2xx.
 *
 *   node scripts/local-env.mjs            write .env.local, print the code
 *   node scripts/local-env.mjs --remove   delete it
 */

import { randomBytes, createHash } from "node:crypto";
import { writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const FILE = join(process.cwd(), ".env.local");

if (process.argv.includes("--remove")) {
  if (existsSync(FILE)) rmSync(FILE);
  console.log(JSON.stringify({ removed: FILE }));
  process.exit(0);
}

const code = `SOLIDIFY-LOCAL-${randomBytes(4).toString("hex")}`;
const hash = createHash("sha256").update(code).digest("hex");
const token = randomBytes(24).toString("base64url");
const port = process.env.PORT ?? "3477";
const sinkPort = process.env.MAIL_SINK_PORT ?? "3479";

const body = `# Written by scripts/local-env.mjs — gitignored, local only.
NEXT_PUBLIC_SITE_URL=http://localhost:${port}
RESEND_API_KEY=local-sink-${token}
RESEND_API_BASE=http://127.0.0.1:${sinkPort}
MAIL_FROM_EMAIL=quotes@solidifytransport.test
INQUIRY_TO_EMAIL=inquiries@solidifytransport.test
`;

writeFileSync(FILE, body, { mode: 0o600 });
console.log(JSON.stringify({ code, sinkPort: Number(sinkPort), file: FILE }));
