import { randomUUID } from "node:crypto";

import type { Adapters, Config } from "@vyora/shared";
import { keys } from "@vyora/storage";
import { fileTypeFromBuffer } from "file-type";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export class InspirationUploadApi {
  constructor(
    private readonly _config: Config,
    private readonly adapters: Adapters,
  ) {}

  async create(args: {
    workspaceId: string;
    userId: string;
    file: { bytes: Buffer; filename: string };
  }) {
    if (args.file.bytes.byteLength > MAX_BYTES) {
      const e = new Error("file-too-large");
      (e as Error & { code?: string }).code = "validation.file_too_large";
      throw e;
    }
    const sniffed = await fileTypeFromBuffer(args.file.bytes);
    if (!sniffed || !ALLOWED.has(sniffed.mime)) {
      const e = new Error("invalid-image-type");
      (e as Error & { code?: string }).code = "validation.invalid_image";
      throw e;
    }
    const { reencodeImage } = await import("./sanitize/image");
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
