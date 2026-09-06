export { renderTemplate } from "./render";
export { renderTemplateBrowser } from "./browser";
export type { RenderInput, RenderOutput } from "./types";

import { renderTemplate as renderSatori } from "./render";
import { renderTemplateBrowser } from "./browser";
import type { RenderInput, RenderOutput } from "./types";

export async function render(
  input: RenderInput,
  opts: { requiresBrowser?: boolean } = {},
): Promise<RenderOutput> {
  return opts.requiresBrowser ? renderTemplateBrowser(input) : renderSatori(input);
}
