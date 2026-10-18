// Optional, fixture-only screenshots for the public product walkthrough.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
export async function captureWalkthrough(page, name, focus) {
  const directory = process.env.WALKTHROUGH_CAPTURE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  if (focus) {
    await focus.scrollIntoViewIfNeeded();
    const box = await focus.boundingBox();
    if (box) await page.evaluate((y) => window.scrollBy(0, y - 72), box.y);
  }
  await page.screenshot({ path: join(directory, name + ".png"), animations: "disabled" });
}
export const walkthroughViewport = process.env.WALKTHROUGH_CAPTURE_DIR
  ? { width: 1200, height: 760 }
  : { width: 390, height: 844 };
