import React from "react";

import styles from "../../app/page.module.css";

import { Icons } from "./icons";

const STEPS = [
  {
    n: "01",
    t: "Set up your brand",
    d: "Upload a logo, paste your colors, pick fonts. About 30 seconds. Or paste your URL — we'll grab them for you.",
    icon: Icons.briefcase(22),
    bg: "linear-gradient(135deg, #FFE5C7, #FBC8A6)",
    iconBg: "#C97A3F",
  },
  {
    n: "02",
    t: "Describe what you want",
    d: "One or two sentences. Optionally pick a Mood — a curated style pack like Christmas or Minimalist Tech.",
    icon: Icons.wand(22),
    bg: "linear-gradient(135deg, #E8E7FA, #D4D2F5)",
    iconBg: "#5E5CE6",
  },
  {
    n: "03",
    t: "Click generate",
    d: "Receive 3–4 finished, brand-correct images in seconds. Download. Edit text inline. Regenerate variants you don't like.",
    icon: Icons.sparkle(22),
    bg: "linear-gradient(135deg, #D7E5C7, #B8D4A0)",
    iconBg: "#1F7A5A",
  },
];

export function HowItWorks() {
  return (
    <section className={styles.workflowSection}>
      <div className={styles.container}>
        <div className={styles.eyebrow} style={{ color: "var(--studio-violet)" }}>
          How it works
        </div>
        <h2 className={styles.h1}>Three steps. Two minutes. A thousand finished images.</h2>
        <div className={styles.stepsGrid}>
          {STEPS.map((step) => (
            <div key={step.n} className={styles.stepCard}>
              <div className={styles.stepTop} style={{ background: step.bg }}>
                <div className={styles.stepIcon} style={{ background: step.iconBg }}>
                  {step.icon}
                </div>
                <div className={styles.stepNumber}>{step.n}</div>
              </div>
              <div className={styles.stepBody}>
                <h3>{step.t}</h3>
                <p>{step.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
