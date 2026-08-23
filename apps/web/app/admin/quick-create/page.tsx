import Link from "next/link";

import {
  createDb,
  desc,
  eq,
  generationVariantFeedback,
  generationVariants,
  generations,
  quickCreateDrafts,
  sql,
  users,
  workspaces,
} from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import {
  AdminEmpty,
  AdminPage,
  AdminSection,
  AdminStat,
  AdminStatGrid,
  AdminStatus,
  formatAdminDate,
  formatAdminNumber,
} from "@/components/admin/ui";
import { I } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminQuickCreatePage() {
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");

  const [draftTotals, feedbackTotals, qaRows, recentDrafts, recentFeedback, recentGenerations] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(quickCreateDrafts)
        .then((rows) => rows[0]?.count ?? 0),
      db
        .select({
          count: sql<number>`count(*)::int`,
          positive: sql<number>`count(*) filter (where ${generationVariantFeedback.rating} = 'up')::int`,
        })
        .from(generationVariantFeedback)
        .then((rows) => rows[0] ?? { count: 0, positive: 0 }),
      db
        .select({
          status: generationVariants.qaStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(generationVariants)
        .groupBy(generationVariants.qaStatus),
      db
        .select({
          id: quickCreateDrafts.id,
          version: quickCreateDrafts.version,
          updatedAt: quickCreateDrafts.updatedAt,
          userEmail: users.email,
          workspaceName: workspaces.name,
        })
        .from(quickCreateDrafts)
        .leftJoin(users, eq(users.id, quickCreateDrafts.userId))
        .leftJoin(workspaces, eq(workspaces.id, quickCreateDrafts.workspaceId))
        .orderBy(desc(quickCreateDrafts.updatedAt))
        .limit(12),
      db
        .select({
          id: generationVariantFeedback.id,
          generationId: generations.id,
          rating: generationVariantFeedback.rating,
          reason: generationVariantFeedback.reason,
          note: generationVariantFeedback.note,
          updatedAt: generationVariantFeedback.updatedAt,
          userEmail: users.email,
          workspaceName: workspaces.name,
        })
        .from(generationVariantFeedback)
        .innerJoin(
          generationVariants,
          eq(generationVariants.id, generationVariantFeedback.variantId),
        )
        .innerJoin(generations, eq(generations.id, generationVariants.generationId))
        .leftJoin(users, eq(users.id, generationVariantFeedback.userId))
        .leftJoin(workspaces, eq(workspaces.id, generationVariantFeedback.workspaceId))
        .orderBy(desc(generationVariantFeedback.updatedAt))
        .limit(12),
      db
        .select({
          id: generations.id,
          brief: generations.brief,
          status: generations.status,
          createdAt: generations.createdAt,
          workspaceName: workspaces.name,
        })
        .from(generations)
        .leftJoin(workspaces, eq(workspaces.id, generations.workspaceId))
        .where(
          sql`${generations.settings} -> 'creative_plan' is not null and ${generations.settings} -> 'creative_plan' <> 'null'::jsonb`,
        )
        .orderBy(desc(generations.createdAt))
        .limit(12),
    ]);

  const qaCounts = new Map(qaRows.map((row) => [row.status ?? "unavailable", row.count]));
  const qaPassed = qaCounts.get("passed") ?? 0;
  const qaFailed = (qaCounts.get("soft_failed") ?? 0) + (qaCounts.get("hard_failed") ?? 0);
  const positiveRate = feedbackTotals.count
    ? Math.round((feedbackTotals.positive / feedbackTotals.count) * 100)
    : 0;

  return (
    <AdminPage
      wide
      eyebrow={
        <>
          <I.Sparkle size={12} />
          Creative Operations
        </>
      }
      title="Quick Create"
      description="Monitor rollout, saved drafts, quality checks, user feedback, and recent v2 generation activity."
    >
      <AdminStatGrid>
        <AdminStat
          label="Rollout"
          value={config.features?.quickCreateV2 ? "Enabled" : "Disabled"}
          detail={`${config.features?.quickCreateV2RolloutPercent ?? 100}% deterministic rollout`}
          icon={<I.Info size={14} />}
          tone={config.features?.quickCreateV2 ? "success" : "warning"}
        />
        <AdminStat
          label="Saved Drafts"
          value={formatAdminNumber(draftTotals)}
          detail="Workspace-synced recovery points"
          icon={<I.Edit size={14} />}
        />
        <AdminStat
          label="QA Passed"
          value={formatAdminNumber(qaPassed)}
          detail={`${formatAdminNumber(qaFailed)} soft or hard failures`}
          icon={<I.Check size={14} />}
          tone={qaFailed > 0 ? "warning" : "success"}
        />
        <AdminStat
          label="Positive Feedback"
          value={`${positiveRate}%`}
          detail={`${formatAdminNumber(feedbackTotals.count)} responses`}
          icon={<I.History size={14} />}
          tone="accent"
        />
      </AdminStatGrid>

      <div className="admin-dashboard-grid">
        <AdminSection
          title="Recent Quick Create Jobs"
          description="Generations carrying a v2 creative plan."
        >
          {recentGenerations.length === 0 ? (
            <AdminEmpty title="No Quick Create v2 jobs yet" />
          ) : (
            <div className="admin-list">
              {recentGenerations.map((generation) => (
                <Link
                  key={generation.id}
                  href={`/admin/generations/${generation.id}`}
                  className="admin-list-row"
                >
                  <span style={{ minWidth: 0 }}>
                    <span className="admin-list-row__title">{generation.brief}</span>
                    <span className="admin-list-row__meta">
                      {generation.workspaceName ?? "Unknown workspace"} ·{" "}
                      {formatAdminDate(generation.createdAt)}
                    </span>
                  </span>
                  <AdminStatus status={generation.status} />
                </Link>
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Draft Health" description="Most recently synced workspace drafts.">
          {recentDrafts.length === 0 ? (
            <AdminEmpty title="No synced drafts" />
          ) : (
            <div className="admin-list">
              {recentDrafts.map((draft) => (
                <div key={draft.id} className="admin-list-row">
                  <span style={{ minWidth: 0 }}>
                    <span className="admin-list-row__title">
                      {draft.userEmail ?? "Unknown user"}
                    </span>
                    <span className="admin-list-row__meta">
                      {draft.workspaceName ?? "Unknown workspace"} ·{" "}
                      {formatAdminDate(draft.updatedAt)}
                    </span>
                  </span>
                  <span className="pill">v{draft.version}</span>
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      </div>

      <AdminSection
        title="Latest User Feedback"
        description="Open the generation for full plan, prompt, QA, and reference context."
      >
        {recentFeedback.length === 0 ? (
          <AdminEmpty title="No feedback yet" />
        ) : (
          <div className="admin-list">
            {recentFeedback.map((entry) => (
              <Link
                key={entry.id}
                href={`/admin/generations/${entry.generationId}`}
                className="admin-list-row"
              >
                <span style={{ minWidth: 0 }}>
                  <span className="admin-list-row__title">
                    {entry.rating === "up" ? "Useful" : "Not right"}
                    {entry.reason ? ` · ${entry.reason.replaceAll("_", " ")}` : ""}
                  </span>
                  <span className="admin-list-row__meta">
                    {entry.userEmail ?? "Unknown user"} ·{" "}
                    {entry.workspaceName ?? "Unknown workspace"} ·{" "}
                    {formatAdminDate(entry.updatedAt)}
                  </span>
                  {entry.note ? <span className="admin-list-row__meta">{entry.note}</span> : null}
                </span>
                <I.ChevronRight size={14} />
              </Link>
            ))}
          </div>
        )}
      </AdminSection>
    </AdminPage>
  );
}
