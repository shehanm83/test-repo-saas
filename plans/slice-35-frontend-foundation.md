# Slice 35 — Frontend foundation (Next.js, Tailwind, shadcn, design tokens)

**Phase:** 11 — Frontend foundation
**Depends on:** 02

**Definition of done:**
- `apps/web` is a Next.js 15 (App Router) project
- Tailwind CSS configured with shadcn/ui design tokens
- Reusable primitives via shadcn: Button, Input, Textarea, Label, Toggle (Switch), Select, Checkbox, Dialog, Drawer, Toast (Sonner), Card, Tabs, Badge, Skeleton
- `app/layout.tsx` with global font (Inter), color theme, basic chrome
- `pnpm --filter @studio/web dev` runs and shows a Hello page
- Component test setup (RTL + jsdom) verifies a Button renders

---

## Files

**Create:**
- `apps/web/next.config.mjs`
- `apps/web/tailwind.config.ts`
- `apps/web/postcss.config.mjs`
- `apps/web/components.json` (shadcn config)
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/ui/*` (Button, Input, Label, Textarea, Switch, Select, Checkbox, Dialog, Drawer, Card, Tabs, Badge, Skeleton, Toast)
- `apps/web/src/lib/utils.ts` (cn helper)
- `apps/web/src/components/ui/button.test.tsx`

**Modify:**
- `apps/web/package.json`
- `apps/web/tsconfig.json` (set `jsx: "preserve"`, `paths` for `@/...`)

---

## Tasks

- [ ] **Step 1 — Add Next + Tailwind + shadcn deps**

```bash
pnpm --filter @studio/web add next@latest react@^19 react-dom@^19
pnpm --filter @studio/web add -D @types/react @types/react-dom typescript tailwindcss postcss autoprefixer @tailwindcss/postcss class-variance-authority clsx tailwind-merge lucide-react
pnpm --filter @studio/web add @testing-library/react @testing-library/user-event @testing-library/dom @testing-library/jest-dom jsdom
```

- [ ] **Step 2 — Init shadcn**

```bash
pnpm --filter @studio/web exec shadcn@latest init -y
pnpm --filter @studio/web exec shadcn@latest add button input label textarea switch select checkbox dialog drawer card tabs badge skeleton sonner
```

(If the CLI scaffolds outside `src/`, move into `src/components/ui/` and update `components.json`.)

- [ ] **Step 3 — `apps/web/tailwind.config.ts`** — pick design tokens (per Section 0 in UI prompts):

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
    },
  },
} satisfies Config;
```

- [ ] **Step 4 — `globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 222 47% 11%;
  --primary-foreground: 0 0% 100%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 222 47% 11%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 222 47% 11%;
  --radius: 0.5rem;
}

.dark {
  --background: 222 47% 11%;
  --foreground: 0 0% 100%;
  /* ... */
}
```

- [ ] **Step 5 — `app/layout.tsx`**

```tsx
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = { title: "Studio", description: "On-brand images, in a sentence." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 6 — `app/page.tsx`** placeholder

```tsx
export default function HomePage() {
  return (
    <main className="container mx-auto py-24 text-center">
      <h1 className="text-4xl font-semibold">Studio</h1>
      <p className="mt-4 text-muted-foreground">On-brand images, in a sentence.</p>
    </main>
  );
}
```

- [ ] **Step 7 — Component test setup + button test**

`apps/web/vitest.config.ts` — change `environment` to `jsdom` and add `setupFiles: ["./src/test/setup.ts"]`.

`apps/web/src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

`apps/web/src/components/ui/button.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 8 — `pnpm dev` script**

In `apps/web/package.json`:
```json
"scripts": { "dev": "next dev", "build": "next build", "start": "next start", "lint": "next lint", "test": "vitest run" }
```

- [ ] **Step 9 — Run + commit**

```bash
pnpm --filter @studio/web test
pnpm --filter @studio/web dev   # browse http://localhost:3000
git add -A
git commit -m "feat(web): Next.js + Tailwind + shadcn foundation with design tokens"
```

---

## Verification

```bash
pnpm --filter @studio/web test
pnpm --filter @studio/web build
```

## Commit message

```
feat(web): Next.js + Tailwind + shadcn foundation with design tokens
```
