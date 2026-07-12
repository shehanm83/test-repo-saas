"use client";

import Link from "next/link";
import React from "react";

import { I } from "@/components/icons";
import {
  AdminPage,
  AdminSection,
  AdminStat,
  AdminStatGrid,
  AdminStatus,
  formatAdminDate,
  formatAdminNumber,
} from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/copy-button";
import { OperatorActions } from "@/components/admin/operator-actions";

interface Variant {
  id: string;
  status: string;
  modelUsed: string | null;
  templateId: string;
  outputS3Key: string | null;
  url: string | null;
  creditCost: number;
  renderMs: number | null;
  errorPayload: unknown;
}

interface LedgerEntry {
  id: string;
  createdAt: string;
  kind: string;
  amount: number;
  metadata: Record<string, unknown> | null;
  generationId: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  payload: string | null;
  createdAt: string;
}

interface InspectorData {
  generation: {
    id: string;
    workspaceId: string;
    brandId: string;
    moodId: string | null;
    brief: string;
    status: string;
    settings: Record<string, unknown>;
    requestedByUserId: string;
    createdAt: string;
    completedAt: string | null;
  };
  brandName: string | null;
  moodName: string | null;
  workspaceName: string | null;
  userEmail: string | null;
  variants: Variant[];
  ledger: LedgerEntry[];
  audit: AuditEntry[];
}

function KV({
  k,
  v,
  mono,
  small,
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div style={{ marginBottom: small ? 6 : 0 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-3)",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontWeight: 600,
        }}
      >
        {k}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: small ? 12 : 14,
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
          wordBreak: "break-all",
        }}
      >
        {v}
      </div>
    </div>
  );
}

type LedgerSortKey = "createdAt" | "amount" | "kind";

export function GenerationInspector({ data }: { data: InspectorData }) {
  const gen = data.generation;
  const [ledgerSort, setLedgerSort] = React.useState<LedgerSortKey>("createdAt");
  const [ledgerDir, setLedgerDir] = React.useState<"asc" | "desc">("asc");

  function handleLedgerSort(key: LedgerSortKey) {
    if (key === ledgerSort) {
      setLedgerDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setLedgerSort(key);
      setLedgerDir("asc");
    }
  }

  const sortedLedger = [...data.ledger].sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    if (ledgerSort === "createdAt") { av = a.createdAt; bv = b.createdAt; }
    else if (ledgerSort === "amount") { av = a.amount; bv = b.amount; }
    else if (ledgerSort === "kind") { av = a.kind; bv = b.kind; }
    if (av < bv) return ledgerDir === "asc" ? -1 : 1;
    if (av > bv) return ledgerDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalCredits = data.ledger
    .filter((e) => e.generationId === gen.id)
    .reduce((sum, e) => sum + e.amount, 0);
  const duration =
    gen.completedAt && gen.createdAt
      ? `${
          Math.round(
            (new Date(gen.completedAt).getTime() - new Date(gen.createdAt).getTime()) / 100,
          ) / 10
        }s`
      : "—";

  return (
    <AdminPage
      wide
      eyebrow={
        <>
          <I.Shield size={12} />
          Generation Inspector
        </>
      }
      title={data.brandName ?? "Generation Detail"}
      description={`Generation ${gen.id}`}
      actions={
        <Link
          href="/admin/generations"
          className="btn btn--secondary"
          style={{ textDecoration: "none" }}
        >
          <I.ArrowLeft size={14} />
          Back to Jobs
        </Link>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        <code className="mono" style={{ fontSize: 12, color: "var(--fg-2)", background: "var(--cal-gray-100)", padding: "4px 10px", borderRadius: 6 }}>
          {gen.id}
        </code>
        <CopyButton value={gen.id} label="Copy ID" />
      </div>

      <AdminStatGrid>
        <AdminStat
          label="Status"
          value={<AdminStatus status={gen.status} />}
          detail={gen.completedAt ? `Finished in ${duration}` : "Still waiting for completion"}
          icon={<I.Info size={14} />}
        />
        <AdminStat
          label="Variants"
          value={data.variants.length}
          detail={`${data.variants.filter((variant) => variant.url).length} outputs available`}
          icon={<I.Grid size={14} />}
        />
        <AdminStat
          label="Credits"
          value={formatAdminNumber(Math.abs(totalCredits))}
          detail="Ledger impact for this generation"
          icon={<I.Coin size={14} />}
          tone="accent"
        />
        <AdminStat
          label="Audit Events"
          value={data.audit.length}
          detail="Operator and system entries"
          icon={<I.History size={14} />}
        />
      </AdminStatGrid>

      <AdminSection title="Summary">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <KV k="Generation ID" v={gen.id} mono />
          <KV k="Workspace" v={data.workspaceName ?? gen.workspaceId} />
          <KV k="User" v={data.userEmail ?? gen.requestedByUserId} />
          <KV k="Brand" v={data.brandName ?? gen.brandId} />
          <KV k="Mood" v={data.moodName ?? "—"} />
          <KV
            k="Aspect ratio"
            v={
              ((gen.settings as { output_target?: { aspectRatio?: string } } | null)?.output_target
                ?.aspectRatio ?? "—") as string
            }
          />
          <KV k="Status" v={<AdminStatus status={gen.status} />} />
          <KV k="Total credits" v={formatAdminNumber(Math.abs(totalCredits))} />
          <KV k="Requested" v={formatAdminDate(gen.createdAt)} />
          <KV k="Completed" v={formatAdminDate(gen.completedAt)} />
          <KV k="Duration" v={duration} />
          <KV k="Variants" v={data.variants.length} />
        </div>
      </AdminSection>

      <AdminSection title="Brief">
        <div
          style={{
            background: "var(--cal-gray-50)",
            padding: 14,
            borderRadius: 8,
            fontFamily: "var(--font-body)",
            fontSize: 14,
            boxShadow: "var(--shadow-inset)",
          }}
        >
          {gen.brief}
        </div>
      </AdminSection>

      <AdminSection
        title="Composed Prompts"
        description="Generated prompt payloads used for each variant."
      >
        {data.variants.map((v, i) => (
          <details key={v.id} style={{ marginBottom: 8 }}>
            <summary
              style={{
                cursor: "pointer",
                padding: 10,
                background: "var(--cal-gray-50)",
                borderRadius: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            >
              variant_{i + 1} · {v.templateId.slice(0, 8)} · {v.modelUsed ?? "—"}
            </summary>
            <pre
              style={{
                margin: "8px 0 0",
                padding: 14,
                background: "var(--cal-charcoal)",
                color: "#E8DCC4",
                borderRadius: 8,
                fontSize: 12,
                lineHeight: 1.6,
                overflow: "auto",
              }}
            >
              {JSON.stringify(
                {
                  model: v.modelUsed,
                  templateId: v.templateId,
                  brief: gen.brief,
                  settings: gen.settings,
                },
                null,
                2,
              )}
            </pre>
          </details>
        ))}
      </AdminSection>

      <AdminSection title="Variants" description="Rendered outputs and model metadata.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {data.variants.map((v, i) => (
            <div key={v.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  aspectRatio: "1/1",
                  background: "var(--cal-gray-100)",
                  position: "relative",
                }}
              >
                {v.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : null}
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                  }}
                >
                  <AdminStatus status={v.status} />
                </div>
              </div>
              <details style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
                <summary style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13 }}>
                  Variant {i + 1} · details
                </summary>
                <div style={{ padding: 14, fontSize: 12, color: "var(--fg-3)" }}>
                  <KV k="Model" v={v.modelUsed ?? "—"} mono small />
                  <KV k="Cost" v={`${v.creditCost} credits`} small />
                  <KV k="Render" v={v.renderMs ? `${v.renderMs}ms` : "—"} small />
                  <KV k="S3 key" v={v.outputS3Key ?? "—"} mono small />
                  {v.errorPayload ? (
                    <KV k="Error" v={JSON.stringify(v.errorPayload)} mono small />
                  ) : null}
                </div>
              </details>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Ledger Entries" flush>
        {data.ledger.length === 0 ? (
          <div style={{ padding: 18 }} className="t-small">
            No ledger entries.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th
                  className="admin-sort-th"
                  aria-sort={ledgerSort === "createdAt" ? (ledgerDir === "asc" ? "ascending" : "descending") : undefined}
                  onClick={() => handleLedgerSort("createdAt")}
                >
                  Time
                  <span className="admin-sort-icon">
                    {ledgerSort === "createdAt"
                      ? ledgerDir === "asc" ? <I.ChevronUp size={11} /> : <I.ChevronDown size={11} />
                      : <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M3 4L5.5 1.5L8 4M3 7L5.5 9.5L8 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                </th>
                <th
                  className="admin-sort-th"
                  aria-sort={ledgerSort === "kind" ? (ledgerDir === "asc" ? "ascending" : "descending") : undefined}
                  onClick={() => handleLedgerSort("kind")}
                >
                  Type
                  <span className="admin-sort-icon">
                    {ledgerSort === "kind"
                      ? ledgerDir === "asc" ? <I.ChevronUp size={11} /> : <I.ChevronDown size={11} />
                      : <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M3 4L5.5 1.5L8 4M3 7L5.5 9.5L8 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                </th>
                <th
                  className="admin-sort-th"
                  aria-sort={ledgerSort === "amount" ? (ledgerDir === "asc" ? "ascending" : "descending") : undefined}
                  onClick={() => handleLedgerSort("amount")}
                >
                  Amount
                  <span className="admin-sort-icon">
                    {ledgerSort === "amount"
                      ? ledgerDir === "asc" ? <I.ChevronUp size={11} /> : <I.ChevronDown size={11} />
                      : <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M3 4L5.5 1.5L8 4M3 7L5.5 9.5L8 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                </th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {sortedLedger.map((e) => (
                <tr key={e.id}>
                  <td className="mono admin-num" style={{ fontSize: 12 }}>
                    {formatAdminDate(e.createdAt)}
                  </td>
                  <td>
                    <span className="pill" style={{ fontSize: 11 }}>
                      {e.kind}
                    </span>
                  </td>
                  <td
                    className="mono admin-num"
                    style={{ color: e.amount >= 0 ? "var(--layertone-green)" : "var(--layertone-red)" }}
                  >
                    {e.amount > 0 ? `+${e.amount}` : e.amount}
                  </td>
                  <td>{(e.metadata as { note?: string } | null)?.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminSection>

      <AdminSection title="Audit Log" description="System and operator events for this generation." flush>
        {data.audit.length === 0 ? (
          <div style={{ padding: "14px 18px" }} className="t-small muted">
            No audit events recorded.
          </div>
        ) : (
          <div className="admin-timeline" style={{ padding: "0 18px" }}>
            {data.audit.map((entry) => {
              const isOp = entry.action.startsWith("operator_") || entry.action.startsWith("admin_");
              const isDanger = entry.action.includes("flag") || entry.action.includes("suspend") || entry.action.includes("ban");
              const dotClass = isDanger
                ? "admin-timeline-dot is-danger"
                : isOp
                ? "admin-timeline-dot is-accent"
                : "admin-timeline-dot";

              let payloadText: string | null = null;
              if (entry.payload) {
                try {
                  const p = JSON.parse(entry.payload) as Record<string, unknown>;
                  const parts = Object.entries(p)
                    .slice(0, 3)
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(" · ");
                  payloadText = parts || null;
                } catch {
                  payloadText = entry.payload.slice(0, 120);
                }
              }

              return (
                <div key={entry.id} className="admin-timeline-item">
                  <div className={dotClass} />
                  <div className="admin-timeline-content">
                    <div className="admin-timeline-action">
                      {entry.action.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                    <div className="admin-timeline-meta">
                      {entry.actorUserId
                        ? `By ${entry.actorUserId.slice(0, 8)}…`
                        : "System"}{" "}
                      · {formatAdminDate(entry.createdAt)}
                    </div>
                    {payloadText ? (
                      <div className="admin-timeline-payload">{payloadText}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminSection>

      <OperatorActions
        generationId={gen.id}
        workspaceId={gen.workspaceId}
        variants={data.variants}
      />
    </AdminPage>
  );
}
