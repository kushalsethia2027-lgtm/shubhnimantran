import { test, expect } from "bun:test";
import { assertPublicPlannerKey } from "../scripts/planner-env";
const jwt = (role: string) =>
  "header." + Buffer.from(JSON.stringify({ role })).toString("base64url") + ".fixture";
test("planner build permits only public keys and the unconfigured setup screen", () => {
  expect(() => assertPublicPlannerKey()).not.toThrow();
  expect(() => assertPublicPlannerKey("sb_publishable_fixture")).not.toThrow();
  expect(() => assertPublicPlannerKey(jwt("anon"))).not.toThrow();
});
test("planner build rejects secret/service-role keys before bundling", () => {
  expect(() => assertPublicPlannerKey("sb_secret_fixture")).toThrow("must never enter");
  expect(() => assertPublicPlannerKey(jwt("service_role"))).toThrow("must never enter");
  expect(() => assertPublicPlannerKey(jwt("authenticated"))).toThrow("must never enter");
});
test("planner build errors never echo supplied secret values", () => {
  const value = "sb_secret_fixture-sensitive-value";
  try {
    assertPublicPlannerKey(value);
    throw new Error("Expected rejection");
  } catch (error) {
    expect((error as Error).message).not.toContain(value);
  }
});
