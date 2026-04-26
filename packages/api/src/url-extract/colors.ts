import { Vibrant } from "node-vibrant/node";

export async function extractDominantColors(imageUrl: string): Promise<string[]> {
  const palette = await Vibrant.from(imageUrl).getPalette();
  return Object.values(palette)
    .filter((swatch): swatch is NonNullable<typeof swatch> => Boolean(swatch))
    .map((swatch) => swatch.hex);
}
