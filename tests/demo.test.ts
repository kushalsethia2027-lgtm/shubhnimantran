import { describe, expect, test } from "bun:test";
import {
  buildInvitation,
  canRender,
  exampleData,
  importDemoCsv,
  invalidateApprovals,
  representatives,
  recordingContext,
  recordingMatches,
  recordingExtension,
} from "../src/features/demo/model";
describe("No-login demo actual workflow rules", () => {
  test("writes only the events assigned to this guest", () => {
    const data = exampleData();
    const script = buildInvitation(data, data.guests[0]!);
    expect(script).toContain("Rajesh Mama ji");
    expect(script).toContain("2027-02-10");
    expect(script).not.toContain("Mehndi");
    expect(script).not.toContain("2027-02-09");
  });
  test("keeps the guest's custom relationship and Hindi language", () => {
    const data = exampleData();
    const guest = { ...data.guests[1]!, relation: "Pinky Bua" };
    const text = buildInvitation(data, guest);
    expect(text).toContain("नमस्ते");
    expect(text).toContain("Pinky Bua");
    expect(text).toContain("Mehndi");
  });
  test("cannot render without real audio, permission and selected guest approval", () => {
    const data = exampleData();
    expect(canRender(data, "mama", false, false)).toContain("Approve");
    const approved = {
      ...data,
      guests: data.guests.map((g) => ({ ...g, script: buildInvitation(data, g), approved: true })),
    };
    expect(canRender(approved, "mama", false, true)).toContain("Record");
    expect(canRender(approved, "mama", true, false)).toContain("permission");
    expect(canRender(approved, "mama", true, true)).toBe(null);
  });
  test("one guest can render without unrelated relationship approvals", () => {
    const data = exampleData();
    data.guests = data.guests.map((g) => ({
      ...g,
      relation: "Mama ji",
      script: "Approved",
      approved: true,
    }));
    expect(representatives(data.guests)).toHaveLength(1);
    data.guests = data.guests.slice(0, 1);
    expect(canRender(data, "mama", true, true)).toBe(null);
  });
  test("wedding edits clear prior wording and approvals", () => {
    const data = exampleData();
    data.guests = data.guests.map((g) => ({ ...g, script: "Old venue", approved: true }));
    expect(invalidateApprovals(data).guests.every((g) => g.script === "" && !g.approved)).toBe(
      true,
    );
  });
  test("missing or stale event assignments block rendering", () => {
    const data = exampleData();
    data.guests = data.guests.map((g) => ({ ...g, script: "Reviewed", approved: true }));
    data.guests[0]!.events = ["deleted"];
    expect(canRender(data, "mama", true, true)).toContain("no longer exists");
  });
  test("CSV does not require WhatsApp numbers and preserves all invalid rows", () => {
    const data = exampleData();
    const rows = importDemoCsv(
      "guest_name,relation,language,invited_events\nAsha,Bua ji,Hindi,Wedding\nDev,,Hinglish,Unknown",
      data,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]!.errors).toEqual([]);
    expect(rows[0]!.guest!.events).toEqual(["wedding"]);
    expect(rows[1]!.errors.length).toBeGreaterThan(0);
  });
  test("CSV reports duplicates and unknown or repeated events", () => {
    const data = exampleData();
    const rows = importDemoCsv(
      "guest_name,relation,language,invited_events\nRajesh,Mama ji,Hinglish,Wedding\nAsha,Bua ji,Hindi,Wedding|Wedding",
      data,
    );
    expect(rows[0]!.errors).toContain("Duplicate guest and relation.");
    expect(rows[1]!.errors).toContain("Unknown or repeated event name.");
  });
});

describe("Individual recordings", () => {
  test("a recording never matches a different guest", () => {
    const data = exampleData();
    const first = data.guests[0]!;
    const take = { guestId: first.id, context: recordingContext(data, first) };
    expect(recordingMatches(data, first, take)).toBe(true);
    expect(recordingMatches(data, data.guests[1]!, take)).toBe(false);
  });
  test("script, pronunciation and event edits require a new take", () => {
    const data = exampleData();
    const first = data.guests[0]!;
    const take = { guestId: first.id, context: recordingContext(data, first) };
    expect(recordingMatches(data, { ...first, script: "Changed spoken wording" }, take)).toBe(
      false,
    );
    expect(recordingMatches(data, { ...first, phonetics: "Changed pronunciation" }, take)).toBe(
      false,
    );
    expect(recordingMatches({ ...data, bride: "A different name" }, first, take)).toBe(false);
  });
  test("approval and design changes do not invalidate identical speech", () => {
    const data = exampleData();
    const first = data.guests[0]!;
    const take = { guestId: first.id, context: recordingContext(data, first) };
    expect(
      recordingMatches({ ...data, template: "royal" }, { ...first, approved: true }, take),
    ).toBe(true);
  });
  test("original downloads use the recorded format's extension", () => {
    expect(recordingExtension("video/webm;codecs=vp8,opus")).toBe("webm");
    expect(recordingExtension("audio/mp4")).toBe("m4a");
    expect(recordingExtension("video/mp4")).toBe("mp4");
    expect(recordingExtension("audio/ogg")).toBe("ogg");
  });
});
