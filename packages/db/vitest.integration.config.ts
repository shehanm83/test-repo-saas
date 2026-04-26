import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "db-integration",
    globals: true,
    environment: "node",
    include: ["src/**/*.int.test.ts"],
  },
});
