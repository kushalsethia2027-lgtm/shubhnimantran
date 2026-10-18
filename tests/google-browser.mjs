// OAuth HTTP fixture only: no request to Google or a real Supabase project.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4174";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const user = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "google-fixture@example.invalid",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "google", providers: ["google"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const access =
  Buffer.from("{}").toString("base64url") +
  "." +
  Buffer.from(
    JSON.stringify({
      sub: user.id,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url") +
  ".fixture";
try {
  for (const destination of ["/planner/", "/demo/"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const requests = [];
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await context.route("https://planner-fixture.supabase.co/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      requests.push({ url, body: request.postDataJSON?.bind(request) });
      const respond = (data) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
      if (url.pathname.endsWith("/authorize"))
        return route.fulfill({
          contentType: "text/html",
          body: "<h1>Google authorization fixture</h1>",
        });
      if (url.pathname.endsWith("/token")) {
        assert.equal(url.searchParams.get("grant_type"), "pkce");
        assert.ok(request.postDataJSON().code_verifier);
        return respond({
          access_token: access,
          refresh_token: "fixture-refresh",
          expires_in: 3600,
          token_type: "bearer",
          user,
        });
      }
      if (url.pathname.endsWith("/user")) return respond(user);
      if (url.pathname.endsWith("/planner_workspaces")) return respond([]);
      throw new Error("Unexpected fixture request " + url.pathname);
    });
    await page.goto(
      base + destination + (destination === "/planner/" ? "#invite=private-fixture-invite" : ""),
    );
    await page.getByRole("button", { name: "Sign in with Google", exact: true }).click();
    await page.waitForURL(/planner-fixture.supabase.co\/auth\/v1\/authorize/);
    const authorize = requests.find((r) => r.url.pathname.endsWith("/authorize")).url;
    assert.equal(authorize.searchParams.get("provider"), "google");
    assert.equal(authorize.searchParams.get("redirect_to"), base + "/auth/");
    assert.equal(authorize.searchParams.get("code_challenge_method"), "s256");
    assert.ok(authorize.searchParams.get("code_challenge"));
    await page.goto(base + "/auth/?code=fixture-code");
    await page.waitForURL(base + destination);
    if (destination === "/planner/") {
      await page
        .getByRole("heading", { name: "Join your family’s workspace", exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(() => sessionStorage.getItem("nimantran-pending-planner-invite")),
        "private-fixture-invite",
      );
      assert.equal(new URL(page.url()).hash, "");
      assert.equal(await page.getByLabel("Email", { exact: true }).count(), 0);
      await page.goto(base + "/demo/");
      await page
        .getByRole("heading", { name: "Welcome, google-fixture@example.invalid", exact: true })
        .waitFor();
    } else {
      await page
        .getByRole("heading", { name: "Welcome, google-fixture@example.invalid", exact: true })
        .waitFor();
      await page
        .getByRole("heading", { name: "An invitation worth keeping.", exact: true })
        .waitFor();
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  const page = await browser.newPage();
  await page.goto(base + "/auth/?error=access_denied");
  await page.getByRole("alert").filter({ hasText: "cancelled" }).waitFor();
  console.log(
    "PASS Google OAuth fixture: provider URL, PKCE challenge/exchange, verified-user fetch, planner return, invitation survives redirect, video return and Google identity, cancellation error. Live Google consent not tested.",
  );
} finally {
  await browser.close();
}
