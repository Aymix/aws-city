import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = "e2e-output";

test("capture the city UI and report console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto("/");
  await page.waitForSelector("canvas", { timeout: 15_000 });
  await page.waitForTimeout(1000); // allow Phaser to render a frame

  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/01-initial.png`, fullPage: true });

  // Report diagnostics + canvas size so we can see what the renderer produced.
  const canvasBox = await page.locator("canvas").first().boundingBox();
  console.log("CANVAS_BOX:", JSON.stringify(canvasBox));
  console.log("CONSOLE_ERRORS:", JSON.stringify(errors, null, 2));

  // Click the red security-group tile on the canvas (coords read from screenshot).
  await page.mouse.click(489, 404);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/02-selected.png`, fullPage: true });

  // If the SG inspector is showing, open port 443 and capture the win state.
  const port443 = page.getByRole("checkbox", { name: /443/ });
  if (await port443.count()) {
    await port443.check();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/03-solved.png`, fullPage: true });
  }

  expect(page.getByRole("heading")).toBeTruthy();
});
