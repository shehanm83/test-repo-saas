"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

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
        <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 16 }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export function MoodStudio({ moods }: { moods: MoodLite[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(moods[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      moods.filter((m) =>
        search ? m.name.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [moods, search],
  );
  const mood = useMemo(
    () => moods.find((m) => m.id === selectedId) ?? moods[0] ?? null,
    [moods, selectedId],
  );

  const [name, setName] = useState(mood?.name ?? "");
  const [slug, setSlug] = useState(mood?.slug ?? "");
  const [promptModifiers, setPromptModifiers] = useState(mood?.promptModifiers ?? "");
  const [negative, setNegative] = useState(mood?.negativePrompts ?? "");
  const [pending, setPending] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (!mood) return;
    setName(mood.name);
    setSlug(mood.slug);
    setPromptModifiers(mood.promptModifiers ?? "");
    setNegative(mood.negativePrompts ?? "");
  }, [mood?.id, mood]);

  async function publish() {
    if (!mood) return;
    setPending(true);
    try {
      await fetch(`/api/admin/moods/${mood.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          promptModifiers,
          negativePrompts: negative,
          status: "published",
        }),
      });
      setToastMsg("Mood published");
      router.refresh();
    } finally {
      setPending(false);
      setTimeout(() => setToastMsg(null), 2400);
    }
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
          kind: "Evergreen",
          status: "draft",
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

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        height: "calc(100vh - var(--header-h))",
      }}
    >
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
                  <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
                    {m.kind ?? "Evergreen"}
                  </div>
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
              style={{
                padding: "24px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              <Section letter="A" title="Identity">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="label">Name</label>
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Slug</label>
                    <input
                      className="input mono"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </div>
                </div>
              </Section>

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

              <Section letter="C" title="Visual layer">
                <label className="label">Accent palette</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(mood.accentPalette ?? ["#7A0E0E", "#0E5C2F", "#E8C66B"]).map((c) => (
                    <div
                      key={c}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        background: c,
                        boxShadow: "var(--shadow-ring)",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      border: "2px dashed var(--cal-gray-300)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--fg-3)",
                    }}
                  >
                    <I.Plus size={14} />
                  </div>
                </div>
              </Section>

              <Section letter="D" title="Decoration motifs">
                <label className="label">Tags</label>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    padding: 8,
                    boxShadow: "var(--shadow-ring)",
                    borderRadius: 8,
                    minHeight: 40,
                  }}
                >
                  {(mood.decorationTags ?? []).map((t) => (
                    <span
                      key={t}
                      className="pill pill--ring"
                      style={{ height: 22 }}
                    >
                      {t}
                      <I.X size={10} />
                    </span>
                  ))}
                  <input
                    style={{ border: 0, outline: 0, flex: 1, fontSize: 13 }}
                    placeholder="Add a tag…"
                  />
                </div>
              </Section>

              <Section letter="E" title="Aspect ratio support">
                <div style={{ display: "flex", gap: 8 }}>
                  {(["1:1", "4:5", "9:16", "16:9"] as const).map((a) => (
                    <label
                      key={a}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        boxShadow: "var(--shadow-ring)",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        defaultChecked={(mood.supportedAspectRatios ?? []).includes(a)}
                      />
                      <span style={{ fontSize: 13 }}>{a}</span>
                    </label>
                  ))}
                </div>
              </Section>
            </div>

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
              <button type="button" className="btn btn--ghost btn--danger">
                <I.Trash size={14} />
                Archive
              </button>
              <button type="button" className="btn btn--secondary">
                Save draft
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void publish()}
                disabled={pending}
              >
                <I.CheckCircle size={14} />
                {pending ? "Publishing…" : "Publish"}
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
