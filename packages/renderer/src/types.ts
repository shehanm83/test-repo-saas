export interface RenderInput {
  templateJsxSource: string;
  background: { bytes: Uint8Array; mimeType: string };
  brand: {
    logoSvg?: string;
    logoPng?: { bytes: Uint8Array; width: number; height: number };
    palette: { primary: string; secondary?: string; accent?: string; extras?: string[] };
    fonts: { heading: { family: string; weight?: string }; body: { family: string; weight?: string } };
    flags: { useColors: boolean; useLogo: boolean; useFonts: boolean };
  };
  mood?: {
    accentPalette: string[];
    decorationTags: string[];
    typographyHint?: { weight?: string; justification?: string };
    flags: { useDecorations: boolean; useAccentColors: boolean };
  };
  slots: { headline?: string; subhead?: string; cta?: string };
  decorationStockUrls?: string[];
  output: { width: number; height: number };
}

export interface RenderOutput {
  pngBytes: Uint8Array;
  renderMs: number;
}
