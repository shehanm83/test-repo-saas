import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/billing/vitest.integration.config.ts",
      "packages/db/vitest.integration.config.ts",
      "packages/storage/vitest.integration.config.ts",
      "apps/worker/vitest.integration.config.ts",
    ],
  },
});
