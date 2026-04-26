import React from "react";

import styles from "../../app/page.module.css";

import { StudioMark } from "./studio-mark";

const COLUMNS: { h: string; l: string[] }[] = [
  { h: "Product", l: ["Generate", "Moods", "Brands", "Pricing"] },
  { h: "Company", l: ["About", "Careers", "Contact", "Press"] },
  { h: "Legal", l: ["Terms", "Privacy", "AUP", "DPA"] },
  { h: "Social", l: ["Twitter", "GitHub", "LinkedIn"] },
];

export function Footer() {
  return (
    <footer className={styles.footer} id="footer">
      <div className={styles.footerGrid}>
        <div>
          <div className={styles.brand}>
            <StudioMark />
            <span>Studio</span>
          </div>
          <p className={styles.footerText}>
            Brand-correct image generation for SMBs, marketers, and creators. © 2026.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.h}>
            <div className={styles.eyebrow}>{column.h}</div>
            <div className={styles.footerLinks}>
              {column.l.map((link) => (
                <span key={link}>{link}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
