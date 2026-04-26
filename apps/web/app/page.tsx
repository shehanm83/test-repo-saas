import Link from "next/link";
import React from "react";

import styles from "./page.module.css";

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

const moods = [
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

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: ["1 brand", "1 seat", "50 credits / month", "Standard model"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 19,
    features: ["3 brands", "1 seat", "400 credits / month", "All Moods"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    popular: true,
    features: ["10 brands", "3 seats", "1,000 credits / month", "Premium model"],
  },
  {
    id: "business",
    name: "Business",
    price: 149,
    features: ["30 brands", "10 seats", "4,000 credits / month", "Priority queue"],
  },
  {
    id: "agency",
    name: "Agency",
    price: 399,
    features: ["100 brands", "30 seats", "12,000 credits / month", "API access", "White-label"],
  },
];

const trustLogos = ["NORTHWIND", "LUMEN", "ATLAS", "KESTREL", "PALOMA", "HEMLOCK"];

function Icon({ children, size = 16 }: { children: React.ReactNode; size?: number | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const Icons = {
  sparkle: (size?: number) => (
    <Icon size={size}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </Icon>
  ),
  arrowRight: (size?: number) => (
    <Icon size={size}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </Icon>
  ),
  play: (size?: number) => (
    <Icon size={size}>
      <polygon points="6 3 20 12 6 21 6 3" />
    </Icon>
  ),
  check: (size?: number) => (
    <Icon size={size}>
      <path d="m20 6-11 11-5-5" />
    </Icon>
  ),
  snowflake: (size?: number) => (
    <Icon size={size}>
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07M9 5l3 3 3-3M9 19l3-3 3 3M5 9l3 3-3 3M19 9l-3 3 3 3" />
    </Icon>
  ),
  briefcase: (size?: number) => (
    <Icon size={size}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </Icon>
  ),
  wand: (size?: number) => (
    <Icon size={size}>
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
    </Icon>
  ),
};

function StudioMark({ size = 24 }: { size?: number }) {
  return (
    <div className={styles.studioMark} style={{ width: size, height: size, fontSize: size * 0.55 }}>
      <span>S</span>
    </div>
  );
}

function CTAButtons() {
  return (
    <div className={styles.heroActions}>
      <Link className={`${styles.btn} ${styles.btnAccent} ${styles.btnLg}`} href="/signup">
        Start free
        {Icons.arrowRight(16)}
      </Link>
      <a className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLg}`} href="#pricing">
        {Icons.play(14)}
        See it work · 90s
      </a>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className={styles.page}>
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
            <Link className={`${styles.btn} ${styles.btnGhost}`} href="/signin">
              Sign in
            </Link>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/signup">
              Start free
            </Link>
          </div>
        </div>
      </header>

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
            <CTAButtons />
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
            {trustLogos.map((logo) => (
              <div key={logo} className={styles.trustLogo}>
                {logo}
              </div>
            ))}
          </div>
        </div>
      </section>

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
            {moods.map((mood) => (
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
            <Link className={`${styles.btn} ${styles.btnDarkSecondary}`} href="/signup">
              Browse 40+ moods
              {Icons.arrowRight(14)}
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.workflowSection}>
        <div className={styles.container}>
          <div className={styles.eyebrow} style={{ color: "var(--studio-violet)" }}>
            How it works
          </div>
          <h2 className={styles.h1}>Three steps. Two minutes. A thousand finished images.</h2>
          <div className={styles.stepsGrid}>
            {[
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
            ].map((step) => (
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

      <section className={styles.differentiatorSection}>
        <div className={styles.container}>
          <h2 className={styles.h1}>
            Not a canvas. Not a chatbot. A brand-correct image generator.
          </h2>
          <div className={styles.diffGrid}>
            {[
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
            ].map((item) => (
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

      <section className={styles.pricingSection} id="pricing">
        <div className={styles.container}>
          <div className={styles.centerHead}>
            <div className={styles.eyebrow} style={{ color: "#FBE5C2" }}>
              Pricing
            </div>
            <h2 className={styles.h1Light}>Pay for what you generate.</h2>
            <p className={styles.sectionLeadDark}>Free for individuals. Top up anytime.</p>
          </div>
          <div className={styles.pricingGrid}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`${styles.priceCard} ${plan.popular ? styles.priceCardPopular : ""}`}
              >
                {plan.popular ? <div className={styles.popularBadge}>Most popular</div> : null}
                <div className={styles.priceName}>{plan.name}</div>
                <div className={styles.priceLine}>
                  <span>${plan.price}</span>
                  <small>/mo</small>
                </div>
                <ul className={styles.featureList}>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      {Icons.check(12)}
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className={styles.pricingNote}>
            What&apos;s a credit? Read the docs →<span>·</span>
            Top up anytime · Credits never expire
          </div>
        </div>
      </section>

      <section className={styles.ctaStrip}>
        <div className={styles.container}>
          <div className={styles.ctaPanel}>
            <h2 className={styles.h1}>Try it on your brand. It takes about 30 seconds.</h2>
            <p>Free forever for one brand. No card, no commitment.</p>
            <div className={styles.heroActionsCentered}>
              <Link className={`${styles.btn} ${styles.btnAccent} ${styles.btnLg}`} href="/signup">
                Start free
                {Icons.arrowRight(16)}
              </Link>
              <Link
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLg}`}
                href="/signin"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

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
          {[
            { h: "Product", l: ["Generate", "Moods", "Brands", "Pricing"] },
            { h: "Company", l: ["About", "Careers", "Contact", "Press"] },
            { h: "Legal", l: ["Terms", "Privacy", "AUP", "DPA"] },
            { h: "Social", l: ["Twitter", "GitHub", "LinkedIn"] },
          ].map((column) => (
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
    </main>
  );
}
