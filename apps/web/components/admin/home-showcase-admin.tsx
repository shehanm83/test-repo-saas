"use client";

import React, { useMemo, useState } from "react";

import type {
  HomeShowcaseCard,
  HomeShowcaseConfig,
  HomeShowcaseView,
} from "@layertone/shared/home-showcase";

import { I } from "@/components/icons";

function cloneView(view: HomeShowcaseView): HomeShowcaseView {
  return JSON.parse(JSON.stringify(view)) as HomeShowcaseView;
}

function replaceCard(
  cards: HomeShowcaseConfig["cards"],
  index: number,
  patch: Partial<HomeShowcaseCard>,
): HomeShowcaseConfig["cards"] {
  const next = cards.map((card, i) => (i === index ? { ...card, ...patch } : card));
  return [next[0]!, next[1]!, next[2]!];
}

export function HomeShowcaseAdmin({ initial }: { initial: HomeShowcaseView }) {
  const [view, setView] = useState(() => cloneView(initial));
  const [draft, setDraft] = useState<HomeShowcaseConfig>(() => cloneView(initial).config);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const imageReady = view.images.length > 5;
  const previewImages = useMemo(() => view.images.slice(0, 5), [view.images]);

  async function refresh() {
    const res = await fetch("/api/admin/home-showcase");
    const next = (await res.json()) as HomeShowcaseView;
    setView(next);
    setDraft(next.config);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/home-showcase", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(await res.text());
      const next = (await res.json()) as HomeShowcaseView;
      setView(next);
      setDraft(next.config);
      setMessage("Saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      const res = await fetch("/api/admin/home-showcase/images", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const next = (await res.json()) as HomeShowcaseView;
      setView(next);
      setMessage("Images uploaded");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteImage(id: string) {
    setMessage(null);
    const res = await fetch(`/api/admin/home-showcase/images/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage(await res.text());
      return;
    }
    setView((await res.json()) as HomeShowcaseView);
  }

  return (
    <div className="page page--wide" style={{ display: "grid", gap: 24 }}>
      <div className="page__header">
        <div>
          <div className="t-eyebrow">Homepage</div>
          <h1 className="page__title">Home showcase</h1>
          <p className="page__subtitle">
            Configure the output gallery and the three comparison cards on the homepage.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={refresh} type="button">
            Refresh
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={save} type="button">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="card" style={{ padding: 12, color: "var(--cal-charcoal)" }}>
          {message}
        </div>
      ) : null}

      {!imageReady ? (
        <div
          className="card"
          style={{ padding: 16, borderColor: "#E8C66B", background: "#FFF9E8" }}
        >
          Upload more than 5 images. The homepage uses fallback showcase content until this section
          has at least 6 images.
        </div>
      ) : null}

      <section className="card" style={{ padding: 24 }}>
        <h2 className="t-h3" style={{ marginTop: 0 }}>
          Text
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="t-label">Gallery kicker</span>
            <input
              className="input"
              value={draft.kicker}
              onChange={(event) => setDraft({ ...draft, kicker: event.target.value })}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="t-label">Gallery heading</span>
            <input
              className="input"
              value={draft.galleryHeading}
              onChange={(event) => setDraft({ ...draft, galleryHeading: event.target.value })}
            />
          </label>
          <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
            <span className="t-label">Main text</span>
            <textarea
              className="input"
              rows={2}
              value={draft.differentiatorHeading}
              onChange={(event) =>
                setDraft({ ...draft, differentiatorHeading: event.target.value })
              }
            />
          </label>
        </div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 className="t-h3" style={{ margin: 0 }}>
              Gallery images
            </h2>
            <p className="t-body-muted" style={{ margin: "6px 0 0" }}>
              {view.images.length} uploaded. The homepage randomly shows 5 once there are more than
              5 images.
            </p>
          </div>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            <I.Upload size={16} />
            {uploading ? "Uploading..." : "Upload images"}
            <input
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => upload(event.target.files)}
              style={{ display: "none" }}
              type="file"
            />
          </label>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          {view.images.map((image, index) => (
            <div
              key={image.id}
              style={{
                border: "1px solid var(--cal-gray-200)",
                borderRadius: 8,
                overflow: "hidden",
                background: "white",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                src={image.imageUrl}
                style={{
                  aspectRatio: "1 / 1",
                  display: "block",
                  objectFit: "cover",
                  width: "100%",
                }}
              />
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 8,
                }}
              >
                <span className="t-label">#{index + 1}</span>
                <button
                  className="btn btn-ghost"
                  onClick={() => deleteImage(image.id)}
                  style={{ height: 30, padding: "0 8px" }}
                  type="button"
                >
                  <I.Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <h2 className="t-h3" style={{ marginTop: 0 }}>
          Comparison cards
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {draft.cards.map((card, index) => (
            <div key={index} style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="t-label">Eyebrow</span>
                <input
                  className="input"
                  value={card.eyebrow}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      cards: replaceCard(draft.cards, index, { eyebrow: event.target.value }),
                    })
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="t-label">Heading</span>
                <input
                  className="input"
                  value={card.heading}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      cards: replaceCard(draft.cards, index, { heading: event.target.value }),
                    })
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="t-label">Body</span>
                <textarea
                  className="input"
                  rows={4}
                  value={card.body}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      cards: replaceCard(draft.cards, index, { body: event.target.value }),
                    })
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="t-label">Accent color</span>
                <input
                  className="input"
                  type="color"
                  value={card.color}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      cards: replaceCard(draft.cards, index, { color: event.target.value }),
                    })
                  }
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <h2 className="t-h3" style={{ marginTop: 0 }}>
          Preview sample
        </h2>
        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "2fr 1fr 1fr",
            maxWidth: 760,
          }}
        >
          {previewImages.map((image, index) => (
            <div
              key={image.id}
              style={{
                aspectRatio: index === 0 ? "1 / 1.2" : "1 / 1",
                borderRadius: index === 0 ? 12 : 8,
                gridRow: index === 0 ? "span 2" : undefined,
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                src={image.imageUrl}
                style={{ display: "block", height: "100%", objectFit: "cover", width: "100%" }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
