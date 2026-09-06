// Probes the exact endpoint packages/renderer/src/fonts.ts uses, so
// packages/shared/src/brand/fonts.ts can only contain family+weight pairs the
// renderer is actually able to fetch.
//
//   node scripts/probe-brand-fonts.mjs > /tmp/fonts.json
//
// Add candidates below, re-run, and fold the JSON into BRAND_FONTS.
const CANDIDATES = {
  sans: ["Inter","Roboto","Open Sans","Lato","Montserrat","Poppins","Raleway","Nunito","Nunito Sans","Work Sans","Rubik","Karla","Manrope","DM Sans","Plus Jakarta Sans","Figtree","Outfit","Sora","Space Grotesk","Archivo","Barlow","Mulish","Public Sans","Source Sans 3","Noto Sans","Cabin","Assistant","Urbanist","Epilogue","Lexend","Josefin Sans","Hanken Grotesk"],
  serif: ["Playfair Display","Merriweather","Lora","PT Serif","Libre Baskerville","Crimson Pro","Cormorant Garamond","EB Garamond","Source Serif 4","Bitter","Spectral","Frank Ruhl Libre","Fraunces","Newsreader","Literata","DM Serif Display","DM Serif Text","Noto Serif","Playfair"],
  slab: ["Roboto Slab","Zilla Slab","Arvo","Josefin Slab"],
  display: ["Bebas Neue","Oswald","Anton","Archivo Black","Abril Fatface","Alfa Slab One","Righteous","Fjalla One","Teko","Chivo","Staatliches"],
  mono: ["Roboto Mono","JetBrains Mono","IBM Plex Mono","Space Mono","Source Code Pro","Fira Code"],
  handwriting: ["Caveat","Pacifico","Dancing Script","Lobster","Satisfy"],
};
const WEIGHTS = ["300","400","500","600","700","800","900"];

async function probe(family, weight) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.status === 400) return false;
      if (!res.ok) throw new Error(String(res.status));
      const css = await res.text();
      return /url\(([^)]+)\)/.test(css);
    } catch {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return false;
}

const jobs = [];
for (const [category, families] of Object.entries(CANDIDATES))
  for (const family of families) jobs.push({ category, family });

const out = [];
const CONCURRENCY = 8;
let cursor = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const weights = [];
      for (const weight of WEIGHTS) if (await probe(job.family, weight)) weights.push(weight);
      out.push({ ...job, weights });
      process.stderr.write(`${job.family}: ${weights.join(",") || "NONE"}\n`);
    }
  }),
);
out.sort((a, b) => a.family.localeCompare(b.family));
console.log(JSON.stringify(out, null, 2));
