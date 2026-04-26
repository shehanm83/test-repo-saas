"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const STEPS = [
  { id: "identify", label: "Brand" },
  { id: "logo", label: "Logo" },
  { id: "palette", label: "Colors" },
  { id: "fonts", label: "Fonts" },
  { id: "voice", label: "Voice" },
  { id: "references", label: "References" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface WizardState {
  brandId: string | null;
  name: string;
  sourceUrl: string;
  palette: string[];
  headingFont: string;
  bodyFont: string;
  voice: string;
}

const DEFAULT_STATE: WizardState = {
  brandId: null,
  name: "",
  sourceUrl: "",
  palette: ["#2A1F18", "#7C5232", "#E8DCC4", "#C9A86A", "#F5EFE3"],
  headingFont: "Cal Sans",
  bodyFont: "Inter",
  voice: "",
};

export function BrandWizard(props: { step: StepId }) {
  const router = useRouter();
  const currentIndex = STEPS.findIndex((step) => step.id === props.step);
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("studio-onboarding");
    if (raw) {
      setState({ ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<WizardState>) });
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("studio-onboarding", JSON.stringify(state));
  }, [state]);

  const titles = useMemo(() => {
    return {
      identify: {
        heading: "Tell us about your brand",
        subheading: "This is the brand we’ll use for every generation. You can add more later.",
      },
      logo: {
        heading: "Upload your logo",
        subheading: "SVG works best — it scales perfectly to any size.",
      },
      palette: {
        heading: "Your brand colors",
        subheading: "Pick the colors we should carry into every generated image.",
      },
      fonts: {
        heading: "Your typography",
        subheading: "We’ll render every image with these heading and body styles.",
      },
      voice: {
        heading: "Anything else?",
        subheading: "Notes about how your brand sounds. We’ll use this for captions.",
      },
      references: {
        heading: "Show us what your brand looks like",
        subheading: "Optional. Upload a few references so Studio can learn the visual tone.",
      },
    } as const;
  }, []);

  function go(step: StepId) {
    router.push(`/onboarding/brand/${step}`);
  }

  async function patchBrand(body: unknown) {
    if (!state.brandId) {
      return;
    }
    await fetch(`/api/brands/${state.brandId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function next() {
    setPending(true);
    try {
      if (props.step === "identify") {
        const method = state.brandId ? "PATCH" : "POST";
        const url = state.brandId ? `/api/brands/${state.brandId}` : "/api/brands";
        const response = await fetch(url, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: state.name, sourceUrl: state.sourceUrl || undefined }),
        });
        const payload = await response.json();
        if (payload.id) {
          setState((current) => ({ ...current, brandId: payload.id }));
        }
      }
      if (props.step === "palette") {
        await patchBrand({
          palette: {
            primary: state.palette[0],
            secondary: state.palette[1],
            accent: state.palette[2],
            extras: state.palette.slice(3),
          },
        });
      }
      if (props.step === "fonts") {
        await patchBrand({
          fonts: {
            heading: { family: state.headingFont, weight: "600" },
            body: { family: state.bodyFont, weight: "400" },
          },
        });
      }
      if (props.step === "voice") {
        await patchBrand({ voiceNotes: state.voice });
      }
      if (currentIndex === STEPS.length - 1) {
        sessionStorage.removeItem("studio-onboarding");
        router.push("/generate");
        return;
      }
      go(STEPS[currentIndex + 1]!.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="studio-onboarding">
      <div className="studio-onboarding__inner">
        <div className="studio-auth-brand">
          <div className="studio-wordmark__mark">S</div>
          <span>Studio</span>
        </div>

        <div className="studio-stepper">
          {STEPS.map((step, index) => (
            <div key={step.id} className="studio-stepper__item">
              <div
                className={`studio-stepper__dot${
                  index === currentIndex ? " is-current" : index < currentIndex ? " is-done" : ""
                }`}
              >
                {index + 1}
              </div>
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        <div className="studio-card studio-onboarding-card">
          <h1>{titles[props.step].heading}</h1>
          <p>{titles[props.step].subheading}</p>

          {props.step === "identify" ? (
            <div className="studio-form-stack">
              <label>
                <span>Brand name</span>
                <input
                  className="studio-input"
                  value={state.name}
                  onChange={(event) =>
                    setState((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="e.g. Northwind Coffee"
                />
              </label>
              <label>
                <span>Website URL</span>
                <input
                  className="studio-input"
                  value={state.sourceUrl}
                  onChange={(event) =>
                    setState((current) => ({ ...current, sourceUrl: event.target.value }))
                  }
                  placeholder="northwindcoffee.com"
                />
              </label>
            </div>
          ) : null}

          {props.step === "logo" ? (
            <label className="studio-upload-drop">
              <strong>Drop your logo here</strong>
              <span>SVG or PNG · max 10MB</span>
              <input
                hidden
                type="file"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file || !state.brandId) {
                    return;
                  }
                  const body = new FormData();
                  body.append("file", file);
                  await fetch(`/api/brands/${state.brandId}/logo`, { method: "POST", body });
                }}
              />
            </label>
          ) : null}

          {props.step === "palette" ? (
            <div className="studio-palette-editor">
              {state.palette.map((color, index) => (
                <label key={`${color}-${index}`} className="studio-palette-swatch">
                  <input
                    type="color"
                    value={color}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        palette: current.palette.map((entry, entryIndex) =>
                          entryIndex === index ? event.target.value : entry,
                        ),
                      }))
                    }
                  />
                  <span style={{ background: color }} />
                  <strong>{color}</strong>
                </label>
              ))}
            </div>
          ) : null}

          {props.step === "fonts" ? (
            <div className="studio-form-grid">
              <label>
                <span>Heading font</span>
                <input
                  className="studio-input"
                  value={state.headingFont}
                  onChange={(event) =>
                    setState((current) => ({ ...current, headingFont: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Body font</span>
                <input
                  className="studio-input"
                  value={state.bodyFont}
                  onChange={(event) =>
                    setState((current) => ({ ...current, bodyFont: event.target.value }))
                  }
                />
              </label>
            </div>
          ) : null}

          {props.step === "voice" ? (
            <label>
              <span>Voice notes</span>
              <textarea
                className="studio-textarea"
                rows={6}
                value={state.voice}
                onChange={(event) =>
                  setState((current) => ({ ...current, voice: event.target.value }))
                }
                placeholder={`Friendly but professional. Avoid jargon. We say "team" not "users".`}
              />
            </label>
          ) : null}

          {props.step === "references" ? (
            <label className="studio-upload-drop">
              <strong>Upload reference images</strong>
              <span>JPG or PNG · up to 10 files</span>
              <input
                hidden
                type="file"
                multiple
                onChange={async (event) => {
                  if (!state.brandId) {
                    return;
                  }
                  const files = Array.from(event.target.files ?? []);
                  for (const file of files) {
                    const body = new FormData();
                    body.append("file", file);
                    await fetch(`/api/brands/${state.brandId}/assets`, { method: "POST", body });
                  }
                }}
              />
            </label>
          ) : null}
        </div>

        <div className="studio-onboarding-nav">
          <button
            className="studio-button studio-button--ghost"
            disabled={currentIndex === 0}
            type="button"
            onClick={() => go(STEPS[currentIndex - 1]!.id)}
          >
            Back
          </button>
          <div className="studio-onboarding-meta">Step {currentIndex + 1} of {STEPS.length}</div>
          <button
            className="studio-button studio-button--primary"
            disabled={pending || (props.step === "identify" && state.name.trim().length === 0)}
            type="button"
            onClick={() => void next()}
          >
            {currentIndex === STEPS.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

