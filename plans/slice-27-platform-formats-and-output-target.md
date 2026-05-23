# Slice 27 — Platform formats lookup + output-target validation

**Phase:** 8 — Generation pipeline
**Depends on:** 16
**Spec references:** [Spec § 1.3 (platform formats)](../specs/2026-04-25-layertone-v1-spec.md), [Spec § 3.3 step 3 (output target validation)](../specs/2026-04-25-layertone-v1-spec.md), [Spec § 4.3 (mood × aspect-ratio compatibility)](../specs/2026-04-25-layertone-v1-spec.md).

**Definition of done:**
- `apps/web/lib/output-targets.ts` (or `packages/shared/src/output-targets.ts` — placed in shared so both web and worker can import) lists the static platform-format table from spec § 1.3
- `resolveOutputTarget(input)` accepts `{ kind, platform?, format?, aspectRatio? }` and returns canonical `{ kind, platform?, format?, aspectRatio, width, height }`
- Throws on invalid combos with the spec-mandated 422-friendly error
- Tests cover all platform/format combinations + Just-an-image mode

---

## Files

**Create:**
- `packages/shared/src/output-targets/index.ts`
- `packages/shared/src/output-targets/index.test.ts`

**Modify:**
- `packages/shared/src/index.ts`

---

## Tasks

- [ ] **Step 1 — Define table + resolver**

`packages/shared/src/output-targets/index.ts`:

```ts
import { z } from "zod";

export type Platform = "instagram" | "facebook" | "linkedin" | "tiktok" | "pinterest" | "youtube" | "x";
export type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9" | "1.91:1" | "2:3";

export interface PlatformFormat {
  platform: Platform;
  format: string;             // "post" | "post_portrait" | "story" | "thumbnail" | "pin" | ...
  label: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
}

export const PLATFORM_FORMATS: PlatformFormat[] = [
  { platform: "instagram", format: "post",          label: "Post (square)",     aspectRatio: "1:1",   width: 1080, height: 1080 },
  { platform: "instagram", format: "post_portrait", label: "Post (portrait)",   aspectRatio: "4:5",   width: 1080, height: 1350 },
  { platform: "instagram", format: "story",         label: "Story / Reel cover",aspectRatio: "9:16",  width: 1080, height: 1920 },
  { platform: "facebook",  format: "post",          label: "Feed post",         aspectRatio: "1.91:1",width: 1200, height: 630  },
  { platform: "facebook",  format: "story",         label: "Story",             aspectRatio: "9:16",  width: 1080, height: 1920 },
  { platform: "linkedin",  format: "post",          label: "Single image post", aspectRatio: "1.91:1",width: 1200, height: 627  },
  { platform: "linkedin",  format: "square",        label: "Square post",       aspectRatio: "1:1",   width: 1200, height: 1200 },
  { platform: "tiktok",    format: "story",         label: "Photo / Story",     aspectRatio: "9:16",  width: 1080, height: 1920 },
  { platform: "pinterest", format: "pin",           label: "Pin",               aspectRatio: "2:3",   width: 1000, height: 1500 },
  { platform: "pinterest", format: "story",         label: "Story Pin",         aspectRatio: "9:16",  width: 1080, height: 1920 },
  { platform: "youtube",   format: "thumbnail",     label: "Thumbnail",         aspectRatio: "16:9",  width: 1280, height: 720  },
  { platform: "x",         format: "image",         label: "Single image",      aspectRatio: "16:9",  width: 1600, height: 900  },
];

export const FREEFORM_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "1:1":   { width: 1024, height: 1024 },
  "4:5":   { width: 1024, height: 1280 },
  "9:16":  { width: 1024, height: 1792 },
  "16:9":  { width: 1792, height: 1024 },
  "1.91:1":{ width: 1792, height: 938  },
  "2:3":   { width: 1024, height: 1536 },
};

export const OutputTargetInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("social"), platform: z.string(), format: z.string() }),
  z.object({ kind: z.literal("image"),  aspectRatio: z.enum(["1:1","4:5","9:16","16:9"]) }),
]);

export interface ResolvedOutputTarget {
  kind: "social" | "image";
  platform: Platform | null;
  format: string | null;
  aspectRatio: AspectRatio;
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
    const dim = FREEFORM_DIMENSIONS[parsed.aspectRatio];
    return {
      kind: "image", platform: null, format: null,
      aspectRatio: parsed.aspectRatio, width: dim.width, height: dim.height,
    };
  }
  const row = PLATFORM_FORMATS.find((p) => p.platform === parsed.platform && p.format === parsed.format);
  if (!row) throw new InvalidOutputTargetError(`platform/format not found: ${parsed.platform}/${parsed.format}`);
  return {
    kind: "social", platform: row.platform, format: row.format,
    aspectRatio: row.aspectRatio, width: row.width, height: row.height,
  };
}
```

`packages/shared/src/output-targets/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PLATFORM_FORMATS, resolveOutputTarget, InvalidOutputTargetError } from "./index.js";

describe("resolveOutputTarget", () => {
  it("resolves all platform formats", () => {
    for (const p of PLATFORM_FORMATS) {
      const r = resolveOutputTarget({ kind: "social", platform: p.platform, format: p.format });
      expect(r.width).toBe(p.width);
      expect(r.height).toBe(p.height);
    }
  });
  it("rejects unknown platform/format", () => {
    expect(() => resolveOutputTarget({ kind: "social", platform: "weibo", format: "post" })).toThrow(InvalidOutputTargetError);
  });
  it("resolves Just-an-image", () => {
    const r = resolveOutputTarget({ kind: "image", aspectRatio: "1:1" });
    expect(r.width).toBe(1024);
  });
  it("rejects unsupported aspect-ratio in image mode", () => {
    expect(() => resolveOutputTarget({ kind: "image", aspectRatio: "1.91:1" })).toThrow();
  });
});
```

- [ ] **Step 2 — Re-export from shared**

In `packages/shared/src/index.ts`:
```ts
export * from "./output-targets/index.js";
```

- [ ] **Step 3 — Mood × output target validator helper**

In the same file or a new `compat.ts`:

```ts
export function assertMoodSupportsAspectRatio(supported: string[], aspectRatio: string): void {
  if (!supported.includes(aspectRatio)) {
    throw new InvalidOutputTargetError(`mood does not support aspect ratio ${aspectRatio}`, "pick a different mood or change output target");
  }
}
```

- [ ] **Step 4 — Tests + commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(shared): static platform-formats lookup + output-target resolver + mood compatibility check"
```

---

## Verification

```bash
pnpm --filter @layertone/shared test
```

## Commit message

```
feat(shared): static platform-formats lookup + output-target resolver + mood compatibility check
```
