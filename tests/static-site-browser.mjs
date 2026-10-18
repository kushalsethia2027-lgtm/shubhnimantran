import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4173";
  await page.goto(base + "/");
  await page.getByRole("heading", { name: /Every guest gets a personal invitation/ }).waitFor();
  for (const name of [
    "Three steps, one recording",
    "Choose your parivaar",
    "Questions families ask",
  ])
    assert.equal(await page.getByRole("heading", { name, exact: true }).count(), 1);
  await page
    .getByRole("heading", { name: "Two families. One beautiful plan.", exact: false })
    .waitFor();
  await page.getByRole("tab", { name: "Arrivals", exact: true }).click();
  await page.getByRole("tabpanel").getByText("Pickup needed", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Logistics", exact: true }).click();
  await page
    .getByRole("tabpanel")
    .getByText("Family guest house · 4 rooms", { exact: true })
    .waitFor();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page.getByText("Illustrative sample data.", { exact: false }).waitFor();
  const video = page.getByLabel("Aarav and Meera wedding invitation sample video with sound");
  assert.equal(await video.getAttribute("controls"), "");
  await video.scrollIntoViewIfNeeded();
  await video.evaluate(async (element) => {
    await element.play();
    element.pause();
  });
  assert.ok((await video.getAttribute("src")).endsWith(".mp4"));
  assert.equal(
    await page.getByRole("button", { name: "Join the waitlist", exact: true }).last().isEnabled(),
    true,
  );
  assert.equal(
    await page
      .locator("form")
      .getByRole("button", { name: "Join the waitlist", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await page.waitForURL(/\/product\/?$/);
  await page.reload();
  await page.getByRole("link", { name: "Join the waitlist", exact: true }).click();
  await page.getByRole("heading", { name: /Every guest gets a personal invitation/ }).waitFor();
  await page.getByRole("link", { name: "Try demo · download your video", exact: true }).click();
  await page.waitForURL(/\/demo\/?$/);
  await page.getByRole("heading", { name: "An invitation worth keeping.", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "An invitation worth keeping.", exact: true }).waitFor();
  await page.getByRole("link", { name: "Nimantran", exact: true }).click();
  await page.getByRole("heading", { name: /Every guest gets a personal invitation/ }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  const privateRequests = [];
  page.on("request", (r) => {
    if (r.url().includes(".supabase.co")) privateRequests.push(r.url());
  });
  await page.getByRole("link", { name: "Guest & Travel Planner", exact: true }).click();
  await page
    .getByRole("heading", { name: "Connect Guest & Travel Planner", exact: true })
    .waitFor();
  await page.getByText("Shared planning is not connected.", { exact: false }).waitFor();
  assert.deepEqual(privateRequests, []);
  await page.getByRole("link", { name: "Nimantran", exact: true }).click();
  await page.screenshot({ path: "/tmp/nimantran-restored-home.png", fullPage: true });
  console.log(
    "PASS: original landing sections and playable bundled MP4; static waitlist is honest; homepage → product → home → studio → home; direct page reloads; unconfigured planner setup without private requests; mobile layout",
  );
} finally {
  await browser.close();
}
