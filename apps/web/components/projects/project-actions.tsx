"use client";

import React, { useState } from "react";

import { I } from "@/components/icons";

export function ProjectImageActions(props: { url: string; filename: string }) {
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      const response = await fetch(props.url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = props.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="row">
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={() => void download()}
        disabled={pending}
      >
        <I.Download size={13} />
        {pending ? "Downloading..." : "Download"}
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => void navigator.clipboard.writeText(props.url)}
      >
        <I.Copy size={13} />
        Copy link
      </button>
    </div>
  );
}

export function ProjectCaptionActions(props: { text: string }) {
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      onClick={() => void navigator.clipboard.writeText(props.text)}
    >
      <I.Copy size={13} />
      Copy caption
    </button>
  );
}
