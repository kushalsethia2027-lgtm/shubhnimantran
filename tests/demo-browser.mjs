import { captureWalkthrough, walkthroughViewport } from "./walkthrough-capture.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});
try {
  const context = await browser.newContext({
    viewport: walkthroughViewport,
    acceptDownloads: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  const privateRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (req) => {
    if (req.url().includes("/api/nimantran/")) privateRequests.push(req.url());
  });
  await page.goto(
    (process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000") +
      (process.env.TEST_DEMO_PATH ?? "/demo"),
  );
  await page.getByRole("heading", { name: "An invitation worth keeping." }).waitFor();
  await captureWalkthrough(
    page,
    "01-wedding",
    page.getByRole("heading", { name: "Your celebration", exact: true }),
  );
  const step = async (index) =>
    page.getByRole("navigation", { name: "Demo steps" }).getByRole("button").nth(index).click();
  await step(4);
  assert.equal(
    await page
      .getByRole("button", { name: "Generate downloadable video", exact: true })
      .isDisabled(),
    true,
  );
  await step(3);
  await page.getByRole("button", { name: "Use example narration", exact: true }).click();
  await page.getByText("Bundled Aarav–Meera example narration", { exact: true }).waitFor();
  await page.getByRole("checkbox", { name: /I have permission to use this audio/ }).check();
  await step(2);
  await page.getByRole("button", { name: "Create personalised scripts", exact: true }).click();
  for (const name of ["Rajesh", "Sunita", "Rohan"])
    await page.getByRole("button", { name: `Approve ${name}’s script`, exact: true }).click();
  await page.getByText("3 / 3 guest scripts approved.", { exact: false }).waitFor();
  await page.reload();
  await step(2);
  await page.getByText("3 / 3 guest scripts approved.", { exact: false }).waitFor();
  // Browser metadata persists, while audio deliberately does not survive a refresh.
  await step(4);
  assert.equal(
    await page
      .getByRole("button", { name: "Generate downloadable video", exact: true })
      .isDisabled(),
    true,
  );
  await step(3);
  await page.getByRole("button", { name: "Use example narration", exact: true }).click();
  await page.getByText("Bundled Aarav–Meera example narration", { exact: true }).waitFor();
  await page.getByRole("checkbox", { name: /I have permission to use this audio/ }).check();
  await step(4);
  await page.getByRole("button", { name: "Generate downloadable video", exact: true }).click();
  await page.getByRole("button", { name: "Rendering your video…", exact: true }).waitFor();
  await page
    .getByRole("heading", { name: "Your generated invitation", exact: true })
    .waitFor({ timeout: 65000 });
  await captureWalkthrough(
    page,
    "03-download",
    page.getByRole("heading", { name: "Your generated invitation", exact: true }),
  );
  const metadata = await page
    .locator('video[aria-label="Generated personal invitation video"]')
    .evaluate(async (video) => {
      if (video.readyState < 1)
        await new Promise((resolve) =>
          video.addEventListener("loadedmetadata", resolve, { once: true }),
        );
      return { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
    });
  assert.equal(metadata.width, 540);
  assert.equal(metadata.height, 960);
  assert.ok(metadata.duration >= 18 && metadata.duration < 30, JSON.stringify(metadata));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download generated video", exact: true }).click(),
  ]);
  const file = `/tmp/${download.suggestedFilename()}`;
  await download.saveAs(file);
  console.log("DOWNLOADED", file, JSON.stringify(metadata));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: "/tmp/nimantran-demo-mobile.png", fullPage: true });
  assert.deepEqual(privateRequests, []);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: no-login real browser flow, actual local scripts and approvals, local draft restoration, audio privacy reset, real browser video generation and download, 390px layout, zero Supabase/provider calls",
  );
  // Editing an approved script invalidates approval and blocks another render.
  await step(2);
  await page
    .getByRole("textbox", { name: "Invitation wording for Rajesh", exact: true })
    .fill(
      "Namaste Rajesh Mama ji! Meera aur Aarav ki shaadi mein aapka dil se swagat hai. Zaroor aaiyega!",
    );
  await step(4);
  assert.equal(
    await page
      .getByRole("button", { name: "Generate downloadable video", exact: true })
      .isDisabled(),
    true,
  );
  console.log("PASS: editing approved wording blocks further rendering until reapproved");
  await step(2);
  await page.getByRole("button", { name: "Approve Rajesh’s script", exact: true }).click();
  await step(3);
  await page.getByRole("button", { name: "Record my voice", exact: true }).click();
  await page.waitForFunction(
    () => Number(document.querySelector('[role="timer"]')?.textContent?.split(":")[1]) >= 4,
    null,
    { timeout: 10000 },
  );
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await page.getByText("Your recorded voice", { exact: true }).waitFor();
  const permission = page.getByRole("checkbox", { name: /I have permission to use this audio/ });
  assert.equal(await permission.isChecked(), false);
  await permission.check();
  await captureWalkthrough(
    page,
    "02-record",
    page.getByRole("combobox", { name: "Script to read", exact: true }),
  );
  await step(4);
  await page.getByRole("button", { name: "Generate downloadable video", exact: true }).click();
  await page.getByRole("button", { name: "Cancel rendering", exact: true }).click();
  await page.getByRole("button", { name: "Generate downloadable video", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Download generated video", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "Generate downloadable video", exact: true }).click();
  await page
    .getByRole("heading", { name: "Your generated invitation", exact: true })
    .waitFor({ timeout: 25000 });
  const [recordedDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download generated video", exact: true }).click(),
  ]);
  const extension = recordedDownload.suggestedFilename().split(".").pop();
  await recordedDownload.saveAs(`/tmp/Nimantran-recorded-voice.${extension}`);
  assert.deepEqual(privateRequests, []);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: actual browser microphone recording with synthetic test input, fresh consent, render cancellation, successful re-render and direct video download",
  );
} finally {
  await browser.close();
}
