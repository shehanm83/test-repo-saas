import { load } from "cheerio";

import { extractDominantColors } from "./colors";
import { safeFetchHtml } from "./fetch";

export interface UrlExtraction {
  title?: string;
  description?: string;
  candidateLogos: string[];
  dominantColors: string[];
}

export async function extractFromUrl(url: string): Promise<UrlExtraction> {
  const { html, finalUrl } = await safeFetchHtml(url);
  const $ = load(html);

  const title =
    $("title").first().text() ||
    $("meta[property='og:title']").first().attr("content") ||
    undefined;
  const description =
    $("meta[name='description']").first().attr("content") ??
    $("meta[property='og:description']").first().attr("content") ??
    undefined;

  const candidateLogos = new Set<string>();

  $('link[rel*="icon"]').each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      candidateLogos.add(new URL(href, finalUrl).href);
    }
  });

  $('meta[property="og:image"]').each((_, element) => {
    const content = $(element).attr("content");
    if (content) {
      candidateLogos.add(new URL(content, finalUrl).href);
    }
  });

  const firstLogo = [...candidateLogos][0];
  const dominantColors = firstLogo ? await extractDominantColors(firstLogo).catch(() => []) : [];

  return {
    candidateLogos: [...candidateLogos],
    dominantColors,
    ...(title?.trim() ? { title: title.trim() } : {}),
    ...(description?.trim() ? { description: description.trim() } : {}),
  };
}
