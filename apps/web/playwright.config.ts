import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-output/results",
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1280, height: 800 },
    browserName: "chromium",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
