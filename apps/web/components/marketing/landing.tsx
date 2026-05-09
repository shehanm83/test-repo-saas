import Link from "next/link";
import React from "react";

import { PLANS, type PlanCode } from "@vyora/billing";

import { VyoraMark, VyoraWordmark } from "@/components/brand/vyora-mark";
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
  const primaryLabel = isAuthed ? "Open Vyora" : "Start free";
  return (
    <div style={{ background: "var(--cal-white)", minHeight: "100vh", overflow: "hidden" }}>
      {/* Top-right nav */}
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 32,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {isAuthed ? (
          <>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "var(--fg-3)",
                fontFamily: "var(--font-body)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "inline-block",
                  boxShadow: "0 0 0 2px rgba(34,197,94,0.25)",
                }}
              />
              Logged in
            </span>
            <Link
              href="/generate"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                background: "linear-gradient(180deg, #7A65EA 0%, #5743D6 100%)",
                color: "white",
                fontFamily: "var(--font-display)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(94,76,222,0.3)",
              }}
            >
              Open Vyora
              <I.ArrowRight size={13} />
            </Link>
          </>
        ) : (
          <Link
            href="/sign-in"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--fg-2)",
              textDecoration: "none",
              padding: "8px 14px",
            }}
          >
            Sign in
          </Link>
        )}
      </div>

      {/* HERO */}
      <section
        id="product"
        style={{
          position: "relative",
          padding: "56px 24px 96px",
          background:
            "radial-gradient(ellipse 80% 60% at 0% 0%, #FBEFD8 0%, transparent 60%), radial-gradient(ellipse 70% 60% at 100% 0%, #F4E6D5 0%, transparent 60%), #FCF7EE",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            position: "relative",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 56,
            alignItems: "start",
          }}
        >
          {/* LEFT */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ marginBottom: 16, marginLeft: 0 }}>
              <VyoraWordmark width={160} />
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 70,
                lineHeight: 1.0,
                margin: 0,
                letterSpacing: "-2.2px",
                fontWeight: 800,
                color: "var(--cal-charcoal)",
              }}
            >
              On-brand images,
              <br />
              <span style={{ color: "#3F62D9" }}>in</span>{" "}
              <span style={{ color: "#7A4F8E" }}>a</span>{" "}
              <span
                style={{
                  background:
                    "linear-gradient(110deg, #C97A3F 0%, #7A0E0E 35%, #5E5CE6 70%, #1F7A5A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                sentence.
              </span>
            </h1>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 18,
                lineHeight: 1.55,
                color: "var(--fg-2)",
                marginTop: 22,
                maxWidth: 460,
              }}
            >
              Describe what you want. Pick your brand. Click generate. Vyora creates stunning,
              on-brand content for every platform.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <Link
                href={primaryHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 28px",
                  borderRadius: 10,
                  background:
                    "linear-gradient(180deg, #7A65EA 0%, #5743D6 100%)",
                  color: "white",
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow:
                    "0 6px 16px rgba(94,76,222,0.34), 0 1px 0 rgba(255,255,255,0.22) inset",
                  letterSpacing: -0.2,
                }}
              >
                {primaryLabel}
                <I.ArrowRight size={16} />
              </Link>
              <a
                href="#showcase"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 26px",
                  borderRadius: 10,
                  background: "white",
                  color: "var(--cal-charcoal)",
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 700,
                  textDecoration: "none",
                  border: "1px solid var(--cal-gray-300)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  letterSpacing: -0.2,
                }}
              >
                <I.Play size={13} />
                See it in action &middot; 90s
              </a>
            </div>
            <div
              style={{
                marginTop: 20,
                display: "flex",
                gap: 22,
                fontSize: 13,
                color: "var(--fg-3)",
                fontFamily: "var(--font-body)",
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <I.Check size={12} style={{ color: "var(--studio-violet)" }} />
                Free for one brand
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <I.Check size={12} style={{ color: "var(--studio-violet)" }} />
                No card required
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <I.Check size={12} style={{ color: "var(--studio-violet)" }} />
                Cancel anytime
              </span>
            </div>

            {/* Brief / Brand / Mood card — anchors the bottom of left column,
                vertically aligned with the bottom row of hero cards on the right. */}
            <div style={{ marginTop: 56 }}>
              <div
                style={{
                  maxWidth: 460,
              background: "white",
              borderRadius: 14,
              padding: 16,
              boxShadow:
                "0 18px 48px rgba(20,20,40,0.10), 0 2px 6px rgba(20,20,40,0.06), 0 0 0 1px rgba(34,42,53,0.05)",
              pointerEvents: "auto",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--fg-3)",
                  marginBottom: 6,
                }}
              >
                Brief
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: "var(--fg-1)",
                  background: "var(--cal-gray-50)",
                  border: "1px solid var(--cal-gray-200)",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                &ldquo;Christmas sale, cozy living
                <br />
                room with a glowing tree, 30% off&rdquo;
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--fg-3)",
                  marginBottom: 6,
                }}
              >
                Brand
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: "#2A1F18",
                    color: "#E8DCC4",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  NW
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)" }}>
                  Your Brand
                </div>
                <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
                  {["#2A1F18", "#7C5232", "#E8DCC4", "#C9A86A"].map((c) => (
                    <span
                      key={c}
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 2,
                        background: c,
                        boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--fg-3)",
                  marginBottom: 6,
                }}
              >
                Mood
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #FCE5C5, #F8D8D8)",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: "#7A0E0E",
                    display: "grid",
                    placeItems: "center",
                    color: "#E8C66B",
                  }}
                >
                  <I.Snowflake size={11} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)" }}>
                  Christmas
                </div>
              </div>
            </div>
              </div>
            </div>
          </div>

          {/* RIGHT — bigger staggered polaroid cards */}
          <div
            style={{
              position: "relative",
              width: 620,
              height: 800,
              marginLeft: "auto",
            }}
          >
            {heroCards.slice(0, 4).map((card, i) => {
              const slots = [
                { top: 90, left: 0, rotate: -4, z: 2 },
                { top: 60, left: 300, rotate: 5, z: 3 },
                { top: 440, left: 30, rotate: -5, z: 1 },
                { top: 440, left: 320, rotate: 3, z: 2 },
              ];
              const slot = slots[i]!;
              return (
                <div
                  key={card.id}
                  style={{
                    position: "absolute",
                    top: slot.top,
                    left: slot.left,
                    width: 290,
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

        {/* Trust strip */}
        <div
          style={{
            maxWidth: 1180,
            margin: "80px auto 0",
            padding: "20px 0",
            borderTop: "1px solid var(--cal-gray-200)",
            display: "flex",
            alignItems: "center",
            gap: 32,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "var(--fg-3)",
              fontFamily: "var(--font-body)",
            }}
          >
            Trusted by 1,400+ teams
          </span>
          {["NORTHWIND", "LUMEN", "ATLAS", "KESTREL", "PALOMA", "HEMLOCK"].map((n) => (
            <div
              key={n}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                letterSpacing: 2,
                color: "var(--fg-3)",
              }}
            >
              {n}
            </div>
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
          <div className="t-eyebrow" style={{ color: "var(--studio-violet)" }}>
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
                    background: popular ? "var(--studio-violet)" : "rgba(255,255,255,0.06)",
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
                        color: "var(--studio-violet-700)",
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
              <VyoraMark size={24} /> Vyora
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
