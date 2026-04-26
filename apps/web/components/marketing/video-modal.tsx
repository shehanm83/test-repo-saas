"use client";

import React, { useState } from "react";

import styles from "../../app/page.module.css";

import { Icons } from "./icons";

const PLACEHOLDER_VIDEO_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";

export function VideoModalTrigger({
  className,
  label = "See it work · 90s",
}: {
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className ?? `${styles.btn} ${styles.btnSecondary} ${styles.btnLg}`}
        onClick={() => setOpen(true)}
      >
        {Icons.play(14)}
        {label}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Studio demo video"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(7, 7, 12, 0.78)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(960px, 92vw)",
              aspectRatio: "16 / 9",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 80px rgba(0,0,0,0.5)",
              background: "#000",
            }}
          >
            <iframe
              src={PLACEHOLDER_VIDEO_URL}
              title="Studio demo"
              width="100%"
              height="100%"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
              style={{ border: 0, width: "100%", height: "100%" }}
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close video"
            style={{
              position: "fixed",
              top: 18,
              right: 22,
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 999,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      ) : null}
    </>
  );
}
