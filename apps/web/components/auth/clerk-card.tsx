import type { ReactNode } from "react";
import React from "react";

function StudioMark({ size = 24 }: { size?: number }) {
  return (
    <div
      className="topbar__brand-mark"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      <span style={{ marginTop: -1 }}>S</span>
    </div>
  );
}

export function ClerkCard(props: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, var(--cal-gray-50), var(--cal-white))",
        display: "grid",
        placeItems: "center",
        padding: 24,
        position: "relative",
      }}
    >
      <a
        href="/"
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-display)",
          fontSize: 18,
          textDecoration: "none",
          color: "var(--fg-1)",
        }}
      >
        <StudioMark /> Studio
      </a>
      <div className="card card--elevated" style={{ width: "min(420px, 100%)", padding: 32 }}>
        <h1 className="t-h2" style={{ margin: 0, textAlign: "center" }}>
          {props.title}
        </h1>
        <p
          className="t-small"
          style={{ textAlign: "center", marginTop: 8, marginBottom: 28 }}
        >
          {props.subtitle}
        </p>
        {props.children}
      </div>
    </main>
  );
}
