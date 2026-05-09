import type { ReactNode } from "react";
import React from "react";

import { VyoraMark, VyoraWordmark } from "@/components/brand/vyora-mark";

export function ClerkCard(props: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: [
          "radial-gradient(ellipse 110% 90% at 5% 10%, rgba(228,227,252,0.95) 0%, transparent 52%)",
          "radial-gradient(ellipse 70% 70% at 95% 90%, rgba(241,241,254,0.6) 0%, transparent 48%)",
          "radial-gradient(ellipse 50% 50% at 55% 45%, rgba(228,227,252,0.3) 0%, transparent 60%)",
          "#ffffff",
        ].join(", "),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 24px 56px",
        position: "relative",
      }}
    >
      <a
        href="/"
        style={{
          position: "absolute",
          top: 28,
          left: 28,
          textDecoration: "none",
        }}
      >
        <VyoraWordmark width={110} />
      </a>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "min(460px, 100%)",
        }}
      >
        <VyoraMark size={40} />

        <h1
          style={{
            margin: "14px 0 0",
            textAlign: "center",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--fg-1)",
          }}
        >
          {props.title}
        </h1>

        <p
          style={{
            textAlign: "center",
            marginTop: 8,
            marginBottom: 24,
            fontSize: 14,
            color: "var(--fg-3)",
            lineHeight: 1.5,
            maxWidth: 320,
          }}
        >
          {props.subtitle}
        </p>

        {props.children}
      </div>
    </main>
  );
}
