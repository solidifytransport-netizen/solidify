import { z } from "zod";

/**
 * Validation schemas shared by the client forms and the server route
 * handlers. One definition per shape, so a field can never be accepted by
 * the browser and rejected by the server, or vice versa.
 *
 * Messages name the field and the expectation and NEVER echo the value.
 */

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

export const STATE_NAMES: Record<(typeof US_STATES)[number], string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

export const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

const text = (label: string, max: number, min = 1) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`).optional().or(z.literal(""));

/** Blank is fine; anything present must match `re`. */
const optionalPattern = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || re.test(v), message)
    .optional();

const isUsPhone = (v: string) => [10, 11].includes(digits(v).length);

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .refine(isUsPhone, "Phone number must be a valid US number.");

/** Blank is fine; anything present must be a US phone number. */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || isUsPhone(v), "Phone number must be a valid US number.")
  .optional();

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(160, "Email must be 160 characters or fewer.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Email must be a valid address.");

export const stateSchema = z.enum(US_STATES, { message: "Select a state." });

const ZIP_RE = /^\d{5}(-\d{4})?$/;
export const zipSchema = z.string().trim().regex(ZIP_RE, "ZIP must be 5 digits.");

/** Blank is fine; anything present must be a real state code. */
export const optionalStateSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || (US_STATES as readonly string[]).includes(v), "Select a state.")
  .optional();

export const optionalZipSchema = optionalPattern(ZIP_RE, "ZIP must be 5 digits.");

/** Honeypot + timing fields present on every public form. */
const antiSpam = {
  website: z.string().max(0, "Invalid submission.").optional().or(z.literal("")),
  startedAt: z.coerce.number().optional(),
  /** Cloudflare Turnstile token; required by the server when the gate is configured. */
  turnstileToken: z.string().max(2048).optional(),
};

/* ────────────────────────────────────────────────────────────── inquiries ── */

export const vehicleQuoteSchema = z.object({
  lane: z.literal("vehicle"),
  pickupCity: text("Pickup city", 80),
  pickupState: stateSchema,
  deliveryCity: text("Delivery city", 80),
  deliveryState: stateSchema,
  vehicleYear: z
    .string()
    .trim()
    .regex(/^(19|20)\d{2}$/, "Vehicle year must be a four-digit year."),
  vehicleMake: text("Vehicle make", 60),
  vehicleModel: text("Vehicle model", 60),
  operable: z.enum(["operable", "inoperable"], { message: "Tell us whether the vehicle runs." }),
  preferredDate: optionalText("Preferred date", 40),
  name: text("Name", 120),
  phone: phoneSchema,
  email: emailSchema,
  notes: optionalText("Notes", 1200),
  ...antiSpam,
});

export const oemInquirySchema = z.object({
  lane: z.literal("oem"),
  company: text("Company", 160),
  role: optionalText("Role", 80),
  orgType: z.enum(["oem", "dealership", "dealer-group", "other"], { message: "Select an organization type." }),
  name: text("Name", 120),
  phone: phoneSchema,
  email: emailSchema,
  originRegion: optionalText("Origin region", 160),
  destinationRegion: optionalText("Destination region", 160),
  volume: optionalText("Approximate volume", 120),
  notes: optionalText("Notes", 1600),
  ...antiSpam,
});

/**
 * A driver inquiring about running SOLIDIFY'S equipment.
 *
 * Every field here is a QUESTION, never a published requirement: Solidify has
 * not confirmed hiring minimums, so the site asks and does not assert. `cdl`
 * is asked because a commercial driver's license is a federal condition of
 * operating this class of vehicle, not because a minimum has been set here.
 */
export const driverInquirySchema = z.object({
  lane: z.literal("driver"),
  name: text("Name", 120),
  phone: phoneSchema,
  email: emailSchema,
  basedIn: optionalText("Where you are based", 120),
  cdl: z.enum(["class-a", "class-b", "other", "none"], { message: "Tell us which license you hold." }),
  experience: optionalText("Driving experience", 200),
  notes: optionalText("Notes", 1200),
  ...antiSpam,
});

export const inquirySchema = z.discriminatedUnion("lane", [
  vehicleQuoteSchema,
  oemInquirySchema,
  driverInquirySchema,
]);

export type VehicleQuote = z.infer<typeof vehicleQuoteSchema>;
export type OemInquiry = z.infer<typeof oemInquirySchema>;
export type DriverInquiry = z.infer<typeof driverInquirySchema>;
export type Inquiry = z.infer<typeof inquirySchema>;

/** Reduce a zod error to { field: message }, first message per field. */
/**
 * Zod issues keyed by their FULL dotted path, so a nested issue names the
 * field and not just the object it sits in.
 */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length > 0 ? issue.path.map((p) => String(p)).join(".") : "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
