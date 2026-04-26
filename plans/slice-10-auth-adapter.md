# Slice 10 — Auth adapter (Clerk + dev bypass)

**Phase:** 2 — Auth & workspace
**Depends on:** 06
**Spec references:** [Architecture § 6.1 (AuthProvider adapter)](../specs/2026-04-25-studio-v1-architecture.md), [Spec § 2 (multi-tenancy)](../specs/2026-04-25-studio-v1-spec.md), [Spec § 3.1 (sign-up flow)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `packages/auth` package with `ClerkAuthProvider` and `DevAuthProvider`
- Dev provider returns `{ userId: DEV_USER_ID, workspaceId: <picked from dev seed>, role: 'user' }`
- Clerk provider verifies the JWT against Clerk's JWKS, extracts `current_workspace_id` claim
- `setActiveWorkspace` either updates Clerk user metadata (clerk) or no-ops (dev)
- Adapter factory in `@studio/shared` returns the correct impl based on `AUTH_MODE`
- Unit tests for both providers (Clerk uses a test JWKS fixture)

---

## Files

**Create:**
- `packages/auth/package.json`
- `packages/auth/tsconfig.json`
- `packages/auth/src/index.ts`
- `packages/auth/src/clerk.ts`
- `packages/auth/src/dev.ts`
- `packages/auth/src/clerk.test.ts`
- `packages/auth/src/dev.test.ts`
- `packages/auth/vitest.config.ts`

**Modify:**
- `packages/shared/src/adapters/factory.ts` (wire auth)
- Root `tsconfig.json` (add reference)

---

## Tasks

- [ ] **Step 1 — Bootstrap `packages/auth`**

Files mirror the layout of `packages/shared` (slice 01). Add `pnpm-workspace` is already wildcarded so just create the package and dependencies:

`packages/auth/package.json`:
```json
{
  "name": "@studio/auth",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "lint": "eslint src --max-warnings=0",
    "test": "vitest run"
  },
  "dependencies": {
    "@studio/shared": "workspace:*",
    "@clerk/backend": "^1.13.0",
    "jose": "^5.9.6"
  }
}
```

`packages/auth/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "composite": true },
  "include": ["src/**/*"],
  "references": [{ "path": "../shared" }]
}
```

`packages/auth/vitest.config.ts`:
```ts
import { defineProject } from "vitest/config";
export default defineProject({ test: { name: "auth", environment: "node", include: ["src/**/*.test.ts"] } });
```

```bash
pnpm install
```

Update root `tsconfig.json` references to include `packages/auth`.

- [ ] **Step 2 — Implement `DevAuthProvider`**

`packages/auth/src/dev.ts`:

```ts
import type { AuthIdentity, AuthProvider } from "@studio/shared";

export class DevAuthProvider implements AuthProvider {
  constructor(private readonly devUserId: string) {}

  async verifyRequest(headers: Headers): Promise<AuthIdentity | null> {
    // Optional override via header for dev persona switching
    const overrideUser = headers.get("x-dev-user-id") ?? this.devUserId;
    const workspaceId = headers.get("x-dev-workspace-id") ?? null;
    const role = headers.get("x-dev-role") === "admin" ? "admin" : "user";
    return { userId: overrideUser, workspaceId, role };
  }

  async setActiveWorkspace(_userId: string, _workspaceId: string): Promise<void> {
    // no-op in dev — UI passes the workspaceId via header instead
  }
}
```

- [ ] **Step 3 — Test `DevAuthProvider`**

`packages/auth/src/dev.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DevAuthProvider } from "./dev.js";

describe("DevAuthProvider", () => {
  const provider = new DevAuthProvider("00000000-0000-0000-0000-000000000001");

  it("returns dev user when no header overrides", async () => {
    const id = await provider.verifyRequest(new Headers());
    expect(id?.userId).toBe("00000000-0000-0000-0000-000000000001");
    expect(id?.role).toBe("user");
  });

  it("respects x-dev-user-id override", async () => {
    const id = await provider.verifyRequest(new Headers({ "x-dev-user-id": "abc" }));
    expect(id?.userId).toBe("abc");
  });

  it("respects x-dev-role admin", async () => {
    const id = await provider.verifyRequest(new Headers({ "x-dev-role": "admin" }));
    expect(id?.role).toBe("admin");
  });
});
```

- [ ] **Step 4 — Implement `ClerkAuthProvider`**

`packages/auth/src/clerk.ts`:

```ts
import { createClerkClient, verifyToken } from "@clerk/backend";
import type { AuthIdentity, AuthProvider } from "@studio/shared";

export interface ClerkAuthOptions {
  publishableKey: string;
  secretKey: string;
}

export class ClerkAuthProvider implements AuthProvider {
  private client: ReturnType<typeof createClerkClient>;

  constructor(private readonly opts: ClerkAuthOptions) {
    this.client = createClerkClient({ secretKey: opts.secretKey, publishableKey: opts.publishableKey });
  }

  async verifyRequest(headers: Headers): Promise<AuthIdentity | null> {
    const auth = headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return null;

    try {
      const verified = await verifyToken(token, { secretKey: this.opts.secretKey });
      const userId = verified.sub;
      const claims = verified as unknown as { current_workspace_id?: string; role?: string };
      const role = claims.role === "admin" ? "admin" : "user";
      return { userId, workspaceId: claims.current_workspace_id ?? null, role };
    } catch {
      return null;
    }
  }

  async setActiveWorkspace(userId: string, workspaceId: string): Promise<void> {
    await this.client.users.updateUserMetadata(userId, {
      publicMetadata: { current_workspace_id: workspaceId },
    });
  }
}
```

- [ ] **Step 5 — Test `ClerkAuthProvider` (mocked)**

`packages/auth/src/clerk.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(() => ({
    users: { updateUserMetadata: vi.fn().mockResolvedValue({}) },
  })),
  verifyToken: vi.fn(async (token: string) => {
    if (token === "good") return { sub: "u_1", current_workspace_id: "w_1", role: "user" };
    if (token === "admin") return { sub: "u_admin", role: "admin" };
    throw new Error("bad token");
  }),
}));

import { ClerkAuthProvider } from "./clerk.js";

describe("ClerkAuthProvider", () => {
  const provider = new ClerkAuthProvider({ publishableKey: "pk", secretKey: "sk" });

  it("verifies a good token and extracts workspace_id", async () => {
    const id = await provider.verifyRequest(new Headers({ authorization: "Bearer good" }));
    expect(id?.userId).toBe("u_1");
    expect(id?.workspaceId).toBe("w_1");
    expect(id?.role).toBe("user");
  });

  it("returns null for bad token", async () => {
    const id = await provider.verifyRequest(new Headers({ authorization: "Bearer bad" }));
    expect(id).toBeNull();
  });

  it("recognizes admin role", async () => {
    const id = await provider.verifyRequest(new Headers({ authorization: "Bearer admin" }));
    expect(id?.role).toBe("admin");
  });
});
```

- [ ] **Step 6 — Re-export from `packages/auth/src/index.ts`**

```ts
export { ClerkAuthProvider } from "./clerk.js";
export { DevAuthProvider } from "./dev.js";
```

- [ ] **Step 7 — Wire factory in `@studio/shared`**

Add `@studio/auth` as a dep:
```bash
pnpm --filter @studio/shared add @studio/auth@workspace:*
```

Edit `packages/shared/src/adapters/factory.ts`:

```ts
import { ClerkAuthProvider, DevAuthProvider } from "@studio/auth";
import { type Config } from "../config.js";
import type {
  AIProvider, AuthProvider, BillingProvider, EmailProvider, QueueAdapter, StorageAdapter, Telemetry,
} from "./types.js";

export interface Adapters {
  auth: AuthProvider;
  storage: StorageAdapter;
  queue: QueueAdapter;
  billing: BillingProvider;
  ai: AIProvider;
  email: EmailProvider;
  telemetry: Telemetry;
}

const notWiredYet = (name: string) => { throw new Error(`${name} adapter not wired yet`); };

export function createAdapters(config: Config): Adapters {
  const auth: AuthProvider =
    config.auth.mode === "clerk"
      ? new ClerkAuthProvider({ publishableKey: config.auth.publishableKey, secretKey: config.auth.secretKey })
      : new DevAuthProvider(config.auth.devUserId);

  return {
    auth,
    storage: new Proxy({}, { get: () => notWiredYet("storage") }) as StorageAdapter,
    queue: new Proxy({}, { get: () => notWiredYet("queue") }) as QueueAdapter,
    billing: new Proxy({}, { get: () => notWiredYet("billing") }) as BillingProvider,
    ai: new Proxy({}, { get: () => notWiredYet("ai") }) as AIProvider,
    email: new Proxy({}, { get: () => notWiredYet("email") }) as EmailProvider,
    telemetry: new Proxy({}, { get: () => notWiredYet("telemetry") }) as Telemetry,
  };
}
```

- [ ] **Step 8 — Run tests**

```bash
pnpm test:unit
```
Expected: dev (3) + clerk (3) tests pass.

- [ ] **Step 9 — Commit**

```bash
git add -A
git commit -m "feat(auth): Clerk + dev-bypass auth providers wired through adapter factory"
```

---

## Verification

```bash
pnpm --filter @studio/auth test
pnpm typecheck
```

## Commit message

```
feat(auth): Clerk + dev-bypass auth providers wired through adapter factory
```
