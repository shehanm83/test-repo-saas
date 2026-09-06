import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

import { loadConfig } from "@layertone/shared/config";

const config = loadConfig();

const client = new S3Client({
  region: config.storage.region,
  endpoint: config.storage.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.storage.accessKeyId ?? "minio",
    secretAccessKey: config.storage.secretAccessKey ?? "minio12345",
  },
});

async function ensureBucket(bucket: string) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

async function main() {
  await ensureBucket(config.storage.bucketApp);
  await ensureBucket(config.storage.bucketGlobal);
  console.info("MinIO bootstrap complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
