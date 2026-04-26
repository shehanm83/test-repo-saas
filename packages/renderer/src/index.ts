export { renderTemplate } from "./render.js";
export { renderTemplateBrowser } from "./browser.js";
export type { RenderInput, RenderOutput } from "./types.js";

import { renderTemplate as renderSatori } from "./render.js";
import { renderTemplateBrowser } from "./browser.js";
import type { RenderInput, RenderOutput } from "./types.js";

export async function render(
  input: RenderInput,
  opts: { requiresBrowser?: boolean } = {},
): Promise<RenderOutput> {
  return opts.requiresBrowser ? renderTemplateBrowser(input) : renderSatori(input);
}
