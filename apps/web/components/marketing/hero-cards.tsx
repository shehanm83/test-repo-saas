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

const placeholderImage = (bg: string, accent: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000'%3E%3Crect width='800' height='1000' fill='${bg.replace("#", "%23")}'/%3E%3Crect x='80' y='80' width='640' height='840' rx='36' fill='none' stroke='${accent.replace("#", "%23")}' stroke-width='6' stroke-dasharray='18 18' opacity='.58'/%3E%3Ccircle cx='400' cy='430' r='96' fill='${accent.replace("#", "%23")}' opacity='.18'/%3E%3Cpath d='M288 560h224M328 620h144' stroke='${accent.replace("#", "%23")}' stroke-width='20' stroke-linecap='round' opacity='.34'/%3E%3C/svg%3E`;

/** Placeholder cards used only as a last-resort fallback. */
export const DEFAULT_HERO_CARDS: HeroCard[] = [
  {
    id: "fallback-placeholder-1",
    imageUrl: placeholderImage("#EEF2F7", "#94A3B8"),
    headline: "Placeholder\nimage one",
    sub: "Dummy card\ncontent",
    textPosition: "bottom",
    textColor: "dark",
    brandInitials: "EX",
    brandColor: "#FFFFFF",
    brandTextColor: "#334155",
    rotation: 1,
  },
  {
    id: "fallback-placeholder-2",
    imageUrl: placeholderImage("#F4F1EA", "#A8A29E"),
    headline: "Placeholder\nimage two",
    sub: "Dummy card\ncontent",
    textPosition: "top",
    textColor: "dark",
    brandInitials: "EX",
    brandColor: "#FFFFFF",
    brandTextColor: "#334155",
    rotation: -1,
  },
  {
    id: "fallback-placeholder-3",
    imageUrl: placeholderImage("#EEF4F1", "#8AA39B"),
    headline: "Placeholder\nimage three",
    sub: "Dummy card\ncontent",
    textPosition: "top",
    textColor: "dark",
    brandInitials: "EX",
    brandColor: "#FFFFFF",
    brandTextColor: "#334155",
    rotation: -1,
  },
  {
    id: "fallback-placeholder-4",
    imageUrl: placeholderImage("#F1EEF6", "#9B8AB8"),
    headline: "Placeholder\nimage four",
    sub: "Dummy card\ncontent",
    textPosition: "bottom",
    textColor: "dark",
    brandInitials: "EX",
    brandColor: "#FFFFFF",
    brandTextColor: "#334155",
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
