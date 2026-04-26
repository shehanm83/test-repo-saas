import { assertSafeUrl } from "./ssrf";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 5000;

export async function safeFetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const safeUrl = await assertSafeUrl(url);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(safeUrl.href, {
      signal: abortController.signal,
      redirect: "follow",
      headers: { "User-Agent": "StudioBot/1.0" },
    });

    if (!response.ok) {
      throw new Error(`fetch-status-${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error("not-html");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("empty-body");
    }

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      total += value.byteLength;
      if (total > MAX_BYTES) {
        throw new Error("body-too-large");
      }

      chunks.push(value);
    }

    return { html: Buffer.concat(chunks).toString("utf8"), finalUrl: response.url };
  } finally {
    clearTimeout(timeout);
  }
}
