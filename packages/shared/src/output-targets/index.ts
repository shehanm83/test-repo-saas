import { z } from "zod";

export type Platform = "instagram" | "facebook" | "linkedin" | "tiktok" | "pinterest" | "youtube" | "x";
export type OutputAspectRatio = "1:1" | "4:5" | "9:16" | "16:9" | "1.91:1" | "2:3";

export interface PlatformFormat {
  platform: Platform;
  format: string;
  label: string;
  aspectRatio: OutputAspectRatio;
  width: number;
  height: number;
}

export const PLATFORM_FORMATS: PlatformFormat[] = [
  { platform: "instagram", format: "post",                 label: "Post square",          aspectRatio: "1:1",    width: 1080, height: 1080 },
  { platform: "instagram", format: "post_portrait",        label: "Post portrait",        aspectRatio: "4:5",    width: 1080, height: 1350 },
  { platform: "instagram", format: "post_landscape",       label: "Post landscape",       aspectRatio: "1.91:1", width: 1080, height: 566  },
  { platform: "instagram", format: "story",                label: "Story",                aspectRatio: "9:16",   width: 1080, height: 1920 },
  { platform: "instagram", format: "reel",                 label: "Reel",                 aspectRatio: "9:16",   width: 1080, height: 1920 },
  { platform: "instagram", format: "feed_video_portrait",  label: "Feed video portrait",  aspectRatio: "4:5",    width: 1080, height: 1350 },
  { platform: "instagram", format: "feed_video_square",    label: "Feed video square",    aspectRatio: "1:1",    width: 1080, height: 1080 },
  { platform: "facebook",  format: "post",                 label: "Feed post",            aspectRatio: "1.91:1", width: 1200, height: 630  },
  { platform: "facebook",  format: "post_square",          label: "Post square",          aspectRatio: "1:1",    width: 1080, height: 1080 },
  { platform: "facebook",  format: "post_portrait",        label: "Post portrait",        aspectRatio: "4:5",    width: 1080, height: 1350 },
  { platform: "facebook",  format: "post_landscape",       label: "Post landscape",       aspectRatio: "1.91:1", width: 1080, height: 566  },
  { platform: "facebook",  format: "link_preview",         label: "Link preview image",   aspectRatio: "1.91:1", width: 1200, height: 630  },
  { platform: "facebook",  format: "profile_photo",        label: "Profile photo",        aspectRatio: "1:1",    width: 320,  height: 320  },
  { platform: "facebook",  format: "cover_photo",          label: "Cover photo",          aspectRatio: "16:9",   width: 820,  height: 360  },
  { platform: "facebook",  format: "story",                label: "Story",                aspectRatio: "9:16",   width: 1080, height: 1920 },
  { platform: "linkedin",  format: "post",                 label: "Standard post",        aspectRatio: "1.91:1", width: 1200, height: 627  },
  { platform: "linkedin",  format: "square",               label: "Square post",          aspectRatio: "1:1",    width: 1200, height: 1200 },
  { platform: "tiktok",    format: "video",                label: "Vertical video",       aspectRatio: "9:16",   width: 1080, height: 1920 },
  { platform: "tiktok",    format: "story",                label: "Photo / Story",        aspectRatio: "9:16",   width: 1080, height: 1920 },
  { platform: "pinterest", format: "pin",           label: "Pin",                aspectRatio: "2:3",    width: 1000, height: 1500 },
  { platform: "pinterest", format: "story",         label: "Story Pin",          aspectRatio: "9:16",   width: 1080, height: 1920 },
  { platform: "youtube",   format: "thumbnail",     label: "Thumbnail",          aspectRatio: "16:9",   width: 1280, height: 720  },
  { platform: "x",         format: "image",         label: "Single image",       aspectRatio: "16:9",   width: 1600, height: 900  },
];

export const FREEFORM_DIMENSIONS: Record<OutputAspectRatio, { width: number; height: number }> = {
  "1:1":    { width: 1024, height: 1024 },
  "4:5":    { width: 1024, height: 1280 },
  "9:16":   { width: 1024, height: 1792 },
  "16:9":   { width: 1792, height: 1024 },
  "1.91:1": { width: 1792, height: 938  },
  "2:3":    { width: 1024, height: 1536 },
};

export const OutputTargetInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("social"), platform: z.string(), format: z.string() }),
  z.object({ kind: z.literal("image"), aspectRatio: z.enum(["1:1", "4:5", "9:16", "16:9"]) }),
]);

export interface ResolvedOutputTarget {
  kind: "social" | "image";
  platform: Platform | null;
  format: string | null;
  aspectRatio: OutputAspectRatio;
  width: number;
  height: number;
}

export class InvalidOutputTargetError extends Error {
  status = 422;
  constructor(message: string, public readonly suggestion?: string) {
    super(message);
    this.name = "InvalidOutputTargetError";
  }
}

export function resolveOutputTarget(input: unknown): ResolvedOutputTarget {
  const parsed = OutputTargetInput.parse(input);
  if (parsed.kind === "image") {
    const dim = FREEFORM_DIMENSIONS[parsed.aspectRatio]!;
    return {
      kind: "image",
      platform: null,
      format: null,
      aspectRatio: parsed.aspectRatio,
      width: dim.width,
      height: dim.height,
    };
  }
  const row = PLATFORM_FORMATS.find(
    (p) => p.platform === parsed.platform && p.format === parsed.format,
  );
  if (!row) {
    throw new InvalidOutputTargetError(
      `platform/format not found: ${parsed.platform}/${parsed.format}`,
    );
  }
  return {
    kind: "social",
    platform: row.platform,
    format: row.format,
    aspectRatio: row.aspectRatio,
    width: row.width,
    height: row.height,
  };
}

export function assertMoodSupportsOutputAspectRatio(
  supported: string[],
  aspectRatio: string,
): void {
  if (!supported.includes(aspectRatio)) {
    throw new InvalidOutputTargetError(
      `mood does not support aspect ratio ${aspectRatio}`,
      "pick a different mood or change output target",
    );
  }
}
