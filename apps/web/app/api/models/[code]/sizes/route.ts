import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

// Public endpoint the Quick Create wizard hits in step 3 to render a chip
// group of native sizes for the chosen model. Returns the model's
// model_supported_sizes plus its allow_custom_size flag (so the wizard knows
// whether to surface a custom W×H tile).
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const api = new TaxonomyApi(loadConfig());
  const [model, sizes] = await Promise.all([api.getModel(code), api.listSupportedSizes(code)]);
  if (!model) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    sizes: sizes.map((s) => ({
      width: s.width,
      height: s.height,
      label: s.label,
    })),
    allowCustomSize: (model as { allowCustomSize?: boolean }).allowCustomSize ?? false,
  });
}
