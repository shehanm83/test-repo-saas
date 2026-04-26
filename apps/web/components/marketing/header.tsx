import Link from "next/link";

import styles from "../../app/page.module.css";

import { StudioMark } from "./studio-mark";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          <StudioMark />
          <span>Studio</span>
        </Link>
        <nav className={styles.nav}>
          <a href="#product">Product</a>
          <a href="#moods">Moods</a>
          <a href="#pricing">Pricing</a>
          <a href="#footer">Docs</a>
        </nav>
        <div className={styles.headerActions}>
          <Link className={`${styles.btn} ${styles.btnGhost}`} href="/sign-in">
            Sign in
          </Link>
          <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/sign-up">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
