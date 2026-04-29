# Slice 49 — Marketing landing page

**Phase:** 17 — Marketing & deployment
**Depends on:** 35
**Spec references:** [UI Prompt 1 — Marketing landing page](../specs/2026-04-25-studio-v1-ui-prompts.md).

**Definition of done:**
- `/` (root) renders a marketing landing page (separate route group from authenticated app)
- Sections per UI Prompt 1: Hero, How it works (3 steps), Differentiator, Pricing, Footer
- Pricing section reuses `PLANS` from `@vyora/billing` (single source of truth)
- "Start free" CTA → `/sign-up`
- "See it work" → modal with embedded video (use a placeholder URL — replace later)
- Lighthouse ≥ 95 on Performance / Accessibility / Best Practices

---

## Files

**Create:**
- `apps/web/src/app/(marketing)/layout.tsx` (no app shell)
- `apps/web/src/app/(marketing)/page.tsx`
- `apps/web/src/components/marketing/{hero.tsx,how-it-works.tsx,differentiator.tsx,pricing.tsx,footer.tsx}`

**Modify:**
- `apps/web/src/app/page.tsx` (now renders marketing) OR move authenticated `/` to `/generate`

---

## Tasks

- [ ] **Step 1 — Marketing layout**

```tsx
// apps/web/src/app/(marketing)/layout.tsx
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="container mx-auto flex items-center justify-between py-6">
        <Link href="/" className="text-lg font-semibold">Studio</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="#pricing">Pricing</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up" className="rounded-md bg-primary px-3 py-2 text-primary-foreground">Start free</Link>
        </nav>
      </header>
      {children}
    </>
  );
}
```

- [ ] **Step 2 — Hero**

```tsx
// apps/web/src/components/marketing/hero.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="container mx-auto py-20 text-center">
      <h1 className="text-5xl font-semibold tracking-tight">On-brand images, in a sentence.</h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
        Describe what you want. Pick your brand. Click generate. Studio produces finished marketing images with your logo, fonts, and colors — exact, every time.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild size="lg"><Link href="/sign-up">Start free</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="#how">See it work</Link></Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 3 — How it works** (3-step horizontal)

- [ ] **Step 4 — Differentiator** (3-column comparison vs Canva / Midjourney / AdCreative)

- [ ] **Step 5 — Pricing**

```tsx
// apps/web/src/components/marketing/pricing.tsx
import { PLANS } from "@vyora/billing";

export function Pricing() {
  return (
    <section id="pricing" className="container mx-auto py-20">
      <h2 className="text-center text-3xl font-semibold">Simple pricing</h2>
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-5">
        {(Object.values(PLANS)).map((p) => (
          <div key={p.code} className="rounded-xl border p-6 text-center">
            <h3 className="text-lg font-medium capitalize">{p.code}</h3>
            <p className="mt-1 text-3xl font-semibold">${p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              <li>{p.brandQuota} brands</li>
              <li>{p.seatQuota === 999 ? "Unlimited" : p.seatQuota} seats</li>
              <li>{p.monthlyCreditGrant} credits/mo</li>
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">Top up anytime. Top-up credits never expire.</p>
    </section>
  );
}
```

- [ ] **Step 6 — Footer**

Standard four-column SaaS footer.

- [ ] **Step 7 — Page composition**

```tsx
// apps/web/src/app/(marketing)/page.tsx
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Differentiator } from "@/components/marketing/differentiator";
import { Pricing } from "@/components/marketing/pricing";
import { Footer } from "@/components/marketing/footer";

export default function MarketingHome() {
  return (
    <main>
      <Hero /><HowItWorks /><Differentiator /><Pricing /><Footer />
    </main>
  );
}
```

- [ ] **Step 8 — Move authenticated home**

Authenticated landing was `/`; redirect to `/generate` in app layout when session exists.

- [ ] **Step 9 — Commit**

```bash
pnpm --filter @vyora/web build
git add -A
git commit -m "feat(web): public marketing landing page"
```

---

## Verification

```bash
pnpm --filter @vyora/web build && pnpm --filter @vyora/web start
# Visit / and confirm Lighthouse ≥ 95 across Perf / A11y / Best Practices
```

## Commit message

```
feat(web): public marketing landing page
```
