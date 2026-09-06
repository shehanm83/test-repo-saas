import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const config = [
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.next*/**",
      "**/.open-next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/next-env.d.ts",
      "template/**",
      "predefined/**",
      "evaluations/**",
      "**/*.html",
      "scripts/**/*.ts",
      "**/vitest.config.ts",
      "**/vitest.integration.config.ts",
      "packages/*/drizzle.config.ts",
      "packages/*/scripts/**/*.ts",
      "vitest.config.ts",
      "vitest.integration.config.ts",
      "vitest.workspace.ts",
      "drizzle.config.ts",
    ],
  },
  js.configs.recommended,
  ...[...nextVitals, ...nextTypeScript].map((entry) => ({
    ...entry,
    settings: {
      ...entry.settings,
      next: {
        rootDir: ["apps/web/"],
      },
    },
    rules: {
      ...entry.rules,
      "@next/next/no-html-link-for-pages": "off",
    },
  })),
  ...tseslint.configs.recommended.map((entry) => ({
    ...entry,
    files: ["apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "packages/**/*.tsx"],
  })),
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports", disallowTypeAnnotations: false },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/require-await": "off",
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],
      "@next/next/no-img-element": "warn",
      "@next/next/no-page-custom-font": "off",
      "import/no-anonymous-default-export": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  prettier,
];

export default config;
