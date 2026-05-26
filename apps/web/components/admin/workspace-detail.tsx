"use client";

import Link from "next/link";
import React, { useState } from "react";

import { I } from "@/components/icons";

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

function StatusPill({ status }: { status: string }) {
  if (status === "active")
    return (
      <span className="pill pill--green">
        <I.Check size={11} /> Active
      </span>
    );
  if (status === "suspended")
    return (
      <span className="pill pill--red">
        <I.Lock size={11} /> Suspended
      </span>
    );
  if (status === "read_only")
    return (
      <span className="pill pill--amber">
        <I.AlertCircle size={11} /> Read-only
      </span>
    );
  return <span className="pill">{status}</span>;
}

export function WorkspaceDetail(props: {
  workspace: Workspace;
  members: Member[];
  ledgerEntries: LedgerEntry[];
  page: number;
  pageSize: number;
}) {
  const { workspace, members, ledgerEntries, page, pageSize } = props;
  const [loading, setLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ ok: boolean; text: string }[]>([]);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [planCode, setPlanCode] = useState(workspace.planCode);

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
        pushMsg(
          true,
          `Granted ${amount} credits. New balance: ${String(data.balanceAfter)}`,
        );
        setGrantAmount("");
        setGrantReason("");
        setTimeout(() => location.reload(), 800);
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
        setTimeout(() => location.reload(), 800);
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
        setTimeout(() => location.reload(), 800);
      }
    } catch (err) {
      pushMsg(false, `Plan update error: ${String(err)}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="page page--wide">
      <div className="breadcrumb">
        <Link href="/admin/users" style={{ textDecoration: "none" }}>
          Users &amp; Workspaces
        </Link>
        <I.ChevronRight size={12} />
        <span className="mono">{workspace.id.slice(0, 8)}…</span>
      </div>

      <div className="page__head">
        <div>
          <h1 className="page__title">{workspace.name}</h1>
          <p className="page__sub mono" style={{ fontSize: 12 }}>
            {workspace.id}
          </p>
        </div>
        <StatusPill status={workspace.status} />
      </div>

      {messages.length > 0 ? (
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          {messages.map((m, i) => (
            <span
              key={i}
              className={`pill ${m.ok ? "pill--green" : "pill--red"}`}
            >
              {m.ok ? <I.Check size={11} /> : <I.AlertCircle size={11} />}
              {m.text}
            </span>
          ))}
        </div>
      ) : null}

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>
          Workspace details
        </div>
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
          <KV label="Monthly credits" value={workspace.monthlyCreditGrant.toLocaleString()} />
          {workspace.stripeCustomerId ? (
            <KV label="Stripe customer">
              <span className="mono" style={{ fontSize: 12 }}>
                {workspace.stripeCustomerId}
              </span>
            </KV>
          ) : null}
          <KV label="Created" value={new Date(workspace.createdAt).toLocaleString()} />
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>
          Pricing plan
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "220px auto 1fr", gap: 12, alignItems: "end" }}>
          <div>
            <label className="label">Plan</label>
            <select className="select" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
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
      </div>

      {members.length > 0 ? (
        <div
          className="card"
          style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}
        >
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--cal-gray-200)",
            }}
            className="t-eyebrow"
          >
            Members
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--cal-gray-50)" }}>
                {["Email", "Role", "Accepted"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 24px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--fg-3)",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  style={{ borderTop: "1px solid var(--cal-gray-200)" }}
                >
                  <td style={{ padding: "10px 24px" }}>{m.email}</td>
                  <td style={{ padding: "10px 24px" }}>
                    <span className="pill">{m.role}</span>
                  </td>
                  <td style={{ padding: "10px 24px" }}>
                    {m.acceptedAt ? (
                      <span className="pill pill--green">
                        <I.Check size={11} />{" "}
                        {new Date(m.acceptedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="pill pill--amber">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>
          Manual credit grant
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label className="label">Amount (credits)</label>
            <input
              className="input"
              type="number"
              min="1"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              placeholder="100"
            />
          </div>
          <div>
            <label className="label">Reason (optional)</label>
            <input
              className="input"
              type="text"
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
            {loading === "grant" ? "Granting…" : "Grant credits"}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>
          Workspace status
        </div>
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
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--cal-gray-200)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="t-eyebrow">Ledger history</div>
          {page > 0 ? (
            <span className="t-small">page {page + 1}</span>
          ) : null}
        </div>
        {ledgerEntries.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3)" }}>
            No ledger entries.
          </div>
        ) : (
          <>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr style={{ background: "var(--cal-gray-50)" }}>
                  {["Kind", "Amount", "Balance after", "Generation", "Date"].map(
                    (h, i) => (
                      <th
                        key={h}
                        style={{
                          textAlign: i === 1 || i === 2 ? "right" : "left",
                          padding: "10px 24px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--fg-3)",
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    style={{ borderTop: "1px solid var(--cal-gray-200)" }}
                  >
                    <td style={{ padding: "10px 24px" }}>
                      <span className="pill">{entry.kind}</span>
                    </td>
                    <td
                      style={{
                        padding: "10px 24px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        color:
                          entry.amount >= 0
                            ? "var(--layertone-green)"
                            : "var(--layertone-red)",
                      }}
                    >
                      {entry.amount >= 0 ? "+" : ""}
                      {entry.amount}
                    </td>
                    <td
                      style={{
                        padding: "10px 24px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {entry.balanceAfter}
                    </td>
                    <td style={{ padding: "10px 24px" }}>
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
                    <td style={{ padding: "10px 24px", color: "var(--fg-3)" }}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{
                padding: "12px 24px",
                display: "flex",
                gap: 8,
                borderTop: "1px solid var(--cal-gray-200)",
              }}
            >
              {page > 0 ? (
                <Link
                  href={`?page=${page - 1}`}
                  className="btn btn--secondary btn--sm"
                  style={{ textDecoration: "none" }}
                >
                  <I.ChevronLeft size={12} /> Previous
                </Link>
              ) : null}
              {ledgerEntries.length === pageSize ? (
                <Link
                  href={`?page=${page + 1}`}
                  className="btn btn--secondary btn--sm"
                  style={{ textDecoration: "none", marginLeft: "auto" }}
                >
                  Next <I.ChevronRight size={12} />
                </Link>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
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
      <div style={{ marginTop: 4, fontSize: 14 }}>
        {children ?? value ?? "—"}
      </div>
    </div>
  );
}
