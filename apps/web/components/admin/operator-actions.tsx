"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { I } from "@/components/icons";
import { AdminAlert, AdminSection } from "@/components/admin/ui";

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
  const router = useRouter();
  const { generationId, variants } = props;
  const [loading, setLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ ok: boolean; text: string }[]>([]);
  const [flagReason, setFlagReason] = useState("");
  const [overrideTemplateId, setOverrideTemplateId] = useState("");

  function addMessage(ok: boolean, msg: string) {
    setMessages((prev) => [{ ok, text: msg }, ...prev]);
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
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        addMessage(false, `${action} failed: ${String(data.error ?? "unknown error")}`);
      } else {
        addMessage(true, `${action} succeeded: ${JSON.stringify(data)}`);
        router.refresh();
      }
    } catch (err) {
      addMessage(false, `${action} error: ${String(err)}`);
    } finally {
      setLoading(null);
    }
  }

  const hasFailedVariants = variants.some(
    (v) => v.status === "failed" || v.status === "failed_safety",
  );

  return (
    <AdminSection title="Operator Actions" description="Direct intervention controls for this generation job.">
      {messages.length > 0 ? (
        <div aria-live="polite" style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {messages.map((m, i) => (
            <AdminAlert key={i} tone={m.ok ? "success" : "danger"}>
              {m.text}
            </AdminAlert>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!hasFailedVariants || loading !== null}
            onClick={() => void handleAction("resume")}
          >
            <I.Refresh size={13} />
            {loading === "resume" ? "Resuming…" : "Resume Failed Variants"}
          </button>
          {!hasFailedVariants ? (
            <p className="hint" style={{ marginTop: 4 }}>No failed variants to resume.</p>
          ) : null}
        </div>

        <div>
          <button
            type="button"
            className="btn btn--secondary btn--danger btn--sm"
            disabled={loading !== null}
            onClick={() => void handleAction("refund")}
          >
            <I.Receipt size={13} />
            {loading === "refund" ? "Refunding…" : "Refund Generation Credits"}
          </button>
        </div>

        <div>
          <label className="label" htmlFor="override-template">
            Override model — fallback template ID
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="override-template"
              className="input mono"
              type="text"
              placeholder="template UUID"
              value={overrideTemplateId}
              onChange={(e) => setOverrideTemplateId(e.target.value)}
              style={{ fontSize: 13 }}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              style={{ flexShrink: 0 }}
              disabled={!overrideTemplateId || loading !== null}
              onClick={() =>
                void handleAction("override-model", { fallbackTemplateId: overrideTemplateId })
              }
            >
              {loading === "override-model" ? "Overriding…" : "Override & Rerun"}
            </button>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="flag-reason">
            Flag for AUP — reason (optional)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="flag-reason"
              className="input"
              type="text"
              placeholder="reason for AUP flag"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn--secondary btn--danger btn--sm"
              style={{ flexShrink: 0 }}
              disabled={loading !== null}
              onClick={() => void handleAction("flag", { reason: flagReason || undefined })}
            >
              <I.AlertTriangle size={13} />
              {loading === "flag" ? "Flagging…" : "Flag for AUP"}
            </button>
          </div>
        </div>
      </div>
    </AdminSection>
  );
}
