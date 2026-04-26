import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "renderer",
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: [],
  },
});
