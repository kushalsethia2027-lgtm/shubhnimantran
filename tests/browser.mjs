// Public-flow browser checks use the real local server. Authenticated UI checks
// below use an explicitly labelled API fixture, NOT a live Supabase integration.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.setDefaultTimeout(10000);
try {
  const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
  await page.goto(base + "/");
  await page.getByRole("heading", { name: /Every guest gets/ }).waitFor();
  assert.equal(await page.locator("video[controls]").count(), 1);
  assert.equal(await page.locator("input[name=email]").count(), 1);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByText("Development mode · Account").waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Email me a sign-in code" }).isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Switch navigation language" }).click();
  await page.getByRole("heading", { name: "शुभ शुरुआत" }).waitFor();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  console.log(
    "PASS: real-server public landing, native video, complete waitlist fields, unavailable-auth state, Hindi navigation, 390px layout",
  );
  const wid = "10000000-0000-4000-8000-000000000001";
  const eid = "20000000-0000-4000-8000-000000000001";
  const wedding = {
    id: wid,
    bride: "Meera",
    groom: "Aarav",
    wedding_date: "2027-02-10",
    city: "Jaipur",
    venue: "Home",
    rsvp_contact: "Host",
    plan: "small",
    notes: "",
    tone: "warm",
    template: "maroon",
    created_at: new Date().toISOString(),
  };
  const workspace = {
    wedding,
    events: [{ id: eid, name: "Wedding", date: "2027-02-10", venue: "Home" }],
    guests: [],
    scripts: [],
    voices: [],
    jobs: [],
  };
  await page.route("**/api/nimantran/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let result = {};
    if (url.pathname.endsWith("/status"))
      result = {
        database: true,
        scripts: false,
        voice: false,
        rendering: false,
        delivery: false,
        productionEnabled: false,
        support: null,
      };
    else if (url.pathname.endsWith("/me"))
      result = { id: "ui-fixture-owner", email: "fixture@example.test" };
    else if (url.pathname.endsWith("/weddings")) result = [wedding];
    else if (url.pathname.endsWith("/guests") && request.method() === "POST") {
      const input = request.postDataJSON();
      workspace.guests.push(
        ...input.map((g) => ({ ...g, id: crypto.randomUUID(), opted_out: false })),
      );
      result = { saved: input.length };
    } else if (url.pathname.endsWith("/scripts") && request.method() === "POST") {
      const input = request.postDataJSON();
      const found = workspace.scripts.find((s) => s.guest_id === input.guest_id);
      if (found) {
        Object.assign(found, {
          body: input.body,
          revision: input.action === "edited" ? found.revision + 1 : found.revision,
          sample: input.sample,
          approved_at: input.action === "approved" ? new Date().toISOString() : null,
        });
      } else
        workspace.scripts.push({
          id: crypto.randomUUID(),
          guest_id: input.guest_id,
          body: input.body,
          pronunciation: input.pronunciation,
          revision: 1,
          sample: input.sample,
          approved_at: null,
          source: "manual",
        });
      result = { saved: true };
    } else if (url.pathname.endsWith("/voices") && request.method() === "POST") {
      const form = await new Response(request.postDataBuffer(), {
        headers: { "Content-Type": request.headers()["content-type"] },
      }).formData();
      assert.equal(form.get("consent"), "true");
      assert.equal(Number(form.get("duration")) >= 30, true);
      assert.equal(form.get("recording").size > 0, true);
      workspace.voices.push({
        id: crypto.randomUUID(),
        speaker: form.get("speaker"),
        relationship: form.get("relationship"),
        status: "stored",
        consent_status: "active",
        provider_verified: false,
        duration: Number(form.get("duration")),
        created_at: new Date().toISOString(),
      });
      result = { id: workspace.voices[0].id, consent: "active", providerVerified: false };
    } else if (url.pathname.endsWith("/" + wid)) result = workspace;
    else throw new Error("Unexpected fixture request: " + request.method() + " " + url.pathname);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
  await page.goto(base + "/app");
  await page.getByRole("heading", { name: "Meera & Aarav" }).waitFor();
  await page.getByRole("button", { name: "Guest list", exact: true }).click();
  await page.getByRole("button", { name: "+ Add guest", exact: true }).click();
  await page.getByRole("textbox", { name: "Guest name", exact: true }).fill("Raj");
  await page.getByRole("combobox", { name: "Relationship / respectful address" }).fill("Mama ji");
  await page.getByRole("textbox", { name: "WhatsApp number" }).fill("9876543210");
  await page.getByRole("checkbox", { name: "Wedding", exact: true }).check();
  await page.getByRole("button", { name: "Save guest", exact: true }).click();
  await page.getByText("1 / 50 guests").waitFor();
  await page.getByRole("button", { name: "Scripts", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Invitation script", exact: true })
    .fill("Raj Mama ji, please join Meera and Aarav for Wedding on 2027-02-10 at Home.");
  await page.getByRole("button", { name: "Save edits", exact: true }).click();
  await page.getByRole("button", { name: "Approve wording", exact: true }).waitFor();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Approve wording", exact: true }).click();
  await page.getByText("Approved", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Voice studio", exact: true }).click();
  assert.equal(
    await page.getByRole("button", { name: "Save recording & consent" }).isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Start recording", exact: true }).click();
  await page.getByRole("button", { name: "Stop recording", exact: true }).waitFor();
  await page.waitForFunction(
    () => Number(document.querySelector('[role="timer"]')?.textContent?.split(":")[1]) >= 30,
    null,
    { timeout: 35000 },
  );
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await page.getByRole("textbox", { name: "Speaker’s full name" }).fill("Test Speaker");
  const consentBox = page.getByRole("checkbox", { name: /I am the actual speaker/ });
  await consentBox.check();
  await page.getByRole("button", { name: "Save recording & consent", exact: true }).click();
  await page.getByText("Recording and consent saved.").waitFor();
  await page.getByText("Test Speaker · Dadi", { exact: true }).waitFor();
  console.log(
    "PASS: real Chromium MediaRecorder with a synthetic test microphone: 30s recording, explicit consent gate, multipart upload to labelled API fixture, saved-voice state",
  );
  await page.getByRole("button", { name: "Delivery & tracking", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Sending unavailable" }).isDisabled(), true);
  await page.getByText("No jobs. Progress and delivery").waitFor();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.screenshot({ path: "/tmp/nimantran-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: API-fixture UI flow: dashboard, add guest, save/approve script, voice consent gate, unavailable delivery, no fake jobs, 390px layout, no browser exceptions",
  );
} finally {
  await browser.close();
}
