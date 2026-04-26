"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { I } from "@/components/icons";

interface VariantState {
  id: string;
  status: string;
  modelUsed: string | null;
  templateId?: string;
  url?: string | null;
}

interface GenerationState {
  id: string;
  brief: string;
  status: string;
  brandId?: string;
  moodId?: string | null;
  brandName?: string;
  moodName?: string | null;
  settings?: { output_target?: { aspectRatio?: string } } | null;
  variants: VariantState[];
}

const AR_PADDING: Record<string, string> = {
  "1:1": "100%",
  "4:5": "125%",
  "9:16": "177%",
  "16:9": "56.25%",
};

function VariantCard({
  variant,
  ar,
  brandName,
  onEdit,
  onRegenerate,
}: {
  variant: VariantState;
  ar: string;
  brandName: string;
  onEdit: () => void;
  onRegenerate: () => void;
}) {
  const padding = AR_PADDING[ar] ?? "100%";
  const initials = brandName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(1, "—");

  const state =
    variant.status === "completed"
      ? "done"
      : variant.status === "failed" || variant.status === "failed_safety"
        ? "failed"
        : variant.status === "running"
          ? "running"
          : "queued";

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "relative",
          paddingBottom: padding,
          background: "var(--cal-gray-100)",
        }}
      >
        {state === "queued" ? (
          <div className="skeleton" style={{ position: "absolute", inset: 0 }} />
        ) : null}
        {state === "running" ? (
          <div className="painting" style={{ position: "absolute", inset: 0 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                color: "white",
                fontFamily: "var(--font-display)",
                fontSize: 18,
              }}
            >
              Painting your background…
            </div>
          </div>
        ) : null}
        {state === "done" && variant.url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={variant.url}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                animation: "fade-in 400ms",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 16,
                bottom: 16,
                padding: "6px 12px",
                borderRadius: 100,
                background: "rgba(255,255,255,0.95)",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-display)",
                color: "var(--cal-charcoal)",
              }}
            >
              {initials}
            </div>
          </>
        ) : null}
        {state === "failed" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "var(--studio-red)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <I.AlertCircle size={28} />
              <div style={{ marginTop: 8, fontSize: 13 }}>Failed</div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                style={{ marginTop: 8 }}
                onClick={onRegenerate}
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {state === "done" ? (
          <div
            className="hover-actions"
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              display: "flex",
              gap: 4,
              padding: 4,
              borderRadius: 8,
              background: "rgba(17,17,17,0.6)",
              backdropFilter: "blur(6px)",
              transition: "opacity 160ms",
            }}
          >
            <a
              href={variant.url ?? "#"}
              download
              className="btn btn--icon"
              style={{ color: "white" }}
              aria-label="Download"
            >
              <I.Download size={14} />
            </a>
            <button
              type="button"
              className="btn btn--icon"
              style={{ color: "white" }}
              title="Regenerate · 5 credits"
              onClick={onRegenerate}
            >
              <I.Refresh size={14} />
            </button>
            <button
              type="button"
              className="btn btn--icon"
              style={{ color: "white" }}
              onClick={onEdit}
              aria-label="Edit text"
            >
              <I.Type size={14} />
            </button>
            <button
              type="button"
              className="btn btn--icon"
              style={{ color: "white" }}
              onClick={() => {
                if (variant.url) void navigator.clipboard.writeText(variant.url);
              }}
              aria-label="Copy link"
            >
              <I.Copy size={14} />
            </button>
          </div>
        ) : null}
      </div>
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: "var(--fg-3)",
          borderTop: "1px solid var(--cal-gray-200)",
        }}
      >
        <span>
          {ar} · {variant.modelUsed ?? "—"}
        </span>
        <span className="mono">{variant.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}

function EditTextDrawer({
  onClose,
  variantIndex,
}: {
  onClose: () => void;
  variantIndex: number;
}) {
  const [vals, setVals] = useState({
    headline: "30% off",
    sub: "This week only",
    cta: "Shop the sale",
  });
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer">
        <div className="drawer__head">
          <div className="drawer__title">Edit text · variant {variantIndex + 1}</div>
          <button
            type="button"
            className="btn btn--icon btn--ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <I.X size={16} />
          </button>
        </div>
        <div className="drawer__body">
          <div
            className="card"
            style={{
              padding: 12,
              background: "var(--studio-violet-50)",
              boxShadow: "none",
              border: "1px solid var(--studio-violet-100)",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <I.Info size={14} style={{ color: "var(--studio-violet)", marginTop: 2 }} />
              <div className="t-small" style={{ color: "var(--studio-violet-700)" }}>
                Editing text doesn&apos;t use credits — only regenerating the background does.
              </div>
            </div>
          </div>
          {(
            [
              { k: "headline", l: "Headline" },
              { k: "sub", l: "Subhead" },
              { k: "cta", l: "Call to action" },
            ] as const
          ).map((f) => (
            <div key={f.k} style={{ marginBottom: 16 }}>
              <label className="label">{f.l}</label>
              <input
                className="input"
                value={vals[f.k]}
                onChange={(e) => setVals((v) => ({ ...v, [f.k]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="drawer__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--accent" onClick={onClose}>
            <I.Refresh size={14} />
            Re-render
          </button>
        </div>
      </div>
    </>
  );
}

function CaptionModal({
  onClose,
  generationId,
  brief,
}: {
  onClose: () => void;
  generationId: string;
  brief: string;
}) {
  const [tier, setTier] = useState<"short" | "medium" | "long">("medium");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/captions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ generationId, brief, lengthTier: tier }),
      });
      if (!r.ok) {
        const json = (await r.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(json?.error?.message ?? "Caption failed");
        setPending(false);
        return;
      }
      onClose();
    } catch (e) {
      setError(String(e));
      setPending(false);
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 4,
          }}
        >
          <h2 className="t-h3" style={{ margin: 0 }}>
            Add caption
          </h2>
          <button
            type="button"
            className="btn btn--icon btn--ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <I.X size={16} />
          </button>
        </div>
        <p className="t-small" style={{ margin: "0 0 20px" }}>
          We&apos;ll write a caption tuned to your brand voice.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {(
            [
              { id: "short", l: "Short", c: 1, d: "1 line" },
              { id: "medium", l: "Medium", c: 3, d: "1 paragraph" },
              { id: "long", l: "Long", c: 5, d: "Full post" },
            ] as const
          ).map((t) => (
            <div
              key={t.id}
              onClick={() => setTier(t.id)}
              className="card"
              style={{
                padding: 14,
                cursor: "pointer",
                boxShadow:
                  tier === t.id
                    ? "0 0 0 2px var(--studio-violet), 0 0 0 4px var(--studio-violet-50)"
                    : "var(--shadow-ring)",
              }}
            >
              <div style={{ fontWeight: 500 }}>{t.l}</div>
              <div className="t-small">{t.d}</div>
              <div className="pill pill--accent" style={{ marginTop: 8 }}>
                {t.c} credits
              </div>
            </div>
          ))}
        </div>
        {error ? (
          <div
            className="t-small"
            style={{ color: "var(--studio-red)", marginTop: 16 }}
          >
            {error}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => void submit()}
            disabled={pending}
          >
            {pending ? "Generating…" : "Generate caption"}
          </button>
        </div>
      </div>
    </>
  );
}

export function GenerationView(props: {
  generationId: string;
  initial: GenerationState | null;
}) {
  const [state, setState] = useState<GenerationState | null>(props.initial);
  const [editing, setEditing] = useState<number | null>(null);
  const [captionOpen, setCaptionOpen] = useState(false);

  useEffect(() => {
    if (!state || state.status === "completed" || state.status === "failed") return;
    let cancelled = false;
    const tick = async () => {
      const response = await fetch(`/api/generations/${props.generationId}`);
      const payload = (await response.json()) as GenerationState;
      if (!cancelled) setState(payload);
      if (!cancelled && payload.status !== "completed" && payload.status !== "failed") {
        setTimeout(() => void tick(), 1500);
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [props.generationId, state]);

  const ar = useMemo(
    () => state?.settings?.output_target?.aspectRatio ?? "1:1",
    [state],
  );

  if (!state) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty__art">
            <I.AlertCircle size={28} />
          </div>
          <div className="empty__title">Generation not found</div>
          <Link
            href="/history"
            className="btn btn--secondary"
            style={{ marginTop: 12, textDecoration: "none" }}
          >
            Go to history
          </Link>
        </div>
      </div>
    );
  }

  const variants = state.variants ?? [];
  const doneCount = variants.filter((v) => v.status === "completed").length;
  const allDone = variants.length > 0 && doneCount === variants.length;
  const briefShort =
    state.brief.length > 80 ? `${state.brief.slice(0, 80)}…` : state.brief;

  async function regenerate(variantId: string) {
    await fetch(
      `/api/generations/${props.generationId}/variants/${variantId}/regenerate`,
      { method: "POST" },
    );
    const r = await fetch(`/api/generations/${props.generationId}`);
    if (r.ok) setState((await r.json()) as GenerationState);
  }

  return (
    <div className="page page--wide">
      <div className="breadcrumb">
        <Link href="/history" style={{ cursor: "pointer", textDecoration: "none" }}>
          Generations
        </Link>
        <I.ChevronRight size={12} />
        <span className="mono">{state.id.slice(0, 8)}</span>
      </div>
      <div className="page__head">
        <div>
          <h1 className="page__title">{briefShort}</h1>
          <p className="page__sub">
            {state.brandName ?? "Brand"}
            {state.moodName ? ` · ${state.moodName} mood` : ""}
            {` · ${ar}`}
          </p>
        </div>
        <div className="row">
          {!allDone ? (
            <span className="pill pill--accent">
              <I.Loader size={12} className="spin" />
              Generating · {doneCount} of {variants.length} ready
            </span>
          ) : (
            <span className="pill pill--green">
              <I.Check size={12} />
              {variants.length} of {variants.length} ready
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {variants.map((v, i) => (
          <VariantCard
            key={v.id}
            variant={v}
            ar={ar}
            brandName={state.brandName ?? "Brand"}
            onEdit={() => setEditing(i)}
            onRegenerate={() => void regenerate(v.id)}
          />
        ))}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "var(--sidebar-w)",
          right: 0,
          padding: 16,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          borderTop: "1px solid var(--cal-gray-200)",
          display: "flex",
          justifyContent: "center",
          gap: 12,
          zIndex: 100,
        }}
      >
        <Link
          href="/generate"
          className="btn btn--secondary"
          style={{ textDecoration: "none" }}
        >
          <I.Refresh size={14} />
          Generate variations
        </Link>
        <button
          type="button"
          className="btn btn--accent"
          onClick={() => setCaptionOpen(true)}
        >
          <I.FileText size={14} />
          Add caption · 1–5 credits
        </button>
      </div>

      {editing !== null ? (
        <EditTextDrawer onClose={() => setEditing(null)} variantIndex={editing} />
      ) : null}
      {captionOpen ? (
        <CaptionModal
          onClose={() => setCaptionOpen(false)}
          generationId={state.id}
          brief={state.brief}
        />
      ) : null}
    </div>
  );
}
