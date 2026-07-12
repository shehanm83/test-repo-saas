"use client";

import { I } from "@/components/icons";

import type { PreflightResult } from "./types";

export function PreflightPanel(props: {
  preflight: PreflightResult | null;
  loading: boolean;
  error: string | null;
}) {
  const blocking = props.preflight?.blocking ?? [];
  const warnings = props.preflight?.warnings ?? [];

  if (props.loading) {
    return (
      <div className="cg-preflight cg-preflight--muted" aria-live="polite">
        <span className="cg-dot is-pending" />
        Checking campaign readiness…
      </div>
    );
  }

  if (props.error) {
    return (
      <div className="cg-preflight cg-preflight--error" aria-live="polite">
        <I.HelpCircle size={16} />
        {props.error}
      </div>
    );
  }

  if (blocking.length === 0 && warnings.length === 0) {
    return (
      <div className="cg-preflight cg-preflight--ok" aria-live="polite">
        <I.Check size={16} />
        Ready for generation.
      </div>
    );
  }

  return (
    <div className="cg-issue-list">
      {blocking.map((issue) => (
        <div className="cg-issue cg-issue--blocking" key={issue.code}>
          <I.X size={15} />
          <span>{issue.message}</span>
        </div>
      ))}
      {warnings.map((issue) => (
        <div className={`cg-issue cg-issue--${issue.severity ?? "medium"}`} key={issue.code}>
          <I.HelpCircle size={15} />
          <span>{issue.message}</span>
        </div>
      ))}
    </div>
  );
}
