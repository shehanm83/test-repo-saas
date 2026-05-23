# Slice 13 — Storage adapter (S3 + MinIO)

**Phase:** 3 — Storage + brand kit
**Depends on:** 05
**Spec references:** [Architecture § 6.1 (Storage adapter)](../specs/2026-04-25-layertone-v1-architecture.md), [Spec § 1.2 (S3 layout)](../specs/2026-04-25-layertone-v1-spec.md).

**Definition of done:**
- `packages/storage` package with `S3StorageAdapter` (works with both AWS S3 and MinIO via `S3_ENDPOINT`)
- Methods: `putSignedUrl`, `getSignedUrl`, `putBytes`, `getBytes`, `delete`, `copy`, `exists`
- Per-workspace prefix helpers `keyForWorkspaceAsset(wid, ...)`, `keyForGenerationOutput(...)`, `keyForInspirationUpload(...)`
- Wired into adapter factory
- Integration tests run against MinIO

---

## Files

**Create:**
- `packages/storage/{package.json,tsconfig.json,vitest.config.ts}`
- `packages/storage/src/{index.ts,s3.ts,keys.ts,s3.int.test.ts}`

**Modify:**
- `packages/shared/src/adapters/factory.ts`
- Root `tsconfig.json`

---

## Tasks

- [ ] **Step 1 — Bootstrap package + deps**

```bash
# Create package.json/tsconfig like prior packages, then:
pnpm --filter @layertone/storage add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pnpm --filter @layertone/storage add @layertone/shared@workspace:*
```

- [ ] **Step 2 — `packages/storage/src/keys.ts`**

```ts
export const keys = {
  brandLogo: (wid: string, brandId: string, ext: string) =>
    `workspaces/${wid}/brands/${brandId}/logo.${ext}`,
  brandAsset: (wid: string, brandId: string, assetId: string, ext: string) =>
    `workspaces/${wid}/brands/${brandId}/assets/${assetId}.${ext}`,
  generationBackground: (wid: string, gid: string, vid: string) =>
    `workspaces/${wid}/generations/${gid}/background-${vid}.png`,
  generationVariant: (wid: string, gid: string, vid: string) =>
    `workspaces/${wid}/generations/${gid}/variants/${vid}.png`,
  inspirationUploadStaging: (wid: string, uploadId: string, ext: string) =>
    `workspaces/${wid}/uploads/inspiration/${uploadId}.${ext}`,
  inspirationClaimed: (wid: string, gid: string, ext: string) =>
    `workspaces/${wid}/generations/${gid}/inspiration.${ext}`,
  globalStock: (assetId: string, ext: string) => `stock/${assetId}.${ext}`,
  globalTemplatePreview: (tid: string) => `templates/${tid}/preview.png`,
  globalMoodPreview: (mid: string) => `moods/${mid}/preview.png`,
};

export function workspacePrefix(wid: string): string { return `workspaces/${wid}/`; }
```

- [ ] **Step 3 — `packages/storage/src/s3.ts`**

```ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SignedUrl, StorageAdapter } from "@layertone/shared";

export interface S3Options {
  endpoint?: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket: string;
  forcePathStyle?: boolean;  // true for MinIO
}

export class S3StorageAdapter implements StorageAdapter {
  readonly client: S3Client;
  readonly bucket: string;

  constructor(opts: S3Options) {
    this.client = new S3Client({
      endpoint: opts.endpoint,
      region: opts.region,
      forcePathStyle: opts.forcePathStyle ?? !!opts.endpoint,
      credentials:
        opts.accessKeyId && opts.secretAccessKey
          ? { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey }
          : undefined,
    });
    this.bucket = opts.bucket;
  }

  async putSignedUrl(key: string, contentType: string, ttlSec = 600): Promise<SignedUrl> {
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(this.client, cmd, { expiresIn: ttlSec });
    return { url, expiresAt: new Date(Date.now() + ttlSec * 1000) };
  }

  async getSignedUrl(key: string, ttlSec = 600): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: ttlSec });
  }

  async putBytes(key: string, body: Uint8Array | Buffer, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async getBytes(key: string): Promise<Uint8Array> {
    const r = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return new Uint8Array(await r.Body!.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async copy(srcKey: string, dstKey: string): Promise<void> {
    await this.client.send(new CopyObjectCommand({
      Bucket: this.bucket, Key: dstKey, CopySource: `${this.bucket}/${srcKey}`,
    }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch { return false; }
  }
}
```

- [ ] **Step 4 — Wire into adapter factory**

```ts
// packages/shared/src/adapters/factory.ts
import { S3StorageAdapter } from "@layertone/storage";
// ... in createAdapters:
const storage = new S3StorageAdapter({
  endpoint: config.storage.endpoint,
  region: config.storage.region,
  accessKeyId: config.storage.accessKeyId,
  secretAccessKey: config.storage.secretAccessKey,
  bucket: config.storage.bucketApp,
});
```

(Add `@layertone/storage` as a dep in `@layertone/shared`.)

- [ ] **Step 5 — Integration test against MinIO**

`packages/storage/src/s3.int.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { S3StorageAdapter } from "./s3.js";

const adapter = new S3StorageAdapter({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  region: "us-east-1",
  accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minio",
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minio12345",
  bucket: process.env.S3_BUCKET_APP ?? "layertone-app",
});

describe("S3StorageAdapter (MinIO int)", () => {
  it("round-trips bytes", async () => {
    const key = `test-${Date.now()}.txt`;
    await adapter.putBytes(key, Buffer.from("hello"), "text/plain");
    expect(await adapter.exists(key)).toBe(true);
    const back = await adapter.getBytes(key);
    expect(Buffer.from(back).toString("utf8")).toBe("hello");
    await adapter.delete(key);
    expect(await adapter.exists(key)).toBe(false);
  });

  it("mints signed PUT URL", async () => {
    const url = await adapter.putSignedUrl("test.png", "image/png");
    expect(url.url).toContain("Signature");
  });
});
```

(Adjust file name to `*.int.test.ts` and run with integration config.)

- [ ] **Step 6 — Run tests**

```bash
pnpm test:unit
pnpm test:int    # MinIO must be up via `make dev:up`
```

- [ ] **Step 7 — Commit**

```bash
git add -A
git commit -m "feat(storage): S3/MinIO adapter with key helpers and signed URLs"
```

---

## Verification

```bash
pnpm --filter @layertone/storage test
pnpm test:int
```

## Commit message

```
feat(storage): S3/MinIO adapter with key helpers and signed URLs
```
