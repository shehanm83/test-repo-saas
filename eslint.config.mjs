import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.open-next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/next-env.d.ts",
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
  ...compat.extends("next/core-web-vitals", "next/typescript").map((entry) => ({
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
  ...tseslint.configs.recommendedTypeChecked.map((entry) => ({
    ...entry,
    files: ["apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "packages/**/*.tsx"],
    languageOptions: {
      ...entry.languageOptions,
      parserOptions: {
        ...entry.languageOptions?.parserOptions,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  })),
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/require-await": "off",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc" },
        },
      ],
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],
    },
  },
  prettier,
];

export default config;
