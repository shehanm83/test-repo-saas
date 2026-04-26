import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "storage-integration",
    globals: true,
    environment: "node",
    include: ["src/**/*.int.test.ts"],
  },
});
