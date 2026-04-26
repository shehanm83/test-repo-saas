"use client";

import { useState } from "react";

interface Variant {
  id: string;
  status: string;
  templateId: string;
}

export function OperatorActions(props: {
  generationId: string;
  workspaceId: string;
  variants: Variant[];
}) {
  const { generationId, workspaceId, variants } = props;
  const [loading, setLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [flagReason, setFlagReason] = useState("");
  const [overrideTemplateId, setOverrideTemplateId] = useState("");

  function addMessage(msg: string) {
    setMessages((prev) => [msg, ...prev]);
  }

  async function handleAction(action: string, body?: unknown) {
    setLoading(action);
    try {
      const fetchInit: RequestInit = {
        method: "POST",
        headers: { "content-type": "application/json" },
      };
      if (body !== undefined) {
        fetchInit.body = JSON.stringify(body);
      }
      const res = await fetch(`/api/admin/generations/${generationId}/${action}`, fetchInit);
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        addMessage(`${action} failed: ${String(data.error ?? "unknown error")}`);
      } else {
        addMessage(`${action} succeeded: ${JSON.stringify(data)}`);
        setTimeout(() => location.reload(), 800);
      }
    } catch (err) {
      addMessage(`${action} error: ${String(err)}`);
    } finally {
      setLoading(null);
    }
  }

  const hasFailedVariants = variants.some(
    (v) => v.status === "failed" || v.status === "failed_safety",
  );

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        padding: "1rem",
        background: "#fff",
      }}
    >
      <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Operator Actions</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Resume failed */}
        <div>
          <button
            type="button"
            disabled={!hasFailedVariants || loading !== null}
            onClick={() => void handleAction("resume")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              background: hasFailedVariants ? "#1d4ed8" : "#e5e7eb",
              color: hasFailedVariants ? "#fff" : "#9ca3af",
              cursor: hasFailedVariants && loading === null ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              fontWeight: 500,
              width: "100%",
            }}
          >
            {loading === "resume" ? "Resuming…" : "Resume failed variants"}
          </button>
          {!hasFailedVariants && (
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>
              No failed variants
            </p>
          )}
        </div>

        {/* Override model */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>
            Fallback template ID for override
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="template UUID"
              value={overrideTemplateId}
              onChange={(e) => setOverrideTemplateId(e.target.value)}
              style={{
                flex: 1,
                padding: "0.375rem 0.625rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
            />
            <button
              type="button"
              disabled={!overrideTemplateId || loading !== null}
              onClick={() =>
                void handleAction("override-model", { fallbackTemplateId: overrideTemplateId })
              }
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                background: overrideTemplateId ? "#7c3aed" : "#e5e7eb",
                color: overrideTemplateId ? "#fff" : "#9ca3af",
                cursor: overrideTemplateId && loading === null ? "pointer" : "not-allowed",
                fontSize: "0.875rem",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {loading === "override-model" ? "Overriding…" : "Override & rerun"}
            </button>
          </div>
        </div>

        {/* Refund */}
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void handleAction("refund")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            background: loading === null ? "#059669" : "#e5e7eb",
            color: loading === null ? "#fff" : "#9ca3af",
            cursor: loading === null ? "pointer" : "not-allowed",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          {loading === "refund" ? "Refunding…" : "Refund generation credits"}
        </button>

        {/* Flag for AUP */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>
            Flag reason (optional)
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="reason for AUP flag"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              style={{
                flex: 1,
                padding: "0.375rem 0.625rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
            />
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => void handleAction("flag", { reason: flagReason || undefined })}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                background: loading === null ? "#dc2626" : "#e5e7eb",
                color: loading === null ? "#fff" : "#9ca3af",
                cursor: loading === null ? "pointer" : "not-allowed",
                fontSize: "0.875rem",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {loading === "flag" ? "Flagging…" : "Flag for AUP"}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
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
    </div>
  );
}
