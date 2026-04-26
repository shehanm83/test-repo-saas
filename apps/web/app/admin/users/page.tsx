import Link from "next/link";

import { createDb, users, workspaces, workspaceMembers } from "@studio/db";
import { eq, ilike, or } from "drizzle-orm";
import { loadConfig } from "@studio/shared";

import { I } from "@/components/icons";

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

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Users &amp; Workspaces</h1>
          <p className="page__sub">
            Search users by email, workspace name, or Stripe customer ID.
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
            className="input"
            name="q"
            defaultValue={q ?? ""}
            placeholder="email, workspace name, or Stripe customer ID…"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="empty card">
          <div className="empty__art">
            <I.Search size={28} />
          </div>
          <div className="empty__title">No results found</div>
          <div className="empty__sub">Try a different search term.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {rows.map((row, i) => (
            <div
              key={`${row.userId}-${row.workspaceId ?? "none"}`}
              style={{
                padding: "12px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: i < rows.length - 1 ? "1px solid var(--cal-gray-200)" : "0",
              }}
            >
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{row.email}</div>
                <div className="t-small" style={{ marginTop: 2, fontSize: 12 }}>
                  Role: {row.role} · Joined{" "}
                  {new Date(row.createdAt).toLocaleDateString()}
                </div>
                {row.workspaceName ? (
                  <div className="t-small" style={{ marginTop: 2, fontSize: 12 }}>
                    Workspace: {row.workspaceName} ({row.workspacePlan})
                    {row.stripeCustomerId ? (
                      <span className="mono"> · {row.stripeCustomerId}</span>
                    ) : null}
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
                {row.workspaceId ? (
                  <>
                    <span
                      className={`pill ${
                        row.workspaceStatus === "active"
                          ? "pill--green"
                          : row.workspaceStatus === "suspended"
                            ? "pill--red"
                            : row.workspaceStatus === "read_only"
                              ? "pill--amber"
                              : ""
                      }`}
                    >
                      {row.workspaceStatus}
                    </span>
                    <Link
                      href={`/admin/users/${row.workspaceId}`}
                      style={{
                        fontSize: 12,
                        color: "var(--cal-link)",
                        textDecoration: "underline",
                      }}
                    >
                      View workspace
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
