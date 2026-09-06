export type LandingHeroSetStatus = "draft" | "published" | "archived";
export type LandingHeroTextPosition = "top" | "bottom";
export type LandingHeroTextColor = "white" | "dark";

export interface LandingHeroSetConfig {
  headline: {
    line1: string;
    line2Prefix: string;
    line2Middle: string;
    line2Suffix: string;
  };
  lede: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    href: string;
    enabled: boolean;
  };
  proofItems: string[];
  prompt: {
    brief: string;
    brandName: string;
    brandInitials: string;
    swatches: string[];
    moodName: string;
  };
  trust: {
    label: string;
    teams: Array<{
      name: string;
      color: string;
    }>;
  };
}

export interface LandingHeroSetCard {
  id: string;
  slot: number;
  imageUrl: string;
  s3Key?: string | null;
  headline: string;
  sub: string;
  textPosition: LandingHeroTextPosition;
  textColor: LandingHeroTextColor;
  brandInitials: string;
  brandColor: string;
  brandTextColor: string;
  badgeText?: string | null;
  badgeBg?: string | null;
  badgeColor?: string | null;
}

export interface LandingHeroSetView {
  id: string;
  name: string;
  status: LandingHeroSetStatus;
  weight: number;
  config: LandingHeroSetConfig;
  cards: LandingHeroSetCard[];
}

const placeholderImage = (bg: string, accent: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000'%3E%3Crect width='800' height='1000' fill='${bg.replace("#", "%23")}'/%3E%3Crect x='80' y='80' width='640' height='840' rx='36' fill='none' stroke='${accent.replace("#", "%23")}' stroke-width='6' stroke-dasharray='18 18' opacity='.58'/%3E%3Ccircle cx='400' cy='430' r='96' fill='${accent.replace("#", "%23")}' opacity='.18'/%3E%3Cpath d='M288 560h224M328 620h144' stroke='${accent.replace("#", "%23")}' stroke-width='20' stroke-linecap='round' opacity='.34'/%3E%3C/svg%3E`;

export const DEFAULT_LANDING_HERO_CONFIG: LandingHeroSetConfig = {
  headline: {
    line1: "Brand-ready content",
    line2Prefix: "for",
    line2Middle: "every",
    line2Suffix: "campaign.",
  },
  lede: "Placeholder landing hero content shown only when no published landing hero set exists.",
  primaryCta: {
    label: "Open Layertone",
    href: "/sign-up",
  },
  secondaryCta: {
    label: "See it in action · 90s",
    href: "#showcase",
    enabled: true,
  },
  proofItems: ["Placeholder item", "No published set", "Admin controlled"],
  prompt: {
    brief: '"Draft campaign brief\nfor placeholder content"',
    brandName: "Example Brand",
    brandInitials: "EX",
    swatches: ["#D7DEE8", "#AEB8C5", "#F3F5F8", "#CBD3DD"],
    moodName: "Placeholder",
  },
  trust: {
    label: "Placeholder teams",
    teams: [
      { name: "ALPHA", color: "#64748B" },
      { name: "BRAVO", color: "#475569" },
      { name: "CHARLIE", color: "#64748B" },
      { name: "DELTA", color: "#475569" },
    ],
  },
};

export const DEFAULT_LANDING_HERO_CARDS: LandingHeroSetCard[] = [
  {
    id: "fallback-placeholder-1",
    slot: 1,
    imageUrl: placeholderImage("#EEF2F7", "#94A3B8"),
    headline: "Placeholder\nimage one",
    sub: "Dummy card\ncontent",
    textPosition: "bottom",
    textColor: "dark",
    brandInitials: "EX",
    brandColor: "#FFFFFF",
    brandTextColor: "#334155",
  },
  {
    id: "fallback-placeholder-2",
    slot: 2,
    imageUrl: placeholderImage("#F4F1EA", "#A8A29E"),
    headline: "Placeholder\nimage two",
    sub: "Dummy card\ncontent",
    textPosition: "top",
    textColor: "dark",
    brandInitials: "EX",
    brandColor: "#FFFFFF",
    brandTextColor: "#334155",
  },
  {
    id: "fallback-placeholder-3",
    slot: 3,
    imageUrl: placeholderImage("#EEF4F1", "#8AA39B"),
    headline: "Placeholder\nimage three",
    sub: "Dummy card\ncontent",
    textPosition: "top",
    textColor: "dark",
    brandInitials: "EX",
    brandColor: "#FFFFFF",
    brandTextColor: "#334155",
  },
  {
    id: "fallback-placeholder-4",
    slot: 4,
    imageUrl: placeholderImage("#F1EEF6", "#9B8AB8"),
    headline: "Placeholder\nimage four",
    sub: "Dummy card\ncontent",
    textPosition: "bottom",
    textColor: "dark",
    brandInitials: "EX",
    brandColor: "#FFFFFF",
    brandTextColor: "#334155",
  },
];

export const DEFAULT_LANDING_HERO_SET: LandingHeroSetView = {
  id: "fallback-placeholder",
  name: "Fallback placeholder hero",
  status: "published",
  weight: 1,
  config: DEFAULT_LANDING_HERO_CONFIG,
  cards: DEFAULT_LANDING_HERO_CARDS,
};
