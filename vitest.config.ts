import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/*.int.test.ts"],
    projects: ["apps/*/vitest.config.ts", "packages/*/vitest.config.ts"],
    passWithNoTests: true,
  },
});
