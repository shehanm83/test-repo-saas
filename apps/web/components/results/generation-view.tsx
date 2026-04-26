"use client";

import { useEffect, useState } from "react";

type GenerationState = {
  id: string;
  brief: string;
  status: string;
  variants: Array<{
    id: string;
    status: string;
    modelUsed: string | null;
    url?: string | null;
  }>;
};

export function GenerationView(props: { generationId: string; initial: GenerationState | null }) {
  const [state, setState] = useState(props.initial);
  const [caption, setCaption] = useState<string | null>(null);
  const [captionPending, setCaptionPending] = useState(false);

  useEffect(() => {
    if (!state || state.status === "completed" || state.status === "failed") {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      const response = await fetch(`/api/generations/${props.generationId}`);
      const payload = (await response.json()) as GenerationState;
      if (!cancelled) {
        setState(payload);
      }
      if (!cancelled && payload.status !== "completed" && payload.status !== "failed") {
        setTimeout(tick, 1500);
      }
    };

    void tick();

    return () => {
      cancelled = true;
    };
  }, [props.generationId, state]);

  if (!state) {
    return (
      <div className="studio-page">
        <div className="studio-card studio-empty-card">
          <strong>Generation not found</strong>
          <p>The requested generation could not be loaded.</p>
        </div>
      </div>
    );
  }

  const completedCount = state.variants.filter((variant) => variant.status === "completed").length;

  async function requestCaption() {
    if (!state) {
      return;
    }

    const current = state;
    setCaptionPending(true);
    const response = await fetch("/api/captions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        generationId: current.id,
        brief: current.brief,
        lengthTier: "medium",
      }),
    });
    const payload = await response.json();
    const jobId = payload.jobId as string | undefined;
    if (!jobId) {
      setCaptionPending(false);
      return;
    }

    const poll = async () => {
      const jobResponse = await fetch(`/api/captions/${jobId}`);
      const jobPayload = await jobResponse.json();
      if (jobPayload.status === "completed") {
        setCaption(jobPayload.outputText as string);
        setCaptionPending(false);
        return;
      }
      setTimeout(poll, 1200);
    };

    void poll();
  }

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>{state.brief}</h1>
          <p>{completedCount} of {state.variants.length} variants ready.</p>
        </div>
      </div>

      <div className="studio-results-grid">
        {state.variants.map((variant) => (
          <article key={variant.id} className="studio-result-card">
            <div className="studio-result-art">
              {variant.status === "completed" && variant.url ? (
                <img alt="" src={variant.url} />
              ) : variant.status === "failed" || variant.status === "failed_safety" ? (
                <div className="studio-result-state">Variant failed</div>
              ) : (
                <div className="studio-result-skeleton" />
              )}
            </div>
            <div className="studio-result-meta">
              <span>{variant.status}</span>
              <strong>{variant.modelUsed ?? "Queued"}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="studio-results-actions">
        <button className="studio-button studio-button--secondary" type="button">
          Generate variations
        </button>
        <button
          className="studio-button studio-button--primary"
          disabled={captionPending}
          type="button"
          onClick={() => void requestCaption()}
        >
          {captionPending ? "Writing…" : "Add caption"}
        </button>
      </div>

      {caption ? (
        <div className="studio-card studio-copy-card">
          <h2>Caption</h2>
          <p>{caption}</p>
        </div>
      ) : null}
    </div>
  );
}
