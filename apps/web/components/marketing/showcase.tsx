import React from "react";

import styles from "../../app/page.module.css";

const STOCK = [
  "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=600&q=80",
  "https://images.unsplash.com/photo-1481833761820-0509d3217039?w=600&q=80",
  "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=600&q=80",
  "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&q=80",
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80",
  "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=600&q=80",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
];

export function Showcase() {
  return (
    <section className={styles.showcaseSection}>
      <div className={styles.container}>
        <div className={styles.centerHead}>
          <div className={styles.eyebrow} style={{ color: "#C97A3F" }}>
            Real work, in seconds
          </div>
          <h2 className={styles.h1}>The output, not the canvas.</h2>
        </div>

        <div className={styles.showcaseGrid}>
          <div className={styles.showcaseFeature}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={STOCK[0]} alt="Holiday campaign sample" />
            <div className={styles.showcasePills}>
              <span className={styles.showcasePill}>Northwind</span>
              <span className={styles.showcasePill}>Christmas</span>
            </div>
            <div className={styles.showcaseCaption}>
              Holiday
              <br />
              Sale · 30% off
            </div>
          </div>

          {[STOCK[3], STOCK[7], STOCK[2], STOCK[4]].map((src, index) => (
            <div key={src} className={styles.showcaseSmall}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
              <div className={styles.showcaseSmallPill}>
                {["Lumen", "Atlas", "Northwind", "Atlas"][index]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
