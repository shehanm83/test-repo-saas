import React from "react";

import styles from "../../app/page.module.css";

const ITEMS = [
  {
    vs: "vs. Canva",
    h: "You don't design. We deliver.",
    b: "No layers, no font picker, no manual layout. The image arrives finished — branded, sized, captioned.",
    color: "#C97A3F",
  },
  {
    vs: "vs. Midjourney",
    h: "Brand-correct by construction.",
    b: "Your real logo, your real fonts, your real colors. Not an approximation. Not a hallucinated lookalike.",
    color: "#5E5CE6",
  },
  {
    vs: "vs. AdCreative.ai",
    h: "Curated Mood library.",
    b: "Blend seasonal and aesthetic style packs with your brand under your control. Christmas without abandoning your palette.",
    color: "#1F7A5A",
  },
];

export function Differentiator() {
  return (
    <section className={styles.differentiatorSection}>
      <div className={styles.container}>
        <h2 className={styles.h1}>
          Not a canvas. Not a chatbot. A brand-correct image generator.
        </h2>
        <div className={styles.diffGrid}>
          {ITEMS.map((item) => (
            <div key={item.vs} className={styles.diffCard}>
              <div className={styles.diffTop} style={{ background: item.color }} />
              <div className={styles.diffBody}>
                <div className={styles.eyebrow} style={{ color: item.color }}>
                  {item.vs}
                </div>
                <h3>{item.h}</h3>
                <p>{item.b}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
