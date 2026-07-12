# Slice 58 — Admin UI enhancement

## Goal

Make the admin area feel like a deliberate operations product instead of a flat generated back office. Enhancement is prioritized over effort/cost. The work should preserve existing admin behavior while improving hierarchy, accessibility, visual density, and operator confidence.

## Inputs

- Vercel Web Interface Guidelines review prompt: accessibility, focus, forms, animation, typography, content resilience, images, performance, navigation state, touch/layout safety, theming, i18n, hydration, hover states, and copy.
- Current admin routes: `/admin/landing-hero`, `/admin/home-showcase`, `/admin/moods`, `/admin/templates`, `/admin/stock`, `/admin/pricebook`, `/admin/generations`, `/admin/users`, `/admin/aup`.
- Current shared admin components: `apps/web/components/admin/*`.

## North-star Improvements

1. Admin-specific design system
   - Add reusable admin shell, page header, section, stat, alert, list, table, toolbar, upload, and empty state patterns.
   - Move repeated inline styles into named classes.
   - Keep cards for actual contained items and controls, not every page section.

2. Admin navigation
   - Group navigation into Marketing, Content, Commerce, Operations, and Safety.
   - Stronger active state, hover state, app-return link, and clear admin identity.
   - Prepare for global admin search.

3. Page hierarchy
   - Add compact metadata strips, stat rows, sticky action bars, and contextual toolbars.
   - Make important status and destructive operations visually obvious.
   - Use page-specific layouts instead of identical title/card/list screens.

4. Visual content
   - Give mood, template, stock, landing, and showcase admin screens image-forward previews.
   - Avoid blank gray placeholders where the admin is curating visual material.

5. Tables and lists
   - Add filters, status tabs, sorting-ready headers, row hover/focus states, copyable IDs, empty states, and pagination/virtualization path.
   - Use tabular numeric formatting for comparable numbers.
   - Reflect filters/search/page state in URLs.

6. Interactions
   - Replace `confirm()`, `alert()`, `location.reload()`, hover-only affordances, and save-on-blur patterns.
   - Use confirmation modals, inline validation, optimistic refresh, toast regions, and explicit save/cancel.

7. Accessibility and resilience
   - Inputs have labels, names, appropriate types, autocomplete/inputmode where useful.
   - Icon-only buttons have accessible names.
   - Toasts/async updates use `aria-live`.
   - Custom controls are keyboard reachable and have `focus-visible`.
   - Long IDs, prompts, names, and user content truncate or wrap intentionally.

8. Responsive and layout
   - Admin shell adapts below desktop.
   - Full-height panels account for safe areas and avoid unwanted horizontal scrolling.
   - Lists/grids degrade cleanly to one column.

9. Copy and formatting
   - Use clear action labels: "Publish Mood", "Add Price Version", "Refund Generation".
   - Use `Intl.DateTimeFormat` and `Intl.NumberFormat`.
   - Use polished punctuation: ellipsis character for loading, title case for headings/actions.

## Implementation Phases

### Phase 1 — Foundation and first pass

- Add admin-specific CSS utilities and layout classes.
- Redesign `AdminShell` with grouped nav and stronger active states.
- Add reusable admin UI helpers for page headers, stats, sections, status pills, alerts, and formatters.
- Update generation inspector/list, mood studio, template studio, stock admin, and pricebook with the new patterns.

### Phase 2 — Interaction quality

- Replace browser-native `confirm()`/`alert()` flows with confirmation and feedback components.
- Remove `location.reload()` from admin mutations.
- Add inline errors, loading states, and disabled states only after request start.
- Add copy-to-clipboard for IDs and API keys where useful.

### Phase 3 — Data operations

- Add URL-synced filters/status tabs/pagination.
- Add sorting-ready table headers and virtualized large lists.
- Add audit/event timeline views for generation and workspace tools.

### Phase 4 — Visual polish

- Make stock and content admin screens image-first.
- Improve template preview sizing, controls, and source editing ergonomics.
- Add responsive QA screenshots and mobile drawer behavior.

## Verification

- `pnpm --filter @layertone/web typecheck`
- `pnpm --filter @layertone/web lint`
- Manual review of `/admin/*` pages on desktop and narrow viewport.
- Keyboard pass through shell nav, forms, lists, and destructive actions.
