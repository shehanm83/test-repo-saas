import { GenerationApi } from "@studio/api/generation";
import { loadConfig } from "@studio/shared";

import { GenerationView } from "@/components/results/generation-view";
import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export default async function GenerationDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  const api = new GenerationApi(loadConfig(), createServerAdapters() as never);
  const generation = session.workspaceId
    ? await api.get({ workspaceId: session.workspaceId, generationId: id })
    : null;

  return <GenerationView generationId={id} initial={generation as never} />;
}
