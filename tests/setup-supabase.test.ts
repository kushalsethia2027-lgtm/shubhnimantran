import { describe, expect, test } from "bun:test";
import { validateLegacyKey, updateEnvironment } from "../scripts/setup-supabase.mjs";
const url = "https://ozvuruhglhyhuparvael.supabase.co";
function fakeKey(role: string, ref = "ozvuruhglhyhuparvael") {
  return `fixture.${Buffer.from(JSON.stringify({ role, ref })).toString("base64url")}.fixture`;
}
describe("Windows Supabase configuration helper (synthetic keys only)", () => {
  test("checks legacy key role and project without claiming signature verification", () => {
    const key = fakeKey("anon");
    expect(validateLegacyKey(key, "anon", url)).toBe(key);
    expect(() => validateLegacyKey(key, "service_role", url)).toThrow("not a service_role");
    expect(() => validateLegacyKey(fakeKey("anon", "different-project"), "anon", url)).toThrow(
      "different Supabase project",
    );
    expect(() => validateLegacyKey("not-a-key", "anon", url)).toThrow("legacy");
  });
  test("preserves unrelated configuration and removes duplicate target assignments", () => {
    const source =
      '# User settings\r\nSUPPORT_EMAIL=owner@example.test\r\nexport SUPABASE_URL="old"\r\nSUPABASE_URL=duplicate\r\n';
    const result = updateEnvironment(source, {
      SUPABASE_URL: url,
      APP_ORIGIN: "http://127.0.0.1:3000",
    });
    expect(result).toContain("SUPPORT_EMAIL=owner@example.test");
    expect(result.match(/^SUPABASE_URL=/gm)).toHaveLength(1);
    expect(result).not.toContain("duplicate");
    expect(result).not.toContain('"old"');
  });
  test("quotes newlines so a supplied value cannot add another variable", () => {
    expect(updateEnvironment("", { VALUE: "a\nINJECTED=yes" })).toBe('VALUE="a\\nINJECTED=yes"\n');
  });
});
