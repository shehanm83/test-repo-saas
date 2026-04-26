import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineProject } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineProject({
  resolve: {
    alias: {
      "@": dirname,
    },
  },
  test: {
    name: "web",
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
