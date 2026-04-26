"use client";

import { useState } from "react";

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
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>Stock library</h1>
          <p>Upload, tag, and curate stock assets used by templates and moods.</p>
        </div>
        <label className="studio-button studio-button--primary">
          {uploading ? "Uploading…" : "Upload stock"}
          <input
            hidden
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void upload(file);
              }
            }}
          />
        </label>
      </div>

      <div className="studio-stock-grid">
        {props.items.map((item) => (
          <article key={item.id} className="studio-stock-card">
            <div className="studio-stock-art" />
            <strong>{item.kind}</strong>
            <span>{item.tags.join(", ") || "untagged"}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

