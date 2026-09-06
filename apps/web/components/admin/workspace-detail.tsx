"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

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
  formatAdminNumber,
} from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/copy-button";

interface Workspace {
  id: string;
  name: string;
  planCode: string;
  status: string;
  brandQuota: number;
  seatQuota: number;
  monthlyCreditGrant: number;
  stripeCustomerId: string | null;
  createdAt: string;
}

interface Member {
  id: string;
  email: string;
  role: string;
  acceptedAt: string | null;
}

interface LedgerEntry {
  id: string;
  kind: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  generationId: string | null;
}

type LedgerSortKey = "createdAt" | "amount" | "balanceAfter" | "kind";

function sortLedger(entries: LedgerEntry[], key: LedgerSortKey, dir: "asc" | "desc") {
  return [...entries].sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    if (key === "createdAt") { av = a.createdAt; bv = b.createdAt; }
    else if (key === "amount") { av = a.amount; bv = b.amount; }
    else if (key === "balanceAfter") { av = a.balanceAfter; bv = b.balanceAfter; }
    else if (key === "kind") { av = a.kind; bv = b.kind; }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

function SortTh({
  label,
  sortKey,
  align,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: LedgerSortKey;
  align?: "right";
  activeKey: LedgerSortKey;
  dir: "asc" | "desc";
  onSort: (k: LedgerSortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th
      className="admin-sort-th"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
      style={{ textAlign: align ?? "left" }}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className="admin-sort-icon">
        {active
          ? dir === "asc"
            ? <I.ChevronUp size={11} />
            : <I.ChevronDown size={11} />
          : <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M3 4L5.5 1.5L8 4M3 7L5.5 9.5L8 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </span>
    </th>
  );
}

export function WorkspaceDetail(props: {
  workspace: Workspace;
  members: Member[];
  ledgerEntries: LedgerEntry[];
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const { workspace, members, ledgerEntries, page, pageSize } = props;
  const [loading, setLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ ok: boolean; text: string }[]>([]);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [planCode, setPlanCode] = useState(workspace.planCode);
  const [sortKey, setSortKey] = useState<LedgerSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: LedgerSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  }

  const sortedLedger = sortLedger(ledgerEntries, sortKey, sortDir);

  function pushMsg(ok: boolean, text: string) {
    setMessages((p) => [{ ok, text }, ...p]);
  }

  async function handleGrant() {
    const amount = parseInt(grantAmount, 10);
    if (!amount || amount <= 0) {
      pushMsg(false, "Grant amount must be a positive integer");
      return;
    }
    setLoading("grant");
    try {
      const res = await fetch(`/api/admin/users/${workspace.id}/grant`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount, reason: grantReason || undefined }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        pushMsg(false, `Grant failed: ${String(data.error ?? "unknown")}`);
      } else {
        pushMsg(true, `Granted ${amount} credits. New balance: ${String(data.balanceAfter)}`);
        setGrantAmount("");
        setGrantReason("");
        router.refresh();
      }
    } catch (err) {
      pushMsg(false, `Grant error: ${String(err)}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleSuspend(action: "suspend" | "ban" | "reactivate") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/users/${workspace.id}/suspend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        pushMsg(false, `${action} failed: ${String(data.error ?? "unknown")}`);
      } else {
        pushMsg(
          true,
          `Workspace ${
            action === "ban" ? "banned" : action + "ed"
          }. Status: ${String(data.status)}`,
        );
        router.refresh();
      }
    } catch (err) {
      pushMsg(false, `${action} error: ${String(err)}`);
    } finally {
      setLoading(null);
    }
  }

  async function handlePlanUpdate() {
    setLoading("plan");
    try {
      const res = await fetch(`/api/admin/users/${workspace.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planCode }),
      });
      const data = (await res.json()) as { error?: unknown };
      if (!res.ok) {
        pushMsg(false, `Plan update failed: ${String(data.error ?? "unknown")}`);
      } else {
        pushMsg(true, `Plan updated to ${planCode}.`);
        router.refresh();
      }
    } catch (err) {
      pushMsg(false, `Plan update error: ${String(err)}`);
    } finally {
      setLoading(null);
    }
  }

  const currentBalance = ledgerEntries[0]?.balanceAfter ?? 0;

  return (
    <AdminPage
      wide
      eyebrow={
        <>
          <Link href="/admin/users" style={{ color: "inherit", textDecoration: "none" }}>
            Users &amp; Workspaces
          </Link>
          <I.ChevronRight size={12} />
          <span className="mono">{workspace.id.slice(0, 8)}…</span>
        </>
      }
      title={workspace.name}
      description={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="mono">{workspace.id}</span>
          <CopyButton value={workspace.id} label="Copy ID" />
        </span>
      }
      actions={<AdminStatus status={workspace.status} />}
    >
      <AdminStatGrid>
        <AdminStat
          label="Plan"
          value={workspace.planCode.toUpperCase()}
          detail="Current billing mode"
          icon={<I.Crown size={14} />}
          tone="accent"
        />
        <AdminStat
          label="Members"
          value={formatAdminNumber(members.length)}
          detail={`${workspace.seatQuota} seat quota`}
          icon={<I.User size={14} />}
        />
        <AdminStat
          label="Monthly Credits"
          value={formatAdminNumber(workspace.monthlyCreditGrant)}
          detail="Configured grant"
          icon={<I.Coin size={14} />}
        />
        <AdminStat
          label="Ledger Balance"
          value={formatAdminNumber(currentBalance)}
          detail="Latest visible ledger balance"
          icon={<I.Receipt size={14} />}
        />
      </AdminStatGrid>

      {messages.length > 0 ? (
        <div
          aria-live="polite"
          style={{
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          {messages.map((m, i) => (
            <AdminAlert key={i} tone={m.ok ? "success" : "danger"}>
              {m.text}
            </AdminAlert>
          ))}
        </div>
      ) : null}

      <AdminSection title="Workspace Details">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}
        >
          <KV label="Plan">
            <span className="pill pill--accent">
              <I.Crown size={11} /> {workspace.planCode.toUpperCase()}
            </span>
          </KV>
          <KV label="Brand quota" value={workspace.brandQuota} />
          <KV label="Seat quota" value={workspace.seatQuota} />
          <KV label="Monthly credits" value={formatAdminNumber(workspace.monthlyCreditGrant)} />
          {workspace.stripeCustomerId ? (
            <KV label="Stripe customer">
              <span className="mono" style={{ fontSize: 12 }}>
                {workspace.stripeCustomerId}
              </span>
            </KV>
          ) : null}
          <KV label="Created" value={formatAdminDate(workspace.createdAt)} />
        </div>
      </AdminSection>

      <AdminSection title="Pricing Plan">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px auto 1fr",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label className="label" htmlFor="workspace-plan">
              Plan
            </label>
            <select
              id="workspace-plan"
              className="select"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
            >
              <option value="free">Free</option>
              <option value="subscription">Subscription</option>
              <option value="payg">Pay As You Go</option>
            </select>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            disabled={loading !== null || planCode === workspace.planCode}
            onClick={() => void handlePlanUpdate()}
          >
            <I.Save size={14} />
            {loading === "plan" ? "Saving…" : "Update plan"}
          </button>
          <p className="t-small" style={{ margin: 0 }}>
            Free has 20 starter credits and no moods. Subscription grants expiring monthly credits.
            PAYG credits do not expire and retention uses day slots.
          </p>
        </div>
      </AdminSection>

      {members.length > 0 ? (
        <AdminSection title="Members" flush>
          <table className="admin-table">
            <thead>
              <tr>
                {["Email", "Role", "Accepted"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.email}</td>
                  <td>
                    <span className="pill">{m.role}</span>
                  </td>
                  <td>
                    {m.acceptedAt ? (
                      <span className="pill pill--green">
                        <I.Check size={11} /> {formatAdminDate(m.acceptedAt)}
                      </span>
                    ) : (
                      <span className="pill pill--amber">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminSection>
      ) : null}

      <AdminSection title="Manual Credit Grant">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label className="label" htmlFor="grant-amount">
              Amount (credits)
            </label>
            <input
              id="grant-amount"
              className="input"
              type="number"
              name="grantAmount"
              inputMode="numeric"
              min="1"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              placeholder="100"
            />
          </div>
          <div>
            <label className="label" htmlFor="grant-reason">
              Reason (optional)
            </label>
            <input
              id="grant-reason"
              className="input"
              type="text"
              name="grantReason"
              autoComplete="off"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="admin override reason"
            />
          </div>
          <button
            type="button"
            className="btn btn--primary"
            disabled={loading !== null || !grantAmount}
            onClick={() => void handleGrant()}
          >
            <I.Plus size={14} />
            {loading === "grant" ? "Granting…" : "Grant Credits"}
          </button>
        </div>
      </AdminSection>

      <AdminSection title="Workspace Status" description="High-impact safety controls.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn--secondary btn--danger"
            disabled={workspace.status === "suspended" || loading !== null}
            onClick={() => void handleSuspend("suspend")}
          >
            <I.Lock size={14} />
            {loading === "suspend" ? "Suspending…" : "Suspend"}
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--danger"
            disabled={workspace.status === "suspended" || loading !== null}
            onClick={() => void handleSuspend("ban")}
          >
            <I.AlertTriangle size={14} />
            {loading === "ban" ? "Banning…" : "Ban"}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={workspace.status === "active" || loading !== null}
            onClick={() => void handleSuspend("reactivate")}
          >
            <I.Refresh size={14} />
            {loading === "reactivate" ? "Reactivating…" : "Reactivate"}
          </button>
        </div>
      </AdminSection>

      <AdminSection
        title="Ledger History"
        actions={<span className="t-small muted">Page {page + 1}</span>}
        flush
      >
        {ledgerEntries.length === 0 ? (
          <div style={{ padding: 18 }}>
            <AdminEmpty icon={<I.Receipt size={28} />} title="No Ledger Entries" />
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <SortTh label="Kind" sortKey="kind" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Amount" sortKey="amount" align="right" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Balance after" sortKey="balanceAfter" align="right" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <th>Generation</th>
                  <SortTh label="Date" sortKey="createdAt" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedLedger.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className="pill">{entry.kind}</span>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        color:
                          entry.amount >= 0 ? "var(--layertone-green)" : "var(--layertone-red)",
                      }}
                    >
                      {entry.amount >= 0 ? "+" : ""}
                      {entry.amount}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {entry.balanceAfter}
                    </td>
                    <td>
                      {entry.generationId ? (
                        <Link
                          href={`/admin/generations/${entry.generationId}`}
                          className="mono"
                          style={{
                            color: "var(--cal-link)",
                            textDecoration: "underline",
                            fontSize: 12,
                          }}
                        >
                          {entry.generationId.slice(0, 8)}…
                        </Link>
                      ) : (
                        <span style={{ color: "var(--fg-4)" }}>—</span>
                      )}
                    </td>
                    <td style={{ color: "var(--fg-3)" }}>{formatAdminDate(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="admin-pagination">
              <span className="admin-pagination__info">
                {ledgerEntries.length === pageSize
                  ? `${page * pageSize + 1}–${(page + 1) * pageSize} shown`
                  : `${page * pageSize + 1}–${page * pageSize + ledgerEntries.length} shown`}
              </span>
              <div className="admin-pagination__nav">
                {page > 0 ? (
                  <Link href={`?page=${page - 1}`} className="btn btn--secondary btn--sm">
                    <I.ChevronLeft size={12} /> Previous
                  </Link>
                ) : null}
                {ledgerEntries.length === pageSize ? (
                  <Link href={`?page=${page + 1}`} className="btn btn--secondary btn--sm">
                    Next <I.ChevronRight size={12} />
                  </Link>
                ) : null}
              </div>
            </div>
          </>
        )}
      </AdminSection>
    </AdminPage>
  );
}

function KV({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-3)",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 14 }}>{children ?? value ?? "—"}</div>
    </div>
  );
}
