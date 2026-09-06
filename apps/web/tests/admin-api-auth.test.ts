import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ADMIN_API_DIR = join(TEST_DIR, "../app/api/admin");

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

describe("admin API authorization", () => {
  it("requires an explicit admin-role check in every route module", () => {
    const unprotected = routeFiles(ADMIN_API_DIR)
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return (
          !source.includes("getAdminSessionWorkspace") &&
          !source.includes('role !== "admin"') &&
          !source.includes('role === "admin"')
        );
      })
      .map((path) => path.replace(`${ADMIN_API_DIR}/`, ""));

    expect(unprotected).toEqual([]);
  });
});
