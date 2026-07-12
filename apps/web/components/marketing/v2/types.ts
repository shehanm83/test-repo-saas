export interface LandingMood {
  id: string;
  name: string;
  kind: "seasonal" | "evergreen";
  accentPalette: string[];
  previewImgUrl: string | null;
}
