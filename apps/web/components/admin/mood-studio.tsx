"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useRef, useState } from "react";

import { I } from "@/components/icons";

interface MoodLite {
  id: string;
  slug: string;
  name: string;
  kind: string | null;
  status: string;
  promptModifiers: string | null;
  negativePrompts: string | null;
  accentPalette: string[] | null;
  decorationTags: string[] | null;
  supportedAspectRatios: string[] | null;
  validFrom: string | null;
  validTo: string | null;
  previewImgUrl?: string | null;
}

function Section({
  letter,
  title,
  children,
}: {
  letter: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "var(--cal-gray-100)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-2)",
          }}
        >
          {letter}
        </span>
        <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 16 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

export function MoodStudio({ moods }: { moods: MoodLite[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(moods[0]?.id ?? null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => moods.filter((m) => (search ? m.name.toLowerCase().includes(search.toLowerCase()) : true)),
    [moods, search],
  );
  const mood = useMemo(
    () => moods.find((m) => m.id === selectedId) ?? moods[0] ?? null,
    [moods, selectedId],
  );

  // Form state
  const [name, setName] = useState(mood?.name ?? "");
  const [slug, setSlug] = useState(mood?.slug ?? "");
  const [slugLocked, setSlugLocked] = useState(false);
  const [kind, setKind] = useState<"seasonal" | "evergreen">(
    (mood?.kind as "seasonal" | "evergreen") ?? "evergreen",
  );
  const [validFrom, setValidFrom] = useState(toDateInputValue(mood?.validFrom));
  const [validTo, setValidTo] = useState(toDateInputValue(mood?.validTo));
  const [promptModifiers, setPromptModifiers] = useState(mood?.promptModifiers ?? "");
  const [negative, setNegative] = useState(mood?.negativePrompts ?? "");
  const [palette, setPalette] = useState<string[]>(mood?.accentPalette ?? []);
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(mood?.previewImgUrl ?? null);
  const [imgUploading, setImgUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sync all fields when selected mood changes
  React.useEffect(() => {
    if (!mood) return;
    setName(mood.name);
    setSlug(mood.slug);
    setSlugLocked(false);
    setKind((mood.kind as "seasonal" | "evergreen") ?? "evergreen");
    setValidFrom(toDateInputValue(mood.validFrom));
    setValidTo(toDateInputValue(mood.validTo));
    setPromptModifiers(mood.promptModifiers ?? "");
    setNegative(mood.negativePrompts ?? "");
    setPalette(mood.accentPalette ?? []);
    setPreviewImgUrl(mood.previewImgUrl ?? null);
  }, [mood?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function toSlug(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugLocked) setSlug(toSlug(value));
  }

  function buildPayload(extraStatus?: "draft" | "published" | "archived") {
    return {
      name,
      slug,
      kind,
      validFrom: validFrom ? new Date(validFrom).toISOString() : null,
      validTo: validTo ? new Date(validTo).toISOString() : null,
      promptModifiers,
      negativePrompts: negative,
      accentPalette: palette,
      ...(extraStatus ? { status: extraStatus } : {}),
    };
  }

  async function save(extraStatus?: "draft" | "published" | "archived") {
    if (!mood) return;
    setPending(true);
    try {
      await fetch(`/api/admin/moods/${mood.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload(extraStatus)),
      });
      setToastMsg(extraStatus === "published" ? "Mood published" : "Saved");
      router.refresh();
    } finally {
      setPending(false);
      setTimeout(() => setToastMsg(null), 2400);
    }
  }

  async function archive() {
    if (!mood) return;
    if (!confirm("Archive this mood? It will be hidden from users.")) return;
    await save("archived");
  }

  async function newMood() {
    setPending(true);
    try {
      const r = await fetch("/api/admin/moods", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: `mood-${Date.now()}`,
          name: "New mood",
          kind: "evergreen",
          supportedAspectRatios: ["1:1", "4:5"],
        }),
      });
      if (r.ok) {
        const json = (await r.json()) as { id?: string };
        if (json.id) setSelectedId(json.id);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function uploadPreview(file: File) {
    if (!mood) return;
    setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/moods/${mood.id}/preview`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const json = (await res.json()) as { url: string };
        setPreviewImgUrl(json.url);
        setToastMsg("Preview image saved");
        setTimeout(() => setToastMsg(null), 2400);
      }
    } finally {
      setImgUploading(false);
    }
  }

  async function removePreview() {
    if (!mood || !confirm("Remove preview image?")) return;
    setImgUploading(true);
    try {
      await fetch(`/api/admin/moods/${mood.id}/preview`, { method: "DELETE" });
      setPreviewImgUrl(null);
    } finally {
      setImgUploading(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        height: "calc(100vh - var(--header-h))",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          borderRight: "1px solid var(--cal-gray-200)",
          background: "var(--cal-gray-50)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid var(--cal-gray-200)" }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>
            <I.Shield size={11} style={{ verticalAlign: "-1px" }} /> Mood Studio
          </div>
          <div style={{ position: "relative" }}>
            <I.Search
              size={14}
              style={{ position: "absolute", left: 10, top: 9, color: "var(--fg-3)" }}
            />
            <input
              className="input"
              placeholder="Search moods…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 13 }}
            />
          </div>
          <button
            type="button"
            className="btn btn--accent btn--full btn--sm"
            style={{ marginTop: 8 }}
            onClick={() => void newMood()}
            disabled={pending}
          >
            <I.Plus size={12} />
            New mood
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {filtered.map((m) => {
            const isSelected = mood?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedId(m.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr auto",
                  gap: 10,
                  padding: 8,
                  alignItems: "center",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: isSelected ? "white" : "transparent",
                  boxShadow: isSelected ? "var(--shadow-ring)" : "none",
                  marginBottom: 2,
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    overflow: "hidden",
                    background: "var(--cal-gray-200)",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      background: m.accentPalette?.[0] ?? "var(--cal-gray-200)",
                    }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{m.kind ?? "evergreen"}</div>
                </div>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 100,
                    background:
                      m.status === "published"
                        ? "var(--layertone-green)"
                        : m.status === "draft"
                          ? "var(--cal-gray-400)"
                          : "var(--layertone-amber)",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <div style={{ overflowY: "auto", paddingBottom: 80, position: "relative" }}>
        {!mood ? (
          <div className="empty" style={{ padding: 80 }}>
            <div className="empty__art">
              <I.Library size={28} />
            </div>
            <div className="empty__title">No moods</div>
            <div className="empty__sub">Create a new mood to get started.</div>
          </div>
        ) : (
          <>
            <div
              style={{
                padding: "20px 32px",
                borderBottom: "1px solid var(--cal-gray-200)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 className="t-h3" style={{ margin: 0 }}>
                  {mood.name}
                </h2>
                <div className="t-small mono">moods/{mood.slug}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {mood.status === "published" ? (
                  <span className="pill pill--green">
                    <I.CheckCircle size={11} />
                    Published
                  </span>
                ) : mood.status === "draft" ? (
                  <span className="pill">Draft</span>
                ) : (
                  <span className="pill pill--amber">{mood.status}</span>
                )}
              </div>
            </div>

            <div
              style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}
            >
              {/* A — Identity */}
              <Section letter="A" title="Identity">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 16 }}>
                  <div>
                    <label className="label">Name</label>
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Kind</label>
                    <select
                      className="select"
                      value={kind}
                      onChange={(e) => setKind(e.target.value as "seasonal" | "evergreen")}
                    >
                      <option value="evergreen">Evergreen</option>
                      <option value="seasonal">Seasonal</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <label className="label">
                    Slug
                    {!slugLocked && (
                      <span style={{ marginLeft: 6, color: "var(--fg-3)", fontWeight: 400 }}>
                        · auto
                      </span>
                    )}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input mono"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugLocked(true);
                      }}
                      style={{ paddingRight: 80 }}
                    />
                    {slugLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          setSlug(toSlug(name));
                          setSlugLocked(false);
                        }}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 11,
                          color: "var(--fg-3)",
                          background: "none",
                          border: 0,
                          cursor: "pointer",
                          padding: "2px 6px",
                        }}
                      >
                        reset
                      </button>
                    )}
                  </div>
                  <div className="hint">Used in URLs — letters, numbers, hyphens only.</div>
                </div>
                {kind === "seasonal" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                      marginTop: 16,
                    }}
                  >
                    <div>
                      <label className="label">Season starts</label>
                      <input
                        className="input"
                        type="date"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Season ends</label>
                      <input
                        className="input"
                        type="date"
                        value={validTo}
                        onChange={(e) => setValidTo(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </Section>

              {/* B — Prompt layer */}
              <Section letter="B" title="Prompt layer">
                <label className="label">Prompt modifiers</label>
                <textarea
                  className="textarea mono"
                  rows={3}
                  style={{ fontSize: 12 }}
                  value={promptModifiers}
                  onChange={(e) => setPromptModifiers(e.target.value)}
                />
                <div className="hint">{promptModifiers.length} / 500 chars</div>
                <label className="label" style={{ marginTop: 16 }}>
                  Negative prompts
                </label>
                <textarea
                  className="textarea mono"
                  rows={2}
                  style={{ fontSize: 12 }}
                  value={negative}
                  onChange={(e) => setNegative(e.target.value)}
                />
                <div className="hint">{negative.length} / 200 chars</div>
              </Section>

              {/* C — Preview image */}
              <Section letter="C" title="Preview image">
                <div className="hint" style={{ marginBottom: 12 }}>
                  Shown on mood cards. Not used in generation.
                </div>
	                <label
	                  style={{
	                    display: "block",
	                    width: "min(420px, 100%)",
	                    aspectRatio: "16/9",
                    borderRadius: 10,
                    overflow: "hidden",
                    position: "relative",
                    cursor: imgUploading ? "wait" : "pointer",
                    background: "var(--cal-gray-100)",
                    boxShadow: "var(--shadow-ring)",
                  }}
                >
                  {previewImgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImgUrl}
                      alt="Mood preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        color: "var(--fg-3)",
                      }}
                    >
                      <I.Image size={28} />
                      <span style={{ fontSize: 13 }}>
                        {imgUploading ? "Uploading…" : "Click to upload an image"}
                      </span>
                    </div>
                  )}
                  {previewImgUrl && !imgUploading && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        opacity: 0,
                        transition: "opacity 0.15s",
                      }}
                      className="preview-hover"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = "1";
                        (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.45)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = "0";
                        (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0)";
                      }}
                    >
                      <span
                        style={{
                          color: "white",
                          fontSize: 13,
                          fontWeight: 500,
                          padding: "6px 14px",
                          borderRadius: 6,
                          background: "rgba(255,255,255,0.15)",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        Replace image
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    disabled={imgUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadPreview(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {previewImgUrl && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm btn--danger"
                    style={{ marginTop: 8 }}
                    onClick={() => void removePreview()}
                    disabled={imgUploading}
                  >
                    <I.Trash size={12} />
                    Remove image
                  </button>
                )}
              </Section>

              {/* D — Accent palette */}
              <Section letter="D" title="Accent palette">
                <label className="label">Colors (up to 5)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {palette.map((color, i) => (
                    <PaletteSwatch
                      key={i}
                      color={color}
                      onChange={(c) =>
                        setPalette((prev) => prev.map((x, j) => (j === i ? c : x)))
                      }
                      onRemove={() => setPalette((prev) => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                  {palette.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPalette((prev) => [...prev, "#888888"])}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        border: "2px dashed var(--cal-gray-300)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--fg-3)",
                        cursor: "pointer",
                        background: "transparent",
                      }}
                    >
                      <I.Plus size={14} />
                    </button>
                  )}
                </div>
              </Section>

            </div>

            {/* Footer */}
            <div
              style={{
                position: "sticky",
                bottom: 0,
                padding: 16,
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(8px)",
                borderTop: "1px solid var(--cal-gray-200)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                className="btn btn--ghost btn--danger"
                onClick={() => void archive()}
                disabled={pending || mood.status === "archived"}
              >
                <I.Trash size={14} />
                Archive
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => void save("draft")}
                disabled={pending}
              >
                Save draft
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void save("published")}
                disabled={pending}
              >
                <I.CheckCircle size={14} />
                {pending ? "Saving…" : "Publish"}
              </button>
            </div>
          </>
        )}
      </div>

      {toastMsg ? (
        <div className="toast-root">
          <div className="toast">
            <I.CheckCircle size={16} />
            {toastMsg}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PaletteSwatch({
  color,
  onChange,
  onRemove,
}: {
  color: string;
  onChange: (c: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: "relative", width: 56, height: 56 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          background: color,
          boxShadow: "var(--shadow-ring)",
          cursor: "pointer",
        }}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
      />
      {hovered && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 18,
            height: 18,
            borderRadius: 100,
            background: "var(--cal-gray-800)",
            color: "white",
            border: 0,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <I.X size={10} />
        </button>
      )}
    </div>
  );
}
