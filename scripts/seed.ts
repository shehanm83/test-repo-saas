import { createDb } from "@layertone/db/client";
import {
  creditLedgerEntries,
  priceBookEntries,
  templates,
  users,
  workspaceMembers,
  workspaces,
} from "@layertone/db/schema";
import { loadConfig } from "@layertone/shared/config";

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
      name: "Personal Workspace",
      planCode: "subscription",
      brandQuota: 3,
      seatQuota: 3,
      monthlyCreditGrant: 1000,
      status: "active",
    })
    .onConflictDoUpdate({
      target: workspaces.id,
      set: { name: "Personal Workspace", planCode: "subscription" },
    })
    .returning();

  await adminDb
    .insert(workspaceMembers)
    .values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
      acceptedAt: new Date(),
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
    .insert(templates)
    .values({
      slug: "quick-create-image-only",
      name: "Quick Create image only",
      description:
        "Fallback image-only renderer for Quick Create generations without campaign or product overlays.",
      jsxSource: `
function template({ background, output }) {
  return h("div", {
    style: {
      display: "flex",
      width: output.width,
      height: output.height,
      backgroundImage: "url(" + background.dataUrl + ")",
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  });
}
`,
      slots: [
        "headline",
        "subtitle",
        "price",
        "discount",
        "badgeText",
        "cta",
        "offerExpiry",
        "legalText",
        "website",
        "phone",
        "qrUrl",
        "logo",
        "certification",
      ],
      textSafeZones: [],
      preferredModel: "flux-1.1-pro",
      supportedAspectRatios: ["1:1", "4:5", "9:16", "16:9", "1.91:1", "2:3"],
      status: "published",
      requiresBrowserRender: false,
    })
    .onConflictDoUpdate({
      target: templates.slug,
      set: {
        name: "Quick Create image only",
        description:
          "Fallback image-only renderer for Quick Create generations without campaign or product overlays.",
        jsxSource: `
function template({ background, output }) {
  return h("div", {
    style: {
      display: "flex",
      width: output.width,
      height: output.height,
      backgroundImage: "url(" + background.dataUrl + ")",
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  });
}
`,
        slots: [
          "headline",
          "subtitle",
          "price",
          "discount",
          "badgeText",
          "cta",
          "offerExpiry",
          "legalText",
          "website",
          "phone",
          "qrUrl",
          "logo",
          "certification",
        ],
        textSafeZones: [],
        preferredModel: "flux-1.1-pro",
        supportedAspectRatios: ["1:1", "4:5", "9:16", "16:9", "1.91:1", "2:3"],
        status: "published",
        requiresBrowserRender: false,
      },
    });

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
