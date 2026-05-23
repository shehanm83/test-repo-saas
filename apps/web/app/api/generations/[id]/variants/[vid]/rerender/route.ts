import { NextResponse } from "next/server";

import {
  brands,
  createDb,
  eq,
  generations,
  generationVariants,
  moods,
  templates,
} from "@layertone/db";
import { render } from "@layertone/renderer";
import { loadConfig } from "@layertone/shared/config";
import { keys } from "@layertone/storage";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; vid: string }> },
) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json(
      {
        error: {
          code: "auth.no_workspace",
          message: "No active workspace.",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 400 },
    );
  }

  const params = await context.params;
  const generationId = params.id;
  const variantId = params.vid;
  const workspaceId = session.workspaceId;

  const body = (await request.json().catch(() => ({}))) as {
    headline?: string;
    subhead?: string;
    cta?: string;
  };

  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");

  // Load the variant and confirm it belongs to a generation in this workspace
  const [variant] = await db
    .select()
    .from(generationVariants)
    .where(eq(generationVariants.id, variantId));

  if (!variant) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Variant not found." } },
      { status: 404 },
    );
  }

  if (!variant.backgroundS3Key) {
    return NextResponse.json(
      {
        error: {
          code: "rerender.no_background",
          message: "Background image has not been generated yet.",
        },
      },
      { status: 400 },
    );
  }

  if (!variant.templateId) {
    return NextResponse.json(
      {
        error: {
          code: "rerender.no_template",
          message: "Variant has no template assigned.",
        },
      },
      { status: 400 },
    );
  }

  // Guard: verify the generation belongs to the authenticated workspace
  const [gen] = await db
    .select()
    .from(generations)
    .where(eq(generations.id, variant.generationId));

  if (!gen || gen.workspaceId !== workspaceId) {
    return NextResponse.json(
      { error: { code: "auth.forbidden", message: "Access denied." } },
      { status: 403 },
    );
  }

  if (gen.id !== generationId) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Variant does not belong to this generation." } },
      { status: 404 },
    );
  }

  // Load template JSX
  const [tpl] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, variant.templateId));

  if (!tpl) {
    return NextResponse.json(
      { error: { code: "rerender.template_missing", message: "Template not found." } },
      { status: 400 },
    );
  }

  // Load brand
  const [brand] = gen.brandId
    ? await db.select().from(brands).where(eq(brands.id, gen.brandId))
    : [null];

  // Load mood
  const [mood] = gen.moodId
    ? await db.select().from(moods).where(eq(moods.id, gen.moodId))
    : [null];

  // Resolve output dimensions from generation settings
  const genSettings = gen.settings as {
    output_target?: { width?: number; height?: number };
  } | null;
  const outputWidth = genSettings?.output_target?.width ?? 1080;
  const outputHeight = genSettings?.output_target?.height ?? 1080;

  // Fetch background bytes from storage
  const adapters = createServerAdapters();
  const backgroundBytes = await adapters.storage.getBytes(variant.backgroundS3Key);

  // Run the renderer
  const rendered = await render(
    {
      templateJsxSource: tpl.jsxSource,
      background: { bytes: Buffer.from(backgroundBytes), mimeType: "image/png" },
      brand: {
        palette: (brand?.palette as never) ?? { primary: "#000" },
        fonts: (brand?.fonts as never) ?? {
          heading: { family: "Inter", weight: "700" },
          body: { family: "Inter", weight: "400" },
        },
        flags: { useColors: true, useLogo: false, useFonts: true },
      },
      ...(mood
        ? {
            mood: {
              accentPalette: mood.accentPalette ?? [],
              decorationTags: mood.decorationTags ?? [],
              flags: { useDecorations: true, useAccentColors: true },
              ...(mood.typographyHint ? { typographyHint: mood.typographyHint } : {}),
            },
          }
        : {}),
      slots: {
        ...(body.headline !== undefined ? { headline: body.headline } : {}),
        ...(body.subhead !== undefined ? { subhead: body.subhead } : {}),
        ...(body.cta !== undefined ? { cta: body.cta } : {}),
      },
      output: { width: outputWidth, height: outputHeight },
    },
    { requiresBrowser: tpl.requiresBrowserRender },
  );

  // Overwrite the variant output in storage
  const outKey = keys.generationVariant(workspaceId, generationId, variantId);
  await adapters.storage.putBytes(outKey, rendered.pngBytes, "image/png");

  // Return a fresh signed URL
  const url = await adapters.storage.getSignedUrl(outKey, 600);
  return NextResponse.json({ url });
}
