import type { ReactNode } from "react";
import React from "react";

import { VyoraWordmark } from "@/components/brand/vyora-mark";

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
          textDecoration: "none",
          color: "var(--fg-1)",
        }}
      >
        <VyoraWordmark size={28} textSize={20} />
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
