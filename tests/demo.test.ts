import { describe, expect, test } from "bun:test";
import {
  buildInvitation,
  canRender,
  exampleData,
  importDemoCsv,
  invalidateApprovals,
  representatives,
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
  test("cannot render without real audio, permission and three sample approvals", () => {
    const data = exampleData();
    expect(canRender(data, "mama", false, false)).toContain("three");
    const approved = {
      ...data,
      guests: data.guests.map((g) => ({ ...g, script: buildInvitation(data, g), approved: true })),
    };
    expect(canRender(approved, "mama", false, true)).toContain("Record");
    expect(canRender(approved, "mama", true, false)).toContain("permission");
    expect(canRender(approved, "mama", true, true)).toBe(null);
  });
  test("repeating the same relation cannot satisfy the three-group gate", () => {
    const data = exampleData();
    data.guests = data.guests.map((g) => ({
      ...g,
      relation: "Mama ji",
      script: "Approved",
      approved: true,
    }));
    expect(representatives(data.guests)).toHaveLength(1);
    expect(canRender(data, "mama", true, true)).toContain("three");
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
