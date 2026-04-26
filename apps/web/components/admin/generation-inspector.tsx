"use client";

import Link from "next/link";

interface Variant {
  id: string;
  templateId: string;
  modelUsed: string | null;
  outputS3Key: string | null;
  creditCost: number;
  renderMs: number | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  errorPayload: unknown;
}

interface LedgerEntry {
  id: string;
  kind: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  payload: string | null;
  isAdminAction: boolean;
  createdAt: string;
}

interface Generation {
  id: string;
  workspaceId: string;
  brief: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  settings: unknown;
  priceBookVersion: number;
}

interface Workspace {
  id: string;
  name: string;
  status: string;
}

export function GenerationInspector(props: {
  generation: Generation;
  variants: Variant[];
  ledgerEntries: LedgerEntry[];
  auditEntries: AuditEntry[];
  workspace: Workspace | null;
}) {
  const { generation, variants, ledgerEntries, auditEntries, workspace } = props;

  const statusColors: Record<string, string> = {
    pending: "background-color:#fef3c7;color:#92400e",
    running: "background-color:#dbeafe;color:#1e40af",
    completed: "background-color:#d1fae5;color:#065f46",
    failed: "background-color:#fee2e2;color:#991b1b",
    failed_safety: "background-color:#fce7f3;color:#9d174d",
    queued: "background-color:#e0e7ff;color:#3730a3",
  };

  return (
    <div className="studio-page">
      {/* Summary */}
      <div className="studio-card" style={{ marginBottom: "1.5rem" }}>
        <div className="studio-page-head">
          <div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Generation {generation.id}</h1>
            {workspace && (
              <p>
                Workspace:{" "}
                <Link href={`/admin/users/${workspace.id}`} style={{ textDecoration: "underline" }}>
                  {workspace.name}
                </Link>{" "}
                &middot; {workspace.status}
              </p>
            )}
          </div>
          <span
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              ...Object.fromEntries(
                (statusColors[generation.status] ?? "")
                  .split(";")
                  .filter(Boolean)
                  .map((s) => s.split(":") as [string, string]),
              ),
            }}
          >
            {generation.status}
          </span>
        </div>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.25rem 1rem", marginTop: "1rem", fontSize: "0.875rem" }}>
          <dt style={{ color: "#6b7280" }}>Brief</dt>
          <dd>{generation.brief}</dd>
          <dt style={{ color: "#6b7280" }}>Created</dt>
          <dd>{new Date(generation.createdAt).toLocaleString()}</dd>
          {generation.completedAt && (
            <>
              <dt style={{ color: "#6b7280" }}>Completed</dt>
              <dd>{new Date(generation.completedAt).toLocaleString()}</dd>
            </>
          )}
          <dt style={{ color: "#6b7280" }}>Pricebook version</dt>
          <dd>{generation.priceBookVersion}</dd>
        </dl>
      </div>

      {/* Variant Mosaic */}
      <div className="studio-card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 600, marginBottom: "1rem" }}>Variants ({variants.length})</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
          {variants.map((variant) => (
            <div
              key={variant.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                fontSize: "0.75rem",
              }}
            >
              <div
                style={{
                  background: "#f3f4f6",
                  borderRadius: "0.25rem",
                  height: "100px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.5rem",
                  color: "#9ca3af",
                  fontSize: "0.625rem",
                }}
              >
                {variant.outputS3Key ? "output saved" : "no output"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                <span style={{ fontFamily: "monospace", fontSize: "0.625rem", color: "#6b7280" }}>
                  {variant.id.slice(0, 8)}…
                </span>
                <span
                  style={{
                    padding: "0.125rem 0.375rem",
                    borderRadius: "9999px",
                    fontSize: "0.625rem",
                    fontWeight: 600,
                    background: variant.status === "completed" ? "#d1fae5" : variant.status.startsWith("failed") ? "#fee2e2" : "#e0e7ff",
                    color: variant.status === "completed" ? "#065f46" : variant.status.startsWith("failed") ? "#991b1b" : "#3730a3",
                  }}
                >
                  {variant.status}
                </span>
              </div>
              <div style={{ color: "#6b7280" }}>
                <div>{variant.modelUsed ?? "—"}</div>
                <div>{variant.creditCost} credits</div>
                {variant.renderMs != null && <div>{variant.renderMs}ms</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ledger entries */}
      {ledgerEntries.length > 0 && (
        <div className="studio-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 600, marginBottom: "1rem" }}>Ledger entries</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Kind</th>
                <th style={{ textAlign: "right", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Amount</th>
                <th style={{ textAlign: "right", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Balance after</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: "#6b7280", fontWeight: 500 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.5rem" }}>{entry.kind}</td>
                  <td style={{ padding: "0.5rem", textAlign: "right", color: entry.amount >= 0 ? "#065f46" : "#991b1b" }}>
                    {entry.amount >= 0 ? "+" : ""}{entry.amount}
                  </td>
                  <td style={{ padding: "0.5rem", textAlign: "right" }}>{entry.balanceAfter}</td>
                  <td style={{ padding: "0.5rem", color: "#6b7280" }}>{new Date(entry.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit log */}
      {auditEntries.length > 0 && (
        <div className="studio-card">
          <h2 style={{ fontWeight: 600, marginBottom: "1rem" }}>Operator actions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {auditEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.375rem",
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  background: entry.isAdminAction ? "#fffbeb" : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 500 }}>{entry.action}</span>
                  <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                {entry.payload && (
                  <pre style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280", whiteSpace: "pre-wrap" }}>
                    {entry.payload}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
