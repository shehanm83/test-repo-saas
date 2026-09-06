# Slice 28 — Inspiration image upload + claim flow

**Phase:** 8 — Generation pipeline
**Depends on:** 13
**Spec references:** [Spec § 3.3.1 (inspiration upload endpoint)](../specs/2026-04-25-layertone-v1-spec.md), [decision D15](../../../C--personal-saas-img-gen/memory/project_decisions.md).

**Definition of done:**
- `InspirationUploadApi.create({ workspaceId, userId, file })` validates + sanitizes + stores → returns `{ uploadId, s3Key, width, height }`
- A `claim(workspaceId, uploadId, generationId)` helper moves the staging key to the canonical generation key
- TTL cleanup script deletes staging uploads older than 24h
- Tests for: oversized file rejected, mime-sniff, non-image rejected, claim moves the file

---

## Files

**Create:**
- `packages/api/src/inspiration.ts`
- `packages/api/src/inspiration.test.ts`
- `packages/api/scripts/cleanup-inspiration.ts`

---

## Tasks

- [ ] **Step 1 — Inspiration API**

```ts
// packages/api/src/inspiration.ts
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { keys } from "@layertone/storage";
import { reencodeImage } from "./sanitize/image.js";
import type { Adapters, Config } from "@layertone/shared";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export class InspirationUploadApi {
  constructor(private readonly config: Config, private readonly adapters: Adapters) {}

  async create(args: { workspaceId: string; userId: string; file: { bytes: Buffer; filename: string } }) {
    if (args.file.bytes.byteLength > MAX_BYTES) {
      const e = new Error("file-too-large"); (e as Error & { code?: string }).code = "validation.file_too_large"; throw e;
    }
    const sniffed = await fileTypeFromBuffer(args.file.bytes);
    if (!sniffed || !ALLOWED.has(sniffed.mime)) {
      const e = new Error("invalid-image-type"); (e as Error & { code?: string }).code = "validation.invalid_image"; throw e;
    }
    const re = await reencodeImage(args.file.bytes, { format: "png", maxLongEdge: 2048 });
    const uploadId = randomUUID();
    const key = keys.inspirationUploadStaging(args.workspaceId, uploadId, "png");
    await this.adapters.storage.putBytes(key, re.bytes, re.mimeType);
    return { uploadId, s3Key: key, width: re.width, height: re.height };
  }

  async claim(args: { workspaceId: string; uploadId: string; generationId: string }) {
    const staging = keys.inspirationUploadStaging(args.workspaceId, args.uploadId, "png");
    const final = keys.inspirationClaimed(args.workspaceId, args.generationId, "png");
    await this.adapters.storage.copy(staging, final);
    await this.adapters.storage.delete(staging);
    return { s3Key: final };
  }
}
```

```bash
pnpm --filter @layertone/api add file-type
```

- [ ] **Step 2 — Test**

```ts
// packages/api/src/inspiration.test.ts
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { InspirationUploadApi } from "./inspiration.js";

const adapters = {
  storage: {
    putBytes: vi.fn(async () => undefined),
    copy: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  },
} as never;

const api = new InspirationUploadApi({ db: { url: "" } } as never, adapters);

describe("InspirationUploadApi", () => {
  it("rejects oversized files", async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 1);
    await expect(api.create({ workspaceId: "w", userId: "u", file: { bytes: big, filename: "x.png" } }))
      .rejects.toThrow(/file-too-large/);
  });

  it("rejects non-images", async () => {
    const txt = Buffer.from("hello");
    await expect(api.create({ workspaceId: "w", userId: "u", file: { bytes: txt, filename: "x.txt" } }))
      .rejects.toThrow(/invalid-image-type/);
  });

  it("happy path returns metadata", async () => {
    const png = await sharp({ create: { width: 200, height: 200, channels: 3, background: "#000" } }).png().toBuffer();
    const r = await api.create({ workspaceId: "w", userId: "u", file: { bytes: png, filename: "ok.png" } });
    expect(r.uploadId).toMatch(/-/);
    expect(r.width).toBe(200);
  });

  it("claim copies and deletes", async () => {
    await api.claim({ workspaceId: "w", uploadId: "u1", generationId: "g1" });
    expect(adapters.storage.copy).toHaveBeenCalled();
    expect(adapters.storage.delete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3 — Cleanup script (TTL)**

`packages/api/scripts/cleanup-inspiration.ts`:

```ts
// Iterates the staging prefix (per workspace) and deletes objects older than 24h.
// In MinIO/S3 this requires listing — for v1, we rely on S3 lifecycle rule on the staging prefix.
// Document the lifecycle rule:
//   s3://{app-bucket}/workspaces/*/uploads/inspiration/  →  expire after 1 day
console.warn("Inspiration cleanup is implemented via S3 lifecycle policy on the staging prefix. See deployment slice 50.");
```

- [ ] **Step 4 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(api): inspiration image upload + claim with mime-sniff and 24h TTL via S3 lifecycle"
```

---

## Verification

```bash
pnpm --filter @layertone/api test
```

## Commit message

```
feat(api): inspiration image upload + claim with mime-sniff and 24h TTL via S3 lifecycle
```
