import Link from "next/link";

import { createDb, generations, workspaces } from "@studio/db";
import { eq, desc, ilike } from "drizzle-orm";
import { loadConfig } from "@studio/shared";

export const dynamic = "force-dynamic";

export default async function AdminGenerationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const db = createDb(loadConfig().db.url, "app_admin");

  let rows: Array<{
    id: string;
    brief: string;
    status: string;
    createdAt: Date;
    workspaceId: string;
    workspaceName: string | null;
  }>;

  if (q?.trim()) {
    const results = await db
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
      .where(ilike(generations.id, `%${q.trim()}%`))
      .orderBy(desc(generations.createdAt))
      .limit(50);
    rows = results;
  } else {
    const results = await db
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
    rows = results;
  }

  const statusColors: Record<string, string> = {
    pending: "#fef3c7",
    running: "#dbeafe",
    completed: "#d1fae5",
    failed: "#fee2e2",
  };

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>Generation inspector</h1>
          <p>Search and inspect image generation jobs.</p>
        </div>
      </div>

      <form method="GET" style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}>
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by generation ID…"
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "none",
            background: "#1d4ed8",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No generations found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/admin/generations/${row.id}`}
              style={{
                display: "block",
                padding: "0.75rem 1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                background: "#fff",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                    {row.id}
                  </p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.brief}
                  </p>
                  {row.workspaceName && (
                    <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{row.workspaceName}</p>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem", marginLeft: "1rem", flexShrink: 0 }}>
                  <span
                    style={{
                      padding: "0.125rem 0.5rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: statusColors[row.status] ?? "#f3f4f6",
                      color: "#374151",
                    }}
                  >
                    {row.status}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    {new Date(row.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
