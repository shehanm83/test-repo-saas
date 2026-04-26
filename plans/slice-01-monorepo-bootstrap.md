# Slice 01 — Monorepo bootstrap

**Phase:** 0 — Foundation
**Depends on:** —
**Spec references:** [Architecture § 6.1 (Adapter pattern)](../specs/2026-04-25-studio-v1-architecture.md), [Spec § 1.2 (table layout — informs package boundaries)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- pnpm monorepo with workspaces configured
- TypeScript root config with project references
- Six packages/apps created with their `package.json` and `tsconfig.json`:
  - `apps/web` (Next.js)
  - `apps/worker` (Lambda worker entrypoint)
  - `packages/db` (Drizzle schema + queries)
  - `packages/shared` (types, errors, utils)
  - `packages/gateway` (AI gateway)
  - `packages/renderer` (template renderer)
- `pnpm install` runs cleanly
- `pnpm -r tsc --noEmit` passes (empty stub source files only)
- Initial commit pushed (or staged if no remote)

---

## Files

**Create:**
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `tsconfig.json`
- `.gitignore`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/src/index.ts` (placeholder — replaced in slice 35)
- `apps/worker/package.json`
- `apps/worker/tsconfig.json`
- `apps/worker/src/index.ts` (placeholder — replaced in slice 30)
- `packages/db/package.json`
- `packages/db/tsconfig.json`
- `packages/db/src/index.ts` (re-export entrypoint)
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/gateway/package.json`
- `packages/gateway/tsconfig.json`
- `packages/gateway/src/index.ts`
- `packages/renderer/package.json`
- `packages/renderer/tsconfig.json`
- `packages/renderer/src/index.ts`

---

## Tasks

- [ ] **Step 1 — Initialize git repo (if not already)**

```bash
git init
git config init.defaultBranch main
```

- [ ] **Step 2 — Create root `.gitignore`**

```gitignore
node_modules/
dist/
.next/
.open-next/
.turbo/
coverage/
.env
.env.local
.env.*.local
*.log
*.tsbuildinfo
.DS_Store
.vscode/
.idea/
```

- [ ] **Step 3 — Create root `package.json`**

```json
{
  "name": "studio-v1",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=20.11.0"
  },
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm --filter @studio/web dev",
    "test": "pnpm -r test",
    "test:unit": "pnpm -r test:unit",
    "test:int": "pnpm -r test:int",
    "lint": "pnpm -r lint",
    "typecheck": "tsc -b",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 4 — Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 5 — Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "incremental": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 6 — Create root `tsconfig.json` (project references)**

```json
{
  "extends": "./tsconfig.base.json",
  "files": [],
  "references": [
    { "path": "apps/web" },
    { "path": "apps/worker" },
    { "path": "packages/db" },
    { "path": "packages/shared" },
    { "path": "packages/gateway" },
    { "path": "packages/renderer" }
  ]
}
```

- [ ] **Step 7 — Create `packages/shared` package**

`packages/shared/package.json`:
```json
{
  "name": "@studio/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*"]
}
```

`packages/shared/src/index.ts`:
```ts
export {}; // placeholder; populated in later slices
```

- [ ] **Step 8 — Create `packages/db` package**

`packages/db/package.json`:
```json
{
  "name": "@studio/db",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@studio/shared": "workspace:*"
  }
}
```

`packages/db/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }
  ]
}
```

`packages/db/src/index.ts`:
```ts
export {};
```

- [ ] **Step 9 — Create `packages/gateway` package**

`packages/gateway/package.json`:
```json
{
  "name": "@studio/gateway",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@studio/shared": "workspace:*"
  }
}
```

`packages/gateway/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }
  ]
}
```

`packages/gateway/src/index.ts`:
```ts
export {};
```

- [ ] **Step 10 — Create `packages/renderer` package**

`packages/renderer/package.json`:
```json
{
  "name": "@studio/renderer",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@studio/shared": "workspace:*"
  }
}
```

`packages/renderer/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }
  ]
}
```

`packages/renderer/src/index.ts`:
```ts
export {};
```

- [ ] **Step 11 — Create `apps/web` (Next.js) package skeleton**

`apps/web/package.json`:
```json
{
  "name": "@studio/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "echo 'web dev wired in slice 35'",
    "build": "echo 'web build wired in slice 35'"
  },
  "dependencies": {
    "@studio/db": "workspace:*",
    "@studio/gateway": "workspace:*",
    "@studio/renderer": "workspace:*",
    "@studio/shared": "workspace:*"
  }
}
```

`apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": ".next",
    "rootDir": "src",
    "composite": true,
    "noEmit": false,
    "jsx": "preserve"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../../packages/shared" },
    { "path": "../../packages/db" },
    { "path": "../../packages/gateway" },
    { "path": "../../packages/renderer" }
  ]
}
```

`apps/web/src/index.ts`:
```ts
export {}; // Next.js bootstrap added in slice 35
```

- [ ] **Step 12 — Create `apps/worker` package skeleton**

`apps/worker/package.json`:
```json
{
  "name": "@studio/worker",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "echo 'worker dev wired in slice 30'",
    "build": "echo 'worker build wired in slice 30'"
  },
  "dependencies": {
    "@studio/db": "workspace:*",
    "@studio/gateway": "workspace:*",
    "@studio/renderer": "workspace:*",
    "@studio/shared": "workspace:*"
  }
}
```

`apps/worker/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../../packages/shared" },
    { "path": "../../packages/db" },
    { "path": "../../packages/gateway" },
    { "path": "../../packages/renderer" }
  ]
}
```

`apps/worker/src/index.ts`:
```ts
export {}; // Worker handler added in slice 30
```

- [ ] **Step 13 — Install**

```bash
pnpm install
```
Expected: success, no peer-dep complaints.

- [ ] **Step 14 — Verify TypeScript build**

```bash
pnpm typecheck
```
Expected: clean, no errors. Builds `.tsbuildinfo` files for each package.

- [ ] **Step 15 — Commit**

```bash
git add -A
git commit -m "chore: bootstrap pnpm monorepo with TypeScript project references"
```

---

## Verification

```bash
pnpm install                    # exits 0
pnpm typecheck                  # exits 0
ls apps/web apps/worker         # both directories exist
ls packages/db packages/shared packages/gateway packages/renderer  # all four exist
cat pnpm-workspace.yaml         # shows apps/* and packages/*
```

## Commit message

```
chore: bootstrap pnpm monorepo with TypeScript project references
```
