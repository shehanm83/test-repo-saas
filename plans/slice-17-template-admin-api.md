# Slice 17 — Template admin API

**Phase:** 4 — Catalogs
**Depends on:** 08
**Spec references:** [Spec § 1.2 (templates)](../specs/2026-04-25-layertone-v1-spec.md), [Architecture § 5 (Template renderer)](../specs/2026-04-25-layertone-v1-architecture.md), [UI prompt for Template Studio (slice 45)].

**Definition of done:**
- `TemplateApi` admin CRUD on `templates`
- Slot schema + text-safe-zones validated as JSON shapes
- `preferred_model` constrained to known model codes (the AI gateway will register them in slice 21 — for now hardcode the enum)
- Listing for users returns published templates only, optionally filtered by aspect ratio + preferred model
- Tests cover validation + listing

---

## Files

**Create:**
- `packages/db/src/queries/template.ts`
- `packages/api/src/template.ts`
- `packages/api/src/template.test.ts`
- `packages/shared/src/templates/schema.ts` (slot JSON shape contracts)

---

## Tasks

- [ ] **Step 1 — Define slot/text-safe-zone shape contracts**

`packages/shared/src/templates/schema.ts`:

```ts
import { z } from "zod";

export const Rect = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const SlotSchema = z.object({
  logo: z.object({ placement: Rect, maxWidth: z.number().min(0).max(1) }).optional(),
  headline: z.object({ placement: Rect, fontSizeRange: z.tuple([z.number(), z.number()]) }).optional(),
  subhead: z.object({ placement: Rect, fontSizeRange: z.tuple([z.number(), z.number()]) }).optional(),
  cta: z.object({ placement: Rect, style: z.enum(["pill", "rect", "ghost"]) }).optional(),
  decorations: z.array(z.object({ placement: Rect, kind: z.enum(["icon", "stock"]) })).optional(),
});

export const TextSafeZonesSchema = z.array(Rect).default([]);

export const ASPECT_RATIOS = z.enum(["1:1","4:5","9:16","16:9","1.91:1","2:3"]);
export const MODEL_CODES = z.enum(["flux-1.1-pro","gpt-image-1","recraft-v3","bedrock-sd35","nova-canvas"]);

export type SlotSpec = z.infer<typeof SlotSchema>;
export type AspectRatio = z.infer<typeof ASPECT_RATIOS>;
export type ModelCode = z.infer<typeof MODEL_CODES>;
```

Update `packages/shared/src/index.ts` to re-export from `./templates/schema.js`.

- [ ] **Step 2 — DB queries**

`packages/db/src/queries/template.ts`:

```ts
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../client.js";
import { templates } from "../schema/index.js";

export async function adminListTemplates(db: Db) {
  return db.select().from(templates).orderBy(templates.name);
}

export async function adminCreateTemplate(db: Db, v: typeof templates.$inferInsert) {
  const [t] = await db.insert(templates).values(v).returning();
  return t;
}

export async function adminUpdateTemplate(db: Db, id: string, patch: Partial<typeof templates.$inferInsert>) {
  const [t] = await db.update(templates).set({ ...patch, updatedAt: sql`now()` }).where(eq(templates.id, id)).returning();
  return t;
}

export async function listPublishedTemplatesForRouting(db: Db, aspectRatio: string) {
  return db.select().from(templates).where(
    and(eq(templates.status, "published"), sql`${aspectRatio} = ANY(${templates.supportedAspectRatios})`),
  );
}
```

- [ ] **Step 3 — Template API**

`packages/api/src/template.ts`:

```ts
import { z } from "zod";
import { ASPECT_RATIOS, MODEL_CODES, SlotSchema, TextSafeZonesSchema } from "@layertone/shared";
import { createDb, adminListTemplates, adminCreateTemplate, adminUpdateTemplate, listPublishedTemplatesForRouting } from "@layertone/db";
import type { Config } from "@layertone/shared";

const TemplateInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  jsxSource: z.string().min(10),
  slots: SlotSchema,
  textSafeZones: TextSafeZonesSchema,
  preferredModel: MODEL_CODES,
  supportedAspectRatios: z.array(ASPECT_RATIOS).min(1),
  requiresBrowserRender: z.boolean().default(false),
});

export class TemplateApi {
  constructor(private readonly config: Config) {}
  private db(r: "app_user" | "app_admin" = "app_user") { return createDb(this.config.db.url, r); }

  async adminList() { return adminListTemplates(this.db("app_admin")); }

  async adminCreate(input: unknown) {
    const v = TemplateInput.parse(input);
    return adminCreateTemplate(this.db("app_admin"), v as never);
  }

  async adminUpdate(id: string, input: unknown) {
    const v = TemplateInput.partial().parse(input);
    return adminUpdateTemplate(this.db("app_admin"), id, v as never);
  }

  async adminPublish(id: string) { return adminUpdateTemplate(this.db("app_admin"), id, { status: "published" }); }
  async adminArchive(id: string) { return adminUpdateTemplate(this.db("app_admin"), id, { status: "archived" }); }

  async listForRouting(aspectRatio: string) {
    const ar = ASPECT_RATIOS.parse(aspectRatio);
    return listPublishedTemplatesForRouting(this.db(), ar);
  }
}
```

- [ ] **Step 4 — Tests**

`packages/api/src/template.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@layertone/db", () => ({
  createDb: () => ({}),
  adminListTemplates: vi.fn(async () => []),
  adminCreateTemplate: vi.fn(async (_d, v) => ({ id: "t1", ...v })),
  adminUpdateTemplate: vi.fn(async () => ({ id: "t1" })),
  listPublishedTemplatesForRouting: vi.fn(async () => []),
}));

import { TemplateApi } from "./template.js";
const api = new TemplateApi({ db: { url: "" } } as never);

describe("TemplateApi", () => {
  it("rejects bad model code", async () => {
    await expect(api.adminCreate({
      slug: "x", name: "X", jsxSource: "<svg>...</svg>",
      slots: {}, textSafeZones: [],
      preferredModel: "nonexistent",
      supportedAspectRatios: ["1:1"],
    })).rejects.toThrow();
  });
  it("creates valid template", async () => {
    const t = await api.adminCreate({
      slug: "minimal-square", name: "Minimal Square", jsxSource: "<svg>...</svg>",
      slots: { logo: { placement: { x: 0, y: 0, w: 0.2, h: 0.2 }, maxWidth: 0.2 } },
      textSafeZones: [{ x: 0, y: 0, w: 1, h: 0.3 }],
      preferredModel: "flux-1.1-pro",
      supportedAspectRatios: ["1:1", "4:5"],
    });
    expect(t.slug).toBe("minimal-square");
  });
});
```

- [ ] **Step 5 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(api): template admin CRUD with slot/text-safe-zone schema validation"
```

---

## Verification

```bash
pnpm --filter @layertone/api test
```

## Commit message

```
feat(api): template admin CRUD with slot/text-safe-zone schema validation
```
