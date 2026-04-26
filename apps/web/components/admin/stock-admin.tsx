"use client";

import React, { useState } from "react";

import { I } from "@/components/icons";

export function StockAdmin(props: {
  items: Array<{ id: string; kind: string; tags: string[]; license: string | null }>;
}) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("kind", "photo");
    body.append("license", "internal");
    body.append("tags", JSON.stringify(["uploaded"]));
    await fetch("/api/admin/stock", { method: "POST", body });
    setUploading(false);
    location.reload();
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Stock library</h1>
          <p className="page__sub">
            Upload, tag, and curate stock assets used by templates and moods.
          </p>
        </div>
        <label
          className="btn btn--accent"
          style={{ cursor: "pointer" }}
        >
          <I.Upload size={14} />
          {uploading ? "Uploading…" : "Upload stock"}
          <input
            hidden
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
      </div>

      {props.items.length === 0 ? (
        <div className="empty card">
          <div className="empty__art">
            <I.Image size={28} />
          </div>
          <div className="empty__title">No stock assets yet</div>
          <div className="empty__sub">Upload PNGs or JPEGs to seed the library.</div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {props.items.map((item) => (
            <div key={item.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  aspectRatio: "1/1",
                  background: "var(--cal-gray-100)",
                }}
              />
              <div style={{ padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.kind}</div>
                <div className="t-small" style={{ marginTop: 2, fontSize: 11 }}>
                  {item.tags.join(", ") || "untagged"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
