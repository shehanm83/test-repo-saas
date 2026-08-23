"use client";

import React, { useMemo, useState } from "react";

import type {
  HomeShowcaseCard,
  HomeShowcaseConfig,
  HomeShowcaseView,
} from "@layertone/shared/home-showcase";

import { I } from "@/components/icons";
import {
  AdminAlert,
  AdminPage,
  AdminSection,
  AdminStat,
  AdminStatGrid,
} from "@/components/admin/ui";

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
  const previewImages = useMemo(() => view.images.slice(0, 4), [view.images]);

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
    <AdminPage
      wide
      eyebrow={
        <>
          <I.Layout size={12} />
          Homepage
        </>
      }
      title="Home Showcase"
      description="Configure the output gallery and the three supporting message cards on the homepage."
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--secondary" onClick={refresh} type="button">
            <I.Refresh size={14} />
            Refresh
          </button>
          <button className="btn btn--primary" disabled={saving} onClick={save} type="button">
            <I.Save size={14} />
            {saving ? "Saving…" : "Save Showcase"}
          </button>
        </div>
      }
    >
      <AdminStatGrid>
        <AdminStat
          label="Images"
          value={view.images.length}
          detail={imageReady ? "Homepage rotation ready" : "Needs at least 6 images"}
          icon={<I.Image size={14} />}
          tone={imageReady ? "success" : "warning"}
        />
        <AdminStat
          label="Cards"
          value={draft.cards.length}
          detail="Supporting messages"
          icon={<I.Layout size={14} />}
        />
        <AdminStat
          label="Preview Set"
          value={previewImages.length}
          detail="Images sampled for preview"
          icon={<I.Grid size={14} />}
        />
        <AdminStat
          label="State"
          value={saving || uploading ? "Working" : "Idle"}
          detail="Latest admin action"
          icon={<I.Loader size={14} />}
        />
      </AdminStatGrid>

      {message ? (
        <AdminAlert
          tone={message === "Saved" || message === "Images uploaded" ? "success" : "danger"}
        >
          {message}
        </AdminAlert>
      ) : null}

      {!imageReady ? (
        <AdminAlert tone="warning">
          Upload more than 5 images. The homepage uses fallback showcase content until this section
          has at least 6 images.
        </AdminAlert>
      ) : null}

      <AdminSection title="Text">
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
      </AdminSection>

      <AdminSection
        title="Gallery Images"
        description={`${view.images.length} uploaded. The homepage randomly shows 4 once there are more than 5 images.`}
        actions={
          <label className="btn btn--secondary" style={{ cursor: "pointer" }}>
            <I.Upload size={16} />
            {uploading ? "Uploading…" : "Upload Images"}
            <input
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => upload(event.target.files)}
              style={{ display: "none" }}
              type="file"
            />
          </label>
        }
      >
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
                  className="btn btn--ghost"
                  aria-label={`Delete showcase image ${index + 1}`}
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
      </AdminSection>

      <AdminSection title="Supporting Message Cards">
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
                <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 8 }}>
                  <input
                    aria-label={`Card ${index + 1} accent color`}
                    type="color"
                    value={card.color}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        cards: replaceCard(draft.cards, index, { color: event.target.value }),
                      })
                    }
                    style={{
                      width: 44,
                      height: 40,
                      border: "1px solid var(--cal-gray-300)",
                      borderRadius: 8,
                      cursor: "pointer",
                      padding: 3,
                    }}
                  />
                  <input
                    className="input"
                    value={card.color}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        cards: replaceCard(draft.cards, index, { color: event.target.value }),
                      })
                    }
                  />
                </div>
              </label>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Preview Sample">
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
      </AdminSection>
    </AdminPage>
  );
}
