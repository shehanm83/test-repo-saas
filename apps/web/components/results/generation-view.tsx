"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { I } from "@/components/icons";
import { CropEditor } from "@/components/generations/crop-editor";

interface VariantState {
  id: string;
  status: string;
  modelUsed: string | null;
  templateId?: string;
  url?: string | null;
  // Sub-project D additions — null on legacy rows.
  backgroundUrl?: string | null;
  cropRegion?: { x: number; y: number; w: number; h: number; targetWidth: number; targetHeight: number } | null;
}

interface CaptionState {
  id: string;
  status: string;
  lengthTier: string;
  creditCost: number;
  outputText?: string | null;
}

interface GenerationState {
  id: string;
  brief: string;
  status: string;
  brandId?: string;
  projectId?: string | null;
  moodId?: string | null;
  brandName?: string;
  moodName?: string | null;
  settings?: {
    output_target?: {
      aspectRatio?: string;
      width?: number;
      height?: number;
      platform?: string | null;
      format?: string | null;
    };
    commercial?: {
      mode?: string;
      creation_type?: string;
      campaign?: Record<string, unknown>;
      template?: Record<string, unknown>;
      composition?: Record<string, unknown>;
      outputs?: Record<string, unknown>;
      prompt?: { rendered_prompt?: string | null };
    };
  } | null;
  variants: VariantState[];
  captions?: CaptionState[];
}

const FALLBACK_TARGET = {
  aspectRatio: "1:1",
  width: 1024,
  height: 1024,
  platform: null,
  format: null,
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getValidGenerationId(value: string) {
  const trimmed = value.trim();
  return UUID_RE.test(trimmed) ? trimmed : undefined;
}

function VariantCard({
  variant,
  target,
  brandName,
  onEdit,
  onDownload,
  onZoom,
  generationId,
  cropOpen,
  onOpenCrop,
  onCloseCrop,
  onCropApplied,
}: {
  variant: VariantState;
  target: {
    aspectRatio?: string;
    width?: number;
    height?: number;
    platform?: string | null;
    format?: string | null;
  };
  brandName: string;
  onEdit: () => void;
  onDownload: () => void;
  onZoom: () => void;
  generationId: string;
  cropOpen: boolean;
  onOpenCrop: () => void;
  onCloseCrop: () => void;
  onCropApplied: (variantId: string, signedUrl: string, cropRegion: NonNullable<VariantState["cropRegion"]>) => void;
}) {
  const width = target.width && target.width > 0 ? target.width : FALLBACK_TARGET.width;
  const height = target.height && target.height > 0 ? target.height : FALLBACK_TARGET.height;
  const ar = target.aspectRatio ?? `${width}:${height}`;
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
          aspectRatio: `${width} / ${height}`,
          minHeight: 220,
          maxHeight: "min(72vh, 720px)",
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
                objectFit: "contain",
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
              onClick={(event) => {
                event.preventDefault();
                onDownload();
              }}
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
              onClick={onZoom}
              aria-label="Zoom image"
              title="Zoom"
            >
              <I.Eye size={14} />
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
            {variant.backgroundUrl ? (
              <button
                type="button"
                className="btn btn--icon"
                style={{ color: "white" }}
                onClick={onOpenCrop}
                aria-label="Crop & resize"
                title="Crop & resize"
              >
                <I.Layers size={14} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {cropOpen && variant.backgroundUrl ? (
        <CropEditor
          generationId={generationId}
          variantId={variant.id}
          backgroundUrl={variant.backgroundUrl}
          targetWidth={target.width ?? FALLBACK_TARGET.width}
          targetHeight={target.height ?? FALLBACK_TARGET.height}
          targetLabel={
            target.aspectRatio
              ? `${target.aspectRatio} (${target.width ?? "?"}×${target.height ?? "?"})`
              : undefined
          }
          initialCrop={variant.cropRegion}
          onApplied={(result) => {
            onCropApplied(variant.id, result.signedUrl, result.cropRegion);
            onCloseCrop();
          }}
          onCancel={onCloseCrop}
        />
      ) : null}
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
          {target.platform ?? "image"}
          {target.format ? ` / ${target.format}` : ""} · {ar} · {width} x {height} · {variant.modelUsed ?? "—"}
        </span>
        <span className="mono">{variant.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}

function CaptionCard({ caption }: { caption: CaptionState }) {
  const text = caption.outputText ?? "";

  function downloadCaption() {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `caption-${caption.id.slice(0, 8)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "relative",
          padding: 18,
          minHeight: 220,
          background: "var(--cal-white)",
        }}
      >
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 14, paddingRight: 88 }}>
          <div className="row">
            <I.FileText size={16} />
            <strong style={{ fontSize: 13 }}>Caption</strong>
          </div>
        </div>
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
          <button
            type="button"
            className="btn btn--icon"
            style={{ color: "white" }}
            onClick={() => void navigator.clipboard.writeText(text)}
            aria-label="Copy caption"
            title="Copy caption"
          >
            <I.Copy size={14} />
          </button>
          <button
            type="button"
            className="btn btn--icon"
            style={{ color: "white" }}
            onClick={downloadCaption}
            aria-label="Download caption"
            title="Download caption"
          >
            <I.Download size={14} />
          </button>
        </div>
        <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.55 }}>{text}</p>
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
        <span>{caption.lengthTier} · {caption.creditCost} credits</span>
        <span className="mono">{caption.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}

function ImageZoomModal({
  variant,
  target,
  onClose,
  onDownload,
}: {
  variant: VariantState;
  target: {
    aspectRatio?: string;
    width?: number;
    height?: number;
    platform?: string | null;
    format?: string | null;
  };
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="modal"
        style={{
          width: "min(96vw, 1280px)",
          padding: 0,
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid var(--cal-gray-200)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div className="t-small">
            {target.platform ?? "image"}
            {target.format ? ` / ${target.format}` : ""} · {target.width ?? "?"} x {target.height ?? "?"}
          </div>
          <div className="row">
            <button type="button" className="btn btn--icon btn--ghost" onClick={onDownload} aria-label="Download image">
              <I.Download size={14} />
            </button>
            <button type="button" className="btn btn--icon btn--ghost" onClick={onClose} aria-label="Close">
              <I.X size={16} />
            </button>
          </div>
        </div>
        <div style={{ background: "var(--cal-gray-100)", display: "grid", placeItems: "center", maxHeight: "calc(96vh - 52px)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={variant.url ?? ""}
            alt=""
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "calc(96vh - 52px)",
              width: "auto",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    </>
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
  contextSummary,
  onCaptionComplete,
}: {
  onClose: () => void;
  generationId: string;
  brief: string;
  contextSummary: string;
  onCaptionComplete: () => void;
}) {
  const [tone, setTone] = useState<"professional" | "warm" | "bold" | "playful" | "luxury" | "direct">("professional");
  const [includeGenerationContext, setIncludeGenerationContext] = useState(false);
  const [short, setShort] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || caption || error) return;
    let cancelled = false;
    const tick = async () => {
      const response = await fetch(`/api/captions/${jobId}`);
      if (!response.ok) return;
      const payload = (await response.json()) as {
        status?: string;
        outputText?: string | null;
        errorPayload?: { message?: string } | null;
      } | null;
      if (cancelled || !payload) return;
      if (payload.status === "completed") {
        setCaption(payload.outputText ?? "");
        setPending(false);
        onCaptionComplete();
        onClose();
      } else if (payload.status === "failed") {
        setError(payload.errorPayload?.message ?? "Caption failed");
        setPending(false);
      } else {
        window.setTimeout(() => void tick(), 1200);
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [caption, error, jobId, onCaptionComplete, onClose]);

  async function submit() {
    const safeGenerationId = getValidGenerationId(generationId);
    setPending(true);
    setError(null);
    setCaption(null);
    setJobId(null);
    try {
      const r = await fetch("/api/captions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(safeGenerationId ? { generationId: safeGenerationId } : {}),
          brief,
          tone,
          includeGenerationContext: safeGenerationId ? includeGenerationContext : false,
          short,
        }),
      });
      if (!r.ok) {
        const json = (await r.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(json?.error?.message ?? "Caption failed");
        setPending(false);
        return;
      }
      const payload = (await r.json()) as { jobId: string };
      setJobId(payload.jobId);
    } catch (e) {
      setError(String(e));
      setPending(false);
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" style={{ width: "min(680px, calc(100vw - 32px))" }}>
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
          Create a caption for this Quick Create image. Fixed price: 5 credits.
        </p>

        <div className="card" style={{ padding: 14, boxShadow: "var(--shadow-ring)", marginBottom: 16 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Available generation context</div>
          <p className="t-small" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {contextSummary}
          </p>
        </div>

        <label className="row" style={{ alignItems: "flex-start", marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={includeGenerationContext}
            onChange={(event) => setIncludeGenerationContext(event.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>
            <strong style={{ display: "block", fontSize: 13 }}>
              Include generation prompt and selected options
            </strong>
            <span className="t-small">
              Use the stored prompt, campaign fields, output size, template, and composition choices to write the caption.
            </span>
          </span>
        </label>

        <label className="label">Tone</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {(["professional", "warm", "bold", "playful", "luxury", "direct"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={tone === item ? "btn btn--accent" : "btn btn--secondary"}
              onClick={() => setTone(item)}
              style={{ justifyContent: "center", textTransform: "capitalize" }}
            >
              {item}
            </button>
          ))}
        </div>

        <label className="row" style={{ alignItems: "flex-start", marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={short}
            onChange={(event) => setShort(event.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>
            <strong style={{ display: "block", fontSize: 13 }}>Short caption</strong>
            <span className="t-small">Keep it tight for social feed scanning.</span>
          </span>
        </label>

        {caption ? (
          <div className="card" style={{ padding: 16, boxShadow: "var(--shadow-ring)", marginTop: 16 }}>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Generated caption</div>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{caption}</p>
          </div>
        ) : null}

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
            {pending ? "Generating..." : "Generate caption · 5 credits"}
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
  const router = useRouter();
  const [state, setState] = useState<GenerationState | null>(props.initial);
  const [editing, setEditing] = useState<number | null>(null);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [zoomVariant, setZoomVariant] = useState<VariantState | null>(null);
  const [activeCrop, setActiveCrop] = useState<string | null>(null);
  const [autoOpenedCrop, setAutoOpenedCrop] = useState(false);
  const searchParams = useSearchParams();
  const cropFirstFlag = searchParams?.get("cropFirst") === "1";
  const [projectPending, setProjectPending] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  const onCropApplied = (
    variantId: string,
    signedUrl: string,
    cropRegion: NonNullable<VariantState["cropRegion"]>,
  ) => {
    setState((prev) =>
      prev
        ? {
            ...prev,
            variants: prev.variants.map((v) =>
              v.id === variantId ? { ...v, url: signedUrl, cropRegion } : v,
            ),
          }
        : prev,
    );
  };

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

  // C → D fallback: when the wizard's "Generate at native size · crop later"
  // path was taken, the wizard appended ?cropFirst=1 to the result-page URL.
  // Once the first variant lands, expand its crop editor automatically. We
  // only do this once per page-load — closing the editor and re-clicking is
  // a deliberate action, no need to re-trigger.
  useEffect(() => {
    if (autoOpenedCrop || !cropFirstFlag || !state) return;
    const first = state.variants.find(
      (v) => v.status === "completed" && v.backgroundUrl,
    );
    if (first) {
      setActiveCrop(first.id);
      setAutoOpenedCrop(true);
    }
  }, [autoOpenedCrop, cropFirstFlag, state]);

  const ar = useMemo(
    () => state?.settings?.output_target?.aspectRatio ?? "1:1",
    [state],
  );
  const target = useMemo(
    () => state?.settings?.output_target ?? FALLBACK_TARGET,
    [state],
  );
  const captionContextSummary = useMemo(
    () => (state ? buildCaptionContextSummary(state) : ""),
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
  const isCampaignBuilder = state.settings?.commercial?.mode === "campaign_builder";

  if (isCampaignBuilder) {
    return <CampaignGenerationView state={state} />;
  }

  const doneCount = variants.filter((v) => v.status === "completed").length;
  const allDone = variants.length > 0 && doneCount === variants.length;
  const briefShort =
    state.brief.length > 80 ? `${state.brief.slice(0, 80)}…` : state.brief;
  const completedCaptions = (state.captions ?? []).filter(
    (caption) => caption.status === "completed" && caption.outputText,
  );

  async function refreshGeneration() {
    const response = await fetch(`/api/generations/${props.generationId}`);
    if (response.ok) setState((await response.json()) as GenerationState);
  }

  async function downloadVariant(variant: VariantState) {
    if (!variant.url) return;
    const response = await fetch(variant.url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `generation-${props.generationId.slice(0, 8)}-${variant.id.slice(0, 8)}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function createOrOpenProject() {
    const currentState = state;
    if (!currentState) return;
    if (currentState.projectId) {
      router.push(`/projects/${currentState.projectId}`);
      return;
    }

    setProjectPending(true);
    setProjectError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ generationId: props.generationId }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { projectId?: string; error?: string }
        | null;
      if (!response.ok || !payload?.projectId) {
        setProjectError(payload?.error ?? "Project could not be created");
        return;
      }
      const projectId = payload.projectId;
      setState((current) => current ? { ...current, projectId } : current);
      router.push(`/projects/${projectId}`);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    } finally {
      setProjectPending(false);
    }
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

      {variants.length === 0 ? (
        <div className="empty" style={{ background: "var(--cal-white)", borderRadius: 8 }}>
          <div className="empty__art">
            <I.Image size={28} />
          </div>
          <div className="empty__title">No samples were created</div>
          <p className="empty__sub">Start a new generation or check the worker logs for this job.</p>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        {variants.map((v, i) => (
          <VariantCard
            key={v.id}
            variant={v}
            target={target}
            brandName={state.brandName ?? "Brand"}
            onEdit={() => setEditing(i)}
            onDownload={() => void downloadVariant(v)}
            onZoom={() => setZoomVariant(v)}
            generationId={props.generationId}
            cropOpen={activeCrop === v.id}
            onOpenCrop={() => setActiveCrop(v.id)}
            onCloseCrop={() => setActiveCrop(null)}
            onCropApplied={onCropApplied}
          />
        ))}
        {completedCaptions.map((caption) => (
          <CaptionCard key={caption.id} caption={caption} />
        ))}
      </div>

      <div className="result-action-bar">
        <button
          type="button"
          className="btn btn--accent"
          onClick={() => setCaptionOpen(true)}
        >
          <I.FileText size={14} />
          Add caption · 5 credits
        </button>
        <button
          type="button"
          className={state.projectId ? "btn btn--primary" : "btn btn--secondary"}
          onClick={() => void createOrOpenProject()}
          disabled={projectPending}
        >
          <I.Folder size={14} />
          {projectPending ? "Creating..." : state.projectId ? "Open project" : "Create project"}
        </button>
      </div>
      {projectError ? (
        <div className="t-small result-action-error">
          {projectError}
        </div>
      ) : null}

      {editing !== null ? (
        <EditTextDrawer onClose={() => setEditing(null)} variantIndex={editing} />
      ) : null}
      {captionOpen ? (
        <CaptionModal
          onClose={() => setCaptionOpen(false)}
          generationId={props.generationId}
          brief={state.brief}
          contextSummary={captionContextSummary}
          onCaptionComplete={() => void refreshGeneration()}
        />
      ) : null}
      {zoomVariant ? (
        <ImageZoomModal
          variant={zoomVariant}
          target={target}
          onClose={() => setZoomVariant(null)}
          onDownload={() => void downloadVariant(zoomVariant)}
        />
      ) : null}
    </div>
  );
}

function buildCaptionContextSummary(state: GenerationState) {
  const output = state.settings?.output_target;
  const commercial = state.settings?.commercial;
  const lines = [
    `Image brief: ${state.brief}`,
    output
      ? `Output: ${[
          output.platform,
          output.format,
          output.width && output.height ? `${output.width} x ${output.height}` : null,
          output.aspectRatio,
        ].filter(Boolean).join(" / ")}`
      : null,
    commercial?.creation_type ? `Creation: ${commercial.creation_type}` : null,
    formatSummaryObject("Campaign", commercial?.campaign),
    formatSummaryObject("Template", commercial?.template),
    formatSummaryObject("Composition", commercial?.composition),
    commercial?.prompt?.rendered_prompt
      ? `Prompt: ${truncateText(commercial.prompt.rendered_prompt, 260)}`
      : null,
  ].filter(Boolean);

  return lines.length ? lines.join("\n") : "Image brief and selected output settings are available.";
}

function formatSummaryObject(label: string, value: Record<string, unknown> | undefined) {
  if (!value) return null;
  const body = Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined && item !== "")
    .slice(0, 5)
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(", ") : String(item)}`)
    .join("; ");
  return body ? `${label}: ${body}` : null;
}

function truncateText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function CampaignGenerationView({ state }: { state: GenerationState }) {
  return (
    <div className="page page--wide">
      <div className="breadcrumb">
        <Link href="/history" style={{ cursor: "pointer", textDecoration: "none" }}>
          Generations
        </Link>
        <I.ChevronRight size={12} />
        <span>Campaign builder</span>
      </div>
      <div className="page__head">
        <div>
          <h1 className="page__title">Campaign result</h1>
          <p className="page__sub">
            Campaign Builder results use a separate review page from Quick Create.
          </p>
        </div>
      </div>
      <div className="empty" style={{ background: "var(--cal-white)", borderRadius: 8 }}>
        <div className="empty__art">
          <I.Layers size={28} />
        </div>
        <div className="empty__title">Campaign result page is separate</div>
        <p className="empty__sub">
          This generation was created from Campaign Builder, so it does not use the Quick Create result actions.
        </p>
        <div className="mono t-small" style={{ marginTop: 12 }}>{state.id}</div>
      </div>
    </div>
  );
}
