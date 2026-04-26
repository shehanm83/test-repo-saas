"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useRef, useState } from "react";

import { I } from "@/components/icons";

const SOCIAL_PLATFORMS = [
  {
    id: "ig",
    name: "Instagram",
    color: "#E4405F",
    formats: [
      { id: "ig-post", label: "Post", ar: "1:1", w: 1080, h: 1080 },
      { id: "ig-portrait", label: "Portrait", ar: "4:5", w: 1080, h: 1350 },
      { id: "ig-story", label: "Story / Reel", ar: "9:16", w: 1080, h: 1920 },
    ],
  },
  {
    id: "fb",
    name: "Facebook",
    color: "#1877F2",
    formats: [
      { id: "fb-post", label: "Post", ar: "1.91:1", w: 1200, h: 630 },
      { id: "fb-story", label: "Story", ar: "9:16", w: 1080, h: 1920 },
    ],
  },
  {
    id: "li",
    name: "LinkedIn",
    color: "#0A66C2",
    formats: [
      { id: "li-post", label: "Post", ar: "1.91:1", w: 1200, h: 627 },
      { id: "li-square", label: "Square", ar: "1:1", w: 1200, h: 1200 },
    ],
  },
  {
    id: "tt",
    name: "TikTok",
    color: "#0E0E10",
    formats: [{ id: "tt-photo", label: "Photo / Story", ar: "9:16", w: 1080, h: 1920 }],
  },
  {
    id: "pn",
    name: "Pinterest",
    color: "#E60023",
    formats: [
      { id: "pn-pin", label: "Pin", ar: "2:3", w: 1000, h: 1500 },
      { id: "pn-story", label: "Story", ar: "9:16", w: 1080, h: 1920 },
    ],
  },
  {
    id: "yt",
    name: "YouTube",
    color: "#FF0000",
    formats: [{ id: "yt-thumb", label: "Thumbnail", ar: "16:9", w: 1280, h: 720 }],
  },
  {
    id: "tw",
    name: "X / Twitter",
    color: "#0E0E10",
    formats: [{ id: "tw-image", label: "Image", ar: "16:9", w: 1600, h: 900 }],
  },
] as const;

const ARS = [
  { id: "1:1" as const, label: "Square", w: 18, h: 18 },
  { id: "4:5" as const, label: "Portrait", w: 16, h: 20 },
  { id: "9:16" as const, label: "Story", w: 12, h: 22 },
  { id: "16:9" as const, label: "Landscape", w: 24, h: 14 },
];

const DOT_COLORS = ["#1D3B2A", "#5E5CE6", "#C97A3F", "#7A0E0E", "#1F7A5A", "#B5651D"];
function dot(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length]!;
}

interface BrandLite {
  id: string;
  name: string;
  palette?: string[] | null;
}
interface MoodLite {
  id: string;
  name: string;
  kind: string;
  group: "now" | "always" | "soon";
  img?: string | null;
  colors?: string[];
}

function PlatformGlyph({ id, size = 14 }: { id: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor" };
  switch (id) {
    case "ig":
      return (
        <svg {...common}>
          <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 2.16c-3.14 0-3.51.01-4.75.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.27.83-.39.39-.63.76-.83 1.27-.15.39-.33.97-.38 2.04-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.07.23 1.65.38 2.04.2.51.44.88.83 1.27.39.39.76.63 1.27.83.39.15.97.33 2.04.38 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.27-.83.39-.39.63-.76.83-1.27.15-.39.33-.97.38-2.04.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.07-.23-1.65-.38-2.04a3.4 3.4 0 0 0-.83-1.27 3.4 3.4 0 0 0-1.27-.83c-.39-.15-.97-.33-2.04-.38-1.24-.06-1.61-.07-4.75-.07zm0 3.68a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 6.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zm5.1-6.76a.94.94 0 1 1 0-1.87.94.94 0 0 1 0 1.87z" />
        </svg>
      );
    case "fb":
      return (
        <svg {...common}>
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
        </svg>
      );
    case "li":
      return (
        <svg {...common}>
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18.34V10H5.67v8.34h2.67zM7 8.84a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zm11.34 9.5v-4.57c0-2.39-1.27-3.5-2.97-3.5-1.37 0-1.99.75-2.33 1.28V10h-2.67c.04.75 0 8.34 0 8.34h2.67v-4.66c0-.24.02-.48.09-.65.19-.48.62-.97 1.36-.97.96 0 1.34.73 1.34 1.8v4.48h2.51z" />
        </svg>
      );
    case "tt":
      return (
        <svg {...common}>
          <path d="M19.6 6.7a5.7 5.7 0 0 1-3.5-1.2 5.7 5.7 0 0 1-2.2-3.6h-3.4v13.6a3 3 0 0 1-5.4 1.8 3 3 0 0 1 4-4.4V9.4a6.5 6.5 0 1 0 5.4 6.4V9.4a9.1 9.1 0 0 0 5.1 1.6V7.6a5.4 5.4 0 0 1-1-.9z" />
        </svg>
      );
    case "pn":
      return (
        <svg {...common}>
          <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.85 6.36 9.3-.09-.79-.17-2 .03-2.86.18-.78 1.18-4.97 1.18-4.97s-.3-.6-.3-1.49c0-1.4.81-2.44 1.82-2.44.86 0 1.27.64 1.27 1.42 0 .87-.55 2.16-.84 3.36-.24 1 .5 1.82 1.49 1.82 1.79 0 3.16-1.89 3.16-4.61 0-2.41-1.73-4.1-4.21-4.1-2.86 0-4.54 2.15-4.54 4.37 0 .87.33 1.79.75 2.3.08.1.1.19.07.29-.08.32-.25 1-.28 1.14-.04.18-.15.22-.34.13-1.24-.58-2.02-2.4-2.02-3.85 0-3.14 2.28-6.02 6.57-6.02 3.45 0 6.13 2.46 6.13 5.74 0 3.43-2.16 6.18-5.16 6.18-1.01 0-1.95-.52-2.27-1.14l-.62 2.36c-.22.86-.83 1.94-1.24 2.6.93.29 1.92.44 2.94.44 5.52 0 10-4.48 10-10S17.52 2 12 2z" />
        </svg>
      );
    case "yt":
      return (
        <svg {...common}>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.78-1.78C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.78 1.78C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.78-1.78C22 15.22 22 12 22 12s0-3.22-.4-4.8zM10 15V9l5.2 3-5.2 3z" />
        </svg>
      );
    case "tw":
      return (
        <svg {...common}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
        </svg>
      );
    default:
      return null;
  }
}

function SectionLabel({ n, label, optional }: { n: string; label: string; optional?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 100,
          background: "var(--cal-charcoal)",
          color: "white",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {n}
      </span>
      <span
        style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", letterSpacing: 0.1 }}
      >
        {label}
      </span>
      {optional ? (
        <span
          className="pill"
          style={{
            height: 18,
            fontSize: 10,
            color: "var(--fg-3)",
            background: "var(--cal-gray-100)",
            boxShadow: "none",
          }}
        >
          optional
        </span>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onChange,
  sub,
  last,
}: {
  label: string;
  on: boolean;
  onChange: () => void;
  sub?: string;
  last?: boolean;
}) {
  return (
    <div
      onClick={onChange}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: last ? "0" : "1px solid var(--cal-gray-200)",
        cursor: "pointer",
        gap: 10,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {sub ? (
          <div className="t-small" style={{ marginTop: 2, fontSize: 11 }}>
            {sub}
          </div>
        ) : null}
      </div>
      <span className={`switch ${on ? "is-on" : ""}`} />
    </div>
  );
}

function MoodPill({
  mood,
  active,
  disabled,
  onClick,
}: {
  mood: MoodLite;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const isNone = mood.id === "none";
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: 124,
        flexShrink: 0,
        borderRadius: 12,
        overflow: "hidden",
        cursor: disabled ? "not-allowed" : "pointer",
        background: "white",
        boxShadow: active
          ? "0 0 0 2px var(--studio-violet), 0 4px 16px rgba(94,92,230,0.15)"
          : "var(--shadow-ring)",
        opacity: disabled ? 0.65 : 1,
        transition: "transform 120ms, box-shadow 120ms",
        transform: active ? "translateY(-2px)" : "none",
      }}
    >
      <div
        style={{
          height: 80,
          position: "relative",
          background: isNone
            ? "linear-gradient(135deg, #FBE5C2 0%, #E8E7FA 100%)"
            : "var(--cal-gray-100)",
        }}
      >
        {mood.img && !isNone ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mood.img}
            alt={mood.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : isNone ? (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              height: "100%",
              color: "var(--studio-violet)",
            }}
          >
            <I.Sparkle size={22} />
          </div>
        ) : null}
        {mood.colors ? (
          <div
            style={{ position: "absolute", left: 6, bottom: 6, display: "flex", gap: 2 }}
          >
            {mood.colors.slice(0, 3).map((c, i) => (
              <span
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 100,
                  background: c,
                  boxShadow: "0 0 0 1.5px white",
                }}
              />
            ))}
          </div>
        ) : null}
        {disabled ? (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: "rgba(0,0,0,0.7)",
              color: "white",
              fontSize: 9,
              padding: "2px 6px",
              borderRadius: 100,
            }}
          >
            Soon
          </div>
        ) : null}
        {active ? (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 18,
              height: 18,
              borderRadius: 100,
              background: "var(--studio-violet)",
              color: "white",
              display: "grid",
              placeItems: "center",
            }}
          >
            <I.Check size={10} />
          </div>
        ) : null}
      </div>
      <div style={{ padding: "8px 10px" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "var(--fg-1)",
          }}
        >
          {mood.name}
        </div>
        <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
          {isNone ? "Default" : mood.kind}
        </div>
      </div>
    </div>
  );
}

export function Generate(props: {
  brands: BrandLite[];
  moods: MoodLite[];
  credits: number;
}) {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [moodId, setMoodId] = useState("none");
  const [target, setTarget] = useState<"social" | "image">("social");
  const [formatId, setFormatId] = useState("ig-post");
  const [ar, setAr] = useState<"1:1" | "4:5" | "9:16" | "16:9">("1:1");
  const [premium, setPremium] = useState(false);
  const [inspiration, setInspiration] = useState<{ name: string; url: string; uploadId?: string } | null>(null);
  const [brandId, setBrandId] = useState(props.brands[0]?.id ?? "");
  const [brandOpen, setBrandOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggles, setToggles] = useState({
    colors: true,
    logo: true,
    fonts: true,
    strict: false,
    moodPrompt: true,
    moodMotif: true,
    moodAccent: true,
  });
  const tog = (k: keyof typeof toggles) =>
    setToggles((t) => ({ ...t, [k]: !t[k] }));
  const fileRef = useRef<HTMLInputElement>(null);

  const allFormats = useMemo(
    () =>
      SOCIAL_PLATFORMS.flatMap((p) =>
        p.formats.map((f) => ({
          ...f,
          platformId: p.id,
          platformName: p.name,
          platformColor: p.color,
        })),
      ),
    [],
  );
  const fmt = allFormats.find((f) => f.id === formatId);
  const activeAr = target === "social" ? fmt?.ar ?? "1:1" : ar;

  const cost = (premium ? 60 : 20) + (inspiration ? 4 : 0);
  const variants = 4;
  const briefValid = brief.trim().length > 0;
  const targetValid = target === "social" ? !!fmt : true;
  const brandValid = !!brandId;
  const canSubmit = briefValid && targetValid && brandValid && !pending;

  const brand = props.brands.find((b) => b.id === brandId) ?? props.brands[0] ?? null;

  const moodGroups = useMemo(
    () => ({
      def: [
        {
          id: "none",
          name: "Just my brand",
          kind: "Default",
          group: "always" as const,
        },
      ],
      now: props.moods.filter((m) => m.group === "now"),
      always: props.moods.filter((m) => m.group === "always"),
      soon: props.moods.filter((m) => m.group === "soon"),
    }),
    [props.moods],
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setInspiration({ name: f.name, url });
    const formData = new FormData();
    formData.append("file", f);
    try {
      const r = await fetch("/api/uploads/inspiration", { method: "POST", body: formData });
      if (r.ok) {
        const json = (await r.json()) as { uploadId: string };
        setInspiration((cur) => (cur ? { ...cur, uploadId: json.uploadId } : cur));
      }
    } catch {
      // best-effort
    }
  }

  async function submit() {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const outputTarget =
        target === "social" && fmt
          ? { kind: "social", platform: fmt.platformId, format: fmt.id }
          : { kind: "image", aspectRatio: activeAr };
      const body = {
        brandId,
        moodId: moodId === "none" ? null : moodId,
        brief,
        outputTarget,
        ...(inspiration?.uploadId ? { inspirationUploadId: inspiration.uploadId } : {}),
        flags: {
          useBrandColors: toggles.colors,
          useBrandLogo: toggles.logo,
          useBrandFonts: toggles.fonts,
          brandStrict: toggles.strict,
          applyMoodModifiers: toggles.moodPrompt,
          applyMoodDecorations: toggles.moodMotif,
          applyMoodAccentColors: toggles.moodAccent,
          usePremiumModel: premium,
        },
      };
      const r = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const json = (await r.json().catch(() => null)) as
          | { error?: { code?: string; message?: string } }
          | null;
        setError(json?.error?.message ?? "Failed to generate");
        setPending(false);
        return;
      }
      const json = (await r.json()) as { generationId: string };
      router.push(`/generations/${json.generationId}`);
    } catch (e) {
      setError(String(e));
      setPending(false);
    }
  }

  return (
    <div className="gen-grid" style={{ height: "100%", minHeight: "calc(100vh - 56px)" }}>
      <div
        style={{
          overflowY: "auto",
          padding: "0 32px 80px",
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, #FBE5C2 0%, transparent 55%), radial-gradient(ellipse 50% 30% at 100% 0%, #E8E7FA 0%, transparent 60%), radial-gradient(ellipse 50% 30% at 0% 0%, #D7E5C7 0%, transparent 60%), var(--cal-white)",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div
            style={{
              padding: "40px 0 28px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 32,
                right: 0,
                display: "flex",
                gap: 4,
                opacity: 0.85,
                transform: "rotate(-4deg)",
              }}
            >
              {["#7A0E0E", "#0E5C2F", "#E8C66B", "#5E5CE6"].map((c) => (
                <span
                  key={c}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: c,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
              ))}
            </div>
            <div
              className="t-eyebrow"
              style={{ color: "var(--studio-violet)", marginBottom: 6 }}
            >
              <I.Sparkle size={11} style={{ verticalAlign: "-1px" }} /> New generation
            </div>
            <h1 className="page__title">What are we making today?</h1>
            <p className="page__sub" style={{ marginTop: 6 }}>
              Describe what you want. Studio handles the rest — 4 finished variants in
              about 30 seconds.
            </p>
          </div>

          {/* 1. OUTPUT TARGET */}
          <SectionLabel n="1" label="What's it for?" />
          <div
            style={{
              display: "inline-flex",
              padding: 4,
              background: "var(--cal-gray-100)",
              borderRadius: 10,
              gap: 2,
            }}
          >
            {(
              [
                { id: "social", label: "For social", icon: <I.Layers size={14} /> },
                { id: "image", label: "Just an image", icon: <I.Image size={14} /> },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setTarget(o.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  border: 0,
                  cursor: "pointer",
                  borderRadius: 8,
                  background: target === o.id ? "white" : "transparent",
                  color: target === o.id ? "var(--fg-1)" : "var(--fg-3)",
                  fontWeight: target === o.id ? 600 : 500,
                  fontSize: 13,
                  boxShadow:
                    target === o.id
                      ? "var(--shadow-ring), 0 1px 2px rgba(0,0,0,0.04)"
                      : "none",
                  transition: "all 120ms",
                }}
              >
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>

          {target === "social" ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SOCIAL_PLATFORMS.map((p) => {
                  const active = fmt?.platformId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormatId(p.formats[0]!.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 14px 8px 10px",
                        borderRadius: 100,
                        background: active ? p.color : "white",
                        color: active ? "white" : "var(--fg-1)",
                        border: 0,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        boxShadow: active
                          ? "var(--shadow-button-highlight)"
                          : "var(--shadow-ring)",
                        height: 36,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: active ? "rgba(255,255,255,0.18)" : `${p.color}12`,
                          color: active ? "white" : p.color,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <PlatformGlyph id={p.id} size={14} />
                      </span>
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {fmt
                ? (() => {
                    const platform = SOCIAL_PLATFORMS.find((p) => p.id === fmt.platformId);
                    if (!platform || platform.formats.length < 2) {
                      return (
                        <div
                          className="t-small"
                          style={{
                            marginTop: 10,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 100,
                              background: fmt.platformColor,
                            }}
                          />
                          <span>
                            <strong style={{ color: "var(--fg-1)" }}>
                              {fmt.platformName} {fmt.label}
                            </strong>{" "}
                            · {fmt.ar} ·{" "}
                            <span className="mono">
                              {fmt.w}×{fmt.h}
                            </span>
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {platform.formats.map((f) => {
                          const active = formatId === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setFormatId(f.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "5px 10px",
                                borderRadius: 100,
                                background: active ? "var(--cal-charcoal)" : "transparent",
                                color: active ? "white" : "var(--fg-2)",
                                border: active ? 0 : "1px solid var(--cal-gray-300)",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 500,
                                height: 28,
                              }}
                            >
                              <span>{f.label}</span>
                              <span
                                style={{
                                  opacity: 0.6,
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 10,
                                }}
                              >
                                {f.ar}
                              </span>
                            </button>
                          );
                        })}
                        <span
                          className="t-small"
                          style={{ marginLeft: 4, fontFamily: "var(--font-mono)" }}
                        >
                          {fmt.w}×{fmt.h}
                        </span>
                      </div>
                    );
                  })()
                : null}
            </div>
          ) : null}

          {/* 2. BRIEF */}
          <div style={{ marginTop: 32 }}>
            <SectionLabel n="2" label="Brief" />
            <div style={{ position: "relative" }}>
              <textarea
                rows={4}
                maxLength={500}
                placeholder="Describe what you want. e.g. 'Christmas sale, cozy living room with a glowing tree, 30% off'"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  resize: "vertical",
                  fontSize: 18,
                  lineHeight: 1.45,
                  padding: "18px 20px 36px",
                  fontFamily: "inherit",
                  color: "var(--fg-1)",
                  background: "white",
                  border: 0,
                  borderRadius: 14,
                  boxShadow: brief
                    ? "0 0 0 2px var(--studio-violet-100), var(--shadow-ring)"
                    : "var(--shadow-ring)",
                  outline: "none",
                  minHeight: 120,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 16,
                  fontSize: 11,
                  color: "var(--fg-4)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {brief.length} / 500
              </div>
            </div>
          </div>

          {/* 3. INSPIRATION */}
          <div style={{ marginTop: 28 }}>
            <SectionLabel n="3" label="Inspiration image" optional />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void onFile(e)}
              style={{ display: "none" }}
            />
            {inspiration ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  background: "white",
                  borderRadius: 12,
                  boxShadow: "var(--shadow-ring)",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "var(--cal-gray-100)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inspiration.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {inspiration.name}
                  </div>
                  <div className="t-small" style={{ fontSize: 11, marginTop: 2 }}>
                    Used for this generation only · +4 credits
                  </div>
                </div>
                <button
                  className="btn btn--icon btn--ghost"
                  type="button"
                  onClick={() => setInspiration(null)}
                  aria-label="Remove inspiration"
                >
                  <I.X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "14px 16px",
                  background: "white",
                  border: "1.5px dashed var(--cal-gray-300)",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--fg-2)",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "var(--cal-gray-100)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--fg-3)",
                  }}
                >
                  <I.Upload size={16} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>
                    Drop a reference image
                  </div>
                  <div className="t-small" style={{ fontSize: 11, marginTop: 2 }}>
                    JPG, PNG, WebP · max 10 MB · this generation only
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* 4. BRAND */}
          <div style={{ marginTop: 28 }}>
            <SectionLabel n="4" label="Brand" />
            <div className="card" style={{ padding: 0, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 18 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: brand ? dot(brand.id) : "var(--cal-gray-200)",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 600,
                    boxShadow: "var(--shadow-ring)",
                  }}
                >
                  {brand ? brand.name.slice(0, 2).toUpperCase() : "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {brand?.name ?? "No brand"}
                  </div>
                  {brand?.palette && brand.palette.length > 0 ? (
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                      {brand.palette.slice(0, 5).map((c, i) => (
                        <span
                          key={i}
                          title={c}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            background: c,
                            boxShadow: "var(--shadow-ring)",
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                {props.brands.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setBrandOpen((o) => !o)}
                    className="btn btn--secondary btn--sm"
                    style={{ flexShrink: 0 }}
                  >
                    Switch
                    <I.ChevronDown
                      size={12}
                      style={{
                        transform: brandOpen ? "rotate(180deg)" : "none",
                      }}
                    />
                  </button>
                ) : null}
              </div>
              {brandOpen ? (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 50 }}
                    onClick={() => setBrandOpen(false)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 12,
                      zIndex: 60,
                      background: "white",
                      borderRadius: 10,
                      boxShadow:
                        "0 10px 32px rgba(0,0,0,0.12), var(--shadow-ring)",
                      minWidth: 240,
                      padding: 6,
                    }}
                  >
                    {props.brands.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setBrandId(b.id);
                          setBrandOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: 10,
                          borderRadius: 8,
                          cursor: "pointer",
                          background:
                            b.id === brandId ? "var(--cal-gray-50)" : "transparent",
                        }}
                      >
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: dot(b.id),
                            color: "white",
                            display: "grid",
                            placeItems: "center",
                            fontFamily: "var(--font-display)",
                            fontSize: 11,
                            flexShrink: 0,
                          }}
                        >
                          {b.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{b.name}</span>
                        {b.id === brandId ? (
                          <I.Check size={14} style={{ color: "var(--studio-violet)" }} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* 5. ASPECT RATIO (image only) */}
          {target === "image" ? (
            <div style={{ marginTop: 28 }}>
              <SectionLabel n="5" label="Aspect ratio" />
              <div style={{ display: "flex", gap: 8 }}>
                {ARS.map((a) => {
                  const active = ar === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAr(a.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        height: 56,
                        padding: "0 16px",
                        borderRadius: 12,
                        background: active ? "var(--cal-charcoal)" : "white",
                        color: active ? "white" : "var(--fg-1)",
                        border: 0,
                        cursor: "pointer",
                        boxShadow: active
                          ? "var(--shadow-button-highlight)"
                          : "var(--shadow-ring)",
                      }}
                    >
                      <div
                        style={{
                          width: a.w,
                          height: a.h,
                          borderRadius: 2,
                          background: "currentColor",
                          opacity: 0.7,
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{a.id}</span>
                        <span style={{ opacity: 0.6, fontSize: 11 }}>{a.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* 6. MOOD */}
          <div style={{ marginTop: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <SectionLabel n={target === "image" ? "6" : "5"} label="Mood" />
              <a
                className="t-small"
                href="/moods"
                style={{ color: "var(--fg-2)", fontSize: 12, textDecoration: "none" }}
              >
                Browse all moods →
              </a>
            </div>
            <div
              className="no-scrollbar"
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 4,
                scrollbarWidth: "none",
              }}
            >
              {moodGroups.def.map((m) => (
                <MoodPill
                  key={m.id}
                  mood={m as MoodLite}
                  active={moodId === m.id}
                  onClick={() => setMoodId(m.id)}
                />
              ))}
              {moodGroups.now.length > 0 ? (
                <div style={{ width: 1, background: "var(--cal-gray-200)", margin: "8px 4px" }} />
              ) : null}
              {moodGroups.now.map((m) => (
                <MoodPill
                  key={m.id}
                  mood={m}
                  active={moodId === m.id}
                  onClick={() => setMoodId(m.id)}
                />
              ))}
              {moodGroups.always.length > 0 ? (
                <div style={{ width: 1, background: "var(--cal-gray-200)", margin: "8px 4px" }} />
              ) : null}
              {moodGroups.always.map((m) => (
                <MoodPill
                  key={m.id}
                  mood={m}
                  active={moodId === m.id}
                  onClick={() => setMoodId(m.id)}
                />
              ))}
              {moodGroups.soon.length > 0 ? (
                <div style={{ width: 1, background: "var(--cal-gray-200)", margin: "8px 4px" }} />
              ) : null}
              {moodGroups.soon.map((m) => (
                <MoodPill key={m.id} mood={m} active={false} disabled onClick={() => {}} />
              ))}
            </div>
          </div>

          {/* CTA */}
          <div
            style={{
              marginTop: 36,
              padding: 20,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, rgba(94,92,230,0.06) 0%, rgba(31,122,90,0.06) 100%)",
              boxShadow: "var(--shadow-ring)",
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn btn--accent btn--lg"
              onClick={() => void submit()}
              disabled={!canSubmit}
              style={{
                height: 52,
                padding: "0 28px",
                fontSize: 15,
                boxShadow: canSubmit
                  ? "0 8px 24px rgba(94,92,230,0.32), var(--shadow-button-highlight)"
                  : "var(--shadow-button-highlight)",
              }}
            >
              {pending ? (
                <I.Loader size={16} className="spin" />
              ) : (
                <I.Sparkle size={16} />
              )}
              {pending ? "Generating…" : `Generate · ${cost} credits`}
            </button>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {cost} credits for {variants} variants
              </div>
              <div className="t-small" style={{ marginTop: 2, fontSize: 12 }}>
                {premium ? "Premium model" : "Standard model"}
                {inspiration ? " · with inspiration" : ""}
              </div>
            </div>
            {error ? (
              <div
                style={{
                  flexBasis: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#FCEEEE",
                  color: "var(--studio-red)",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <I.AlertCircle size={14} />
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{
          borderLeft: "1px solid var(--cal-gray-200)",
          background:
            "linear-gradient(180deg, var(--cal-gray-50) 0%, #F8F4FB 100%)",
          overflowY: "auto",
          padding: "32px 24px 64px",
        }}
      >
        <div
          className="t-eyebrow"
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--studio-violet)",
          }}
        >
          <I.Sliders size={11} />
          Brand grounding
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ToggleRow label="Use brand colors" on={toggles.colors} onChange={() => tog("colors")} />
          <ToggleRow label="Use brand logo" on={toggles.logo} onChange={() => tog("logo")} />
          <ToggleRow label="Use brand fonts" on={toggles.fonts} onChange={() => tog("fonts")} />
          <ToggleRow
            label="Brand-strict mode"
            on={toggles.strict}
            onChange={() => tog("strict")}
            sub="Mood only influences the AI background — no decorative motifs or accent overlays."
            last
          />
        </div>

        {moodId !== "none" ? (
          <>
            <div
              className="t-eyebrow"
              style={{
                marginTop: 24,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#C97A3F",
              }}
            >
              <I.Library size={11} />
              Mood layer
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <ToggleRow
                label="Apply mood prompt modifiers"
                on={toggles.moodPrompt}
                onChange={() => tog("moodPrompt")}
              />
              <ToggleRow
                label="Apply mood decorative motifs"
                on={toggles.moodMotif}
                onChange={() => tog("moodMotif")}
              />
              <ToggleRow
                label="Apply mood accent colors"
                on={toggles.moodAccent}
                onChange={() => tog("moodAccent")}
                last
              />
            </div>
          </>
        ) : null}

        <div
          className="t-eyebrow"
          style={{
            marginTop: 24,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--studio-green)",
          }}
        >
          <I.Crown size={11} />
          Quality
          <span
            className="pill pill--accent"
            style={{ marginLeft: 4, height: 18, fontSize: 10 }}
          >
            Pro
          </span>
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ToggleRow
            label="Premium model (gpt-image-1)"
            on={premium}
            onChange={() => setPremium((p) => !p)}
            sub="15 credits per variant instead of 5"
            last
          />
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 18,
            background:
              "linear-gradient(135deg, var(--cal-charcoal) 0%, #1a1a1a 100%)",
            color: "white",
            borderRadius: 14,
            boxShadow:
              "0 8px 24px rgba(0,0,0,0.16), var(--shadow-button-highlight)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: 100,
              background:
                "radial-gradient(circle, rgba(94,92,230,0.4) 0%, transparent 70%)",
            }}
          />
          <div
            className="t-eyebrow"
            style={{ color: "rgba(255,255,255,0.6)", marginBottom: 8 }}
          >
            <I.Zap size={11} style={{ verticalAlign: "-1px" }} /> Estimated cost
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              fontFamily: "var(--font-display)",
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 600 }}>{cost}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              credits
            </span>
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {premium ? "15 × 4 variants" : "5 × 4 variants"}
            {inspiration ? " · +4 inspiration" : ""}
          </div>
          <div
            style={{
              marginTop: 14,
              height: 6,
              borderRadius: 100,
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, (cost / Math.max(props.credits, 1)) * 100)}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, var(--studio-violet) 0%, #B5B4F2 100%)",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              display: "flex",
              justifyContent: "space-between",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <span>After this run</span>
            <span className="mono" style={{ color: "white", fontWeight: 600 }}>
              {Math.max(0, props.credits - cost).toLocaleString()} left
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
