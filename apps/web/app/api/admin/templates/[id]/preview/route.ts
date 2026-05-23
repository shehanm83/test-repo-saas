import { NextResponse } from "next/server";

import { render } from "@layertone/renderer";
import { adminListTemplates, createDb } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { requireSession } from "@/lib/auth/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const session = await requireSession();

  if (session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const brandName = searchParams.get("brandName") ?? "Brand";
  const primary = searchParams.get("primary") ?? "#5E5CE6";

  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");
  const allTemplates = await adminListTemplates(db);
  const tpl = allTemplates.find((t) => t.id === id) ?? null;

  if (!tpl?.jsxSource) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const backgroundBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==",
    "base64",
  );

  try {
    const result = await render({
      templateJsxSource: tpl.jsxSource,
      background: { bytes: backgroundBytes, mimeType: "image/png" },
      brand: {
        palette: { primary },
        fonts: {
          heading: { family: "Inter", weight: "700" },
          body: { family: "Inter", weight: "400" },
        },
        flags: { useColors: true, useLogo: false, useFonts: true },
      },
      slots: {
        headline: `${brandName} · Preview`,
        subhead: "Template preview",
        cta: "Shop now",
      },
      output: { width: 1080, height: 1080 },
    });

    return new Response(Buffer.from(result.pngBytes), {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("[template-preview] render error", err);
    return NextResponse.json({ error: "render failed" }, { status: 500 });
  }
}
