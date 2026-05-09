"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactCrop, { type Crop, type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface RecomposeOk {
  outputS3Key: string;
  signedUrl: string;
  width: number;
  height: number;
  recomposedAt: string;
  cropRegion: { x: number; y: number; w: number; h: number; targetWidth: number; targetHeight: number };
}

interface Props {
  generationId: string;
  variantId: string;
  backgroundUrl: string;
  /** The picked use case's dimensions. Drives the default aspect lock. */
  targetWidth: number;
  targetHeight: number;
  targetLabel?: string | undefined;
  /** Pre-applied crop, if any — used to repopulate when re-opening. */
  initialCrop?:
    | { x: number; y: number; w: number; h: number; targetWidth: number; targetHeight: number }
    | null
    | undefined;
  onApplied: (result: RecomposeOk) => void;
  onCancel: () => void;
}

export function CropEditor(props: Props) {
  const targetAspect = props.targetWidth / props.targetHeight;
  const [locked, setLocked] = useState(true);
  // Custom W×H lets the user override the target when locked is false.
  const [customW, setCustomW] = useState(String(props.targetWidth));
  const [customH, setCustomH] = useState(String(props.targetHeight));
  const [percentCrop, setPercentCrop] = useState<PercentCrop | null>(null);
  const [pixelCrop, setPixelCrop] = useState<Crop | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Pick a default centered, aspect-locked crop on first image load (or when
  // initialCrop is supplied — re-opening the editor for a previously cropped
  // variant should show the previous selection).
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    imgRef.current = img;
    if (props.initialCrop) {
      const init: PercentCrop = {
        unit: "%",
        x: props.initialCrop.x * 100,
        y: props.initialCrop.y * 100,
        width: props.initialCrop.w * 100,
        height: props.initialCrop.h * 100,
      };
      setPercentCrop(init);
      return;
    }
    // Centred, sized to fill either width or height of the source.
    const naturalAspect = img.naturalWidth / img.naturalHeight;
    let widthPct: number;
    let heightPct: number;
    if (naturalAspect > targetAspect) {
      // Source is wider than target — fit to height.
      heightPct = 100;
      widthPct = (100 * targetAspect) / naturalAspect;
    } else {
      widthPct = 100;
      heightPct = (100 * naturalAspect) / targetAspect;
    }
    const init: PercentCrop = {
      unit: "%",
      x: (100 - widthPct) / 2,
      y: (100 - heightPct) / 2,
      width: widthPct,
      height: heightPct,
    };
    setPercentCrop(init);
  }

  const effectiveTarget = useMemo(() => {
    if (locked) return { w: props.targetWidth, h: props.targetHeight };
    const w = Number(customW);
    const h = Number(customH);
    if (w >= 256 && w <= 4096 && h >= 256 && h <= 4096) return { w, h };
    return { w: props.targetWidth, h: props.targetHeight };
  }, [locked, customW, customH, props.targetWidth, props.targetHeight]);

  // When locked, also re-snap the existing crop's aspect when the user toggles.
  useEffect(() => {
    if (locked && imgRef.current && percentCrop) {
      const img = imgRef.current;
      const naturalAspect = img.naturalWidth / img.naturalHeight;
      // Match crop ratio in pixel space → naturalAspect-aware normalised ratio.
      const desiredNormalRatio = targetAspect / naturalAspect;
      const currentRatio = percentCrop.width / Math.max(percentCrop.height, 0.0001);
      if (Math.abs(currentRatio - desiredNormalRatio) / desiredNormalRatio > 0.01) {
        // Resize height to match the locked aspect, centered around the
        // existing center.
        const cx = percentCrop.x + percentCrop.width / 2;
        const cy = percentCrop.y + percentCrop.height / 2;
        const newH = Math.min(100, percentCrop.width / desiredNormalRatio);
        const newY = Math.max(0, Math.min(100 - newH, cy - newH / 2));
        setPercentCrop({ unit: "%", x: percentCrop.x, y: newY, width: percentCrop.width, height: newH });
      }
    }
  }, [locked, targetAspect, percentCrop]);

  async function apply() {
    if (!percentCrop) {
      setError("Pick a region first.");
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const body = {
        crop: {
          x: percentCrop.x / 100,
          y: percentCrop.y / 100,
          w: percentCrop.width / 100,
          h: percentCrop.height / 100,
        },
        targetWidth: effectiveTarget.w,
        targetHeight: effectiveTarget.h,
      };
      const res = await fetch(
        `/api/generations/${encodeURIComponent(props.generationId)}/variants/${encodeURIComponent(props.variantId)}/recompose`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(json?.error?.message ?? `Recompose failed: ${res.status}`);
      }
      const json = (await res.json()) as RecomposeOk;
      props.onApplied(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }

  // Aspect for ReactCrop is in image-display space, not pixel space — and
  // ReactCrop already normalises against the rendered image size. So passing
  // the target aspect directly works.
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
        gap: 16,
        padding: 16,
        background: "var(--cal-gray-50)",
        borderTop: "1px solid var(--cal-gray-200)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ReactCrop
          {...(percentCrop ? { crop: percentCrop } : {})}
          onChange={(px, pct) => {
            setPixelCrop(px);
            setPercentCrop(pct);
          }}
          {...(locked ? { aspect: targetAspect } : {})}
          keepSelection
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.backgroundUrl}
            alt="Background to crop"
            onLoad={onImageLoad}
            style={{ maxWidth: "100%", maxHeight: "60vh", display: "block" }}
          />
        </ReactCrop>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
          />
          Lock to{" "}
          <span className="mono">
            {props.targetLabel ?? `${props.targetWidth}×${props.targetHeight}`}
          </span>{" "}
          aspect
        </label>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600 }}>
          Output: {effectiveTarget.w} × {effectiveTarget.h}
        </h4>
        {!locked ? (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div>
              <label className="label">Width</label>
              <input
                className="input mono"
                style={{ width: 100 }}
                type="number"
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
              />
            </div>
            <span style={{ marginBottom: 8 }}>×</span>
            <div>
              <label className="label">Height</label>
              <input
                className="input mono"
                style={{ width: 100 }}
                type="number"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <CroppedPreview
          backgroundUrl={props.backgroundUrl}
          percentCrop={percentCrop}
          target={effectiveTarget}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn btn--accent"
            disabled={applying || !percentCrop}
            onClick={() => void apply()}
          >
            {applying ? "Applying…" : "Apply crop"}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={props.onCancel}
            disabled={applying}
          >
            Cancel
          </button>
        </div>

        {pixelCrop ? (
          <p className="mono" style={{ fontSize: 11, color: "var(--fg-3)", margin: 0 }}>
            Pixel: {Math.round(pixelCrop.x)},{Math.round(pixelCrop.y)} ·{" "}
            {Math.round(pixelCrop.width)}×{Math.round(pixelCrop.height)}
          </p>
        ) : null}
        {error ? (
          <p
            style={{
              color: "var(--studio-red, #c00)",
              fontSize: 12,
              margin: 0,
            }}
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// CSS-only preview: show the source image with object-position + size set so
// the visible window matches the picked crop. Cheaper than re-encoding.
function CroppedPreview({
  backgroundUrl,
  percentCrop,
  target,
}: {
  backgroundUrl: string;
  percentCrop: PercentCrop | null;
  target: { w: number; h: number };
}) {
  if (!percentCrop) {
    return (
      <div
        style={{
          aspectRatio: `${target.w} / ${target.h}`,
          background: "var(--cal-gray-200)",
          borderRadius: 6,
          display: "grid",
          placeItems: "center",
          color: "var(--fg-3)",
          fontSize: 12,
        }}
      >
        Select a region to preview
      </div>
    );
  }
  // Translate the crop into background-image coordinates: the visible window
  // is `width: 100% / crop.w` of the natural image, offset by -x/-y.
  const scale = 100 / percentCrop.width;
  const bgSizeX = scale * 100;
  const bgSizeY = (100 / percentCrop.height) * 100;
  const bgPosX = percentCrop.x === 0 ? 0 : (-percentCrop.x * scale);
  const bgPosY = percentCrop.y === 0 ? 0 : (-percentCrop.y * (100 / percentCrop.height));
  return (
    <div
      style={{
        aspectRatio: `${target.w} / ${target.h}`,
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        backgroundRepeat: "no-repeat",
        borderRadius: 6,
        border: "1px solid var(--cal-gray-200)",
      }}
      role="img"
      aria-label="Crop preview"
    />
  );
}
