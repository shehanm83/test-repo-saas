/** Hex helpers for the palette editor. All values are stored as `#rrggbb`. */

export function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#?/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .split("")
      .map((char) => char + char)
      .join("")}`.toLowerCase();
  }
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : null;
}

export function isHex(value: string): boolean {
  return normalizeHex(value) !== null;
}

function channels(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex) ?? "#000000";
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const linear = channels(hex)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

/** Black or white — whichever stays readable on the given background. */
export function readableInk(background: string): string {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#111111")
    ? "#ffffff"
    : "#111111";
}

export function isDark(hex: string): boolean {
  return relativeLuminance(hex) < 0.4;
}
