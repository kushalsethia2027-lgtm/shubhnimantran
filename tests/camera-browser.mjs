import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  const requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("/api/nimantran/")) requests.push(r.url());
  });
  await page.goto(
    (process.env.TEST_BASE_URL ?? "http://127.0.0.1:4173") + (process.env.TEST_DEMO_PATH ?? "/"),
  );
  await page.getByRole("heading", { name: "An invitation worth keeping." }).waitFor();
  const step = async (i) =>
    page.getByRole("navigation", { name: "Demo steps" }).getByRole("button").nth(i).click();
  await step(2);
  await page.getByRole("button", { name: "Create personalised scripts", exact: true }).click();
  await page.getByRole("button", { name: "Approve Rajesh’s script", exact: true }).click();
  await step(3);
  // Simulate an explicit permission denial, then restore the real test device.
  await page.evaluate(() => {
    window.__testMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.getByRole("button", { name: "Enable camera & microphone", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Camera/microphone permission was denied" })
    .waitFor();
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = window.__testMedia;
    delete window.__testMedia;
  });
  await page.getByRole("button", { name: "Enable camera & microphone", exact: true }).click();
  await page.getByRole("button", { name: "Start video recording", exact: true }).waitFor();
  const live = page.getByLabel("Live camera preview");
  await live.evaluate(async (video) => {
    if (video.readyState < 1)
      await new Promise((resolve) =>
        video.addEventListener("loadedmetadata", resolve, { once: true }),
      );
  });
  await page.getByRole("button", { name: "Start video recording", exact: true }).click();
  await page.waitForFunction(
    () =>
      Number(
        document
          .querySelector('[aria-label="Video recording duration"]')
          ?.textContent?.split(":")[1],
      ) >= 4,
    null,
    { timeout: 10000 },
  );
  await page.getByRole("button", { name: "Stop video recording", exact: true }).click();
  await page.getByText("Personal camera recording for Rajesh", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Live camera preview").count(), 0);
  const camera = page.getByLabel("Personal camera recording preview");
  const cameraMetadata = await camera.evaluate(async (video) => {
    if (video.readyState < 1)
      await new Promise((resolve) =>
        video.addEventListener("loadedmetadata", resolve, { once: true }),
      );
    return { width: video.videoWidth, height: video.videoHeight };
  });
  assert.ok(cameraMetadata.width > 0 && cameraMetadata.height > 0);
  const [original] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("link", { name: "Download this guest’s original recording", exact: true })
      .click(),
  ]);
  await original.saveAs(
    "/tmp/Nimantran-original-camera." + original.suggestedFilename().split(".").pop(),
  );
  const permission = page.getByRole("checkbox", { name: /I have permission to use this audio/ });
  assert.equal(await permission.isChecked(), false);
  await permission.check();
  await page.getByRole("combobox", { name: "Script to read", exact: true }).selectOption("mausi");
  await page.getByText("No recording for this guest.", { exact: false }).waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Download this guest’s original recording", exact: true })
      .count(),
    0,
  );
  await page.getByRole("combobox", { name: "Script to read", exact: true }).selectOption("mama");
  await page.getByText("Personal camera recording for Rajesh", { exact: true }).waitFor();
  assert.equal(await permission.isChecked(), true);
  // Recreating drafts must preserve reviewed wording, approvals and the recorded take.
  await step(2);
  await page.getByRole("button", { name: "Create personalised scripts", exact: true }).click();
  await page.getByRole("button", { name: "Reopen Rajesh’s script", exact: true }).waitFor();
  // Saving unchanged wedding fields also must not invalidate the recording.
  await step(0);
  await page.getByRole("button", { name: "Save wedding & continue", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await page.getByRole("button", { name: "Save guest", exact: true }).click();
  await step(4);
  await page.getByLabel("Recording used for final video").waitFor();
  await page.getByRole("button", { name: "Generate downloadable video", exact: true }).click();
  await page
    .getByRole("heading", { name: "Your generated invitation", exact: true })
    .waitFor({ timeout: 25000 });
  const metadata = await page
    .getByLabel("Generated personal invitation video")
    .evaluate(async (video) => {
      if (video.readyState < 1)
        await new Promise((resolve) =>
          video.addEventListener("loadedmetadata", resolve, { once: true }),
        );
      return { width: video.videoWidth, height: video.videoHeight, duration: video.duration };
    });
  assert.equal(metadata.width, 540);
  assert.equal(metadata.height, 960);
  assert.ok(metadata.duration >= 3 && metadata.duration < 8, JSON.stringify(metadata));
  const [generated] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download generated video", exact: true }).click(),
  ]);
  await generated.saveAs(
    "/tmp/Nimantran-camera-invitation." + generated.suggestedFilename().split(".").pop(),
  );
  console.log("CAMERA INVITATION", JSON.stringify(metadata));
  await page.screenshot({ path: "/tmp/nimantran-camera-mobile.png", fullPage: true });
  await step(2);
  await page
    .getByRole("textbox", { name: "Invitation wording for Rajesh", exact: true })
    .fill("Updated words require a new recording.");
  await page.getByRole("button", { name: "Approve Rajesh’s script", exact: true }).click();
  await step(4);
  assert.equal(
    await page
      .getByRole("button", { name: "Generate downloadable video", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByText("This guest’s details or script changed. Re-record", { exact: false })
    .waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  console.log(
    "PASS: permission denial/recovery; real camera+microphone recording with synthetic devices; original clip download; guest isolation and return; consent; branded camera invitation render with audio; edited-script invalidation; 390px layout; no provider calls",
  );
} finally {
  await browser.close();
}
