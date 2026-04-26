import { createDb } from "@studio/db/client";
import {
  brands,
  creditLedgerEntries,
  moods,
  priceBookEntries,
  templates,
  users,
  workspaces,
} from "@studio/db/schema";
import { loadConfig } from "@studio/shared/config";

const config = loadConfig();
const adminDb = createDb(config.db.url, "app_admin");

async function main() {
  const [user] = await adminDb
    .insert(users)
    .values({
      id: "00000000-0000-0000-0000-000000000001",
      email: "dev@studio.example",
      role: "admin",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: "dev@studio.example", role: "admin" },
    })
    .returning();

  const [workspace] = await adminDb
    .insert(workspaces)
    .values({
      id: "00000000-0000-0000-0000-000000000001",
      ownerUserId: user.id,
      name: "Northwind Creative",
      planCode: "pro",
      brandQuota: 3,
      seatQuota: 3,
      monthlyCreditGrant: 1000,
      status: "active",
    })
    .onConflictDoUpdate({
      target: workspaces.id,
      set: { name: "Northwind Creative", planCode: "pro" },
    })
    .returning();

  await adminDb.insert(brands).values({
    workspaceId: workspace.id,
    name: "Northwind Creative",
    palette: { primary: "#1D3B2A", secondary: "#DCC9A0", accent: "#C64F20" },
    fonts: {
      heading: { family: "Cal Sans" },
      body: { family: "Inter" },
    },
    voiceNotes: "Quiet confidence. Editorial, tactile, warm.",
    sourceUrl: "https://example.com",
  });

  await adminDb
    .insert(moods)
    .values({
      slug: "minimalist-tech",
      name: "Minimalist Tech",
      kind: "evergreen",
      promptModifiers: "clean editorial surfaces, controlled geometric highlights",
      negativePrompts: "busy collage, cluttered frame",
      accentPalette: ["#6F7FF7", "#BAC4FF"],
      decorationTags: ["halo", "grid", "fine-line"],
      supportedAspectRatios: ["1:1", "4:5", "9:16", "16:9"],
      status: "published",
    })
    .onConflictDoNothing();

  await adminDb
    .insert(templates)
    .values({
      slug: "editorial-portrait-a",
      name: "Editorial Portrait A",
      jsxSource: "export default function Template() { return null; }",
      slots: { headline: true, subhead: true, cta: true, logo: true },
      textSafeZones: [{ x: 0.08, y: 0.1, w: 0.42, h: 0.22 }],
      preferredModel: "flux-1.1-pro",
      supportedAspectRatios: ["4:5", "1:1"],
      status: "published",
      description: "Seed template",
    })
    .onConflictDoNothing();

  await adminDb.insert(priceBookEntries).values([
    {
      modelCode: "flux-1.1-pro",
      sizeBucket: "standard",
      premiumFlag: false,
      hasInspirationFlag: false,
      credits: 5,
      version: 1,
    },
    {
      modelCode: "gpt-image-1",
      sizeBucket: "standard",
      premiumFlag: true,
      hasInspirationFlag: false,
      credits: 15,
      version: 1,
    },
    {
      modelCode: "recraft-v3",
      sizeBucket: "standard",
      premiumFlag: false,
      hasInspirationFlag: false,
      credits: 8,
      version: 1,
    },
  ]);

  await adminDb
    .insert(creditLedgerEntries)
    .values({
      workspaceId: workspace.id,
      kind: "grant",
      amount: 1000,
      balanceAfter: 1000,
      idempotencyKey: "seed-grant-dev-user-1",
      metadata: { source: "seed" },
    })
    .onConflictDoNothing();

  console.info("Seed complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
