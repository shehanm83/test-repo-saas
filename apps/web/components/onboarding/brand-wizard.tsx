"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { I } from "@/components/icons";

// ── sections ───────────────────────────────────────────────────────────────
const STEPS = ["identify", "logo", "palette", "fonts", "voice", "references"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABELS: Record<Step, string> = {
  identify: "Brand", logo: "Logo", palette: "Colors",
  fonts: "Fonts", voice: "Voice", references: "References",
};

const DEFAULT_PALETTE = ["#2A1F18", "#7C5232", "#E8DCC4", "#C9A86A", "#F5EFE3"];
const PALETTE_LABELS  = ["Primary", "Secondary", "Accent", "Extra 1", "Extra 2"];
const MAX_LOGOS = 5;
const MAX_REFERENCES = 10;
const STORAGE_KEY = "layertone-onboarding";

type UploadedAsset = {
  id: string;
  kind: "logo" | "reference" | "icon";
  s3Key: string;
  url: string | null;
  mimeType?: string | null;
};

type PendingAsset = {
  id: string;
  file: File;
  url: string;
};

type WizardData = {
  brandId: string;
  name: string;
  url: string;
  palette: string[];
  heading: string;
  body: string;
  voice: string;
  logos: UploadedAsset[];
  references: UploadedAsset[];
};

const EMPTY_DATA: WizardData = {
  brandId: "",
  name: "",
  url: "",
  palette: DEFAULT_PALETTE,
  heading: "",
  body: "",
  voice: "",
  logos: [],
  references: [],
};

// ── font catalogue ─────────────────────────────────────────────────────────
const FONTS = [
  { name: "Inter",              category: "Sans-serif",     heading: "The Future of Design",  body: "Clean and modern, perfect for digital products." },
  { name: "Playfair Display",   category: "Serif",          heading: "Elegant & Timeless",    body: "Classic serif with high contrast strokes." },
  { name: "Montserrat",         category: "Geometric Sans", heading: "Bold Statement",        body: "Geometric shapes inspired by urban signage." },
  { name: "Lora",               category: "Literary Serif", heading: "Stories Worth Telling", body: "A well-balanced serif for long-form reading." },
  { name: "Raleway",            category: "Art Deco",       heading: "Refined Elegance",      body: "Elegant thin strokes with Art Deco roots." },
  { name: "Poppins",            category: "Rounded Sans",   heading: "Friendly & Modern",     body: "Geometric and approachable, loved by startups." },
  { name: "Merriweather",       category: "Newspaper Serif",heading: "Built to Be Read",      body: "Designed for comfortable on-screen reading." },
  { name: "Oswald",             category: "Condensed",      heading: "STRONG IMPACT",         body: "Reworked classic gothic style, ultra-condensed." },
  { name: "Nunito",             category: "Rounded",        heading: "Warm & Welcoming",      body: "Well-rounded terminals for a soft, friendly feel." },
  { name: "Roboto Slab",        category: "Slab Serif",     heading: "Grounded Authority",    body: "Mechanical skeleton with friendly open curves." },
  { name: "Space Grotesk",      category: "Quirky Geometric",heading: "Designed in Space",   body: "Slightly quirky geometric with unique details." },
  { name: "DM Serif Display",   category: "High Contrast",  heading: "Sharp & Distinct",      body: "High contrast and dramatic for display use." },
  { name: "Crimson Pro",        category: "Classic Serif",  heading: "Scholarly & Refined",   body: "Inspired by old-style typography for long text." },
  { name: "Work Sans",          category: "Humanist Sans",  heading: "Clear & Direct",        body: "Optimised for on-screen text at medium sizes." },
  { name: "Libre Baskerville",  category: "Traditional",    heading: "Timeless & Trusted",    body: "Based on 1941 ATF Baskerville, digitised for web." },
];

// Build a single Google Fonts URL for all fonts
const GF_URL =
  "https://fonts.googleapis.com/css2?family=" +
  FONTS.map((f) => f.name.replace(/ /g, "+") + ":wght@400;600;700;800").join("&family=") +
  "&display=swap";

// ── design tokens ──────────────────────────────────────────────────────────
const T = {
  bg:      "#f8f9ff",
  card:    "rgba(255,255,255,0.88)",
  text:    "#101828",
  muted:   "#667085",
  line:    "#e6e8f0",
  primary: "#635bff",
  shadow:  "0 18px 45px rgba(31,41,55,0.08)",
  radius:  "24px",
};

// ── font loader ────────────────────────────────────────────────────────────
function GoogleFontsLoader() {
  useEffect(() => {
    if (document.getElementById("gf-brand-wizard")) return;
    const link = document.createElement("link");
    link.id   = "gf-brand-wizard";
    link.rel  = "stylesheet";
    link.href = GF_URL;
    document.head.appendChild(link);
  }, []);
  return null;
}

// ── shared primitives ──────────────────────────────────────────────────────
function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 8px", color: T.text }}>
        {title}
      </h2>
      <p style={{ margin: 0, color: T.muted, fontSize: 15 }}>{sub}</p>
    </div>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>
        {label}
        {optional && <span style={{ color: T.muted, fontWeight: 500, marginLeft: 6 }}>· optional</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", boxSizing: "border-box",
        border: `1px solid ${T.line}`, borderRadius: 14,
        background: "white", padding: "14px 18px",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 15, color: T.text, outline: "none",
      }}
    />
  );
}

// ── section tabs ───────────────────────────────────────────────────────────
function SectionTabs({
  current,
  busy,
  onChange,
}: {
  current: Step;
  busy: boolean;
  onChange: (step: Step) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Brand kit sections"
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: 6,
        marginBottom: 28,
        borderRadius: 14,
        background: "rgba(244,245,251,0.92)",
        border: `1px solid ${T.line}`,
      }}
    >
      {STEPS.map((s) => {
        const active = s === current;
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={busy}
            onClick={() => onChange(s)}
            style={{
              minWidth: 104,
              height: 42,
              padding: "0 14px",
              borderRadius: 10,
              background: active ? "white" : "transparent",
              color: active ? T.text : T.muted,
              boxShadow: active ? "0 4px 14px rgba(16,24,40,0.08), 0 0 0 1px rgba(16,24,40,0.06)" : "none",
              fontSize: 13,
              fontWeight: 800,
              cursor: busy ? "wait" : "pointer",
              transition: ".15s ease",
              flexShrink: 0,
            }}
          >
            {STEP_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}

// ── font picker ────────────────────────────────────────────────────────────
function FontPicker({
  label, selected, onSelect,
}: { label: string; selected: string; onSelect: (f: string) => void }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{label}</span>
        <span style={{
          background: `${T.primary}12`, border: `1px solid ${T.primary}30`,
          borderRadius: 999, padding: "4px 12px",
          fontSize: 12, fontWeight: 700, color: T.primary,
          fontFamily: selected ? `"${selected}", sans-serif` : "inherit",
        }}>
          {selected || "None selected"}
        </span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0,1fr))",
        gap: 10,
      }}>
        {FONTS.map((f) => {
          const active = selected === f.name;
          return (
            <div
              key={f.name}
              onClick={() => onSelect(f.name)}
              style={{
                border: `1.5px solid ${active ? T.primary : T.line}`,
                borderRadius: 16,
                background: active ? `${T.primary}08` : "white",
                padding: "14px 12px 12px",
                cursor: "pointer",
                transform: active ? "translateY(-2px)" : "none",
                boxShadow: active ? `0 10px 24px ${T.primary}20` : "none",
                transition: ".15s ease",
                textAlign: "center",
              }}
            >
              {/* large sample text */}
              <div style={{
                fontFamily: `"${f.name}", serif`,
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1,
                color: active ? T.primary : T.text,
                marginBottom: 10,
                letterSpacing: "-0.02em",
              }}>
                Aa
              </div>
              {/* font name */}
              <div style={{
                fontSize: 11, fontWeight: 700, color: active ? T.primary : T.text,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                marginBottom: 2,
              }}>
                {f.name}
              </div>
              {/* category */}
              <div style={{ fontSize: 10, color: T.muted }}>{f.category}</div>
              {/* active check */}
              {active && (
                <div style={{
                  marginTop: 8,
                  width: 18, height: 18, borderRadius: "50%",
                  background: T.primary, color: "white",
                  display: "grid", placeItems: "center",
                  margin: "8px auto 0",
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* live preview */}
      {selected && (
        <div style={{
          marginTop: 14,
          background: "linear-gradient(180deg,#fbfaff,#f5f3ff)",
          border: "1px solid #e5e1ff",
          borderRadius: 16,
          padding: "18px 22px",
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: T.primary,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
          }}>
            Live preview — {selected}
          </div>
          {label.toLowerCase().includes("heading") ? (
            <div style={{ fontFamily: `"${selected}", serif`, fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: "-0.03em" }}>
              Your brand, beautifully composed.
            </div>
          ) : (
            <div style={{ fontFamily: `"${selected}", sans-serif`, fontSize: 15, color: T.muted, lineHeight: 1.7 }}>
              Great typography isn&apos;t noticed — it&apos;s felt. Every word carries your brand&apos;s tone, and the right typeface makes every message resonate with your audience.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function readStoredData(resetDraft = false): WizardData {
  if (typeof window === "undefined") return EMPTY_DATA;
  if (resetDraft) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return EMPTY_DATA;
  }
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return EMPTY_DATA;
  try {
    const parsed = JSON.parse(stored) as Partial<WizardData>;
    return {
      ...EMPTY_DATA,
      ...parsed,
      palette: parsed.palette?.length ? parsed.palette : DEFAULT_PALETTE,
      logos: parsed.logos ?? [],
      references: parsed.references ?? [],
    };
  } catch {
    return EMPTY_DATA;
  }
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// ── main wizard ────────────────────────────────────────────────────────────
export function BrandWizard({ step, resetDraft = false }: { step: Step; resetDraft?: boolean }) {
  const router    = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const pendingLogosRef = useRef<PendingAsset[]>([]);
  const pendingReferencesRef = useRef<PendingAsset[]>([]);

  const [data, setData] = useState<WizardData>(() => readStoredData(resetDraft));
  const [pendingLogos, setPendingLogos] = useState<PendingAsset[]>([]);
  const [pendingReferences, setPendingReferences] = useState<PendingAsset[]>([]);
  const [deletedAssetIds, setDeletedAssetIds] = useState<string[]>([]);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeLogos = data.logos.filter((asset) => !deletedAssetIds.includes(asset.id));
  const activeReferences = data.references.filter((asset) => !deletedAssetIds.includes(asset.id));

  useEffect(() => {
    pendingLogosRef.current = pendingLogos;
  }, [pendingLogos]);

  useEffect(() => {
    pendingReferencesRef.current = pendingReferences;
  }, [pendingReferences]);

  useEffect(() => {
    return () => {
      pendingLogosRef.current.forEach((asset) => URL.revokeObjectURL(asset.url));
      pendingReferencesRef.current.forEach((asset) => URL.revokeObjectURL(asset.url));
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined")
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!resetDraft || typeof window === "undefined") return;
    window.sessionStorage.removeItem(STORAGE_KEY);
    pendingLogosRef.current.forEach((asset) => URL.revokeObjectURL(asset.url));
    pendingReferencesRef.current.forEach((asset) => URL.revokeObjectURL(asset.url));
    setData(EMPTY_DATA);
    setPendingLogos([]);
    setPendingReferences([]);
    setDeletedAssetIds([]);
    setLogoError(null);
    setReferenceError(null);
    setFinishError(null);
  }, [resetDraft]);

  useEffect(() => {
    if (!data.brandId) return;
    let cancelled = false;
    void Promise.all([
      fetch(`/api/brands/${data.brandId}`).then((response) => (response.ok ? response.json() : null)),
      fetch(`/api/brands/${data.brandId}/assets`).then((response) => (response.ok ? response.json() : null)),
    ])
      .then(([brand, assets]: [
        {
          name?: string;
          sourceUrl?: string | null;
          palette?: { primary?: string; secondary?: string; accent?: string; extras?: string[] } | null;
          fonts?: { heading?: { family?: string }; body?: { family?: string } } | null;
          voiceNotes?: string | null;
        } | null,
        UploadedAsset[] | null,
      ]) => {
        if (cancelled) return;
        if (!brand) {
          window.sessionStorage.removeItem(STORAGE_KEY);
          pendingLogosRef.current.forEach((asset) => URL.revokeObjectURL(asset.url));
          pendingReferencesRef.current.forEach((asset) => URL.revokeObjectURL(asset.url));
          setData(EMPTY_DATA);
          setPendingLogos([]);
          setPendingReferences([]);
          setDeletedAssetIds([]);
          return;
        }
        setData((current) => ({
          ...current,
          ...(brand?.name ? { name: brand.name } : {}),
          ...(brand?.sourceUrl ? { url: brand.sourceUrl } : {}),
          ...(brand?.palette
            ? (() => {
                const palette = [
                  brand.palette.primary,
                  brand.palette.secondary,
                  brand.palette.accent,
                  ...(brand.palette.extras ?? []),
                ].filter((color): color is string => Boolean(color)).slice(0, 5);
                return palette.length ? { palette } : {};
              })()
            : {}),
          ...(brand?.fonts?.heading?.family ? { heading: brand.fonts.heading.family } : {}),
          ...(brand?.fonts?.body?.family ? { body: brand.fonts.body.family } : {}),
          ...(brand?.voiceNotes ? { voice: brand.voiceNotes } : {}),
          ...(assets
            ? {
                logos: assets.filter((asset) => asset.kind === "logo"),
                references: assets.filter((asset) => asset.kind === "reference"),
              }
            : {}),
        }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [data.brandId]);

  const update = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  async function ensureBrand() {
    const name = data.name.trim();
    if (!name) {
      setFinishError("Enter a brand name before continuing.");
      return null;
    }

    const body = {
      name,
      sourceUrl: normalizeUrl(data.url),
    };

    if (data.brandId) {
      const response = await fetch(`/api/brands/${data.brandId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setFinishError("Brand could not be saved. Please check the URL and try again.");
        return null;
      }
      return data.brandId;
    }

    const response = await fetch("/api/brands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        ...(body.sourceUrl ? { sourceUrl: body.sourceUrl } : {}),
      }),
    });
    if (!response.ok) {
      setFinishError("Brand could not be created. Please check the URL and try again.");
      return null;
    }

    const brand = (await response.json()) as { id?: string };
    if (!brand.id) {
      setFinishError("Brand was created without an ID. Please refresh and try again.");
      return null;
    }
    setData((current) => ({ ...current, brandId: brand.id! }));
    return brand.id;
  }

  async function uploadAsset(
    endpoint: "logo" | "assets",
    file: File,
    brandId: string,
  ): Promise<UploadedAsset | null> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`/api/brands/${brandId}/${endpoint}`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) return null;
    return (await response.json()) as UploadedAsset;
  }

  async function saveBrandDetails(brandId: string) {
    return fetch(`/api/brands/${brandId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        sourceUrl: normalizeUrl(data.url),
        palette: {
          primary: data.palette[0],
          secondary: data.palette[1],
          accent: data.palette[2],
          extras: data.palette.slice(3),
        },
        fonts: {
          heading: { family: data.heading || "Inter" },
          body: { family: data.body || "Inter" },
        },
        ...(data.voice ? { voiceNotes: data.voice } : {}),
      }),
    });
  }

  async function addLogoFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files).filter((file) => file.type.startsWith("image/") || file.name.endsWith(".svg"));
    if (nextFiles.length === 0) {
      setLogoError("Choose SVG, PNG, JPG, or WebP logo files.");
      return;
    }
    const slots = MAX_LOGOS - activeLogos.length - pendingLogos.length;
    if (slots <= 0) {
      setLogoError(`You can upload up to ${MAX_LOGOS} logos.`);
      return;
    }
    const accepted = nextFiles.slice(0, slots);
    setLogoError(nextFiles.length > slots ? `Only ${MAX_LOGOS} logos can be uploaded.` : null);
    setPendingLogos((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  async function addReferenceFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (nextFiles.length === 0) {
      setReferenceError("Choose PNG, JPG, or WebP reference files.");
      return;
    }
    const slots = MAX_REFERENCES - activeReferences.length - pendingReferences.length;
    if (slots <= 0) {
      setReferenceError(`You can upload up to ${MAX_REFERENCES} references.`);
      return;
    }
    const accepted = nextFiles.slice(0, slots);
    setReferenceError(nextFiles.length > slots ? `Only ${MAX_REFERENCES} references can be uploaded.` : null);
    setPendingReferences((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeSavedAsset(asset: UploadedAsset) {
    setDeletedAssetIds((current) => (current.includes(asset.id) ? current : [...current, asset.id]));
    setLogoError(null);
    setReferenceError(null);
  }

  function removePendingLogo(asset: PendingAsset) {
    URL.revokeObjectURL(asset.url);
    setPendingLogos((current) => current.filter((item) => item.id !== asset.id));
    setLogoError(null);
  }

  function removePendingReference(asset: PendingAsset) {
    URL.revokeObjectURL(asset.url);
    setPendingReferences((current) => current.filter((item) => item.id !== asset.id));
    setReferenceError(null);
  }

  async function applyPendingImageChanges(brandId: string) {
    const deleted = [...deletedAssetIds];
    for (const assetId of deleted) {
      const response = await fetch(`/api/brands/${brandId}/assets/${assetId}`, { method: "DELETE" }).catch(() => null);
      if (!response?.ok && response?.status !== 404) {
        setFinishError("One or more image changes could not be saved. Please try again.");
        return false;
      }
    }

    const uploadedLogos: UploadedAsset[] = [];
    const failedLogos: PendingAsset[] = [];
    for (const pending of pendingLogos) {
      const asset = await uploadAsset("logo", pending.file, brandId);
      if (asset) uploadedLogos.push(asset);
      else failedLogos.push(pending);
    }

    const uploadedReferences: UploadedAsset[] = [];
    const failedReferences: PendingAsset[] = [];
    for (const pending of pendingReferences) {
      const asset = await uploadAsset("assets", pending.file, brandId);
      if (asset) uploadedReferences.push(asset);
      else failedReferences.push(pending);
    }

    pendingLogos
      .filter((asset) => !failedLogos.some((failed) => failed.id === asset.id))
      .forEach((asset) => URL.revokeObjectURL(asset.url));
    pendingReferences
      .filter((asset) => !failedReferences.some((failed) => failed.id === asset.id))
      .forEach((asset) => URL.revokeObjectURL(asset.url));

    setData((current) => ({
      ...current,
      logos: [
        ...current.logos.filter((asset) => !deleted.includes(asset.id)),
        ...uploadedLogos,
      ].slice(0, MAX_LOGOS),
      references: [
        ...current.references.filter((asset) => !deleted.includes(asset.id)),
        ...uploadedReferences,
      ].slice(0, MAX_REFERENCES),
    }));
    setDeletedAssetIds([]);
    setPendingLogos(failedLogos);
    setPendingReferences(failedReferences);

    if (failedLogos.length > 0) {
      setLogoError(`Logo upload failed for ${failedLogos[0]!.file.name}.`);
    } else {
      setLogoError(null);
    }
    if (failedReferences.length > 0) {
      setReferenceError(`Reference upload failed for ${failedReferences[0]!.file.name}.`);
    } else {
      setReferenceError(null);
    }

    return failedLogos.length === 0 && failedReferences.length === 0;
  }

  async function persistCurrentSection(
    options: { requireBrand: boolean; uploadPendingImages?: boolean } = { requireBrand: false },
  ) {
    setFinishError(null);
    const hasBrandName = data.name.trim().length > 0;

    if (!data.brandId && !hasBrandName) {
      if (options.requireBrand) {
        setFinishError("Add a brand name before saving this brand kit.");
        return false;
      }
      return true;
    }

    setBusy(true);
    const brandId = data.brandId || hasBrandName ? await ensureBrand().catch(() => null) : null;
    if (!brandId) {
      setBusy(false);
      return false;
    }

    const response = await saveBrandDetails(brandId).catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      setFinishError("Brand changes could not be saved. Please try again.");
      return false;
    }

    if (options.uploadPendingImages) {
      const imagesSaved = await applyPendingImageChanges(brandId);
      if (!imagesSaved) {
        setBusy(false);
        return false;
      }
    }

    setBusy(false);
    return true;
  }

  async function openSection(target: Step) {
    if (target === step || busy) return;
    const saved = await persistCurrentSection({ requireBrand: false, uploadPendingImages: false });
    if (!saved) return;
    router.push(`/brands/new/${target}`);
  }

  async function finish() {
    const saved = await persistCurrentSection({ requireBrand: true, uploadPendingImages: true });
    if (!saved) return;

    if (typeof window !== "undefined")
      window.sessionStorage.removeItem(STORAGE_KEY);
    router.push("/generate");
  }

  return (
    <>
      <GoogleFontsLoader />
      <div style={{
        background: `
          radial-gradient(circle at 8% 4%, rgba(114,255,189,0.18), transparent 28%),
          radial-gradient(circle at 88% 5%, rgba(99,91,255,0.18), transparent 25%),
          linear-gradient(180deg,#ffffff 0%,${T.bg} 55%,#ffffff 100%)
        `,
        minHeight: "calc(100vh - var(--header-h))",
        padding: "32px 32px 96px",
      }}>
        <div className="page page--narrow" style={{ maxWidth: step === "fonts" ? 980 : 820, padding: 0 }}>
        <div className="page__head">
          <div>
            <div className="t-eyebrow" style={{ color: "var(--layertone-violet)", marginBottom: 6 }}>
              <I.Briefcase size={11} style={{ verticalAlign: "-1px" }} /> Brand kit setup
            </div>
            <h1 className="page__title">New brand</h1>
            <p className="page__sub">
              Create a production brand kit for generation. Each section can be edited and saved independently.
            </p>
          </div>
          <span className="pill" style={{
            background: "rgba(99,91,255,0.08)",
            color: "var(--layertone-violet)",
            boxShadow: "0 0 0 1px rgba(99,91,255,0.18)",
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {data.brandId ? "Brand kit draft" : "Local draft"}
          </span>
        </div>

        <div
          className="card card--elevated"
          style={{
            padding: step === "fonts" ? "28px 28px 24px" : 28,
            background: T.card,
            border: "1px solid rgba(230,232,240,.92)",
            backdropFilter: "blur(16px)",
          }}
        >
          <SectionTabs
            current={step}
            busy={busy}
            onChange={(target) => {
              void openSection(target);
            }}
          />

            {/* ── Brand ─────────────────────────────────────────── */}
            {step === "identify" && (
              <div>
                <StepHeading
                  title="Tell us about your brand"
                  sub="This is the brand we'll use for every generation. You can add more later."
                />
                <Field label="Brand name">
                  <TextInput
                    value={data.name}
                    onChange={(v) => update("name", v)}
                    placeholder="e.g. Your brand name"
                  />
                </Field>
                <Field label="Your website URL" optional>
                  <TextInput
                    value={data.url}
                    onChange={(v) => update("url", v)}
                    placeholder="yourbrand.com"
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, color: T.muted }}>
                    <I.Wand size={12} style={{ color: T.primary }} />
                    Used as source context for this brand.
                  </div>
                </Field>
              </div>
            )}

            {/* ── Logos ─────────────────────────────────────────── */}
            {step === "logo" && (
              <div>
                <StepHeading
                  title="Upload your logos"
                  sub="Add 1-5 logo files. SVG works best, and PNG/JPG/WebP are supported."
                />
                <div style={{
                  border: "1.5px dashed #cfd4df",
                  borderRadius: 18,
                  minHeight: 180,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  background: "#fcfcff",
                  cursor: "pointer",
                }}
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void addLogoFiles(event.dataTransfer.files);
                  }}
                >
                  <div>
                    <div style={{ fontSize: 36, color: T.primary, marginBottom: 6 }}>⇧</div>
                    <b style={{ color: T.text, display: "block", marginBottom: 4 }}>Drop your logos here</b>
                    <small style={{ color: T.muted }}>SVG, PNG, JPG, or WebP · up to {MAX_LOGOS} files · max 10 MB each</small>
                    <div style={{ marginTop: 16 }}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          logoInputRef.current?.click();
                        }}
                        style={{
                        display: "inline-block", border: `1px solid ${T.line}`,
                        borderRadius: 10, padding: "8px 18px",
                        fontSize: 13, fontWeight: 600, color: T.text,
                        background: "white", cursor: "pointer",
                      }}>
                        Browse files
                      </button>
                    </div>
                  </div>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  multiple
                  style={{ display: "none" }}
                  onChange={(event) => {
                    void addLogoFiles(event.target.files ?? []);
                    event.currentTarget.value = "";
                  }}
                />
                {logoError ? (
                  <div style={{ marginTop: 10, color: "#b42318", fontSize: 13, fontWeight: 600 }}>
                    {logoError}
                  </div>
                ) : null}
                {activeLogos.length + pendingLogos.length > 0 && (
                  <div style={{ marginTop: 20, padding: 20, borderRadius: 16, background: "linear-gradient(180deg,#fbfaff,#f5f3ff)", border: "1px solid #e5e1ff" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.primary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                      Logos · {activeLogos.length + pendingLogos.length} / {MAX_LOGOS}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
                      {activeLogos.map((asset) => (
                        <div
                          key={`saved-${asset.id}`}
                          style={{
                            position: "relative",
                            minHeight: 104,
                            borderRadius: 12,
                            border: `1px solid ${T.line}`,
                            background: "white",
                            padding: 10,
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div style={{ height: 58, display: "grid", placeItems: "center" }}>
                            {asset.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={asset.url} alt="" style={{ maxWidth: "100%", maxHeight: 58, objectFit: "contain" }} />
                            ) : (
                              <span style={{ fontSize: 11, color: T.muted }}>Uploaded</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            Saved logo
                          </div>
                          <button
                            type="button"
                            aria-label="Remove logo"
                            onClick={() => removeSavedAsset(asset)}
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              border: `1px solid ${T.line}`,
                              background: "white",
                              color: T.text,
                              cursor: "pointer",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {pendingLogos.map((asset) => (
                        <div
                          key={`pending-${asset.id}`}
                          style={{
                            position: "relative",
                            minHeight: 104,
                            borderRadius: 12,
                            border: `1px solid ${T.primary}55`,
                            background: "white",
                            padding: 10,
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div style={{ height: 58, display: "grid", placeItems: "center" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={asset.url} alt="" style={{ maxWidth: "100%", maxHeight: 58, objectFit: "contain" }} />
                          </div>
                          <div style={{ fontSize: 11, color: T.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>
                            Selected, not saved
                          </div>
                          <button
                            type="button"
                            aria-label="Remove selected logo"
                            onClick={() => removePendingLogo(asset)}
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              border: `1px solid ${T.line}`,
                              background: "white",
                              color: T.text,
                              cursor: "pointer",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Colors ────────────────────────────────────────── */}
            {step === "palette" && (
              <div>
                <StepHeading
                  title="Your brand colors"
                  sub="3–5 colors. We'll use these as the foundation for every image."
                />
                <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                  {data.palette.map((c, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center" }}>
                      <input
                        type="color"
                        value={c}
                        onChange={(e) => {
                          const next = [...data.palette];
                          next[i] = e.target.value;
                          update("palette", next);
                        }}
                        style={{
                          width: "100%", height: 88,
                          borderRadius: 14, border: `1px solid ${T.line}`,
                          cursor: "pointer", padding: 0, display: "block",
                        }}
                      />
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginTop: 6 }}>{PALETTE_LABELS[i]}</div>
                      <div style={{ fontSize: 10, color: T.muted, fontFamily: "monospace", marginTop: 2 }}>{c}</div>
                    </div>
                  ))}
                </div>
                {/* live preview */}
                <div style={{
                  borderRadius: 18,
                  background: data.palette[0],
                  padding: "24px 28px",
                  marginTop: 8,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                    Preview
                  </div>
                  <div style={{ fontFamily: "serif", fontSize: 28, fontWeight: 800, color: data.palette[2], letterSpacing: "-0.03em", marginBottom: 6 }}>
                    Holiday Sale
                  </div>
                  <div style={{ fontSize: 13, color: data.palette[3] ?? "rgba(255,255,255,0.7)", marginBottom: 16 }}>
                    30% off everything · this week only
                  </div>
                  <div style={{
                    display: "inline-flex", padding: "9px 18px",
                    borderRadius: 999, background: data.palette[1],
                    color: data.palette[4] ?? "white",
                    fontSize: 13, fontWeight: 700,
                  }}>
                    Shop the sale →
                  </div>
                </div>
              </div>
            )}

            {/* ── Fonts ─────────────────────────────────────────── */}
            {step === "fonts" && (
              <div>
                <StepHeading
                  title="Your typography"
                  sub="Choose a heading font and a body font — rendered in every image."
                />
                <FontPicker
                  label="Heading font"
                  selected={data.heading}
                  onSelect={(f) => update("heading", f)}
                />
                <FontPicker
                  label="Body font"
                  selected={data.body}
                  onSelect={(f) => update("body", f)}
                />
              </div>
            )}

            {/* ── Voice ─────────────────────────────────────────── */}
            {step === "voice" && (
              <div>
                <StepHeading
                  title="Brand voice"
                  sub="Notes about how your brand sounds. We'll use this when generating captions."
                />
                <textarea
                  rows={6}
                  maxLength={500}
                  placeholder={'Friendly but professional. Avoid jargon. We say "team" not "users".'}
                  value={data.voice}
                  onChange={(e) => update("voice", e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    border: `1px solid ${T.line}`, borderRadius: 18,
                    background: "white", padding: 18, resize: "vertical",
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: 15, color: T.text, outline: "none",
                    minHeight: 150,
                  }}
                />
                <div style={{ textAlign: "right", color: T.muted, fontSize: 12, marginTop: 8 }}>
                  {data.voice.length} / 500
                </div>
              </div>
            )}

            {/* ── References ────────────────────────────────────── */}
            {step === "references" && (
              <div>
                <StepHeading
                  title="Show us what your brand looks like"
                  sub="Optional. Up to 10 example images — past campaigns, product shots, anything visual."
                />
                <div style={{
                  border: "1.5px dashed #cfd4df",
                  borderRadius: 18,
                  padding: "48px 32px",
                  textAlign: "center",
                  background: "#fcfcff",
                  cursor: "pointer",
                }}
                  onClick={() => referenceInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void addReferenceFiles(event.dataTransfer.files);
                  }}
                >
                  <div style={{ fontSize: 36, color: T.primary, marginBottom: 6 }}>⇧</div>
                  <b style={{ color: T.text, display: "block", marginBottom: 4 }}>Drop reference images</b>
                  <small style={{ color: T.muted }}>JPG or PNG · up to 10 files</small>
                  <div style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        referenceInputRef.current?.click();
                      }}
                      style={{
                      display: "inline-block", border: `1px solid ${T.line}`,
                      borderRadius: 10, padding: "8px 18px",
                      fontSize: 13, fontWeight: 600, color: T.text,
                      background: "white", cursor: "pointer",
                    }}>
                      Browse files
                    </button>
                  </div>
                </div>
                <input
                  ref={referenceInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  style={{ display: "none" }}
                  onChange={(event) => {
                    void addReferenceFiles(event.target.files ?? []);
                    event.currentTarget.value = "";
                  }}
                />
                {referenceError ? (
                  <div style={{ marginTop: 10, color: "#b42318", fontSize: 13, fontWeight: 600 }}>
                    {referenceError}
                  </div>
                ) : null}
                {activeReferences.length + pendingReferences.length > 0 ? (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>
                      {activeReferences.length + pendingReferences.length} reference file{activeReferences.length + pendingReferences.length === 1 ? "" : "s"} selected.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
                      {activeReferences.map((asset) => (
                        <div
                          key={`saved-${asset.id}`}
                          style={{
                            position: "relative",
                            aspectRatio: "1 / 1",
                            borderRadius: 12,
                            overflow: "hidden",
                            border: `1px solid ${T.line}`,
                            background: "white",
                          }}
                        >
                          {asset.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={asset.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : null}
                          <button
                            type="button"
                            aria-label="Remove reference"
                            onClick={() => removeSavedAsset(asset)}
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              border: `1px solid ${T.line}`,
                              background: "white",
                              color: T.text,
                              cursor: "pointer",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {pendingReferences.map((asset) => (
                        <div
                          key={`pending-${asset.id}`}
                          style={{
                            position: "relative",
                            aspectRatio: "1 / 1",
                            borderRadius: 12,
                            overflow: "hidden",
                            border: `1px solid ${T.primary}55`,
                            background: "white",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{
                            position: "absolute",
                            left: 6,
                            bottom: 6,
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.9)",
                            color: T.primary,
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "3px 7px",
                          }}>
                            Not saved
                          </div>
                          <button
                            type="button"
                            aria-label="Remove selected reference"
                            onClick={() => removePendingReference(asset)}
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              border: `1px solid ${T.line}`,
                              background: "white",
                              color: T.text,
                              cursor: "pointer",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

        </div>
          {finishError ? (
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 12,
                background: "#fef3f2",
                border: "1px solid #fecdca",
                color: "#b42318",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {finishError}
            </div>
          ) : null}

          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                void persistCurrentSection({ requireBrand: true, uploadPendingImages: true });
              }}
              disabled={busy}
              style={{
                border: `1px solid ${T.line}`,
                borderRadius: 12,
                background: "white",
                padding: "11px 18px",
                fontSize: 14,
                fontWeight: 700,
                color: T.text,
                cursor: busy ? "wait" : "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => void finish()}
              disabled={busy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                border: 0, borderRadius: 12,
                background: busy ? "#d0d5dd" : "linear-gradient(90deg,#6d4dff,#1769ff)",
                color: "white", padding: "12px 24px",
                fontSize: 14, fontWeight: 800, cursor: busy ? "wait" : "pointer",
                boxShadow: busy ? "none" : "0 10px 24px rgba(38,103,255,.28)",
                transition: ".2s",
              }}
            >
              {busy ? "Saving..." : "Finish setup"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
