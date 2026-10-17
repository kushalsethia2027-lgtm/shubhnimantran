import { afterEach, describe, expect, mock, test } from "bun:test";
import { handleApi } from "../src/lib/server/api.server";
import { authCookies, boundedBody } from "../src/lib/server/supabase.server";
import { verifyTwilio } from "../src/lib/server/providers.server";
const saved = { ...process.env };
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
});
const req = (path: string, data?: unknown, origin = "http://localhost:3000") =>
  new Request(
    `http://localhost:3000/api/nimantran${path}`,
    data === undefined
      ? {}
      : {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
describe("server boundaries", () => {
  test("rejects cross-site writes before any provider/database call", async () => {
    const response = await handleApi(req("/waitlist", {}, "https://attacker.test"));
    expect(response.status).toBe(403);
  });
  test("unauthenticated private requests cannot access wedding data", async () => {
    const response = await handleApi(req("/weddings"));
    expect(response.status).toBe(401);
  });
  test("missing configuration is explicit, never fake success", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    const response = await handleApi(req("/auth/request", { email: "host@example.test" }));
    expect(response.status).toBe(503);
  });
  test("status endpoint reveals presence only, never secrets", async () => {
    process.env.ANTHROPIC_API_KEY = "test-secret-do-not-emit";
    const response = await handleApi(req("/status"));
    const text = await response.text();
    expect(text).not.toContain("test-secret");
    expect(JSON.parse(text).scripts).toBe(true);
    expect(JSON.parse(text).productionEnabled).toBe(false);
  });
  test("validates waitlist fields before network access", async () => {
    expect((await handleApi(req("/waitlist", { name: "No email" }))).status).toBe(400);
  });
  test("limits actual streamed request bytes", async () => {
    await expect(
      boundedBody(new Request("http://localhost", { method: "POST", body: "123456" }), 5),
    ).rejects.toThrow("too large");
  });
  test("sets HttpOnly SameSite cookies; production uses Secure", () => {
    process.env.NODE_ENV = "production";
    const values = authCookies(req("/"), "access", "refresh");
    expect(
      values.every(
        (v) => v.includes("HttpOnly") && v.includes("SameSite=Lax") && v.includes("Secure"),
      ),
    ).toBe(true);
    expect(authCookies(req("/"), "", "", 0).every((v) => v.includes("Max-Age=0"))).toBe(true);
  });
  test("signed-in caller still cannot access a different owner's wedding", async () => {
    process.env.SUPABASE_URL = "https://database.example.test";
    process.env.SUPABASE_ANON_KEY = "anon";
    globalThis.fetch = mock(
      async (input) =>
        new Response(
          JSON.stringify(
            String(input).endsWith("/auth/v1/user")
              ? { id: "10000000-0000-4000-8000-000000000001", email: "host@example.test" }
              : [],
          ),
          { status: 200 },
        ),
    ) as typeof fetch;
    const request = new Request(
      "http://localhost:3000/api/nimantran/weddings/20000000-0000-4000-8000-000000000001",
      { headers: { cookie: "nim_access=token" } },
    );
    expect((await handleApi(request)).status).toBe(404);
  });
});
describe("Twilio signature verification (local cryptographic tests)", () => {
  test("accepts an authentic signature and rejects tampering", async () => {
    const token = "test-token";
    const url = "https://example.test/api/nimantran/webhooks/twilio";
    const fields = { MessageSid: "SM123", MessageStatus: "delivered" };
    const value = url + "MessageSidSM123MessageStatusdelivered";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(token),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"],
    );
    const signature = btoa(
      String.fromCharCode(
        ...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))),
      ),
    );
    expect(await verifyTwilio(url, fields, signature, token)).toBe(true);
    expect(await verifyTwilio(url, { ...fields, MessageStatus: "read" }, signature, token)).toBe(
      false,
    );
    expect(await verifyTwilio(url, fields, "invalid!", token)).toBe(false);
  });
  test("rejects unsigned callbacks without changing state", async () => {
    process.env.TWILIO_AUTH_TOKEN = "test-token";
    process.env.APP_ORIGIN = "http://localhost:3000";
    const response = await handleApi(
      new Request("http://localhost:3000/api/nimantran/webhooks/twilio", {
        method: "POST",
        body: "MessageSid=SM123&MessageStatus=read",
      }),
    );
    expect(response.status).toBe(403);
  });
});
