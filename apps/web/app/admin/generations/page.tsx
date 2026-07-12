import Link from "next/link";

import { createDb, generations, workspaces } from "@layertone/db";
import { eq, desc, inArray, sql } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { I } from "@/components/icons";
import {
  AdminAlert,
  AdminEmpty,
  AdminPage,
  AdminSection,
  AdminStat,
  AdminStatGrid,
  AdminStatus,
  formatAdminDate,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "running", label: "Running" },
  { key: "failed", label: "Failed" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["key"];

type GenStatus = "completed" | "failed" | "running" | "pending";

function statusFilter(tab: StatusTab): GenStatus[] | null {
  if (tab === "completed") return ["completed"];
  if (tab === "running") return ["running"];
  if (tab === "failed") return ["failed"];
  return null;
}

function tabHref(tab: StatusTab, page = 0) {
  const params = new URLSearchParams();
  if (tab !== "all") params.set("status", tab);
  if (page > 0) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/generations${qs ? `?${qs}` : ""}`;
}

export default async function AdminGenerationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageParam } = await searchParams;
  const db = createDb(loadConfig().db.url, "app_admin");

  const trimmedQ = q?.trim() ?? "";
  const isUuid = /^[0-9a-f-]{36}$/i.test(trimmedQ);
  const invalidSearch = trimmedQ.length > 0 && !isUuid;
  const activeTab: StatusTab = STATUS_TABS.some((t) => t.key === status)
    ? (status as StatusTab)
    : "all";
  const page = Math.max(0, parseInt(pageParam ?? "0", 10) || 0);

  const cols = {
    id: generations.id,
    brief: generations.brief,
    status: generations.status,
    createdAt: generations.createdAt,
    workspaceId: generations.workspaceId,
    workspaceName: workspaces.name,
  };

  type Row = {
    id: string;
    brief: string;
    status: string;
    createdAt: Date;
    workspaceId: string;
    workspaceName: string | null;
  };

  let rows: Row[];
  let totalCount = 0;

  if (isUuid) {
    rows = await db
      .select(cols)
      .from(generations)
      .leftJoin(workspaces, eq(workspaces.id, generations.workspaceId))
      .where(eq(generations.id, trimmedQ))
      .limit(1);
    totalCount = rows.length;
  } else {
    const statusValues = statusFilter(activeTab);
    const base = db
      .select(cols)
      .from(generations)
      .leftJoin(workspaces, eq(workspaces.id, generations.workspaceId))
      .orderBy(desc(generations.createdAt));

    const filtered = statusValues ? base.where(inArray(generations.status, statusValues)) : base;

    const [countResult, pageRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(generations)
        .where(statusValues ? inArray(generations.status, statusValues) : sql`1=1`)
        .then((r) => r[0]?.count ?? 0),
      filtered.limit(PAGE_SIZE).offset(page * PAGE_SIZE),
    ]);

    rows = pageRows;
    totalCount = countResult;
  }

  const completed = rows.filter((row) => row.status === "completed").length;
  const running = rows.filter((row) => row.status === "running").length;
  const failed = rows.filter((row) => row.status.startsWith("failed")).length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = !isUuid && page < totalPages - 1;
  const hasPrev = !isUuid && page > 0;

  return (
    <AdminPage
      wide
      eyebrow={
        <>
          <I.Shield size={12} />
          Operations
        </>
      }
      title="Generation Inspector"
      description="Search, inspect, and recover image generation jobs with full prompt, output, ledger, and audit context."
    >
      <AdminStatGrid>
        <AdminStat
          label={isUuid ? "Matching Jobs" : "Total Jobs"}
          value={totalCount}
          detail={isUuid ? "UUID search result" : `Page ${page + 1} of ${totalPages || 1}`}
          icon={<I.Search size={14} />}
        />
        <AdminStat
          label="Completed"
          value={completed}
          detail="On this page"
          icon={<I.Check size={14} />}
          tone="success"
        />
        <AdminStat
          label="Running"
          value={running}
          detail="On this page"
          icon={<I.Loader size={14} />}
          tone="accent"
        />
        <AdminStat
          label="Failed"
          value={failed}
          detail="On this page"
          icon={<I.AlertCircle size={14} />}
          tone={failed > 0 ? "danger" : "neutral"}
        />
      </AdminStatGrid>

      <form method="GET" style={{ marginBottom: 16, display: "flex", gap: 8, maxWidth: 620 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <I.Search
            size={14}
            style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-3)" }}
          />
          <input
            className="input mono"
            name="q"
            autoComplete="off"
            defaultValue={q ?? ""}
            placeholder="Generation ID (36-character UUID)…"
            style={{ paddingLeft: 36, fontSize: 13 }}
          />
        </div>
        <button type="submit" className="btn btn--primary">
          Search
        </button>
        {trimmedQ ? (
          <Link href="/admin/generations" className="btn btn--secondary">
            Clear
          </Link>
        ) : null}
      </form>

      {invalidSearch ? (
        <AdminAlert tone="warning">Enter a valid generation ID (36-character UUID).</AdminAlert>
      ) : null}

      {rows.length === 0 ? (
        <AdminEmpty icon={<I.Search size={28} />} title="No Generations Found">
          Try a different generation ID or clear the filter.
        </AdminEmpty>
      ) : (
        <AdminSection
          title={isUuid ? "Search Result" : "Generation Jobs"}
          description="Open a job to inspect composed prompts, variants, ledger entries, and operator actions."
          flush
        >
          {!isUuid ? (
            <div className="tabs" style={{ padding: "0 6px" }}>
              {STATUS_TABS.map((tab) => (
                <Link
                  key={tab.key}
                  href={tabHref(tab.key)}
                  className={`tab${activeTab === tab.key ? " is-active" : ""}`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="admin-list">
            {rows.map((row) => (
              <Link key={row.id} href={`/admin/generations/${row.id}`} className="admin-list-row">
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>
                    {row.id}
                  </div>
                  <div className="admin-list-row__title">{row.brief}</div>
                  <div className="admin-list-row__meta">{row.workspaceName ?? row.workspaceId}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <AdminStatus status={row.status} />
                  <span className="admin-num" style={{ fontSize: 11, color: "var(--fg-3)" }}>
                    {formatAdminDate(row.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {(hasPrev || hasNext) && (
            <div className="admin-pagination">
              <span className="admin-pagination__info">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of{" "}
                {totalCount} jobs
              </span>
              <div className="admin-pagination__nav">
                {hasPrev ? (
                  <Link
                    href={tabHref(activeTab, page - 1)}
                    className="btn btn--secondary btn--sm"
                  >
                    <I.ChevronLeft size={13} /> Previous
                  </Link>
                ) : null}
                {hasNext ? (
                  <Link
                    href={tabHref(activeTab, page + 1)}
                    className="btn btn--secondary btn--sm"
                  >
                    Next <I.ChevronRight size={13} />
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </AdminSection>
      )}
    </AdminPage>
  );
}
