import Link from "next/link";

import { createDb, users, workspaces, workspaceMembers } from "@studio/db";
import { eq, ilike, or } from "drizzle-orm";
import { loadConfig } from "@studio/shared";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const db = createDb(loadConfig().db.url, "app_admin");

  const baseQuery = db
    .select({
      userId: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceStatus: workspaces.status,
      workspacePlan: workspaces.planCode,
      stripeCustomerId: workspaces.stripeCustomerId,
    })
    .from(users)
    .leftJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
    .leftJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId));

  const rows = q?.trim()
    ? await baseQuery
        .where(
          or(
            ilike(users.email, `%${q.trim()}%`),
            ilike(workspaces.name, `%${q.trim()}%`),
            ilike(workspaces.stripeCustomerId, `%${q.trim()}%`),
          ),
        )
        .limit(50)
    : await baseQuery.limit(50);

  const statusColors: Record<string, string> = {
    active: "#d1fae5",
    suspended: "#fee2e2",
    read_only: "#fef3c7",
    deleted: "#f3f4f6",
  };

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>Users &amp; Workspaces</h1>
          <p>Search users by email, workspace name, or Stripe customer ID.</p>
        </div>
      </div>

      <form method="GET" style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}>
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="email, workspace name, or Stripe customer ID…"
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
        <p style={{ color: "#6b7280" }}>No results found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((row) => (
            <div
              key={`${row.userId}-${row.workspaceId ?? "none"}`}
              style={{
                padding: "0.75rem 1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                background: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ fontWeight: 500, fontSize: "0.875rem" }}>{row.email}</p>
                <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  Role: {row.role} &middot; Joined {new Date(row.createdAt).toLocaleDateString()}
                </p>
                {row.workspaceName && (
                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    Workspace: {row.workspaceName} ({row.workspacePlan})
                    {row.stripeCustomerId && (
                      <span style={{ fontFamily: "monospace" }}> · {row.stripeCustomerId}</span>
                    )}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                {row.workspaceId && (
                  <>
                    <span
                      style={{
                        padding: "0.125rem 0.5rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: statusColors[row.workspaceStatus ?? ""] ?? "#f3f4f6",
                        color: "#374151",
                      }}
                    >
                      {row.workspaceStatus}
                    </span>
                    <Link
                      href={`/admin/users/${row.workspaceId}`}
                      style={{
                        fontSize: "0.75rem",
                        color: "#1d4ed8",
                        textDecoration: "underline",
                      }}
                    >
                      View workspace
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
