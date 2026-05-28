import { randomUUID } from "node:crypto";

import { adminInsertStock, adminListStock, adminUpdateStock, createDb, deleteStock } from "@layertone/db";
import type { Adapters } from "@layertone/shared/adapters";
import type { Config } from "@layertone/shared/config";
import { keys } from "@layertone/storage";
import { z } from "zod";

const UploadInput = z.object({
  kind: z.enum(["icon", "photo"]),
  category: z.enum(["food-dietary", "food-safety", "cosmetics", "manufacturing", "wellness"]),
  label: z.string().min(1).max(120),
  tags: z.array(z.string()).default([]),
  license: z.string().min(1),
  attribution: z.string().optional(),
});

export class StockApi {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  private db() {
    return createDb(this.config.db.url, "app_admin");
  }

  async adminList() {
    return adminListStock(this.db());
  }

  async adminUpload(input: {
    kind: "icon" | "photo";
    category: "food-dietary" | "food-safety" | "cosmetics" | "manufacturing" | "wellness";
    label: string;
    tags: string[];
    license: string;
    attribution?: string;
    file: { bytes: Buffer; mimeType: string; filename: string };
  }) {
    const args = UploadInput.parse(input);
    const id = randomUUID();

    let s3Key: string;
    let mimeType: string;
    let width: number | null = null;
    let height: number | null = null;

    if (input.file.mimeType === "image/svg+xml" || input.file.filename.endsWith(".svg")) {
      const { sanitizeSvg } = await import("./sanitize/svg");
      const cleaned = sanitizeSvg(input.file.bytes.toString("utf8"));
      s3Key = keys.globalStock(id, "svg");
      mimeType = "image/svg+xml";
      await this.adapters.storage.putBytes(s3Key, Buffer.from(cleaned, "utf8"), mimeType);
    } else {
      const { reencodeImage } = await import("./sanitize/image");
      const reencoded = await reencodeImage(input.file.bytes, { format: "png", maxLongEdge: 2048 });
      s3Key = keys.globalStock(id, "png");
      mimeType = reencoded.mimeType;
      width = reencoded.width;
      height = reencoded.height;
      await this.adapters.storage.putBytes(s3Key, reencoded.bytes, mimeType);
    }

    return adminInsertStock(this.db(), {
      id,
      category: args.category,
      kind: args.kind,
      label: args.label,
      s3Key,
      mimeType,
      width,
      height,
      tags: args.tags,
      license: args.license,
      attribution: args.attribution ?? null,
      embedding: new Array(1536).fill(0),
    });
  }

  async adminUpdate(
    id: string,
    patch: Partial<Pick<typeof import("@layertone/db").stockAssets.$inferInsert, "label" | "category" | "tags">>,
  ) {
    return adminUpdateStock(this.db(), id, patch);
  }

  async adminDelete(id: string) {
    await deleteStock(this.db(), id);
  }
}
