import * as React from "react";

export type TemplateFn = (input: unknown) => unknown;

/**
 * Compile a template JSX source string into a render function.
 * Templates must declare a `template(input)` function using `h()` (createElement alias).
 * `new Function` is acceptable here since templates are admin-authored.
 */
export function compileTemplate(source: string): TemplateFn {
  const factory = new Function(
    "React",
    "h",
    `${source};\nreturn typeof template === 'function' ? template : null;`,
  );
  const fn = factory(React, React.createElement) as unknown;
  if (typeof fn !== "function") throw new Error("template-source-must-export-template-function");
  return fn as TemplateFn;
}
