"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { I } from "@/components/icons";
import { trackQuickCreateEvent } from "@/lib/quick-create-events";

interface VariantState {
  id: string;
  status: string;
  modelUsed: string | null;
  templateId?: string;
  url?: string | null;
  qaStatus?: "pending" | "passed" | "soft_failed" | "hard_failed" | "unavailable" | null;
  qaResult?: {
    summary?: string;
    dimensions?: Record<string, { score: number; reason: string; hardFailure?: boolean }>;
  } | null;
  qaRank?: number | null;
  parentVariantId?: string | null;
  creditCost?: number;
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
  onAccept,
  onReject,
  onRefine,
  feedback,
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
  onAccept: () => void;
  onReject: () => void;
  onRefine: () => void;
  feedback?: "up" | "down";
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
              color: "var(--layertone-red)",
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
          {target.platform ?? "image"}
          {target.format ? ` / ${target.format}` : ""} · {ar} · {width} x {height} · {variant.modelUsed ?? "—"}
        </span>
        <span className="mono">{variant.id.slice(0, 8)}</span>
      </div>
      {state === "done" ? (
        <div className="result-variant-actions">
          <div className="row">
            <button type="button" className={feedback === "up" ? "btn btn--secondary" : "btn btn--ghost"} onClick={onAccept}>
              <I.Check size={14} /> {feedback === "up" ? "Marked useful" : "Useful"}
            </button>
            <button type="button" className={feedback === "down" ? "btn btn--secondary" : "btn btn--ghost"} onClick={onReject}>
              <I.X size={14} /> {feedback === "down" ? "Feedback sent" : "Not right"}
            </button>
          </div>
          <button type="button" className="btn btn--secondary" onClick={onRefine}>
            <I.Wand size={14} /> Refine
          </button>
        </div>
      ) : null}
      {variant.qaStatus && variant.qaStatus !== "unavailable" ? (
        <details className={`result-qa result-qa--${variant.qaStatus}`}>
          <summary>
            Quality check · {variant.qaStatus === "passed" ? "Passed" : variant.qaStatus === "pending" ? "Checking" : "Review suggested"}
          </summary>
          {variant.qaResult?.summary ? <p>{variant.qaResult.summary}</p> : null}
          {variant.qaResult?.dimensions
            ? Object.entries(variant.qaResult.dimensions).map(([name, result]) => (
                <div className="result-qa__dimension" key={name}>
                  <strong>{name.replaceAll("_", " ")}</strong>
                  <span>{result.score}/100 · {result.reason}</span>
                </div>
              ))
            : null}
        </details>
      ) : null}
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
  variantId,
  generationId,
  onDone,
  initialCopy,
}: {
  onClose: () => void;
  variantIndex: number;
  variantId: string;
  generationId: string;
  onDone: (newUrl: string) => void;
  initialCopy: { headline: string; subhead: string; cta: string };
}) {
  const [vals, setVals] = useState({
    headline: initialCopy.headline,
    sub: initialCopy.subhead,
    cta: initialCopy.cta,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRerender() {
    setPending(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/generations/${generationId}/variants/${variantId}/rerender`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ headline: vals.headline, subhead: vals.sub, cta: vals.cta }),
        },
      );
      if (!r.ok) {
        const json = (await r.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(json?.error?.message ?? "Re-render failed");
        return;
      }
      const payload = (await r.json()) as { url: string };
      onDone(payload.url);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

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
              background: "var(--layertone-violet-50)",
              boxShadow: "none",
              border: "1px solid var(--layertone-violet-100)",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <I.Info size={14} style={{ color: "var(--layertone-violet)", marginTop: 2 }} />
              <div className="t-small" style={{ color: "var(--layertone-violet-700)" }}>
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
          {error ? (
            <div className="t-small" style={{ color: "var(--layertone-red)", marginTop: 4 }}>
              {error}
            </div>
          ) : null}
        </div>
        <div className="drawer__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => void handleRerender()}
            disabled={pending}
          >
            <I.Refresh size={14} />
            {pending ? "Re-rendering…" : "Re-render"}
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
            style={{ color: "var(--layertone-red)", marginTop: 16 }}
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

const REJECTION_REASONS = [
  ["wrong_product", "Wrong product"],
  ["not_my_idea", "Not my idea"],
  ["bad_composition", "Bad composition"],
  ["brand_mismatch", "Brand mismatch"],
  ["text_problem", "Text problem"],
  ["other", "Something else"],
] as const;

function RejectionModal(props: {
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (reason: (typeof REJECTION_REASONS)[number][0], note: string) => void;
}) {
  const [reason, setReason] = useState<(typeof REJECTION_REASONS)[number][0] | null>(null);
  const [note, setNote] = useState("");
  return (
    <>
      <div className="scrim" onClick={props.onClose} />
      <div className="modal result-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="rejection-title">
        <div className="result-modal-head">
          <div>
            <h2 id="rejection-title" className="t-h3">What missed the mark?</h2>
            <p className="t-small">This helps rank future directions and measure output quality.</p>
          </div>
          <button type="button" className="btn btn--icon btn--ghost" onClick={props.onClose} aria-label="Close">
            <I.X size={16} />
          </button>
        </div>
        <div className="result-reason-grid">
          {REJECTION_REASONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={reason === value ? "btn btn--accent" : "btn btn--secondary"}
              onClick={() => setReason(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="label" htmlFor="rejection-note">Optional detail</label>
        <textarea id="rejection-note" className="input result-refine-textarea" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
        {props.error ? <p className="t-small result-action-error">{props.error}</p> : null}
        <div className="result-modal-actions">
          <button type="button" className="btn btn--ghost" onClick={props.onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" disabled={!reason || props.pending} onClick={() => reason && props.onSubmit(reason, note)}>
            {props.pending ? "Saving…" : "Send feedback"}
          </button>
        </div>
      </div>
    </>
  );
}

function RefinementModal(props: {
  variant: VariantState;
  variants: VariantState[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: { instruction: string; locks: string[]; treatmentVariantId: string | null }) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [locks, setLocks] = useState(() => new Set(["product", "brand", "copy"]));
  const [treatmentVariantId, setTreatmentVariantId] = useState("");
  function toggleLock(lock: string) {
    setLocks((current) => {
      const next = new Set(current);
      if (next.has(lock)) next.delete(lock);
      else next.add(lock);
      return next;
    });
  }
  return (
    <>
      <div className="scrim" onClick={props.onClose} />
      <div className="modal result-refine-modal" role="dialog" aria-modal="true" aria-labelledby="refine-title">
        <div className="result-modal-head">
          <div>
            <h2 id="refine-title" className="t-h3">Refine this result</h2>
            <p className="t-small">Say what should change, then lock what must stay unchanged.</p>
          </div>
          <button type="button" className="btn btn--icon btn--ghost" onClick={props.onClose} aria-label="Close">
            <I.X size={16} />
          </button>
        </div>
        <label className="label" htmlFor="refinement-request">What should change?</label>
        <textarea
          id="refinement-request"
          className="input result-refine-textarea"
          maxLength={2000}
          placeholder="Make the background warmer and add more breathing room on the left…"
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          autoFocus
        />
        <fieldset className="result-locks">
          <legend className="label">Keep unchanged</legend>
          {["product", "composition", "brand", "copy", "mood"].map((lock) => (
            <label key={lock}>
              <input type="checkbox" checked={locks.has(lock)} onChange={() => toggleLock(lock)} />
              <I.Lock size={13} /> {lock[0]!.toUpperCase() + lock.slice(1)}
            </label>
          ))}
        </fieldset>
        {props.variants.filter((variant) => variant.id !== props.variant.id && variant.status === "completed").length ? (
          <div>
            <label className="label" htmlFor="visual-treatment">Visual treatment from another result</label>
            <select id="visual-treatment" className="select" value={treatmentVariantId} onChange={(event) => setTreatmentVariantId(event.target.value)}>
              <option value="">Keep this result’s treatment</option>
              {props.variants.filter((variant) => variant.id !== props.variant.id && variant.status === "completed").map((variant, index) => (
                <option key={variant.id} value={variant.id}>Use result {index + 1}</option>
              ))}
            </select>
          </div>
        ) : null}
        <p className="t-small result-credit-note">
          Refinement creates one new variant for {props.variant.creditCost ?? "the normal variant"} credits.
          If automated QA finds a hard failure, its single automatic retry costs 0 additional credits.
        </p>
        {props.error ? <p className="t-small result-action-error">{props.error}</p> : null}
        <div className="result-modal-actions">
          <button type="button" className="btn btn--ghost" onClick={props.onClose}>Cancel</button>
          <button type="button" className="btn btn--accent" disabled={!instruction.trim() || props.pending} onClick={() => props.onSubmit({ instruction: instruction.trim(), locks: [...locks], treatmentVariantId: treatmentVariantId || null })}>
            <I.Wand size={14} /> {props.pending ? "Refining…" : "Create refinement"}
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
  const [projectPending, setProjectPending] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [refiningVariant, setRefiningVariant] = useState<VariantState | null>(null);
  const [rejectingVariant, setRejectingVariant] = useState<VariantState | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [refinementPending, setRefinementPending] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);
  const [feedbackByVariant, setFeedbackByVariant] = useState<Record<string, "up" | "down">>({});

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

  useEffect(() => {
    if (state?.settings?.commercial?.mode !== "quick") return;
    trackQuickCreateEvent("result_viewed", { source: "generation" });
  }, [props.generationId, state?.settings?.commercial?.mode]);

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
    trackQuickCreateEvent("result_downloaded", {
      model: variant.modelUsed ?? "unknown",
      format: target.format ?? "image",
    });
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

  async function saveFeedback(
    variant: VariantState,
    rating: "up" | "down",
    reason?: (typeof REJECTION_REASONS)[number][0],
    note?: string,
  ) {
    setFeedbackPending(true);
    setFeedbackError(null);
    try {
      const response = await fetch(
        `/api/generations/${props.generationId}/variants/${variant.id}/feedback`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rating, reason: reason ?? null, note: note || null }),
        },
      );
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Feedback could not be saved");
      setFeedbackByVariant((current) => ({ ...current, [variant.id]: rating }));
      trackQuickCreateEvent(rating === "up" ? "result_accepted" : "result_rejected", {
        model: variant.modelUsed ?? "unknown",
        ...(reason ? { reason } : {}),
      });
      setRejectingVariant(null);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : String(error));
    } finally {
      setFeedbackPending(false);
    }
  }

  async function submitRefinement(input: {
    instruction: string;
    locks: string[];
    treatmentVariantId: string | null;
  }) {
    if (!refiningVariant) return;
    setRefinementPending(true);
    setRefinementError(null);
    try {
      const response = await fetch(
        `/api/generations/${props.generationId}/variants/${refiningVariant.id}/refine`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
        variant?: VariantState;
      } | null;
      if (!response.ok || !payload?.variant) {
        throw new Error(payload?.error?.message ?? "Refinement could not be started");
      }
      setState((current) =>
        current
          ? { ...current, status: "running", variants: [...current.variants, payload.variant!] }
          : current,
      );
      trackQuickCreateEvent("refinement_started", {
        model: refiningVariant.modelUsed ?? "unknown",
        source: input.treatmentVariantId ? "another_result" : "same_result",
      });
      setRefiningVariant(null);
    } catch (error) {
      setRefinementError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefinementPending(false);
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
            onEdit={() => {
              trackQuickCreateEvent("text_edit_opened", {
                model: v.modelUsed ?? "unknown",
              });
              setEditing(i);
            }}
            onDownload={() => void downloadVariant(v)}
            onZoom={() => setZoomVariant(v)}
            onAccept={() => void saveFeedback(v, "up")}
            onReject={() => {
              setFeedbackError(null);
              setRejectingVariant(v);
            }}
            onRefine={() => {
              setRefinementError(null);
              setRefiningVariant(v);
            }}
            {...(feedbackByVariant[v.id] ? { feedback: feedbackByVariant[v.id] } : {})}
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

      {editing !== null && editing < variants.length ? (
        <EditTextDrawer
          onClose={() => setEditing(null)}
          variantIndex={editing}
          variantId={variants[editing]!.id}
          generationId={props.generationId}
          onDone={(url) => {
            setState((s) =>
              s
                ? { ...s, variants: s.variants.map((v, i) => i === editing ? { ...v, url } : v) }
                : s,
            );
            setEditing(null);
          }}
          initialCopy={copyFromGeneration(state)}
        />
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
      {rejectingVariant ? (
        <RejectionModal
          pending={feedbackPending}
          error={feedbackError}
          onClose={() => setRejectingVariant(null)}
          onSubmit={(reason, note) => void saveFeedback(rejectingVariant, "down", reason, note)}
        />
      ) : null}
      {refiningVariant ? (
        <RefinementModal
          variant={refiningVariant}
          variants={variants}
          pending={refinementPending}
          error={refinementError}
          onClose={() => setRefiningVariant(null)}
          onSubmit={(input) => void submitRefinement(input)}
        />
      ) : null}
    </div>
  );
}

function copyFromGeneration(state: GenerationState) {
  const campaign = state.settings?.commercial?.campaign ?? {};
  return {
    headline: stringValue(campaign.title) || stringValue(campaign.badgeText),
    subhead: stringValue(campaign.subtitle) || stringValue(campaign.message),
    cta: stringValue(campaign.cta),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
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
