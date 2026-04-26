import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "auth",
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
