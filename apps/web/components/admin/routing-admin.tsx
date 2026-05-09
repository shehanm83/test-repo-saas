"use client";

import React, { useMemo, useState } from "react";

import { I } from "@/components/icons";

import { RoutingBucketPanel } from "./routing-bucket-panel";

export interface RoutingRow {
  id: string;
  tierCode: string;
  strengthCode: string | null;
  modelCode: string;
  isDefault: boolean;
  sortOrder: number;
}
export interface ModelRow {
  code: string;
  displayName: string;
  vendor: string;
  status: "active" | "paused" | "deprecated";
}
export interface StrengthRow {
  code: string;
  label: string;
}

export interface BucketKey {
  tierCode: string;
  strengthCode: string | null;
}

export interface BucketGroup extends BucketKey {
  label: string;
  rows: RoutingRow[];
}

function bucketLabel(
  tier: string,
  strengthCode: string | null,
  strengthLabel: string | null,
) {
  const tierTitle = tier.charAt(0).toUpperCase() + tier.slice(1);
  if (!strengthCode) return tierTitle;
  return `${tierTitle} · ${strengthLabel ?? strengthCode}`;
}

function groupBuckets(
  routing: RoutingRow[],
  strengths: StrengthRow[],
): BucketGroup[] {
  const map = new Map<string, BucketGroup>();
  for (const r of routing) {
    const key = `${r.tierCode}|${r.strengthCode ?? ""}`;
    let bucket = map.get(key);
    if (!bucket) {
      const sLabel = r.strengthCode
        ? (strengths.find((s) => s.code === r.strengthCode)?.label ?? null)
        : null;
      bucket = {
        tierCode: r.tierCode,
        strengthCode: r.strengthCode,
        label: bucketLabel(r.tierCode, r.strengthCode, sLabel),
        rows: [],
      };
      map.set(key, bucket);
    }
    bucket.rows.push(r);
  }
  for (const b of map.values()) {
    b.rows.sort((a, c) => a.sortOrder - c.sortOrder);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.tierCode !== b.tierCode) return a.tierCode.localeCompare(b.tierCode);
    return (a.strengthCode ?? "").localeCompare(b.strengthCode ?? "");
  });
}

export function RoutingAdmin({
  routing,
  models,
  strengths,
}: {
  routing: RoutingRow[];
  models: ModelRow[];
  strengths: StrengthRow[];
}) {
  const buckets = useMemo(() => groupBuckets(routing, strengths), [routing, strengths]);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const editingBucket = useMemo(() => {
    if (!editingKey) return null;
    return buckets.find((b) => `${b.tierCode}|${b.strengthCode ?? ""}` === editingKey)
      ?? null;
  }, [buckets, editingKey]);

  function modelDisplay(code: string) {
    return models.find((m) => m.code === code)?.displayName ?? code;
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Routing</h1>
          <p className="page__sub">
            Map tiers and strengths to eligible models. Each bucket has one default.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        {buckets.length === 0 ? (
          <div className="card" style={{ padding: 24, color: "var(--fg-3)" }}>
            No routing buckets configured.
          </div>
        ) : (
          buckets.map((bucket) => {
            const key = `${bucket.tierCode}|${bucket.strengthCode ?? ""}`;
            return (
              <div key={key} className="card" style={{ padding: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <h3 className="t-h4" style={{ margin: 0 }}>
                    {bucket.label}
                  </h3>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setEditingKey(key)}
                  >
                    <I.Edit size={12} />
                    Edit
                  </button>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {bucket.rows.map((r) => (
                    <li
                      key={r.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        padding: "6px 0",
                        borderBottom: "1px solid var(--cal-gray-200)",
                      }}
                    >
                      <span className="mono" style={{ fontSize: 13, flex: 1 }}>
                        {modelDisplay(r.modelCode)}
                      </span>
                      {r.isDefault ? (
                        <span className="pill pill--green">DEFAULT</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>

      {editingBucket ? (
        <RoutingBucketPanel
          bucket={editingBucket}
          allModels={models}
          onClose={() => setEditingKey(null)}
        />
      ) : null}
    </div>
  );
}
