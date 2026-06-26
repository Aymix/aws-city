import { defineWorkspace } from "vitest/config";

// Each package/app is a Vitest project. Domain/application/etc. run in a Node
// environment (pure logic, no DOM); the web app runs in jsdom for React tests.
export default defineWorkspace([
  {
    test: {
      name: "domain",
      root: "./packages/domain",
      environment: "node",
    },
  },
  {
    test: {
      name: "application",
      root: "./packages/application",
      environment: "node",
    },
  },
  {
    test: {
      name: "adapters",
      root: "./packages/adapters",
      environment: "node",
    },
  },
  {
    test: {
      name: "content",
      root: "./packages/content",
      environment: "node",
    },
  },
  "./apps/web/vitest.config.ts",
]);
