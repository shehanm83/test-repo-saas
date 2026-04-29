"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { VyoraWordmark } from "@/components/brand/vyora-mark";
import { I } from "@/components/icons";

const STEPS = ["identify", "logo", "palette", "fonts", "voice", "references"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABELS: Record<Step, string> = {
  identify: "Brand",
  logo: "Logo",
  palette: "Colors",
  fonts: "Fonts",
  voice: "Voice",
  references: "References",
};

const DEFAULT_PALETTE = ["#2A1F18", "#7C5232", "#E8DCC4", "#C9A86A", "#F5EFE3"];
const PALETTE_LABELS = ["Primary", "Secondary", "Accent", "Extra 1", "Extra 2"];

function StepDot({
  n,
  current,
  label,
}: {
  n: number;
  current: number;
  label: string;
}) {
  const state = n < current ? "done" : n === current ? "current" : "todo";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 100,
          display: "grid",
          placeItems: "center",
          background:
            state === "current"
              ? "var(--cal-charcoal)"
              : state === "done"
                ? "var(--studio-violet)"
                : "var(--cal-gray-100)",
          color: state === "todo" ? "var(--fg-3)" : "white",
          fontSize: 12,
          fontWeight: 600,
          boxShadow: state === "todo" ? "var(--shadow-ring)" : "none",
        }}
      >
        {state === "done" ? <I.Check size={14} /> : n}
      </div>
      <div
        style={{
          fontSize: 11,
          marginTop: 6,
          color: state === "current" ? "var(--fg-1)" : "var(--fg-3)",
          fontWeight: state === "current" ? 600 : 400,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function StepConnector({ filled }: { filled: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        height: 1,
        background: filled ? "var(--studio-violet)" : "var(--cal-gray-200)",
        marginTop: -22,
        alignSelf: "flex-start",
      }}
    />
  );
}

export function BrandWizard({ step }: { step: Step }) {
  const router = useRouter();
  const stepIndex = STEPS.indexOf(step);
  const stepNum = stepIndex + 1;

  const [data, setData] = useState({
    name: "",
    url: "",
    logoUploaded: false,
    palette: DEFAULT_PALETTE,
    heading: "Cal Sans",
    body: "Inter",
    voice: "",
    refs: [] as string[],
  });

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("studio-onboarding")
        : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<typeof data>;
        setData((d) => ({ ...d, ...parsed }));
      } catch {
        // noop
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("studio-onboarding", JSON.stringify(data));
    }
  }, [data]);

  const update = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  function next() {
    if (stepIndex >= STEPS.length - 1) {
      void finish();
      return;
    }
    router.push(`/onboarding/brand/${STEPS[stepIndex + 1]}`);
  }

  function back() {
    if (stepIndex > 0) {
      router.push(`/onboarding/brand/${STEPS[stepIndex - 1]}`);
    }
  }

  async function finish() {
    await fetch("/api/brands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        sourceUrl: data.url || null,
        palette: {
          primary: data.palette[0],
          secondary: data.palette[1],
          accent: data.palette[2],
          extras: data.palette.slice(3),
        },
        fonts: {
          heading: { family: data.heading },
          body: { family: data.body },
        },
        voiceNotes: data.voice || null,
      }),
    }).catch(() => undefined);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("studio-onboarding");
    }
    router.push("/generate");
  }

  const canNext = useMemo(() => {
    if (step === "identify") return data.name.trim().length > 0;
    return true;
  }, [step, data.name]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cal-gray-50)",
        padding: "32px 24px 64px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{ marginBottom: 32, cursor: "pointer", display: "inline-block" }}
          onClick={() => router.push("/")}
        >
          <VyoraWordmark size={28} textSize={20} />
        </div>

        <div style={{ display: "flex", alignItems: "stretch", marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <StepDot n={i + 1} current={stepNum} label={STEP_LABELS[s]} />
              {i < STEPS.length - 1 ? <StepConnector filled={stepNum > i + 1} /> : null}
            </React.Fragment>
          ))}
        </div>

        <div className="card card--elevated" style={{ padding: 40 }}>
          {step === "identify" ? (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>
                Tell us about your brand
              </h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>
                This is the brand we&apos;ll use for every generation. You can add more
                later.
              </p>
              <label className="label">Brand name</label>
              <input
                className="input input--lg"
                placeholder="e.g. Northwind Coffee"
                value={data.name}
                onChange={(e) => update("name", e.target.value)}
              />
              <div style={{ height: 20 }} />
              <label className="label">
                Your website URL{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  · optional
                </span>
              </label>
              <input
                className="input input--lg"
                placeholder="northwindcoffee.com"
                value={data.url}
                onChange={(e) => update("url", e.target.value)}
              />
              <div
                className="hint"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <I.Wand size={12} />
                We&apos;ll grab your colors and logo automatically.
              </div>
            </div>
          ) : null}

          {step === "logo" ? (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>
                Upload your logo
              </h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>
                SVG works best — it scales perfectly to any size.
              </p>
              <div
                style={{
                  border: "2px dashed var(--cal-gray-300)",
                  borderRadius: 12,
                  padding: 48,
                  textAlign: "center",
                  background: "var(--cal-white)",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    margin: "0 auto 16px",
                    borderRadius: 12,
                    background: "var(--cal-gray-100)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--fg-3)",
                  }}
                >
                  <I.Upload size={22} />
                </div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Drop your logo here</div>
                <div className="t-small">SVG or PNG · max 10MB</div>
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ marginTop: 16 }}
                  onClick={() => update("logoUploaded", true)}
                >
                  Browse files
                </button>
              </div>
              {data.logoUploaded ? (
                <div style={{ marginTop: 16 }}>
                  <div className="t-eyebrow" style={{ marginBottom: 8 }}>
                    Preview
                  </div>
                  <div
                    className="checker"
                    style={{
                      height: 120,
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "var(--shadow-ring)",
                    }}
                  >
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 12,
                        background: data.palette[0],
                        color: data.palette[2],
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: 24,
                      }}
                    >
                      {data.name.slice(0, 2).toUpperCase() || "—"}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "palette" ? (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>
                Your brand colors
              </h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>
                3–5 colors. We&apos;ll use these as the foundation for every image.
              </p>
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                {data.palette.map((c, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <input
                      type="color"
                      value={c}
                      onChange={(e) => {
                        const next = [...data.palette];
                        next[i] = e.target.value;
                        update("palette", next);
                      }}
                      style={{
                        width: "100%",
                        height: 96,
                        borderRadius: 10,
                        border: 0,
                        boxShadow: "var(--shadow-ring)",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                    <div
                      className="t-small"
                      style={{ marginTop: 6, textAlign: "center" }}
                    >
                      {PALETTE_LABELS[i]}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--fg-3)",
                        textAlign: "center",
                        marginTop: 2,
                      }}
                    >
                      {c}
                    </div>
                  </div>
                ))}
              </div>
              <div className="t-eyebrow" style={{ marginTop: 28, marginBottom: 8 }}>
                Preview on a sample design
              </div>
              <div
                className="card"
                style={{
                  padding: 24,
                  background: data.palette[0],
                  color: data.palette[2],
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    color: data.palette[2],
                  }}
                >
                  Holiday Sale
                </div>
                <div
                  style={{ fontSize: 13, color: data.palette[3], marginTop: 4 }}
                >
                  30% off everything · this week only
                </div>
                <div
                  style={{
                    marginTop: 16,
                    display: "inline-flex",
                    padding: "8px 14px",
                    borderRadius: 100,
                    background: data.palette[1],
                    color: data.palette[4] ?? "white",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Shop the sale →
                </div>
              </div>
            </div>
          ) : null}

          {step === "fonts" ? (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>
                Your typography
              </h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>
                Choose a heading font and a body font. We&apos;ll render every image with
                these.
              </p>
              {(
                [
                  {
                    k: "heading" as const,
                    label: "Heading font",
                    val: data.heading,
                    sample: "The quick brown fox",
                    sizeKey: "display" as const,
                  },
                  {
                    k: "body" as const,
                    label: "Body font",
                    val: data.body,
                    sample: "Cozy living room scenes with soft glowing light.",
                    sizeKey: "body" as const,
                  },
                ] as const
              ).map((f) => (
                <div key={f.k} style={{ marginBottom: 20 }}>
                  <label className="label">{f.label}</label>
                  <input
                    className="input input--lg"
                    value={f.val}
                    onChange={(e) =>
                      f.k === "heading"
                        ? update("heading", e.target.value)
                        : update("body", e.target.value)
                    }
                  />
                  <div
                    className="card"
                    style={{
                      padding: 20,
                      marginTop: 12,
                      background: "var(--cal-gray-50)",
                      boxShadow: "var(--shadow-ring)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily:
                          f.sizeKey === "display"
                            ? "var(--font-display)"
                            : "var(--font-body)",
                        fontSize: f.sizeKey === "display" ? 28 : 16,
                      }}
                    >
                      {f.sample}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {step === "voice" ? (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>
                Anything else?
              </h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>
                Notes about how your brand sounds. We&apos;ll use this when generating
                captions.
              </p>
              <textarea
                className="textarea"
                rows={6}
                placeholder='Friendly but professional. Avoid jargon. We say "team" not "users".'
                value={data.voice}
                onChange={(e) => update("voice", e.target.value)}
                maxLength={500}
              />
              <div className="hint" style={{ textAlign: "right" }}>
                {data.voice.length} / 500
              </div>
            </div>
          ) : null}

          {step === "references" ? (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>
                Show us what your brand looks like
              </h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>
                Optional. Up to 10 example images — past campaigns, product shots, anything
                visual we should learn from.
              </p>
              <div
                style={{
                  border: "2px dashed var(--cal-gray-300)",
                  borderRadius: 12,
                  padding: 32,
                  textAlign: "center",
                  background: "var(--cal-white)",
                }}
              >
                <I.Image size={28} style={{ color: "var(--fg-3)", margin: "0 auto" }} />
                <div style={{ fontWeight: 500, marginTop: 12 }}>Drop reference images</div>
                <div className="t-small">JPG or PNG · up to 10</div>
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ marginTop: 16 }}
                >
                  Browse files
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            {stepIndex > 0 ? (
              <button type="button" className="btn btn--ghost" onClick={back}>
                <I.ArrowLeft size={14} />
                Back
              </button>
            ) : null}
          </div>
          <div className="t-small">Step {stepNum} of {STEPS.length}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {step === "voice" || step === "references" ? (
              <button type="button" className="btn btn--ghost" onClick={next}>
                Skip
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--accent"
              disabled={!canNext}
              onClick={next}
            >
              {stepIndex === STEPS.length - 1 ? "Finish" : "Next"}
              <I.ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
