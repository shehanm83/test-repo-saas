"use client";

import { useState } from "react";

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

export function WorkspaceDetail(props: {
  workspace: Workspace;
  members: Member[];
  ledgerEntries: LedgerEntry[];
  page: number;
  pageSize: number;
}) {
  const { workspace, members, ledgerEntries, page, pageSize } = props;
  const [loading, setLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");

  function addMessage(msg: string) {
    setMessages((prev) => [msg, ...prev]);
  }

  async function handleGrant() {
    const amount = parseInt(grantAmount, 10);
    if (!amount || amount <= 0) {
      addMessage("Grant amount must be a positive integer");
      return;
    }
    setLoading("grant");
    try {
      const res = await fetch(`/api/admin/users/${workspace.id}/grant`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount, reason: grantReason || undefined }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        addMessage(`Grant failed: ${String(data.error ?? "unknown")}`);
      } else {
        addMessage(`Granted ${amount} credits. New balance: ${String(data.balanceAfter)}`);
        setGrantAmount("");
        setGrantReason("");
        setTimeout(() => location.reload(), 800);
      }
    } catch (err) {
      addMessage(`Grant error: ${String(err)}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleSuspend(action: "suspend" | "reactivate") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/users/${workspace.id}/suspend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        addMessage(`${action} failed: ${String(data.error ?? "unknown")}`);
      } else {
        addMessage(`Workspace ${action}ed. Status: ${String(data.status)}`);
        setTimeout(() => location.reload(), 800);
      }
    } catch (err) {
      addMessage(`${action} error: ${String(err)}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="studio-page">
      {/* Workspace info */}
      <div className="studio-card" style={{ marginBottom: "1.5rem" }}>
        <div className="studio-page-head">
          <div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>{workspace.name}</h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{workspace.id}</p>
          </div>
          <span
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              background: workspace.status === "active" ? "#d1fae5" : "#fee2e2",
              color: workspace.status === "active" ? "#065f46" : "#991b1b",
            }}
          >
            {workspace.status}
          </span>
        </div>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "0.25rem 1rem",
            marginTop: "1rem",
            fontSize: "0.875rem",
          }}
        >
          <dt style={{ color: "#6b7280" }}>Plan</dt>
          <dd>{workspace.planCode}</dd>
          <dt style={{ color: "#6b7280" }}>Brand quota</dt>
          <dd>{workspace.brandQuota}</dd>
          <dt style={{ color: "#6b7280" }}>Seat quota</dt>
          <dd>{workspace.seatQuota}</dd>
          <dt style={{ color: "#6b7280" }}>Monthly credit grant</dt>
          <dd>{workspace.monthlyCreditGrant}</dd>
          {workspace.stripeCustomerId && (
            <>
              <dt style={{ color: "#6b7280" }}>Stripe customer</dt>
              <dd style={{ fontFamily: "monospace" }}>{workspace.stripeCustomerId}</dd>
            </>
          )}
          <dt style={{ color: "#6b7280" }}>Created</dt>
          <dd>{new Date(workspace.createdAt).toLocaleString()}</dd>
        </dl>
      </div>

      {/* Members */}
      {members.length > 0 && (
        <div className="studio-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Members</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Email</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Role</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Accepted</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.5rem" }}>{m.email}</td>
                  <td style={{ padding: "0.5rem" }}>{m.role}</td>
                  <td style={{ padding: "0.5rem", color: "#6b7280" }}>
                    {m.acceptedAt ? new Date(m.acceptedAt).toLocaleDateString() : "pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual grant */}
      <div className="studio-card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Manual credit grant</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
              Amount (credits)
            </label>
            <input
              type="number"
              min="1"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              style={{
                padding: "0.375rem 0.625rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                width: "8rem",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "12rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
              Reason (optional)
            </label>
            <input
              type="text"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="admin override reason"
              style={{
                padding: "0.375rem 0.625rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                width: "100%",
              }}
            />
          </div>
          <button
            type="button"
            disabled={loading !== null || !grantAmount}
            onClick={() => void handleGrant()}
            style={{
              padding: "0.375rem 1rem",
              borderRadius: "0.375rem",
              border: "none",
              background: loading === null && grantAmount ? "#1d4ed8" : "#e5e7eb",
              color: loading === null && grantAmount ? "#fff" : "#9ca3af",
              cursor: loading === null && grantAmount ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {loading === "grant" ? "Granting…" : "Grant credits"}
          </button>
        </div>
      </div>

      {/* Suspend/Reactivate */}
      <div className="studio-card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Workspace status</h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            disabled={workspace.status === "suspended" || loading !== null}
            onClick={() => void handleSuspend("suspend")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #fca5a5",
              background: workspace.status !== "suspended" && loading === null ? "#fee2e2" : "#f3f4f6",
              color: workspace.status !== "suspended" ? "#991b1b" : "#9ca3af",
              cursor:
                workspace.status !== "suspended" && loading === null ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {loading === "suspend" ? "Suspending…" : "Suspend workspace"}
          </button>
          <button
            type="button"
            disabled={workspace.status === "active" || loading !== null}
            onClick={() => void handleSuspend("reactivate")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #6ee7b7",
              background: workspace.status !== "active" && loading === null ? "#d1fae5" : "#f3f4f6",
              color: workspace.status !== "active" ? "#065f46" : "#9ca3af",
              cursor: workspace.status !== "active" && loading === null ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {loading === "reactivate" ? "Reactivating…" : "Reactivate workspace"}
          </button>
        </div>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {messages.map((msg, i) => (
            <p
              key={i}
              style={{
                fontSize: "0.75rem",
                padding: "0.375rem 0.625rem",
                background: msg.includes("failed") || msg.includes("error") ? "#fee2e2" : "#d1fae5",
                borderRadius: "0.25rem",
                color: msg.includes("failed") || msg.includes("error") ? "#991b1b" : "#065f46",
              }}
            >
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* Ledger history */}
      <div className="studio-card">
        <h2 style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
          Ledger history
          {page > 0 && <span style={{ fontWeight: 400, color: "#6b7280" }}> — page {page + 1}</span>}
        </h2>
        {ledgerEntries.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No ledger entries.</p>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Kind</th>
                  <th style={{ textAlign: "right", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Amount</th>
                  <th style={{ textAlign: "right", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Balance after</th>
                  <th style={{ textAlign: "left", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Generation</th>
                  <th style={{ textAlign: "left", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.5rem" }}>{entry.kind}</td>
                    <td
                      style={{
                        padding: "0.5rem",
                        textAlign: "right",
                        color: entry.amount >= 0 ? "#065f46" : "#991b1b",
                      }}
                    >
                      {entry.amount >= 0 ? "+" : ""}
                      {entry.amount}
                    </td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>{entry.balanceAfter}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {entry.generationId ? (
                        <a
                          href={`/admin/generations/${entry.generationId}`}
                          style={{ color: "#1d4ed8", textDecoration: "underline", fontFamily: "monospace", fontSize: "0.75rem" }}
                        >
                          {entry.generationId.slice(0, 8)}…
                        </a>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem", color: "#6b7280" }}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", fontSize: "0.875rem" }}>
              {page > 0 && (
                <a href={`?page=${page - 1}`} style={{ color: "#1d4ed8", textDecoration: "underline" }}>
                  &larr; Previous
                </a>
              )}
              {ledgerEntries.length === pageSize && (
                <a href={`?page=${page + 1}`} style={{ color: "#1d4ed8", textDecoration: "underline" }}>
                  Next &rarr;
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
