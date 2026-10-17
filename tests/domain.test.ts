import { describe, expect, test } from "bun:test";
import {
  approvalGate,
  chooseSamples,
  csvExport,
  guestSchema,
  parseCsv,
  phone,
  previewCsv,
  weddingSchema,
  type Guest,
  type Script,
} from "../src/features/workspace/domain";
const event = {
  id: "20000000-0000-4000-8000-000000000001",
  name: "Wedding",
  date: "2027-02-10",
  venue: "Home",
};
const guest = {
  id: "30000000-0000-4000-8000-000000000001",
  guest_name: "Raj",
  relation: "Mama ji",
  language: "Hindi",
  whatsapp_number: "+919876543210",
  notes: "",
  pronunciation: "",
  invited_events: [event.id],
  messaging_consent: false,
  opted_out: false,
} satisfies Guest;
describe("phone and wedding validation", () => {
  test("normalises Indian local, international, and 00-prefixed numbers", () => {
    expect(phone("98765 43210")).toBe("+919876543210");
    expect(phone("0044 7700 900123")).toBe("+447700900123");
    expect(phone("+91 (98765) 43210")).toBe("+919876543210");
  });
  test("rejects partial numbers and arbitrary strings", () => {
    for (const value of ["123", "+0123456789", "abc", "+1234567890123456"])
      expect(() => phone(value)).toThrow();
  });
  test("guest permission is never assumed", () => {
    const { messaging_consent, ...input } = guest;
    expect(guestSchema.parse(input).messaging_consent).toBe(false);
  });
  test("requires a relationship and at least one event", () => {
    expect(guestSchema.safeParse({ ...guest, relation: "" }).success).toBe(false);
    expect(guestSchema.safeParse({ ...guest, invited_events: [] }).success).toBe(false);
  });
  test("rejects unsupported languages and invalid wedding dates", () => {
    expect(guestSchema.safeParse({ ...guest, language: "Tamil" }).success).toBe(false);
    expect(
      weddingSchema.safeParse({
        bride: "A",
        groom: "B",
        wedding_date: "2027-02-30",
        city: "x",
        venue: "v",
        rsvp_contact: "r",
        plan: "small",
        events: [event],
      }).success,
    ).toBe(false);
  });
});
test("rejects duplicate event selections before import", () => {
  expect(guestSchema.safeParse({ ...guest, invited_events: [event.id, event.id] }).success).toBe(
    false,
  );
});
describe("CSV import", () => {
  const header = "guest_name,relation,language,whatsapp_number,invited_events,notes\r\n";
  test("parses BOM, CRLF, quoted commas, escaped quotes and multiline cells", () => {
    expect(parseCsv('\uFEFFname,note\r\n"Raj, ji","He said ""yes""\nTomorrow"\r\n')).toEqual([
      ["name", "note"],
      ["Raj, ji", 'He said "yes"\nTomorrow'],
    ]);
  });
  test("rejects malformed quoting", () => {
    expect(() => parseCsv('name\n"open')).toThrow();
    expect(() => parseCsv('"closed"bad')).toThrow();
  });
  test("requires known nonduplicate headers", () => {
    expect(() => previewCsv("name,phone\nRaj,123", [event])).toThrow();
    expect(() => previewCsv(header.replace("notes", "relation"), [event])).toThrow();
  });
  test("flags duplicate numbers after normalisation", () => {
    const result = previewCsv(
      header + "Raj,Mama ji,Hindi,9876543210,Wedding,\nAsha,Mausi ji,Hindi,+919876543210,Wedding,",
      [event],
    );
    expect(result[0]?.errors).toEqual([]);
    expect(result[1]?.errors).toContain("Duplicate WhatsApp number.");
  });
  test("does not discard row errors or assume opt-in", () => {
    const result = previewCsv(
      header + "Raj,,Hindi,123,Unknown,\nAsha,Mausi ji,Hindi,9876543211,Wedding,",
      [event],
    );
    expect(result).toHaveLength(2);
    expect(result[0]!.errors.length).toBeGreaterThan(0);
    expect(result[1]!.guest!.messaging_consent).toBe(false);
  });
  test("rejects numbers already in this wedding", () => {
    expect(
      previewCsv(header + "Raj,Mama ji,Hindi,9876543210,Wedding,", [event], [guest])[0]!.errors,
    ).toContain("Duplicate WhatsApp number.");
  });
  test("maps only explicitly selected events", () => {
    const other = { ...event, id: "20000000-0000-4000-8000-000000000002", name: "Mehndi" };
    expect(
      previewCsv(header + "Raj,Mama ji,Hindi,9876543210,Wedding,", [event, other])[0]!.guest!
        .invited_events,
    ).toEqual([event.id]);
  });
  test("flags mismatched columns and file/row limits", () => {
    expect(
      previewCsv(header + "Raj,Mama ji,Hindi,9876543210,Wedding,,extra", [event])[0]!.errors.length,
    ).toBeGreaterThan(0);
    expect(() => parseCsv("x".repeat(2_000_001))).toThrow();
    expect(() => parseCsv("x\n".repeat(402))).toThrow();
  });
  test("protects spreadsheet export from formula injection", () => {
    expect(csvExport([["=IMPORTXML(x)", "safe, cell", 'He said "hi"']])).toBe(
      '"\'=IMPORTXML(x)","safe, cell","He said ""hi"""',
    );
  });
});
describe("representative approval gate", () => {
  const guests = [
    guest,
    { ...guest, id: "30000000-0000-4000-8000-000000000002", relation: "Mausi ji" },
    { ...guest, id: "30000000-0000-4000-8000-000000000003", relation: "College friend" },
  ];
  const scripts = guests.map((g, i) => ({
    id: String(i),
    guest_id: g.id,
    body: "Reviewed",
    revision: 1,
    sample: true,
    approved_at: "2026-10-17T00:00:00Z",
    pronunciation: "",
    source: "manual",
  })) satisfies Script[];
  test("selects three distinct relationship groups", () => {
    expect(
      chooseSamples([guest, { ...guest, id: "duplicate-relation" }, ...guests.slice(1)]),
    ).toHaveLength(3);
  });
  test("requires three approved current samples", () => {
    expect(approvalGate(scripts, guests)).toBe(true);
    expect(
      approvalGate(
        scripts.map((s, i) => (i === 0 ? { ...s, approved_at: null } : s)),
        guests,
      ),
    ).toBe(false);
    expect(approvalGate(scripts, guests.slice(1))).toBe(false);
  });
  test("three guests with the same relation cannot satisfy the gate", () => {
    expect(
      approvalGate(
        scripts,
        guests.map((g) => ({ ...g, relation: "Mama ji" })),
      ),
    ).toBe(false);
  });
});
