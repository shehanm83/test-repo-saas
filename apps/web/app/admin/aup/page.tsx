"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

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

interface FlaggedItem {
  auditId: string;
  generationId: string | null;
  workspaceId: string;
  actorUserId: string | null;
  payload: string | null;
  flaggedAt: string;
  generation: {
    id: string;
    brief: string;
    status: string;
    createdAt: string;
  } | null;
  workspace: {
    id: string;
    name: string;
    status: string;
  } | null;
}

export default function AdminAupPage() {
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ ok: boolean; text: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/aup")
      .then((r) => r.json() as Promise<{ flagged: FlaggedItem[] }>)
      .then((data) => {
        setItems(data.flagged);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function suspendWorkspace(workspaceId: string, generationId: string | null) {
    setActionLoading(workspaceId);
    try {
      const res = await fetch(`/api/admin/aup/${workspaceId}/suspend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "AUP violation", generationId }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setMessages((p) => [
          { ok: false, text: `Suspend failed: ${String(data.error ?? "unknown")}` },
          ...p,
        ]);
      } else {
        setMessages((p) => [{ ok: true, text: `Workspace ${workspaceId} suspended.` }, ...p]);
        setItems((prev) =>
          prev.map((item) =>
            item.workspaceId === workspaceId && item.workspace
              ? { ...item, workspace: { ...item.workspace, status: "suspended" } }
              : item,
          ),
        );
      }
    } catch (err) {
      setMessages((p) => [{ ok: false, text: `Suspend error: ${String(err)}` }, ...p]);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <AdminPage
      eyebrow={
        <>
          <I.Shield size={12} />
          Safety
        </>
      }
      title="AUP Enforcement"
      description="Generations flagged for Acceptable Use Policy review."
    >
      <AdminStatGrid>
        <AdminStat
          label="Flagged"
          value={loading ? "…" : formatAdminNumber(items.length)}
          detail="Items requiring review"
          icon={<I.AlertTriangle size={14} />}
          tone={items.length > 0 ? "danger" : "success"}
        />
        <AdminStat
          label="Suspended"
          value={formatAdminNumber(
            items.filter((item) => item.workspace?.status === "suspended").length,
          )}
          detail="Already restricted"
          icon={<I.Lock size={14} />}
        />
        <AdminStat
          label="Generations"
          value={formatAdminNumber(items.filter((item) => item.generationId).length)}
          detail="Linked to inspector records"
          icon={<I.Image size={14} />}
        />
        <AdminStat
          label="Workspaces"
          value={formatAdminNumber(new Set(items.map((item) => item.workspaceId)).size)}
          detail="Distinct workspaces in view"
          icon={<I.Briefcase size={14} />}
        />
      </AdminStatGrid>

      {messages.length > 0 ? (
        <div
          aria-live="polite"
          style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}
        >
          {messages.map((m, i) => (
            <AdminAlert key={i} tone={m.ok ? "success" : "danger"}>
              {m.text}
            </AdminAlert>
          ))}
        </div>
      ) : null}

      {loading ? (
        <AdminSection title="Review Queue">
          <div className="t-small">Loading…</div>
        </AdminSection>
      ) : items.length === 0 ? (
        <AdminEmpty icon={<I.Shield size={28} />} title="No Flagged Generations">
          All clear.
        </AdminEmpty>
      ) : (
        <AdminSection
          title="Review Queue"
          description="Inspect flagged generations and suspend workspaces when the violation is confirmed."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item) => {
              const reason = (() => {
                if (!item.payload) return null;
                try {
                  const parsed = JSON.parse(item.payload) as { reason?: string; tags?: string[] };
                  return parsed.reason ?? parsed.tags?.join(", ") ?? item.payload;
                } catch {
                  return item.payload;
                }
              })();
              return (
                <div
                  key={item.auditId}
                  className="card"
                  style={{
                    padding: 20,
                    borderTop: "3px solid var(--layertone-red)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t-small mono" style={{ marginBottom: 6 }}>
                        <I.AlertTriangle
                          size={11}
                          style={{
                            verticalAlign: "-1px",
                            color: "var(--layertone-red)",
                          }}
                        />{" "}
                        Flagged {formatAdminDate(item.flaggedAt)}
                      </div>
                      {item.generation ? (
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                          {item.generation.brief}
                        </div>
                      ) : null}
                      {reason ? (
                        <div className="t-small" style={{ marginBottom: 6 }}>
                          Reason: {reason}
                        </div>
                      ) : null}
                      {item.workspace ? (
                        <div className="t-small">
                          Workspace:{" "}
                          <Link
                            href={`/admin/users/${item.workspace.id}`}
                            style={{ color: "var(--cal-link)", textDecoration: "underline" }}
                          >
                            {item.workspace.name}
                          </Link>
                          <span style={{ marginLeft: 8 }}>
                            <AdminStatus status={item.workspace.status} />
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      {item.generationId ? (
                        <Link
                          href={`/admin/generations/${item.generationId}`}
                          className="btn btn--secondary btn--sm"
                          style={{ textDecoration: "none" }}
                        >
                          <I.Search size={11} />
                          Inspect
                        </Link>
                      ) : null}
                      {item.workspace && item.workspace.status !== "suspended" ? (
                        <button
                          type="button"
                          className="btn btn--secondary btn--danger btn--sm"
                          disabled={actionLoading !== null}
                          onClick={() =>
                            void suspendWorkspace(item.workspace!.id, item.generationId)
                          }
                        >
                          <I.Lock size={11} />
                          {actionLoading === item.workspace.id
                            ? "Suspending…"
                            : "Suspend Workspace"}
                        </button>
                      ) : (
                        <span className="t-small">Already suspended</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </AdminSection>
      )}
    </AdminPage>
  );
}
