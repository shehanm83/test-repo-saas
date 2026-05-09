"use client";

import Link from "next/link";
import React, { useState } from "react";

import { I } from "@/components/icons";

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
    brandId: string | null;
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

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <h3
        style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: 16 }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

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
  return <span className="pill pill--amber">{status}</span>;
}

export function GenerationInspector({ data }: { data: InspectorData }) {
  const [pending, setPending] = useState<string | null>(null);
  const gen = data.generation;
  const totalCredits = data.ledger
    .filter((e) => e.generationId === gen.id)
    .reduce((sum, e) => sum + e.amount, 0);
  const duration =
    gen.completedAt && gen.createdAt
      ? `${Math.round(
          (new Date(gen.completedAt).getTime() - new Date(gen.createdAt).getTime()) / 100,
        ) / 10}s`
      : "—";

  async function action(path: string) {
    setPending(path);
    try {
      await fetch(`/api/admin/generations/${gen.id}/${path}`, { method: "POST" });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="page page--wide" style={{ paddingTop: 24 }}>
      <div className="t-eyebrow" style={{ marginBottom: 8 }}>
        <I.Shield size={11} style={{ verticalAlign: "-1px" }} /> Admin · Generation inspector
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 540 }}>
          <I.Search
            size={14}
            style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-3)" }}
          />
          <input
            className="input mono"
            placeholder="generation_id or workspace_id + brief snippet"
            defaultValue={gen.id}
            style={{ paddingLeft: 36, fontSize: 13 }}
          />
        </div>
        <Link
          href="/admin/generations"
          className="btn btn--secondary"
          style={{ textDecoration: "none" }}
        >
          Back
        </Link>
      </div>

      <InspectorSection title="Summary">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <KV k="Generation ID" v={gen.id} mono />
          <KV k="Workspace" v={data.workspaceName ?? gen.workspaceId} />
          <KV k="User" v={data.userEmail ?? gen.requestedByUserId} />
          <KV k="Brand" v={data.brandName ?? gen.brandId} />
          <KV k="Mood" v={data.moodName ?? "—"} />
          <KV
            k="Aspect ratio"
            v={
              ((gen.settings as { output_target?: { aspectRatio?: string } } | null)
                ?.output_target?.aspectRatio ?? "—") as string
            }
          />
          <KV k="Status" v={<StatusPill status={gen.status} />} />
          <KV k="Total credits" v={Math.abs(totalCredits)} />
          <KV k="Requested" v={new Date(gen.createdAt).toLocaleString()} />
          <KV
            k="Completed"
            v={gen.completedAt ? new Date(gen.completedAt).toLocaleString() : "—"}
          />
          <KV k="Duration" v={duration} />
          <KV k="Variants" v={data.variants.length} />
        </div>
      </InspectorSection>

      <InspectorSection title="The brief">
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
      </InspectorSection>

      <InspectorSection title="Composed prompts">
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
      </InspectorSection>

      <InspectorSection title="Variants">
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
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                  }}
                >
                  <StatusPill status={v.status} />
                </div>
              </div>
              <details style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
                <summary style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13 }}>
                  Variant {i + 1} · details
                </summary>
                <div style={{ padding: 14, fontSize: 12, color: "var(--fg-3)" }}>
                  <KV k="Model" v={v.modelUsed ?? "—"} mono small />
                  <KV
                    k="Cost"
                    v={`${v.creditCost} credits`}
                    small
                  />
                  <KV
                    k="Render"
                    v={v.renderMs ? `${v.renderMs}ms` : "—"}
                    small
                  />
                  <KV
                    k="S3 key"
                    v={v.outputS3Key ?? "—"}
                    mono
                    small
                  />
                  {v.errorPayload ? (
                    <KV
                      k="Error"
                      v={JSON.stringify(v.errorPayload)}
                      mono
                      small
                    />
                  ) : null}
                </div>
              </details>
            </div>
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="Ledger entries">
        {data.ledger.length === 0 ? (
          <div className="t-small" style={{ color: "var(--fg-3)" }}>
            No ledger entries.
          </div>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--cal-gray-50)" }}>
                {["Time", "Type", "Amount", "Note"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
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
              {data.ledger.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
                  <td
                    style={{
                      padding: "8px 14px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                    }}
                  >
                    {new Date(e.createdAt).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    <span className="pill" style={{ fontSize: 11 }}>
                      {e.kind}
                    </span>
                  </td>
                  <td style={{ padding: "8px 14px", fontFamily: "var(--font-mono)" }}>
                    {e.amount > 0 ? `+${e.amount}` : e.amount}
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    {(e.metadata as { note?: string } | null)?.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </InspectorSection>

      <InspectorSection title="Operator actions">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => void action("resume")}
            disabled={pending === "resume"}
          >
            <I.Refresh size={14} />
            Resume failed variants
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => void action("override-model")}
            disabled={pending === "override-model"}
          >
            <I.Sliders size={14} />
            Override model and re-run
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--danger"
            onClick={() => void action("refund")}
            disabled={pending === "refund"}
          >
            <I.Receipt size={14} />
            Refund this generation
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--danger"
            onClick={() => void action("flag")}
            disabled={pending === "flag"}
          >
            <I.AlertTriangle size={14} />
            Flag for AUP review
          </button>
        </div>
      </InspectorSection>
    </div>
  );
}
