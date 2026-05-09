import Link from "next/link";

import { createDb, generations, workspaces } from "@vyora/db";
import { eq, desc } from "drizzle-orm";
import { loadConfig } from "@vyora/shared/config";

import { I } from "@/components/icons";

export const dynamic = "force-dynamic";

function StatusPill({ status }: { status: string }) {
  if (status === "completed")
    return (
      <span className="pill pill--green">
        <I.Check size={11} /> Complete
      </span>
    );
  if (status === "failed" || status === "failed_safety")
    return (
      <span className="pill pill--red">
        <I.AlertCircle size={11} /> {status}
      </span>
    );
  if (status === "running")
    return (
      <span className="pill pill--accent">
        <I.Loader size={11} className="spin" />
        Running
      </span>
    );
  return <span className="pill">{status}</span>;
}

export default async function AdminGenerationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const db = createDb(loadConfig().db.url, "app_admin");

  const trimmedQ = q?.trim() ?? "";
  const isUuid = /^[0-9a-f-]{36}$/i.test(trimmedQ);
  const invalidSearch = trimmedQ.length > 0 && !isUuid;

  let rows: Array<{
    id: string;
    brief: string;
    status: string;
    createdAt: Date;
    workspaceId: string;
    workspaceName: string | null;
  }>;
  if (isUuid) {
    rows = await db
      .select({
        id: generations.id,
        brief: generations.brief,
        status: generations.status,
        createdAt: generations.createdAt,
        workspaceId: generations.workspaceId,
        workspaceName: workspaces.name,
      })
      .from(generations)
      .leftJoin(workspaces, eq(workspaces.id, generations.workspaceId))
      .where(eq(generations.id, trimmedQ))
      .limit(1);
  } else {
    rows = await db
      .select({
        id: generations.id,
        brief: generations.brief,
        status: generations.status,
        createdAt: generations.createdAt,
        workspaceId: generations.workspaceId,
        workspaceName: workspaces.name,
      })
      .from(generations)
      .leftJoin(workspaces, eq(workspaces.id, generations.workspaceId))
      .orderBy(desc(generations.createdAt))
      .limit(50);
  }

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <h1 className="page__title">Generation inspector</h1>
          <p className="page__sub">
            Search and inspect image generation jobs.
          </p>
        </div>
      </div>

      <form
        method="GET"
        style={{ marginBottom: 16, display: "flex", gap: 8, maxWidth: 540 }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <I.Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: 11,
              color: "var(--fg-3)",
            }}
          />
          <input
            className="input mono"
            name="q"
            defaultValue={q ?? ""}
            placeholder="generation_id (36-char UUID)"
            style={{ paddingLeft: 36, fontSize: 13 }}
          />
        </div>
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      </form>

      {invalidSearch ? (
        <div
          className="card"
          style={{
            padding: 16,
            background: "var(--studio-violet-50)",
            color: "var(--studio-violet-700)",
            boxShadow: "none",
            border: "1px solid var(--studio-violet-100)",
            marginBottom: 16,
          }}
        >
          Enter a valid generation ID (36-character UUID).
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="empty card">
          <div className="empty__art">
            <I.Search size={28} />
          </div>
          <div className="empty__title">No generations found</div>
          <div className="empty__sub">Try a different ID or clear the filter.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {rows.map((row, i) => (
            <Link
              key={row.id}
              href={`/admin/generations/${row.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 16,
                padding: 16,
                borderBottom:
                  i < rows.length - 1 ? "1px solid var(--cal-gray-200)" : "0",
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  className="mono t-small"
                  style={{ fontSize: 11, marginBottom: 4 }}
                >
                  {row.id}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.brief}
                </div>
                {row.workspaceName ? (
                  <div className="t-small" style={{ marginTop: 4 }}>
                    {row.workspaceName}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 6,
                }}
              >
                <StatusPill status={row.status} />
                <span className="t-small" style={{ fontSize: 11 }}>
                  {new Date(row.createdAt).toLocaleString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
