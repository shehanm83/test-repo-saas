# Slice 16 — Mood admin API + bindings

**Phase:** 4 — Catalogs
**Depends on:** 08
**Spec references:** [Spec § 4 (Mood system)](../specs/2026-04-25-layertone-v1-spec.md), [UI Prompt 11 (Mood Studio)](../specs/2026-04-25-layertone-v1-ui-prompts.md).

**Definition of done:**
- `MoodApi` (admin-only) supports CRUD on moods + mood-template-bindings + lifecycle (draft → publish → archive)
- User-facing `listAvailableMoods(workspaceId, aspectRatio?)` filters by status='published', aspect-ratio compatibility, and seasonal validity windows
- Validation: aspect ratios in {1:1, 4:5, 9:16, 16:9, 1.91:1, 2:3}; valid_from < valid_to
- Tests cover: drafts hidden from users; expired seasonal moods hidden; binding weight ordering

---

## Files

**Create:**
- `packages/db/src/queries/mood.ts`
- `packages/api/src/mood.ts`
- `packages/api/src/mood.test.ts`

---

## Tasks

- [ ] **Step 1 — DB queries**

`packages/db/src/queries/mood.ts`:

```ts
import { and, asc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import type { Db } from "../client.js";
import { moods, moodTemplateBindings, templates } from "../schema/index.js";

const ASPECT_RATIOS = ["1:1","4:5","9:16","16:9","1.91:1","2:3"] as const;
export type AspectRatio = typeof ASPECT_RATIOS[number];

export async function listAvailableMoods(db: Db, args: { aspectRatio?: AspectRatio; now?: Date }) {
  const now = args.now ?? new Date();
  const conds = [
    eq(moods.status, "published"),
    or(isNull(moods.validFrom), lte(moods.validFrom, now)),
    or(isNull(moods.validTo), gte(moods.validTo, now)),
  ];
  if (args.aspectRatio) {
    conds.push(sql`${args.aspectRatio} = ANY(${moods.supportedAspectRatios})`);
  }
  return db.select().from(moods).where(and(...conds)).orderBy(asc(moods.name));
}

export async function adminListMoods(db: Db) {
  return db.select().from(moods).orderBy(asc(moods.name));
}

export async function adminCreateMood(db: Db, v: typeof moods.$inferInsert) {
  const [m] = await db.insert(moods).values(v).returning();
  return m;
}

export async function adminUpdateMood(db: Db, id: string, patch: Partial<typeof moods.$inferInsert>) {
  const [m] = await db.update(moods).set({ ...patch, updatedAt: sql`now()` }).where(eq(moods.id, id)).returning();
  return m;
}

export async function adminBindings(db: Db, moodId: string) {
  return db.select({ id: moodTemplateBindings.id, templateId: templates.id, slug: templates.slug, name: templates.name, weight: moodTemplateBindings.weight })
    .from(moodTemplateBindings).innerJoin(templates, eq(templates.id, moodTemplateBindings.templateId))
    .where(eq(moodTemplateBindings.moodId, moodId));
}

export async function setBindings(db: Db, moodId: string, items: { templateId: string; weight: number }[]) {
  return db.transaction(async (tx) => {
    await tx.delete(moodTemplateBindings).where(eq(moodTemplateBindings.moodId, moodId));
    if (items.length > 0) {
      await tx.insert(moodTemplateBindings).values(items.map((i) => ({ moodId, templateId: i.templateId, weight: i.weight })));
    }
  });
}
```

- [ ] **Step 2 — API**

`packages/api/src/mood.ts`:

```ts
import { z } from "zod";
import { createDb, listAvailableMoods, adminListMoods, adminCreateMood, adminUpdateMood, adminBindings, setBindings } from "@layertone/db";
import type { Config } from "@layertone/shared";

const ASPECT_RATIOS = z.enum(["1:1","4:5","9:16","16:9","1.91:1","2:3"]);

const MoodInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  kind: z.enum(["seasonal", "evergreen"]),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  promptModifiers: z.string().default(""),
  negativePrompts: z.string().default(""),
  accentPalette: z.array(z.string()).max(5).default([]),
  decorationTags: z.array(z.string()).default([]),
  typographyHint: z.object({ weight: z.string().optional(), justification: z.string().optional() }).optional(),
  supportedAspectRatios: z.array(ASPECT_RATIOS).min(1),
}).refine(
  (m) => !(m.validFrom && m.validTo) || new Date(m.validFrom) < new Date(m.validTo),
  { message: "validFrom must be before validTo" },
);

export class MoodApi {
  constructor(private readonly config: Config) {}
  private db(role: "app_user" | "app_admin" = "app_user") { return createDb(this.config.db.url, role); }

  async listAvailable(args: { aspectRatio?: string }) {
    const ar = args.aspectRatio ? ASPECT_RATIOS.parse(args.aspectRatio) : undefined;
    return listAvailableMoods(this.db(), { aspectRatio: ar });
  }

  async adminList() { return adminListMoods(this.db("app_admin")); }

  async adminCreate(input: unknown) {
    const v = MoodInput.parse(input);
    return adminCreateMood(this.db("app_admin"), {
      ...v,
      validFrom: v.validFrom ? new Date(v.validFrom) : null,
      validTo: v.validTo ? new Date(v.validTo) : null,
    } as never);
  }

  async adminUpdate(id: string, input: unknown) {
    const v = MoodInput.partial().parse(input);
    return adminUpdateMood(this.db("app_admin"), id, v as never);
  }

  async adminPublish(id: string) {
    return adminUpdateMood(this.db("app_admin"), id, { status: "published" });
  }
  async adminArchive(id: string) {
    return adminUpdateMood(this.db("app_admin"), id, { status: "archived" });
  }

  async adminBindings(moodId: string) { return adminBindings(this.db("app_admin"), moodId); }
  async adminSetBindings(moodId: string, input: unknown) {
    const v = z.array(z.object({ templateId: z.string().uuid(), weight: z.number().int().min(1).max(1000) })).parse(input);
    await setBindings(this.db("app_admin"), moodId, v);
  }
}
```

- [ ] **Step 3 — Tests**

`packages/api/src/mood.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@layertone/db", () => ({
  createDb: () => ({}),
  listAvailableMoods: vi.fn(async () => [{ id: "m1", name: "Christmas" }]),
  adminListMoods: vi.fn(async () => []),
  adminCreateMood: vi.fn(async (_d, v) => ({ id: "m1", ...v })),
  adminUpdateMood: vi.fn(async (_d, id, p) => ({ id, ...p })),
  adminBindings: vi.fn(async () => []),
  setBindings: vi.fn(async () => undefined),
}));

import { MoodApi } from "./mood.js";
const api = new MoodApi({ db: { url: "" } } as never);

describe("MoodApi", () => {
  it("rejects invalid aspect ratio", async () => {
    await expect(api.listAvailable({ aspectRatio: "100:100" })).rejects.toThrow();
  });
  it("rejects validFrom > validTo", async () => {
    await expect(api.adminCreate({
      slug: "x", name: "X", kind: "seasonal",
      validFrom: "2026-12-01T00:00:00Z", validTo: "2026-11-01T00:00:00Z",
      supportedAspectRatios: ["1:1"],
    })).rejects.toThrow(/validFrom/);
  });
  it("creates valid mood", async () => {
    const m = await api.adminCreate({
      slug: "minimal-tech", name: "Minimal Tech", kind: "evergreen",
      supportedAspectRatios: ["1:1", "4:5"],
    });
    expect(m.slug).toBe("minimal-tech");
  });
});
```

- [ ] **Step 4 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(api): mood admin CRUD + user-facing mood listing with availability filters"
```

---

## Verification

```bash
pnpm --filter @layertone/api test
```

## Commit message

```
feat(api): mood admin CRUD + user-facing mood listing with availability filters
```
