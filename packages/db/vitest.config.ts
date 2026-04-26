import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "db",
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.int.test.ts"],
    setupFiles: [],
  },
});
