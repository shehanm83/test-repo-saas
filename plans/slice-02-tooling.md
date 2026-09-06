# Slice 02 — Tooling (lint, format, test)

**Phase:** 0 — Foundation
**Depends on:** 01

**Definition of done:**
- ESLint configured with TypeScript + import-order rules; `pnpm lint` runs clean across all packages
- Prettier configured; `pnpm format` formats consistently
- Vitest configured at root with two profiles: `unit` and `integration`
- Playwright installed (configured fully in slice 50)
- Each package has `lint` and `test` scripts
- `pnpm test:unit` runs (zero tests defined — passes trivially)

---

## Files

**Create:**
- `eslint.config.mjs` (flat config)
- `.prettierrc.json`
- `.prettierignore`
- `vitest.config.ts`
- `vitest.workspace.ts`
- `apps/web/vitest.config.ts`
- `apps/worker/vitest.config.ts`
- `packages/db/vitest.config.ts`
- `packages/shared/vitest.config.ts`
- `packages/gateway/vitest.config.ts`
- `packages/renderer/vitest.config.ts`

**Modify:**
- Root `package.json` — add tooling devDependencies, scripts
- Each package `package.json` — add `lint` + `test` scripts

---

## Tasks

- [ ] **Step 1 — Add tooling devDependencies**

```bash
pnpm add -Dw \
  eslint \
  @eslint/js \
  typescript-eslint \
  eslint-plugin-import \
  eslint-config-prettier \
  prettier \
  vitest \
  @vitest/coverage-v8 \
  @playwright/test
```

- [ ] **Step 2 — Create `eslint.config.mjs`**

```js
import js from "@eslint/js";
import ts from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { import: importPlugin },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc" },
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: ["**/dist/**", "**/.next/**", "**/.open-next/**", "**/node_modules/**", "**/coverage/**"],
  },
  prettier,
);
```

- [ ] **Step 3 — Create `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- [ ] **Step 4 — Create `.prettierignore`**

```
node_modules
dist
.next
.open-next
coverage
pnpm-lock.yaml
*.tsbuildinfo
```

- [ ] **Step 5 — Create root `vitest.workspace.ts`**

```ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "apps/*/vitest.config.ts",
  "packages/*/vitest.config.ts",
]);
```

- [ ] **Step 6 — Create per-package `vitest.config.ts` (copy to all 6 packages)**

Template (replace `<NAME>` with the package name):

```ts
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "<NAME>",
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: [],
  },
});
```

For `apps/web/vitest.config.ts` use `environment: "jsdom"` instead of `node`. (Component tests added in slice 35.)

- [ ] **Step 7 — Add lint + test scripts to each package**

In each `package.json`, add to `scripts`:

```json
{
  "scripts": {
    "lint": "eslint src --max-warnings=0",
    "test": "vitest run",
    "test:unit": "vitest run --reporter=default",
    "test:int": "vitest run --reporter=default --config vitest.integration.config.ts || true"
  }
}
```

(Integration config file added in slice 04.)

- [ ] **Step 8 — Update root `package.json` scripts**

Replace the `scripts` section:

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm --filter @layertone/web dev",
    "test": "vitest run",
    "test:unit": "vitest run",
    "test:int": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc -b",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

- [ ] **Step 9 — Add a placeholder test in `packages/shared` to validate setup**

`packages/shared/src/sanity.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("sanity", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 10 — Run lint and tests**

```bash
pnpm lint
pnpm test:unit
pnpm format:check
```
Expected: all green, sanity test passes.

- [ ] **Step 11 — Install Playwright browsers (one-time)**

```bash
pnpm exec playwright install chromium
```

- [ ] **Step 12 — Commit**

```bash
git add -A
git commit -m "chore: configure ESLint, Prettier, Vitest, Playwright"
```

---

## Verification

```bash
pnpm lint                # exits 0
pnpm test:unit           # passes (1 sanity test)
pnpm format:check        # exits 0
pnpm typecheck           # exits 0
```

## Commit message

```
chore: configure ESLint, Prettier, Vitest, Playwright
```
