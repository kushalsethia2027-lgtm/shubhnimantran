import { z } from "zod";

export const plans = {
  small: { name: "Chhota Parivaar", limit: 50 },
  medium: { name: "Bada Parivaar", limit: 150 },
  grand: { name: "Grand Baraat", limit: 400 },
} as const;
export const relations = [
  "Mama ji",
  "Mausi ji",
  "Chacha ji",
  "Bua ji",
  "Nana ji",
  "Dadi ji",
  "Cousin",
  "Family friend",
  "Colleague",
  "College friend",
];
export const privacyPromise =
  "Your family's voice is used only with consent for your wedding invitations. You can request deletion of the recording and associated voice assets.";
export const consentVersion = "2026-10-v1";
export const consentText =
  "I am the speaker identified here. I freely agree to the recording and use of my voice to create personalised invitations only for this wedding. I understand that an external voice provider may process it, that provider verification is required before cloning, and that I can revoke consent and request deletion. I have included the spoken consent statement in this recording.";
export const phone = (value: string) => {
  let normalized = value.trim().replace(/[\s().-]/g, "");
  if (/^\d{10}$/.test(normalized)) normalized = `+91${normalized}`;
  if (/^00\d+$/.test(normalized)) normalized = `+${normalized.slice(2)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized))
    throw new Error("Use an international WhatsApp number, e.g. +919876543210.");
  return normalized;
};
const phoneSchema = z.string().transform((value, ctx) => {
  try {
    return phone(value);
  } catch (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: (error as Error).message });
    return z.NEVER;
  }
});
const text = (max = 160) => z.string().trim().min(1).max(max);
export const eventSchema = z.object({
  id: z.string().uuid().optional(),
  name: text(80),
  date: z.string().date(),
  venue: text(240),
});
export const weddingSchema = z.object({
  bride: text(100),
  groom: text(100),
  wedding_date: z.string().date(),
  city: text(100),
  venue: text(240),
  rsvp_contact: text(80),
  plan: z.enum(["small", "medium", "grand"]),
  notes: z.string().trim().max(2000).default(""),
  tone: z.enum(["traditional", "warm", "playful"]).default("warm"),
  template: z.enum(["maroon", "floral", "royal", "minimal"]).default("maroon"),
  events: z.array(eventSchema).min(1).max(12),
});
export const guestSchema = z.object({
  id: z.string().uuid().optional(),
  guest_name: text(100),
  relation: text(100),
  language: z.enum(["Hindi", "Hinglish"]),
  whatsapp_number: phoneSchema,
  invited_events: z
    .array(z.string().uuid())
    .min(1)
    .max(12)
    .refine((ids) => new Set(ids).size === ids.length, "Select each event only once."),
  notes: z.string().trim().max(1000).default(""),
  pronunciation: z.string().trim().max(240).default(""),
  messaging_consent: z.boolean().default(false),
});
export const waitlistSchema = z.object({
  name: text(100),
  phone: phoneSchema,
  email: z.string().trim().email().max(200),
  date: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  guest_count: z.coerce.number().int().min(1).max(400),
  language: z.enum(["Hindi", "Hinglish"]),
  role: text(60),
});
export type WeddingInput = z.infer<typeof weddingSchema>;
export type Wedding = Omit<WeddingInput, "events"> & { id: string; created_at: string };
export type WeddingEvent = z.infer<typeof eventSchema> & { id: string };
export type Guest = z.infer<typeof guestSchema> & { id: string; opted_out: boolean };
export type Script = {
  id: string;
  guest_id: string;
  body: string;
  revision: number;
  sample: boolean;
  approved_at: string | null;
  pronunciation: string;
  source: string;
};
export type Voice = {
  id: string;
  speaker: string;
  relationship: string;
  status: string;
  duration: number;
  consent_status: string;
  provider_verified: boolean;
  created_at: string;
};
export type Job = {
  id: string;
  guest_id: string;
  kind: string;
  status: string;
  error: string | null;
  created_at: string;
  scheduled_at: string | null;
};
export type Workspace = {
  wedding: Wedding;
  events: WeddingEvent[];
  guests: Guest[];
  scripts: Script[];
  voices: Voice[];
  jobs: Job[];
};

// RFC 4180 quoting, including commas, CRLF and newlines inside a field.
export function parseCsv(input: string): string[][] {
  if (input.length > 2_000_000) throw new Error("CSV must be smaller than 2 MB.");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  const source = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error("Unexpected quote in CSV.");
      quoted = true;
    } else if (c === ",") {
      row.push(field.trim());
      field = "";
      closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
      closed = false;
    } else {
      if (closed && c.trim()) throw new Error("Unexpected text after a quoted field.");
      if (!closed) field += c;
    }
  }
  if (quoted) throw new Error("Unclosed quoted field in CSV.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length > 401) throw new Error("Import at most 400 guests at once.");
  return rows;
}
export type ImportRow = {
  line: number;
  data: Record<string, string>;
  guest: z.infer<typeof guestSchema> | null;
  errors: string[];
};
export function previewCsv(
  input: string,
  events: WeddingEvent[],
  existing: Guest[] = [],
): ImportRow[] {
  const [headers, ...rows] = parseCsv(input);
  const required = ["guest_name", "relation", "language", "whatsapp_number", "invited_events"];
  if (
    !headers ||
    required.some((h) => !headers.includes(h)) ||
    new Set(headers).size !== headers.length
  )
    throw new Error(`Use the template columns: ${required.join(", ")}, notes.`);
  const numbers = new Set(existing.map((g) => g.whatsapp_number));
  return rows.map((cells, i) => {
    const data = Object.fromEntries(headers.map((h, j) => [h, cells[j] ?? ""]));
    const errors: string[] = [];
    if (cells.length !== headers.length) errors.push("Column count does not match the header.");
    const names = (data["invited_events"] ?? "")
      .split("|")
      .map((n) => n.trim())
      .filter(Boolean);
    const ids = names.map((n) => events.find((e) => e.name.toLowerCase() === n.toLowerCase())?.id);
    if (ids.some((id) => !id)) errors.push("Unknown event. Separate exact event names with |.");
    let result: ReturnType<typeof guestSchema.safeParse>;
    try {
      result = guestSchema.safeParse({
        ...data,
        invited_events: ids.filter(Boolean),
        messaging_consent: false,
      });
    } catch (e) {
      errors.push((e as Error).message);
      return { line: i + 2, data, guest: null, errors };
    }
    if (!result.success)
      errors.push(
        ...result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      );
    if (result.success) {
      if (numbers.has(result.data.whatsapp_number)) errors.push("Duplicate WhatsApp number.");
      numbers.add(result.data.whatsapp_number);
    }
    return { line: i + 2, data, guest: result.success ? result.data : null, errors };
  });
}
export function csvExport(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const safe = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
          return `"${safe.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}
export function chooseSamples(guests: Guest[]): Guest[] {
  const chosen: Guest[] = [];
  const seen = new Set<string>();
  for (const guest of guests) {
    const key = guest.relation.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      chosen.push(guest);
    }
    if (chosen.length === 3) break;
  }
  return chosen;
}
export function approvalGate(scripts: Script[], guests: Guest[]): boolean {
  const samples = scripts.filter(
    (s) => s.sample && s.approved_at && guests.some((g) => g.id === s.guest_id),
  );
  return (
    samples.length >= 3 &&
    new Set(samples.map((s) => guests.find((g) => g.id === s.guest_id)?.relation.toLowerCase()))
      .size >= 3
  );
}
