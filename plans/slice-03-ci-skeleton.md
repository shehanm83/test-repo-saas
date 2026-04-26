# Slice 03 — CI skeleton

**Phase:** 0 — Foundation
**Depends on:** 02

**Definition of done:**
- `.github/workflows/ci.yaml` runs on every PR and push to main
- Jobs: lint, typecheck, unit tests, format check
- Integration + E2E job placeholders defined but skipped (wired in slices 09 and 50 respectively)
- Caching: pnpm store + node_modules
- A no-op PR (or workflow_dispatch) shows all green checks

---

## Files

**Create:**
- `.github/workflows/ci.yaml`

---

## Tasks

- [ ] **Step 1 — Create `.github/workflows/ci.yaml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20.11.0"
  PNPM_VERSION: "9.12.0"

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile

  lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check

  typecheck:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  unit:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit

  integration:
    needs: install
    runs-on: ubuntu-latest
    if: false  # enabled in slice 09 once docker-compose stack and DB schema are ready
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_PASSWORD: dev
          POSTGRES_DB: studio
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - run: echo "integration runs once schema migrations exist"

  e2e:
    needs: install
    runs-on: ubuntu-latest
    if: false  # enabled in slice 50 once full stack is deployable
    steps:
      - uses: actions/checkout@v4
      - run: echo "E2E runs after slice 50"
```

- [ ] **Step 2 — Commit**

```bash
git add -A
git commit -m "ci: add base lint/typecheck/unit pipeline"
```

- [ ] **Step 3 — (If pushing) Verify CI green on a no-op PR**

Push the branch, open a draft PR, confirm `lint`, `typecheck`, `unit` jobs pass.

---

## Verification

- `.github/workflows/ci.yaml` parses (YAML lint locally if available)
- Workflow shape: 4 active jobs, 2 skipped jobs
- Pushed PR (if remote configured) shows all four active jobs green

## Commit message

```
ci: add base lint/typecheck/unit pipeline
```
