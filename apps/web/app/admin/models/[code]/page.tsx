import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { ModelDetail } from "@/components/admin/model-detail";

export default async function AdminModelDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const api = new TaxonomyApi(loadConfig());
  const [model, allStrengths, allTags, routing, assignedStrengths, assignedTags] =
    await Promise.all([
      api.getModel(code),
      api.listStrengths(),
      api.listTags(),
      api.listRouting(),
      api.listStrengthsForModel(code),
      api.listTagsForModel(code),
    ]);

  if (!model) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">Model not found</h1>
          <p className="page__sub">No model with code &quot;{code}&quot;.</p>
        </div>
      </div>
    );
  }

  return (
    <ModelDetail
      model={model as never}
      allStrengths={allStrengths as never}
      allTags={allTags as never}
      routing={routing as never}
      assignedStrengths={assignedStrengths}
      assignedTags={assignedTags}
    />
  );
}
