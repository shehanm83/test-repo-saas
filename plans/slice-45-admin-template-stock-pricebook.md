# Slice 45 — Admin: Template Studio + Stock library + Pricebook editor

**Phase:** 15
**Depends on:** 44, 17, 18

**Definition of done:**
- `/admin/templates` and `/admin/templates/[id]` pages: list, edit JSX source, slot/text-safe-zone JSON editors, preferred model select, publish/archive
- `/admin/stock`: upload (drop-in), tag editor, list grid
- `/admin/pricebook`: versioned table editor, add new version, expire old version
- Each writes `audit_log`

---

## Files

**Create:**
- `apps/web/src/app/admin/templates/page.tsx`
- `apps/web/src/app/admin/templates/[id]/page.tsx`
- `apps/web/src/components/admin/template-form.tsx`
- `apps/web/src/components/admin/template-preview.tsx`
- `apps/web/src/app/admin/stock/page.tsx`
- `apps/web/src/components/admin/stock-uploader.tsx`
- `apps/web/src/app/admin/pricebook/page.tsx`
- `apps/web/src/components/admin/pricebook-table.tsx`
- API routes: `/api/admin/templates*`, `/api/admin/stock*`, `/api/admin/pricebook*`

---

## Tasks

- [ ] **Step 1 — Template form** with a code editor (Monaco or CodeMirror) for `jsx_source` and JSON editors for `slots` + `text_safe_zones`. Live preview uses the `test-render` endpoint similar to mood editor.

```bash
pnpm --filter @vyora/web add @uiw/react-codemirror @codemirror/lang-javascript @codemirror/lang-json
```

- [ ] **Step 2 — Stock uploader** with drag-drop multi-file, tag input per file, license dropdown.

- [ ] **Step 3 — Pricebook table** rendering all versions, with "Add version" form (model code, size bucket, premium flag, has-inspiration flag, credits, version, effectiveFrom). "Expire" button on each row.

- [ ] **Step 4 — API routes** wrap `TemplateApi`, `StockApi`, `PricebookApi`. Audit log on every mutate.

- [ ] **Step 5 — Commit**

```bash
pnpm --filter @vyora/web test
git add -A
git commit -m "feat(admin): Template Studio + Stock library + Pricebook editor"
```

---

## Verification

```bash
pnpm dev
# Navigate /admin/templates, /admin/stock, /admin/pricebook
```

## Commit message

```
feat(admin): Template Studio + Stock library + Pricebook editor
```
