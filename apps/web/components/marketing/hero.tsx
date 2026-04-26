import Link from "next/link";

import styles from "../../app/page.module.css";

import { Icons } from "./icons";
import { VideoModalTrigger } from "./video-modal";

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

const TRUST_LOGOS = ["NORTHWIND", "LUMEN", "ATLAS", "KESTREL", "PALOMA", "HEMLOCK"];

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroChipSwatches}>
        {["#7A0E0E", "#0E5C2F", "#E8C66B", "#5E5CE6"].map((color) => (
          <span key={color} style={{ background: color }} />
        ))}
      </div>
      <div className={styles.heroFloatingPill}>
        {Icons.sparkle(14)}
        47 generations today
      </div>

      <div className={styles.container}>
        <div className={styles.heroContent}>
          <div className={styles.pill}>
            <span className={styles.dot} />
            Studio v1 · live now
          </div>
          <h1 className={styles.heroTitle}>
            On-brand images,
            <br />
            <span>in a sentence.</span>
          </h1>
          <p className={styles.heroLead}>
            Describe what you want. Pick your brand. Click generate. Studio produces finished
            marketing images with your logo, fonts, and colors — exact, every time.
          </p>
          <div className={styles.heroActions}>
            <Link
              className={`${styles.btn} ${styles.btnAccent} ${styles.btnLg}`}
              href="/sign-up"
            >
              Start free
              {Icons.arrowRight(16)}
            </Link>
            <VideoModalTrigger />
          </div>
          <div className={styles.benefits}>
            <span>{Icons.check(11)} Free for one brand</span>
            <span>{Icons.check(11)} No card required</span>
            <span>{Icons.check(11)} Cancel anytime</span>
          </div>
        </div>

        <div className={styles.heroVisual} id="product">
          <div className={`${styles.card} ${styles.cardElevated} ${styles.inputCard}`}>
            <div className={styles.eyebrow} style={{ color: "var(--studio-violet)" }}>
              Brief
            </div>
            <div className={styles.briefBox}>
              &quot;Christmas sale, cozy living room with a glowing tree, 30% off&quot;
            </div>
            <div className={styles.eyebrow} style={{ marginTop: 16 }}>
              Brand
            </div>
            <div className={styles.brandPreview}>
              <div className={styles.brandInitials}>NW</div>
              <div>
                <div className={styles.brandName}>Northwind Coffee</div>
                <div className={styles.swatchRow}>
                  {["#2A1F18", "#7C5232", "#E8DCC4", "#C9A86A"].map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.eyebrow} style={{ marginTop: 16 }}>
              Mood
            </div>
            <div className={styles.moodPreview}>
              <div className={styles.moodIcon}>{Icons.snowflake(16)}</div>
              <div className={styles.brandName}>Christmas</div>
            </div>
          </div>

          <div className={styles.heroArrowWrap}>
            <div className={styles.heroArrow}>{Icons.arrowRight(20)}</div>
          </div>

          <div className={styles.outputGrid}>
            {[STOCK[0], STOCK[3], STOCK[5], STOCK[2]].map((src, index) => (
              <div
                key={src}
                className={styles.outputCard}
                style={{
                  transform:
                    index === 1 ? "rotate(1deg)" : index === 2 ? "rotate(-1deg)" : undefined,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
                <div className={styles.outputBadge}>30% off</div>
                <div className={styles.outputLogo}>NW</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.trustStrip}>
          <span className={styles.trustLabel}>Trusted by 1,400+ teams</span>
          {TRUST_LOGOS.map((logo) => (
            <div key={logo} className={styles.trustLogo}>
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
