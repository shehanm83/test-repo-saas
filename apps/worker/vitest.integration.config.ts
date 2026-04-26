import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "worker-integration",
    globals: true,
    environment: "node",
    include: ["src/**/*.int.test.ts"],
  },
});
