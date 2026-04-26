import sharp from "sharp";

export interface ProcessedImage {
  bytes: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
}

export async function reencodeImage(
  input: Buffer,
  opts: { format?: "png" | "jpeg" | "webp"; maxLongEdge?: number } = {},
): Promise<ProcessedImage> {
  const format = opts.format ?? "png";
  const maxLongEdge = opts.maxLongEdge ?? 2048;

  const pipeline = sharp(input, { failOn: "error" })
    .rotate()
    .resize({
      width: maxLongEdge,
      height: maxLongEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .withMetadata({ orientation: 1 });

  const output =
    format === "png"
      ? pipeline.png({ quality: 90, compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
      : format === "jpeg"
        ? pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer({ resolveWithObject: true })
        : pipeline.webp({ quality: 88 }).toBuffer({ resolveWithObject: true });

  const result = await output;

  return {
    bytes: result.data,
    mimeType: format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp",
    width: result.info.width,
    height: result.info.height,
  };
}
