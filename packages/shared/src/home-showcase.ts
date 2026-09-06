export interface HomeShowcaseCard {
  eyebrow: string;
  heading: string;
  body: string;
  color: string;
}

export interface HomeShowcaseConfig {
  kicker: string;
  galleryHeading: string;
  differentiatorHeading: string;
  cards: [HomeShowcaseCard, HomeShowcaseCard, HomeShowcaseCard];
}

export interface HomeShowcaseImage {
  id: string;
  imageUrl: string;
  s3Key?: string | null;
  sortOrder: number;
}

export interface HomeShowcaseView {
  config: HomeShowcaseConfig;
  images: HomeShowcaseImage[];
}

export const DEFAULT_HOME_SHOWCASE_CONFIG: HomeShowcaseConfig = {
  kicker: "Real work, in seconds",
  galleryHeading: "The output, not the canvas.",
  differentiatorHeading: "Not a canvas. Not a chatbot. A brand-correct image generator.",
  cards: [
    {
      eyebrow: "vs. Canva",
      heading: "You don't design. We deliver.",
      body: "No layers, no font picker, no manual layout. The image arrives finished - branded, sized, captioned.",
      color: "#C97A3F",
    },
    {
      eyebrow: "vs. Midjourney",
      heading: "Brand-correct by construction.",
      body: "Your real logo, your real fonts, your real colors. Not an approximation. Not a hallucinated lookalike.",
      color: "#5E5CE6",
    },
    {
      eyebrow: "vs. AdCreative.ai",
      heading: "Curated Mood library.",
      body: "Blend seasonal and aesthetic style packs with your brand under your control. Christmas without abandoning your palette.",
      color: "#1F7A5A",
    },
  ],
};

export const DEFAULT_HOME_SHOWCASE_IMAGES: HomeShowcaseImage[] = [
  {
    id: "default-showcase-1",
    imageUrl: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=900&q=85",
    sortOrder: 0,
  },
  {
    id: "default-showcase-2",
    imageUrl: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=900&q=85",
    sortOrder: 1,
  },
  {
    id: "default-showcase-3",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=85",
    sortOrder: 2,
  },
  {
    id: "default-showcase-4",
    imageUrl: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=900&q=85",
    sortOrder: 3,
  },
  {
    id: "default-showcase-5",
    imageUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=900&q=85",
    sortOrder: 4,
  },
];

export const DEFAULT_HOME_SHOWCASE_VIEW: HomeShowcaseView = {
  config: DEFAULT_HOME_SHOWCASE_CONFIG,
  images: DEFAULT_HOME_SHOWCASE_IMAGES,
};
