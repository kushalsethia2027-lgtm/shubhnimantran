import { test, expect } from "bun:test";
import { safeDestination } from "../src/features/auth/client";
test("OAuth destinations cannot redirect to an external origin or arbitrary path", () => {
  expect(safeDestination("https://attacker.invalid")).toBe("/planner/");
  expect(safeDestination("//attacker.invalid")).toBe("/planner/");
  expect(safeDestination("/app?redirect=bad")).toBe("/planner/");
  expect(safeDestination(null)).toBe("/planner/");
  expect(safeDestination("/demo/")).toBe("/demo/");
  expect(safeDestination("/app")).toBe("/app");
});
