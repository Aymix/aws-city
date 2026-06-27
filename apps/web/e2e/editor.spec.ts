import { parseShareUrl } from "@aws-city/application";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = "e2e-output";

test("sandbox editor: build, share, and restore from the link", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sandbox" }).click();
  await page.waitForSelector("canvas");

  // Build two top-level services.
  await page.getByRole("button", { name: "+ vpc" }).click();
  await page.getByRole("button", { name: "+ internet-gateway" }).click();
  await page.waitForTimeout(300);

  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/04-editor.png`, fullPage: true });

  // Create a share link and verify it encodes both buildings.
  await page.getByRole("button", { name: "Create share link" }).click();
  const shareUrl = await page.getByLabel("share-url").inputValue();
  expect(shareUrl).toContain("#city=");
  const decoded = parseShareUrl(shareUrl);
  expect(decoded?.services).toHaveLength(2);

  // Restore from the link in a fresh load.
  await page.goto(shareUrl);
  await page.getByRole("button", { name: "Sandbox" }).click();
  await page.getByRole("button", { name: "Create share link" }).click();
  const restored = parseShareUrl(await page.getByLabel("share-url").inputValue());
  expect(restored?.services.map((s) => s.kind).sort()).toEqual(["internet-gateway", "vpc"]);
});
