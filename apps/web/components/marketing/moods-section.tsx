import Link from "next/link";

import styles from "../../app/page.module.css";

import { Icons } from "./icons";

const MOODS = [
  {
    id: "christmas",
    name: "Christmas",
    kind: "Seasonal",
    img: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=400&q=80",
    colors: ["#7A0E0E", "#0E5C2F", "#E8C66B"],
  },
  {
    id: "midsummer",
    name: "Midsummer",
    kind: "Seasonal",
    img: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&q=80",
    colors: ["#F4D35E", "#7BAE7F", "#E8DCC4"],
  },
  {
    id: "minimalist-tech",
    name: "Minimalist Tech",
    kind: "Evergreen",
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
    colors: ["#0E0E10", "#5E5CE6", "#F4F4FB"],
  },
  {
    id: "editorial",
    name: "Editorial",
    kind: "Evergreen",
    img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80",
    colors: ["#101010", "#F0EAD6", "#A23B2D"],
  },
];

export function MoodsSection() {
  return (
    <section className={styles.moodsSection} id="moods">
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.eyebrow} style={{ color: "#FBE5C2" }}>
              Moods
            </div>
            <h2 className={styles.h1Light}>
              Seasonal flavor.
              <br />
              Without abandoning your brand.
            </h2>
          </div>
          <p className={styles.sectionLeadDark}>
            Curated style packs blend with your brand on demand. Christmas, Midsummer, Bauhaus —
            tonally consistent, never costume-y.
          </p>
        </div>

        <div className={styles.moodsGrid}>
          {MOODS.map((mood) => (
            <div key={mood.id} className={styles.moodCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mood.img} alt={mood.name} />
              <div className={styles.moodOverlay} />
              <div className={styles.moodColors}>
                {mood.colors.map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </div>
              <div className={styles.moodMeta}>
                <div className={styles.moodTitle}>{mood.name}</div>
                <div className={styles.moodKind}>{mood.kind}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.centerRow}>
          <Link className={`${styles.btn} ${styles.btnDarkSecondary}`} href="/sign-up">
            Browse 40+ moods
            {Icons.arrowRight(14)}
          </Link>
        </div>
      </div>
    </section>
  );
}
