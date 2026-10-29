// Browser integration fixture, not evidence of a hosted Supabase/Google connection.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
const root = resolve(process.env.SOCIAL_TEST_DIR ?? "/tmp/nimantran-social-fixture");
const server = createServer(async (req, res) => {
  try {
    let p = new URL(req.url, "http://localhost").pathname;
    if (p.endsWith("/")) p += "index.html";
    const file = join(root, p);
    if (!file.startsWith(root)) throw Error();
    const data = await readFile(file);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".jpg": "image/jpeg",
        ".png": "image/png",
      }[extname(file)] ?? "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(4181, "127.0.0.1", r));
const base = "http://127.0.0.1:4181";
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const host = "11000000-0000-4000-8000-000000000001",
  guest = "11000000-0000-4000-8000-000000000002";
let scenes = [],
  bookings = [],
  saved = [],
  reviewRows = [];
const failures = [];
const users = Object.fromEntries(
  [
    [host, "Test Host"],
    [guest, "Test Guest"],
  ].map(([id, name]) => [
    id,
    {
      id,
      email: id === host ? "host@example.invalid" : "guest@example.invalid",
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: "google", providers: ["google"] },
      user_metadata: { full_name: name },
      created_at: new Date().toISOString(),
    },
  ]),
);
const profile = (id) => ({
  display_name: id === host ? "Test Host" : "Test Guest",
  bio: "Board games and a friendly conversation.",
});
async function context(id) {
  const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  if (id) {
    const token =
      Buffer.from("{}").toString("base64url") +
      "." +
      Buffer.from(
        JSON.stringify({
          sub: id,
          role: "authenticated",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url") +
      ".fixture";
    await c.addInitScript(
      ({ id, token, user }) => {
        if (location.protocol !== "http:") return;
        sessionStorage.setItem(
          "nimantran-social-auth",
          JSON.stringify({
            access_token: token,
            refresh_token: "fixture-refresh",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user,
          }),
        );
      },
      { id, token, user: users[id] },
    );
  }
  await c.route("https://www.clarity.ms/**", (r) => r.abort());
  await c.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await c.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await c.route("https://tile.openstreetmap.org/**", (r) => r.abort());
  await c.route("https://social-fixture.supabase.co/**", async (r) => {
    const req = r.request(),
      u = new URL(req.url());
    let body = {};
    try {
      body = req.postDataJSON() ?? {};
    } catch {}
    const name = u.pathname.split("/").at(-1);
    let data = [];
    let status = 200;
    if (u.pathname === "/auth/v1/authorize") {
      data = { message: "OAuth intercepted by test" };
    } else if (u.pathname === "/auth/v1/token") {
      assert.equal(body.auth_code, "fixture-google-code");
      assert.ok(body.code_verifier?.length > 20);
      id = guest;
      const token =
        Buffer.from("{}").toString("base64url") +
        "." +
        Buffer.from(
          JSON.stringify({
            sub: id,
            role: "authenticated",
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        ).toString("base64url") +
        ".fixture";
      data = {
        access_token: token,
        refresh_token: "oauth-fixture-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user: users[id],
      };
    } else if (u.pathname === "/auth/v1/user") data = users[id] ?? {};
    else if (name === "social_events")
      data = scenes.map((e) => ({
        ...e,
        confirmed_count: bookings.filter(
          (x) => x.event_id === e.id && ["confirmed", "checked_in"].includes(x.status),
        ).length,
      }));
    else if (name === "social_profiles") data = [profile(id)];
    else if (name === "social_accounts") data = [{ dob: "1994-01-01" }];
    else if (name === "social_venues")
      data =
        id === host ||
        bookings.some((x) => x.user_id === id && ["confirmed", "checked_in"].includes(x.status))
          ? scenes.map((e) => ({ event_id: e.id, address: "Fixture private venue, Gurgaon" }))
          : [];
    else if (name === "social_my_bookings") data = bookings.filter((x) => x.user_id === id);
    else if (name === "social_event_guests")
      data = bookings.filter((x) => x.event_id === body.p_event);
    else if (name === "social_event_reviews") data = reviewRows;
    else if (name === "social_saved") {
      if (req.method() === "POST") {
        saved.push(body);
        data = null;
      } else if (req.method() === "DELETE") {
        saved = saved.filter((x) => x.event_id !== u.searchParams.get("event_id")?.slice(3));
        data = null;
      } else data = saved.filter((x) => x.user_id === id);
    } else if (name === "social_publish") {
      assert.equal(id, host);
      const e = body.p_data;
      assert.equal(e.city, "Gurgaon");
      assert.equal(e.price, "0");
      assert.equal(e.alcohol_free, true);
      scenes.push({
        ...e,
        id: "22000000-0000-4000-8000-000000000001",
        host_id: host,
        host_name: "Test Host",
        confirmed_count: 0,
        host_events: 0,
        rating: null,
        review_count: 0,
        status: "published",
        price: Number(e.price),
        capacity: Number(e.capacity),
        min_age: Number(e.min_age),
        max_age: null,
        lat: Number(e.lat),
        lng: Number(e.lng),
      });
      data = scenes[0].id;
    } else if (name === "social_request") {
      assert.equal(id, guest);
      assert.ok(body.p_intro.length >= 20);
      bookings.push({
        id: "33000000-0000-4000-8000-000000000001",
        event_id: body.p_event,
        user_id: id,
        status: "requested",
        created_at: new Date().toISOString(),
        guest_name: "Test Guest",
        checkin_code: null,
        introduction: body.p_intro,
        bio: profile(id).bio,
      });
      data = bookings[0].id;
    } else if (name === "social_booking_action") {
      const booking = bookings.find((x) => x.id === body.p_booking);
      assert.ok(booking);
      if (body.p_action === "approve") {
        assert.equal(id, host);
        booking.status = "confirmed";
        booking.checkin_code = "44000000-0000-4000-8000-000000000001";
      } else if (body.p_action === "checkin") {
        assert.equal(body.p_code, booking.checkin_code);
        booking.status = "checked_in";
      } else if (body.p_action === "cancel") booking.status = "cancelled";
      data = null;
    } else if (name === "social_review") {
      reviewRows.push({
        id: "review",
        event_id: body.p_event,
        user_id: id,
        rating: body.p_rating,
        body: body.p_body,
        created_at: new Date().toISOString(),
        guest_name: "Test Guest",
        host_reply: null,
      });
      data = null;
    } else if (name === "social_profile") {
      assert.equal(body.p_name, "Updated Guest");
      data = null;
    } else {
      status = 404;
      data = { message: "Unhandled fixture " + name };
      failures.push("Unhandled fixture " + name);
    }
    await r.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  c.on("page", (p) => p.on("pageerror", (e) => failures.push(e.message)));
  return c;
}
try {
  const anon = await context();
  const a = await anon.newPage();
  await a.goto(base);
  await a.getByRole("heading", { name: /Go out/ }).waitFor();
  assert.equal(
    await a
      .locator('img[src="/social/rooftop.jpg"]')
      .evaluate((e) => e.complete && e.naturalWidth > 0),
    true,
  );
  assert.equal(await a.locator(".category-card .category-art").count(), 6);
  assert.equal(
    await a.getByText(/Gurgaon first|concept preview|illustrative attendance/i).count(),
    0,
  );
  await a.getByRole("button", { name: "Find my scene" }).click();
  await a.getByRole("button", { name: /Khel Khel Mein/ }).click();
  await a.getByRole("heading", { name: "Your next good plan starts here." }).waitFor();
  assert.equal(await a.locator(".event-card").count(), 0);
  await a.getByRole("button", { name: "Filters", exact: true }).click();
  await a.getByLabel("Language", { exact: true }).selectOption("Hindi");
  await a.getByLabel("Time of day").selectOption("night");
  await a.getByLabel("Places available").check();
  await a.getByRole("button", { name: "Reset filters" }).click();
  await a.getByRole("button", { name: "Map", exact: true }).click();
  await a.getByRole("button", { name: "Zoom in" }).click();
  await a.getByRole("button", { name: "Show Delhi NCR" }).click();
  assert.equal(await a.locator(".map-price").count(), 0);
  await a.setViewportSize({ width: 390, height: 844 });
  assert.equal(await a.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await anon.close();
  console.log(
    "PASS real empty catalogue, category art, extra filters, map controls, mobile overflow",
  );
  const oauth = await context();
  const o = await oauth.newPage();
  await o.goto(base);
  await o.getByRole("button", { name: "Sign in", exact: true }).click();
  await o.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await o.waitForURL((url) => url.hostname === "social-fixture.supabase.co");
  const authUrl = new URL(o.url());
  assert.equal(authUrl.searchParams.get("provider"), "google");
  assert.equal(authUrl.searchParams.get("redirect_to"), base + "/auth/");
  assert.ok(authUrl.searchParams.get("code_challenge"));
  await o.goto(base + "/auth/?code=fixture-google-code");
  await o.waitForURL(base + "/#profile");
  await o.getByRole("heading", { name: "A little hello." }).waitFor();
  await oauth.close();
  const fallback = await context();
  const fallbackPage = await fallback.newPage();
  await fallbackPage.goto(base);
  await fallbackPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await fallbackPage.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await fallbackPage.waitForURL((url) => url.hostname === "social-fixture.supabase.co");
  await fallbackPage.goto(base + "/?code=fixture-google-code");
  await fallbackPage.waitForURL(base + "/#profile");
  await fallback.close();
  const cancelled = await context();
  const cancelledPage = await cancelled.newPage();
  await cancelledPage.goto(
    base + "/#error=access_denied&error_description=Google+sign-in+was+cancelled",
  );
  await cancelledPage.getByText("Google sign-in was cancelled", { exact: true }).waitFor();
  assert.equal(new URL(cancelledPage.url()).search, "");
  await cancelled.close();
  console.log(
    "PASS Google OAuth authorize, PKCE exchange, verified-user return, cancellation feedback and callback URL cleanup",
  );
  const hc = await context(host);
  const h = await hc.newPage();
  await h.goto(base + "/#host");
  await h.getByRole("button", { name: "Publish my gathering" }).count();
  await h.getByLabel("Give your gathering a name").fill("Sunday games with new friends");
  await h
    .getByLabel("What’s the plan, and who would enjoy it?")
    .fill(
      "A welcoming afternoon of board games and friendly introductions. Beginners are welcome and every rule will be explained.",
    );
  await h.getByRole("button", { name: "Next: the details" }).click();
  const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  assert.equal(await h.locator('input[type="date"]').count(), 1);
  assert.equal(await h.locator('input[type="datetime-local"]').count(), 0);
  await h.getByLabel("Event date", { exact: true }).fill(date);
  await h.getByLabel("Start time · IST").fill("16:00");
  await h.getByLabel("End time · IST").fill("19:00");
  await h.getByLabel("Neighbourhood", { exact: true }).fill("Sector 29");
  await h.getByLabel("Exact venue address").fill("Fixture private venue, Gurgaon");
  await h
    .getByLabel("Venue accessibility")
    .fill("Ground floor, seated activity, step-free entrance.");
  await h.getByRole("button", { name: "Next: the welcome" }).click();
  await h.getByLabel("Food included").fill("Vegetarian snacks");
  await h.getByLabel("Drinks included").fill("Water and one soft drink");
  await h.getByLabel("Other inclusions").fill("Hosted board games and equipment");
  await h.getByLabel("What costs extra?").fill("Additional café orders");
  await h.getByText("House rules, cancellations & what to bring", { exact: true }).click();
  await h
    .getByLabel("House rules", { exact: true })
    .fill("Respect personal boundaries. Ask before taking photos.");
  await h
    .getByLabel("Cancellation terms")
    .fill("Please cancel at least 24 hours before the event.");
  await h.getByLabel("I have permission to host").check();
  await h.getByRole("button", { name: "Publish my gathering" }).click();
  await h.getByText("Your gathering is published.").waitFor();
  assert.equal(scenes.length, 1);
  await h.getByRole("button", { name: "Close dialog" }).click();
  console.log("PASS host three-step publication and exact inclusions");
  const gc = await context(guest);
  const g = await gc.newPage();
  await g.goto(base + "/#explore");
  await g.getByRole("button", { name: "Sunday games with new friends", exact: true }).click();
  await g.getByRole("button", { name: "Request to join", exact: true }).click();
  await g
    .getByLabel("Say a little hello")
    .fill("I just moved to Gurgaon and would love to learn a board game and meet new people.");
  await g.getByLabel("I meet the event").check();
  await g.getByRole("button", { name: "Send join request" }).click();
  await g.getByText("Introduction sent.").waitFor();
  await g.getByRole("button", { name: "Close dialog" }).click();
  await g.getByRole("button", { name: "My plans", exact: true }).click();
  await g.getByText("Your host is reviewing your introduction.").waitFor();
  assert.equal(await g.getByRole("button", { name: "Open my Nimantran" }).count(), 0);
  console.log("PASS guest introduction, pending approval, no premature ticket");
  await h.reload();
  await h.getByRole("button", { name: "Manage guests" }).click();
  await h.getByText("I just moved to Gurgaon and would love").waitFor();
  await h.getByRole("button", { name: "Approve", exact: true }).click();
  await h.getByText("Guest confirmed.").waitFor();
  await g.getByRole("button", { name: "Refresh bookings" }).click();
  await g.getByText("Fixture private venue, Gurgaon").waitFor();
  await g.getByRole("button", { name: "Open my Nimantran" }).click();
  await g.getByText("YOUR INVITATION IS CONFIRMED").waitFor();
  const download = g.waitForEvent("download");
  await g.getByRole("button", { name: "Download invitation" }).click();
  const file = await download;
  assert.equal(file.suggestedFilename(), "my-nimantran-ticket.svg");
  await file.saveAs("/tmp/nimantran-social-confirmed-ticket.svg");
  console.log("PASS cross-context approval refresh, private address, themed SVG ticket download");
  await g.getByRole("button", { name: "Close dialog" }).click();
  await h.getByLabel("Guest’s check-in code").fill("44000000-0000-4000-8000-000000000001");
  await h.getByRole("button", { name: "Check in", exact: true }).click();
  await h.getByText("Guest checked in.").waitFor();
  scenes[0].starts_at = new Date(Date.now() - 7200000).toISOString();
  scenes[0].ends_at = new Date(Date.now() - 3600000).toISOString();
  await g.reload();
  await g.getByRole("button", { name: "Leave a review" }).click();
  await g
    .getByLabel("Tell future guests")
    .fill("A warm welcome and well explained games. I felt comfortable coming alone.");
  await g.getByRole("button", { name: "Post review" }).click();
  await g.getByText("Your attendance-backed review is posted.").waitFor();
  assert.equal(reviewRows.length, 1);
  console.log("PASS check-in, completed-event review flow");
  assert.deepEqual(failures, []);
  await hc.close();
  await gc.close();
  console.log(
    "Social browser checks passed. HTTP fixture only; real Google and hosted sync still require acceptance testing.",
  );
} finally {
  await b.close();
  await new Promise((r) => server.close(r));
}
