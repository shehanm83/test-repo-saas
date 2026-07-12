/**
 * Manifest of static marketing assets under /public/marketing.
 * Generated with AI (Higgsfield) — update this list when files change.
 */
export type MarketingAsset = {
  src: string;
  alt: string;
  /** Loose niche tag used for captions/labels in the UI. */
  label: string;
};

export const MARQUEE_ASSETS: MarketingAsset[] = [
  { src: "/marketing/marquee-01.webp", alt: "Cosmetics serum campaign visual", label: "Cosmetics" },
  { src: "/marketing/marquee-02.webp", alt: "Skincare flatlay campaign visual", label: "Skincare" },
  { src: "/marketing/marquee-03.webp", alt: "Specialty coffee campaign visual", label: "Coffee" },
  { src: "/marketing/marquee-04.webp", alt: "Artisan bakery campaign visual", label: "Bakery" },
  { src: "/marketing/marquee-05.webp", alt: "Wellness candle campaign visual", label: "Wellness" },
  { src: "/marketing/marquee-06.webp", alt: "Activewear campaign visual", label: "Activewear" },
  { src: "/marketing/marquee-07.webp", alt: "Minimalist jewelry campaign visual", label: "Jewelry" },
  { src: "/marketing/marquee-08.webp", alt: "Craft beverage campaign visual", label: "Beverage" },
];

export const SHOWCASE_ASSETS: MarketingAsset[] = [
  { src: "/marketing/showcase-01.webp", alt: "Fashion editorial campaign", label: "Fashion" },
  { src: "/marketing/showcase-02.webp", alt: "Food campaign table spread", label: "Food" },
  { src: "/marketing/showcase-03.webp", alt: "Cosmetics macro campaign", label: "Cosmetics" },
  { src: "/marketing/showcase-04.webp", alt: "Lifestyle interior campaign", label: "Home" },
];

export const HERO_VIDEO = {
  src: "/marketing/hero-loop.mp4",
  poster: "/marketing/hero-poster.webp",
  /** Flip to false if the mp4 is removed; the poster image renders instead. */
  hasVideo: true,
};
