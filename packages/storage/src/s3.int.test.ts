import { describe, expect, it } from "vitest";

import { S3StorageAdapter } from "./s3";

const adapter = new S3StorageAdapter({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  region: process.env.S3_REGION ?? "us-east-1",
  accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minio",
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minio12345",
  bucket: process.env.S3_BUCKET_APP ?? "layertone-app",
  forcePathStyle: true,
});

describe("S3StorageAdapter", () => {
  it("round-trips bytes against MinIO", async () => {
    await adapter.ensureBucket();

    const key = `integration/${Date.now()}.txt`;
    await adapter.putBytes(key, Buffer.from("hello"), "text/plain");
    expect(await adapter.exists(key)).toBe(true);

    const bytes = await adapter.getBytes(key);
    expect(Buffer.from(bytes).toString("utf8")).toBe("hello");

    await adapter.delete(key);
    expect(await adapter.exists(key)).toBe(false);
  });

  it("mints a signed put url", async () => {
    await adapter.ensureBucket();

    const signed = await adapter.putSignedUrl(`integration/${Date.now()}.png`, "image/png");
    expect(signed.url).toContain("X-Amz-Signature");
  });
});
