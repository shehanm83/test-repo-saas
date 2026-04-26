import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "billing-integration",
    globals: true,
    environment: "node",
    include: ["src/**/*.int.test.ts"],
  },
});
