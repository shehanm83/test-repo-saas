import { Ledger } from "@vyora/billing";
import { createDb, getTierOptions, listBrands, listStrengths, listUseCases } from "@vyora/db";
import { loadConfig } from "@vyora/shared/config";

import { GeneratePageClient } from "@/components/generate/generate-page-client";
import { getSessionWorkspace } from "@/lib/auth/server";

export default async function GeneratePage() {
  const { session } = await getSessionWorkspace();
  const config = loadConfig();
  const adminDb = createDb(config.db.url, "app_admin");
  const userDb = createDb(config.db.url, "app_user");

  const [credits, brands, useCases, tierOptions, strengths] = await Promise.all([
    session.workspaceId ? new Ledger(adminDb).getBalance(session.workspaceId) : Promise.resolve(0),
    session.workspaceId ? listBrands(userDb, session.workspaceId) : Promise.resolve([]),
    listUseCases(adminDb, { activeOnly: true }),
    getTierOptions(adminDb),
    listStrengths(adminDb),
  ]);

  const useCasesDTO = useCases.map((u) => ({
    code: u.code,
    label: u.label,
    platform: u.platform,
    targetWidth: u.targetWidth,
    targetHeight: u.targetHeight,
    aspectRatio: u.aspectRatio,
    icon: u.icon,
  }));

  const strengthsDTO = strengths.map((s) => ({ code: s.code, label: s.label }));

  return (
    <GeneratePageClient
      brandId={brands[0]?.id ?? null}
      credits={credits}
      useCases={useCasesDTO}
      tierOptions={tierOptions}
      strengths={strengthsDTO}
    />
  );
}
