import Link from "next/link";
import React from "react";

import { PLANS, type PlanCode } from "@layertone/billing";

import { LayertoneMark } from "@/components/brand/layertone-mark";
import { I } from "@/components/icons";

import type { HeroCard } from "./hero-cards";
import { HeroCardImage } from "./hero-cards";

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
    id: "clean-editorial",
    name: "Clean Editorial",
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

const PLAN_ORDER: PlanCode[] = ["free", "starter", "pro", "business", "agency"];
const POPULAR: PlanCode = "pro";
const PLAN_FEATURES: Record<PlanCode, string[]> = {
  free: ["1 brand", "1 seat", "30 credits / month", "Standard model"],
  starter: ["1 brand", "1 seat", "250 credits / month", "All Moods"],
  pro: ["3 brands", "3 seats", "1,000 credits / month", "Premium model"],
  business: ["10 brands", "10 seats", "4,000 credits / month", "Priority queue"],
  agency: ["50 brands", "Unlimited seats", "15,000 credits / month", "API access", "White-label"],
};

export function Landing({
  isAuthed = false,
  heroCards,
}: {
  isAuthed?: boolean;
  heroCards: HeroCard[];
}) {
  const primaryHref = isAuthed ? "/generate" : "/sign-up";
  const primaryLabel = "Open Layertone";
  const navPrimaryLabel = isAuthed ? "Open Layertone" : "Get Started Free";
  return (
    <div style={{ background: "#FCF7EE", minHeight: "100vh", overflow: "hidden" }}>
      <section id="product" className="lt-home-hero">
        <header className="lt-home-nav" aria-label="Primary navigation">
          <Link className="lt-home-logo" href="/">
            <LayertoneMark size={59} />
            <span>
              Layer<b>tone</b>
            </span>
          </Link>
          <nav className="lt-home-nav-links" aria-label="Marketing">
            <Link href="#features">
              Features <I.ChevronDown size={15} strokeWidth={2.2} />
            </Link>
            <Link href="#templates">Templates</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#resources">
              Resources <I.ChevronDown size={15} strokeWidth={2.2} />
            </Link>
            <Link href="#enterprise">Enterprise</Link>
          </nav>
          <div className="lt-home-actions">
            <Link className="lt-home-login" href={isAuthed ? "/generate" : "/sign-in"}>
              {isAuthed ? "Dashboard" : "Log in"}
            </Link>
            <Link className="lt-home-nav-cta" href={primaryHref}>
              {navPrimaryLabel}
            </Link>
          </div>
        </header>

        <div className="lt-home-hero-grid">
          <div className="lt-home-copy">
            <h1 className="lt-home-title">
              On-brand images,
              <br />
              <span className="lt-home-title-blue">in</span>{" "}
              <span className="lt-home-title-purple">a</span>{" "}
              <span className="lt-home-title-gradient">sentence.</span>
            </h1>
            <p className="lt-home-lede">
              Describe what you want. Pick your brand. Click generate. Layertone creates stunning,
              on-brand content for every platform.
            </p>
            <div className="lt-home-ctas">
              <Link className="lt-home-main-cta" href={primaryHref}>
                {primaryLabel}
                <I.ArrowRight size={18} strokeWidth={2.2} />
              </Link>
              <a className="lt-home-video-cta" href="#showcase">
                <I.Play size={16} strokeWidth={2} />
                See it in action &middot; 90s
              </a>
            </div>
            <div className="lt-home-proof">
              <span>
                <I.Check size={14} strokeWidth={2.4} />
                Free for one brand
              </span>
              <span>
                <I.Check size={14} strokeWidth={2.4} />
                No card required
              </span>
              <span>
                <I.Check size={14} strokeWidth={2.4} />
                Cancel anytime
              </span>
            </div>

            <div className="lt-home-prompt-card">
              <div className="lt-home-brief">
                <span>Brief</span>
                <p>
                  &ldquo;Christmas sale, cozy living
                  <br />
                  room with a glowing tree, 30%
                  <br />
                  off&rdquo;
                </p>
              </div>
              <div className="lt-home-brand">
                <span>Brand</span>
                <div className="lt-home-brand-row">
                  <div className="lt-home-brand-badge">NW</div>
                  <strong>Your Brand</strong>
                  <div className="lt-home-swatches">
                    {["#06122f", "#534660", "#b9a39a", "#d9ceb7"].map((c) => (
                      <i key={c} style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <span>Mood</span>
                <div className="lt-home-mood">
                  <div>
                    <I.Snowflake size={12} strokeWidth={2.2} />
                  </div>
                  <strong>Christmas</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="lt-home-card-collage" aria-hidden="true">
            <div className="lt-home-dots" />
            {heroCards.slice(0, 4).map((card, i) => {
              const slots = [
                { top: 20, left: 12, width: 314, rotate: -4, z: 2 },
                { top: 10, left: 368, width: 318, rotate: 4, z: 3 },
                { top: 392, left: 70, width: 308, rotate: -5, z: 1 },
                { top: 399, left: 392, width: 320, rotate: 3, z: 2 },
              ];
              const slot = slots[i]!;
              return (
                <div
                  key={card.id}
                  className="lt-home-card-slot"
                  style={{
                    top: slot.top,
                    left: slot.left,
                    width: slot.width,
                    transform: `rotate(${slot.rotate}deg)`,
                    zIndex: slot.z,
                  }}
                >
                  <HeroCardImage card={{ ...card, rotation: 0 }} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="lt-home-trust">
          <span>
            Trusted by 1,400+ teams
          </span>
          {[
            ["NORTHWIND", "#00568f"],
            ["LUMEN", "#06a348"],
            ["ATLAS", "#1265ff"],
            ["KESTREL", "#151925"],
            ["PALOMA", "#7856d8"],
            ["HEMLOCK", "#00a158"],
          ].map(([n, color]) => (
            <strong key={n} style={{ color }}>
              {n}
            </strong>
          ))}
        </div>
      </section>

      {/* MOOD GALLERY */}
      <section
        id="moods"
        style={{
          background: "var(--cal-charcoal)",
          color: "white",
          padding: "96px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 48,
              flexWrap: "wrap",
              gap: 24,
            }}
          >
            <div>
              <div className="t-eyebrow" style={{ color: "#FBE5C2" }}>
                Moods
              </div>
              <h2 className="t-h1" style={{ color: "white", marginTop: 8, maxWidth: 620 }}>
                Seasonal flavor.
                <br />
                Without abandoning your brand.
              </h2>
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)", maxWidth: 380, fontSize: 16 }}>
              Curated style packs blend with your brand on demand. Christmas, Midsummer, Bauhaus —
              tonally consistent, never costume-y.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {MOODS.map((m) => (
              <div
                key={m.id}
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  aspectRatio: "3/4",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.img}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt={m.name}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    top: 16,
                    display: "flex",
                    gap: 4,
                  }}
                >
                  {m.colors.map((c) => (
                    <span
                      key={c}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 100,
                        background: c,
                        boxShadow: "0 0 0 1.5px white",
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 16,
                    bottom: 16,
                    color: "white",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{m.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{m.kind}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Link
              className="btn btn--secondary"
              href={primaryHref}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "white",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
                textDecoration: "none",
              }}
            >
              Browse 40+ moods
              <I.ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        style={{
          padding: "96px 24px",
          background: "linear-gradient(180deg, var(--cal-white) 0%, #FFFAF0 100%)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="t-eyebrow" style={{ color: "var(--layertone-violet)" }}>
            How it works
          </div>
          <h2 className="t-h1" style={{ marginTop: 8, maxWidth: 720 }}>
            Three steps. Two minutes. A thousand finished images.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
              marginTop: 48,
            }}
          >
            {(
              [
                {
                  n: "01",
                  t: "Set up your brand",
                  d:
                    "Upload a logo, paste your colors, pick fonts. About 30 seconds. Or paste your URL — we'll grab them for you.",
                  icon: <I.Briefcase size={22} />,
                  bg: "linear-gradient(135deg, #FFE5C7, #FBC8A6)",
                  iconBg: "#C97A3F",
                },
                {
                  n: "02",
                  t: "Describe what you want",
                  d:
                    "One or two sentences. Optionally pick a published Mood from your production catalog.",
                  icon: <I.Wand size={22} />,
                  bg: "linear-gradient(135deg, #E8E7FA, #D4D2F5)",
                  iconBg: "#5E5CE6",
                },
                {
                  n: "03",
                  t: "Click generate",
                  d:
                    "Receive 3–4 finished, brand-correct images in seconds. Download. Edit text inline. Regenerate variants you don't like.",
                  icon: <I.Sparkle size={22} />,
                  bg: "linear-gradient(135deg, #D7E5C7, #B8D4A0)",
                  iconBg: "#1F7A5A",
                },
              ] as const
            ).map((s) => (
              <div
                key={s.n}
                className="card"
                style={{ padding: 0, overflow: "hidden", background: "white" }}
              >
                <div
                  style={{
                    background: s.bg,
                    padding: "32px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: s.iconBg,
                      color: "white",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                    }}
                  >
                    {s.icon}
                  </div>
                  <div
                    className="mono"
                    style={{ color: "rgba(0,0,0,0.4)", fontSize: 32, fontWeight: 700 }}
                  >
                    {s.n}
                  </div>
                </div>
                <div style={{ padding: 24 }}>
                  <h3 className="t-h4" style={{ margin: "0 0 8px" }}>
                    {s.t}
                  </h3>
                  <p className="t-body-muted" style={{ margin: 0, fontSize: 15 }}>
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOWCASE */}
      <section id="showcase" style={{ padding: "96px 24px", background: "var(--cal-white)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="t-eyebrow" style={{ color: "#C97A3F" }}>
              Real work, in seconds
            </div>
            <h2 className="t-h1" style={{ marginTop: 8 }}>
              The output, not the canvas.
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr",
              gridTemplateRows: "auto auto",
              gap: 12,
            }}
          >
            <div
              style={{
                gridRow: "span 2",
                borderRadius: 16,
                overflow: "hidden",
                aspectRatio: "1/1.2",
                position: "relative",
                background: "#7A0E0E",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={STOCK[0]}
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.92 }}
                alt=""
              />
              <div style={{ position: "absolute", left: 24, top: 24, display: "flex", gap: 8 }}>
                <span className="pill" style={{ background: "rgba(255,255,255,0.95)", height: 24 }}>
                  Brand
                </span>
                <span className="pill" style={{ background: "rgba(255,255,255,0.95)", height: 24 }}>
                  Christmas
                </span>
              </div>
              <div style={{ position: "absolute", left: 24, bottom: 24, color: "white" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1.05 }}>
                  Holiday
                  <br />
                  Sale · 30% off
                </div>
              </div>
            </div>
            {[STOCK[3], STOCK[7], STOCK[2], STOCK[4]].map((s, i) => (
              <div
                key={s}
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  aspectRatio: "1/1",
                  position: "relative",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt=""
                />
                <div style={{ position: "absolute", left: 10, top: 10 }}>
                  <span
                    className="pill"
                    style={{
                      background: "rgba(255,255,255,0.95)",
                      height: 20,
                      fontSize: 10,
                    }}
                  >
                    {["Brand", "Brand", "Brand", "Brand"][i]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFFERENTIATORS */}
      <section
        style={{
          padding: "96px 24px",
          background: "var(--cal-gray-50)",
          borderTop: "1px solid var(--cal-gray-200)",
          borderBottom: "1px solid var(--cal-gray-200)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 className="t-h1" style={{ maxWidth: 720, marginBottom: 48 }}>
            Not a canvas. Not a chatbot. A brand-correct image generator.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {(
              [
                {
                  vs: "vs. Canva",
                  h: "You don't design. We deliver.",
                  b:
                    "No layers, no font picker, no manual layout. The image arrives finished — branded, sized, captioned.",
                  color: "#C97A3F",
                },
                {
                  vs: "vs. Midjourney",
                  h: "Brand-correct by construction.",
                  b:
                    "Your real logo, your real fonts, your real colors. Not an approximation. Not a hallucinated lookalike.",
                  color: "#5E5CE6",
                },
                {
                  vs: "vs. AdCreative.ai",
                  h: "Curated Mood library.",
                  b:
                    "Blend seasonal and aesthetic style packs with your brand under your control. Christmas without abandoning your palette.",
                  color: "#1F7A5A",
                },
              ] as const
            ).map((d) => (
              <div
                key={d.vs}
                className="card"
                style={{ padding: 0, overflow: "hidden", background: "white" }}
              >
                <div style={{ height: 4, background: d.color }} />
                <div style={{ padding: 28 }}>
                  <div className="t-eyebrow" style={{ color: d.color, marginBottom: 12 }}>
                    {d.vs}
                  </div>
                  <h3 className="t-h3" style={{ margin: "0 0 12px" }}>
                    {d.h}
                  </h3>
                  <p className="t-body-muted" style={{ margin: 0 }}>
                    {d.b}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        style={{ background: "var(--cal-charcoal)", color: "white", padding: "96px 0" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="t-eyebrow" style={{ color: "#FBE5C2" }}>
              Pricing
            </div>
            <h2 className="t-h1" style={{ color: "white", marginTop: 8 }}>
              Pay for what you generate.
            </h2>
            <p className="t-lede" style={{ color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
              Free for individuals. Top up anytime.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {PLAN_ORDER.map((code) => {
              const p = PLANS[code];
              const popular = code === POPULAR;
              return (
                <div
                  key={code}
                  style={{
                    background: popular ? "var(--layertone-violet)" : "rgba(255,255,255,0.06)",
                    border: popular ? "0" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: 20,
                    position: "relative",
                  }}
                >
                  {popular ? (
                    <div
                      style={{
                        position: "absolute",
                        top: -10,
                        left: 16,
                        background: "white",
                        color: "var(--layertone-violet-700)",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 100,
                      }}
                    >
                      Most popular
                    </div>
                  ) : null}
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
                    {code.charAt(0).toUpperCase() + code.slice(1)}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      alignItems: "baseline",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 36 }}>
                      ${p.price}
                    </span>
                    <span style={{ fontSize: 13, opacity: 0.7 }}>/mo</span>
                  </div>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "16px 0 0",
                      fontSize: 13,
                      lineHeight: 1.7,
                      opacity: 0.85,
                    }}
                  >
                    {PLAN_FEATURES[code].map((f) => (
                      <li
                        key={f}
                        style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
                      >
                        <I.Check size={12} style={{ marginTop: 5, flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div
            style={{
              textAlign: "center",
              marginTop: 32,
              fontSize: 13,
              opacity: 0.6,
            }}
          >
            What&apos;s a credit?{" "}
            <a className="t-link" style={{ color: "rgba(255,255,255,0.8)" }}>
              Read the docs →
            </a>
            <span style={{ margin: "0 12px" }}>·</span>
            Top up anytime · Credits never expire
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section
        style={{
          padding: "72px 24px",
          background:
            "linear-gradient(135deg, #FFE5C7 0%, #E8E7FA 50%, #D7E5C7 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <h2 className="t-h1" style={{ margin: 0, maxWidth: 720, marginInline: "auto" }}>
            Try it on your brand. It takes about 30 seconds.
          </h2>
          <p style={{ color: "var(--fg-2)", fontSize: 18, marginTop: 12, marginBottom: 24 }}>
            Free forever for one brand. No card, no commitment.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              className="btn btn--accent btn--lg"
              href={primaryHref}
              style={{ textDecoration: "none" }}
            >
              {primaryLabel}
              <I.ArrowRight size={16} />
            </Link>
            {!isAuthed ? (
              <Link
                className="btn btn--secondary btn--lg"
                href="/sign-in"
                style={{ background: "white", textDecoration: "none" }}
              >
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        id="footer"
        style={{
          borderTop: "1px solid var(--cal-gray-200)",
          padding: "48px 24px",
          background: "var(--cal-white)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            gap: 32,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-display)",
                fontSize: 20,
                marginBottom: 12,
              }}
            >
              <LayertoneMark size={48} /> Layertone
            </div>
            <p className="t-small" style={{ maxWidth: 280 }}>
              Brand-correct image generation for SMBs, marketers, and creators. © 2026.
            </p>
          </div>
          {(
            [
              { h: "Product", l: ["Generate", "Moods", "Brands", "Pricing"] },
              { h: "Company", l: ["About", "Careers", "Contact", "Press"] },
              { h: "Legal", l: ["Terms", "Privacy", "AUP", "DPA"] },
              { h: "Social", l: ["Twitter", "GitHub", "LinkedIn"] },
            ] as const
          ).map((c) => (
            <div key={c.h}>
              <div className="t-eyebrow" style={{ marginBottom: 12 }}>
                {c.h}
              </div>
              {c.l.map((x) => (
                <div key={x} className="t-small" style={{ padding: "4px 0", cursor: "pointer" }}>
                  {x}
                </div>
              ))}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
