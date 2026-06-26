import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "web",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    // Unit/component tests live under test/. Playwright e2e specs live under
    // e2e/ and must NOT be collected by Vitest (they run in a real browser).
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
  },
});
