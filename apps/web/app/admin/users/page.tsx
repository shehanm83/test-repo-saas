import Link from "next/link";

import { createDb, users, workspaces, workspaceMembers } from "@layertone/db";
import { eq, sql, inArray } from "@layertone/db";
import { ilike } from "drizzle-orm";
import { loadConfig } from "@layertone/shared/config";

import { I } from "@/components/icons";
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

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["key"];

function tabHref(tab: StatusTab, page = 0, q?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (tab !== "all") params.set("status", tab);
  if (page > 0) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/users${qs ? `?${qs}` : ""}`;
}

const DOT_COLORS = ["#1D3B2A", "#5E5CE6", "#C97A3F", "#7A0E0E", "#1F7A5A", "#B5651D"];
function dotColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length]!;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageParam } = await searchParams;
  const db = createDb(loadConfig().db.url, "app_admin");

  const activeTab: StatusTab = STATUS_TABS.some((t) => t.key === status)
    ? (status as StatusTab)
    : "all";
  const page = Math.max(0, parseInt(pageParam ?? "0", 10) || 0);
  const trimmedQ = q?.trim() ?? "";

  const userRows = await (trimmedQ
    ? db
        .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt })
        .from(users)
        .where(ilike(users.email, `%${trimmedQ}%`))
        .limit(PAGE_SIZE)
        .offset(page * PAGE_SIZE)
    : db
        .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt })
        .from(users)
        .limit(PAGE_SIZE)
        .offset(page * PAGE_SIZE));

  const [countRow] = await (trimmedQ
    ? db.select({ count: sql<number>`count(*)::int` }).from(users).where(ilike(users.email, `%${trimmedQ}%`))
    : db.select({ count: sql<number>`count(*)::int` }).from(users)) as [{ count: number }];
  const totalCount = countRow?.count ?? 0;

  const userIds = userRows.map((u) => u.id);
  const wsRows = userIds.length > 0
    ? await db
        .select({
          userId: workspaceMembers.userId,
          workspaceId: workspaces.id,
          workspaceName: workspaces.name,
          workspaceStatus: workspaces.status,
          workspacePlan: workspaces.planCode,
          stripeCustomerId: workspaces.stripeCustomerId,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(inArray(workspaceMembers.userId, userIds))
    : [];

  const wsMap = new Map<string, typeof wsRows>();
  for (const row of wsRows) {
    if (!wsMap.has(row.userId)) wsMap.set(row.userId, []);
    wsMap.get(row.userId)!.push(row);
  }

  const filteredUsers = activeTab === "all"
    ? userRows
    : userRows.filter((u) => {
        const uws = wsMap.get(u.id) ?? [];
        return uws.some((w) => w.workspaceStatus === activeTab);
      });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  return (
    <AdminPage
      eyebrow={<><I.User size={12} /> Operations</>}
      title="Users & Workspaces"
      description="Search users by email, then inspect their workspaces, billing, and status."
    >
      <AdminStatGrid>
        <AdminStat
          label="Total users"
          value={formatAdminNumber(totalCount)}
          detail={trimmedQ ? "Search results" : `Page ${page + 1} of ${totalPages || 1}`}
          icon={<I.User size={14} />}
        />
        <AdminStat
          label="Workspaces"
          value={formatAdminNumber(wsRows.length)}
          detail="Across users on this page"
          icon={<I.Briefcase size={14} />}
        />
        <AdminStat
          label="Active"
          value={formatAdminNumber(wsRows.filter((w) => w.workspaceStatus === "active").length)}
          detail="Active workspaces on this page"
          icon={<I.Check size={14} />}
          tone="success"
        />
        <AdminStat
          label="Suspended"
          value={formatAdminNumber(wsRows.filter((w) => w.workspaceStatus === "suspended").length)}
          detail="Restricted workspaces on this page"
          icon={<I.Lock size={14} />}
          tone={wsRows.some((w) => w.workspaceStatus === "suspended") ? "danger" : "neutral"}
        />
      </AdminStatGrid>

      <form method="GET" style={{ marginBottom: 16, display: "flex", gap: 8, maxWidth: 540 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <I.Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-3)" }} />
          <input
            className="input"
            name="q"
            autoComplete="off"
            defaultValue={q ?? ""}
            placeholder="Search by email…"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <button type="submit" className="btn btn--primary">Search</button>
        {trimmedQ ? (
          <Link href="/admin/users" className="btn btn--secondary">Clear</Link>
        ) : null}
      </form>

      {filteredUsers.length === 0 ? (
        <AdminEmpty icon={<I.Search size={28} />} title="No Results Found">
          Try a different email address.
        </AdminEmpty>
      ) : (
        <AdminSection title="Results" flush>
          {!trimmedQ ? (
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
            {filteredUsers.map((user) => {
              const userWorkspaces = wsMap.get(user.id) ?? [];
              return (
                <div
                  key={user.id}
                  className="admin-list-row"
                  style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="admin-list-row__title">{user.email}</div>
                      <div className="admin-list-row__meta">
                        Role: {user.role} · Joined {formatAdminDate(user.createdAt)}
                      </div>
                    </div>
                    <span className="t-small" style={{ color: "var(--fg-4)" }}>
                      {userWorkspaces.length === 0
                        ? "No workspace"
                        : `${userWorkspaces.length} workspace${userWorkspaces.length > 1 ? "s" : ""}`}
                    </span>
                  </div>
                  {userWorkspaces.length > 0 ? (
                    <div
                      style={{
                        paddingLeft: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        borderLeft: "2px solid var(--cal-gray-200)",
                      }}
                    >
                      {userWorkspaces.map((ws) => (
                        <div
                          key={ws.workspaceId}
                          style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 100,
                              background: dotColor(ws.workspaceId),
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{ws.workspaceName}</span>
                          <span className="pill">{ws.workspacePlan}</span>
                          <AdminStatus status={ws.workspaceStatus ?? "unknown"} />
                          {ws.stripeCustomerId ? (
                            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>
                              {ws.stripeCustomerId}
                            </span>
                          ) : null}
                          <Link
                            href={`/admin/users/${ws.workspaceId}`}
                            className="btn btn--ghost btn--sm"
                            style={{ textDecoration: "none", fontSize: 12, marginLeft: "auto" }}
                          >
                            View <I.ChevronRight size={11} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {(hasPrev || hasNext) && (
            <div className="admin-pagination">
              <span className="admin-pagination__info">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} users
              </span>
              <div className="admin-pagination__nav">
                {hasPrev ? (
                  <Link href={tabHref(activeTab, page - 1, trimmedQ)} className="btn btn--secondary btn--sm">
                    <I.ChevronLeft size={13} /> Previous
                  </Link>
                ) : null}
                {hasNext ? (
                  <Link href={tabHref(activeTab, page + 1, trimmedQ)} className="btn btn--secondary btn--sm">
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
