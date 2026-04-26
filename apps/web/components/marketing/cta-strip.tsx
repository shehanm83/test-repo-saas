import Link from "next/link";
import React from "react";

import styles from "../../app/page.module.css";

import { Icons } from "./icons";

export function CtaStrip() {
  return (
    <section className={styles.ctaStrip}>
      <div className={styles.container}>
        <div className={styles.ctaPanel}>
          <h2 className={styles.h1}>Try it on your brand. It takes about 30 seconds.</h2>
          <p>Free forever for one brand. No card, no commitment.</p>
          <div className={styles.heroActionsCentered}>
            <Link className={`${styles.btn} ${styles.btnAccent} ${styles.btnLg}`} href="/sign-up">
              Start free
              {Icons.arrowRight(16)}
            </Link>
            <Link
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLg}`}
              href="/sign-in"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
