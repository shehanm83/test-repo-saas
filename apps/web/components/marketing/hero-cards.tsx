import React from "react";

export interface HeroCard {
  id: string;
  imageUrl: string;
  headline: string; // \n for line breaks
  sub: string; // \n for line breaks
  textPosition: "top" | "bottom";
  textColor: "white" | "dark";
  brandInitials: string;
  brandColor: string; // background of badge
  brandTextColor: string;
  badgeText?: string | null; // e.g. "30%\nOFF"
  badgeBg?: string | null;
  badgeColor?: string | null;
  rotation?: number; // degrees, e.g. -1 / 0 / 1
}

/** Default cards used when DB has none. Curated for the prop.png look. */
export const DEFAULT_HERO_CARDS: HeroCard[] = [
  {
    id: "celebrate-season",
    imageUrl: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=900&q=85",
    headline: "Celebrate\nthe season",
    sub: "Cozy moments,\nwarm memories",
    textPosition: "bottom",
    textColor: "white",
    brandInitials: "NW",
    brandColor: "#FFFFFF",
    brandTextColor: "#2A1F18",
    rotation: 1,
  },
  {
    id: "sweet-indulgence",
    imageUrl: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=900&q=85",
    headline: "A sweet\nindulgence",
    sub: "Made for moments\nthat matter",
    textPosition: "top",
    textColor: "white",
    brandInitials: "NW",
    brandColor: "#FFFFFF",
    brandTextColor: "#2A1F18",
    badgeText: "30%\nOFF",
    badgeBg: "#7A4023",
    badgeColor: "#FBE5C2",
    rotation: -1,
  },
  {
    id: "write-ideas",
    imageUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&q=85",
    headline: "Write ideas.\nCreate impact.",
    sub: "Every word\ntells a story",
    textPosition: "top",
    textColor: "dark",
    brandInitials: "NW",
    brandColor: "#FFFFFF",
    brandTextColor: "#2A1F18",
    rotation: -1,
  },
  {
    id: "new-season",
    imageUrl: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=900&q=85",
    headline: "New season.\nNew inspiration.",
    sub: "Fresh vibes for\nyour feed",
    textPosition: "bottom",
    textColor: "white",
    brandInitials: "NW",
    brandColor: "#FFFFFF",
    brandTextColor: "#2A1F18",
    rotation: 1,
  },
];

export function HeroCardImage({ card }: { card: HeroCard }) {
  const isWhiteText = card.textColor === "white";
  const textColor = isWhiteText ? "white" : "var(--cal-charcoal)";
  const rotation = card.rotation ?? 0;

  const gradient = isWhiteText
    ? card.textPosition === "top"
      ? "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 50%)"
      : "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 50%)"
    : card.textPosition === "top"
      ? "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 45%)"
      : "linear-gradient(0deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 45%)";

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        aspectRatio: "4 / 5",
        boxShadow:
          "0 14px 36px rgba(20,20,40,0.14), 0 2px 8px rgba(20,20,40,0.06), 0 0 0 1px rgba(34,42,53,0.04)",
        transform: `rotate(${rotation}deg)`,
        background: "var(--cal-gray-100)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.imageUrl}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        loading="lazy"
      />

      {/* Smooth gradient mask for white-text legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: gradient,
          pointerEvents: "none",
        }}
      />

      {/* Round discount badge */}
      {card.badgeText ? (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 56,
            height: 56,
            borderRadius: 100,
            background: card.badgeBg ?? "#7A4023",
            color: card.badgeColor ?? "#FBE5C2",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: 0.4,
            textAlign: "center",
            boxShadow: "0 5px 14px rgba(0,0,0,0.22)",
            whiteSpace: "pre-line",
            transform: "rotate(8deg)",
          }}
        >
          {card.badgeText}
        </div>
      ) : null}

      {/* Headline + sub */}
      <div
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          [card.textPosition === "top" ? "top" : "bottom"]: 16,
          color: textColor,
          fontFamily: "var(--font-display)",
        }}
      >
        <div
          style={{
            fontSize: 22,
            lineHeight: 1.05,
            fontWeight: 700,
            whiteSpace: "pre-line",
            letterSpacing: -0.4,
          }}
        >
          {card.headline}
        </div>
        <div
          style={{
            fontSize: 11,
            lineHeight: 1.35,
            fontFamily: "var(--font-body)",
            marginTop: 7,
            opacity: isWhiteText ? 0.95 : 0.78,
            whiteSpace: "pre-line",
            fontWeight: 500,
          }}
        >
          {card.sub}
        </div>
      </div>

      {/* Brand initials badge */}
      <div
        style={{
          position: "absolute",
          [card.textPosition === "top" ? "bottom" : "top"]: 16,
          left: 16,
          width: 32,
          height: 32,
          borderRadius: 6,
          background: card.brandColor,
          color: card.brandTextColor,
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-display)",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.4,
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        {card.brandInitials}
      </div>
    </div>
  );
}

/** Pick `count` cards randomly from a pool, returning an array of distinct picks. */
export function pickRandomHeroCards(pool: HeroCard[], count = 4): HeroCard[] {
  if (pool.length <= count) return pool;
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, count);
}
