# Stock Library — Design Spec
**Date:** 2026-05-28
**Status:** Approved for implementation

---

## Overview

The stock library is a curated set of non-trademarked certification and compliance concept marks (icons) that users can optionally select when creating a generation. The selected icon is fed to the AI model as a reference image, nudging the output to include or incorporate that graphic element.

**Key constraints:**
- User always selects explicitly — the system never auto-injects stock assets
- Graphics only — no photography
- Non-trademarked concept marks only — no official certification logos
- One selection per generation (optional)

---

## 1. Schema

Drop and recreate the `stock_assets` table. No migration — this is a fresh production setup.

```sql
stock_assets
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid()
  category    text          NOT NULL  -- enum: food-dietary | food-safety | cosmetics | manufacturing | wellness
  kind        text          NOT NULL  -- enum: icon | photo  (all stock library entries use "icon")
  label       text          NOT NULL  -- display name shown in picker, e.g. "Gluten Free"
  s3_key      text          NOT NULL
  mime_type   text          NOT NULL
  width       integer
  height      integer
  tags        text[]        NOT NULL DEFAULT '{}'  -- keyword search terms, e.g. {vegan, plant-based, no animal}
  embedding   vector(1536)            -- for future semantic search, populated on upload
  license     text                    -- "internal" for all current entries
  attribution text
  created_at  timestamptz   NOT NULL DEFAULT now()
```

**Changes from current schema:** added `category` (enum-as-text) and `label` (display name). The `label` field is required — it's the human-readable name shown in the picker UI.

**Category values:**
- `food-dietary` — dietary claims (Vegan, Gluten Free, etc.)
- `food-safety` — food safety and quality standards (HACCP Concept, Food Grade, etc.)
- `cosmetics` — beauty and personal care marks (Cruelty Free, Paraben Free, etc.)
- `manufacturing` — industrial and export quality marks
- `wellness` — health and wellness claims

---

## 2. Content Plan

### Starter Set (~40 icons)

These are shipped with the initial launch. All icons are generic concept marks — visually representative of the certification concept without reproducing any trademarked logo.

**Food — Dietary (15)**
| Label | Tags |
|---|---|
| Vegan | vegan, plant-based, no animal products, cruelty free |
| Vegetarian | vegetarian, no meat, plant-based |
| Gluten Free | gluten free, wheat free, celiac, coeliac |
| Dairy Free | dairy free, lactose free, no milk |
| Nut Free | nut free, peanut free, tree nut free, allergen free |
| Organic | organic, natural, no pesticides |
| Non-GMO | non-gmo, no genetically modified, natural |
| Sugar Free | sugar free, no sugar, zero sugar |
| No Added Sugar | no added sugar, natural sugars only |
| Plant-Based | plant-based, vegan, no animal |
| Keto Friendly | keto, ketogenic, low carb, high fat |
| Paleo | paleo, paleolithic, grain free, legume free |
| Allergen Free | allergen free, free from, allergy safe |
| Low Carb | low carb, reduced carbohydrate |
| Raw Food | raw, unprocessed, no heat treatment |

**Food — Safety (6)**
| Label | Tags |
|---|---|
| Food Grade | food grade, food safe, food contact |
| Lab Tested | lab tested, laboratory tested, quality verified |
| Quality Assured | quality assured, QA, quality control |
| HACCP Concept | haccp, food safety management, hazard control |
| ISO 22000 Concept | iso 22000, food safety management system |
| BRC Concept | brc, food safety, retail standard |

**Cosmetics & Beauty (8)**
| Label | Tags |
|---|---|
| Cruelty Free | cruelty free, not tested on animals, no animal testing |
| Vegan (Cosmetics) | vegan, no animal ingredients, cruelty free |
| Paraben Free | paraben free, no parabens, preservative free |
| Sulphate Free | sulphate free, sulfate free, no sls |
| Dermatologist Tested | dermatologist tested, dermat approved, skin tested |
| Hypoallergenic | hypoallergenic, sensitive skin, allergy tested |
| Fragrance Free | fragrance free, unscented, no perfume |
| Natural Ingredients | natural ingredients, plant derived, botanical |

**Manufacturing (6)**
| Label | Tags |
|---|---|
| Export Quality | export quality, international standard, global quality |
| Premium Quality | premium quality, high quality, superior |
| Third Party Tested | third party tested, independent testing, verified |
| Quality Certified | quality certified, certified quality, accredited |
| CE Concept | ce concept, european conformity, safety standard |
| RoHS Concept | rohs concept, restriction of hazardous substances |

**Wellness (5)**
| Label | Tags |
|---|---|
| Doctor Recommended | doctor recommended, physician approved, medically endorsed |
| Clinically Tested | clinically tested, clinical study, scientifically proven |
| No Artificial Colors | no artificial colors, no artificial colouring, natural color |
| No Preservatives | no preservatives, preservative free, natural only |
| All Natural | all natural, 100% natural, no artificial ingredients |

---

### Backlog (future waves — not in starter set)

**Food — Dietary**
- Kosher Concept, Halal Concept, Fair Trade Concept, High Protein, Probiotic, Omega-3 Rich, Fibre Rich, Low Sodium, Low Fat, Whole Grain, Fortified, Reduced Calorie

**Food — Safety**
- SQF Concept, IFS Concept, FSSC 22000 Concept, Cold Chain Verified, Pesticide Free, Antibiotic Free, Hormone Free

**Cosmetics**
- SPF Tested, Oil Free, Alcohol Free, pH Balanced, Microbiome Friendly, Reef Safe, Biodegradable Formula

**Manufacturing**
- ISO 9001 Concept, ISO 14001 Concept, Energy Efficient, Sustainably Sourced, Recycled Materials, Upcycled

**Wellness**
- Nutritionist Approved, Sports Nutrition Certified, GMP Concept, Pharmacist Recommended, Antioxidant Rich

**Environmental / Cross-industry**
- Carbon Neutral, Eco Friendly, Recyclable Packaging, Biodegradable, Sustainable, Zero Waste, B-Corp Concept, Fair Wage

---

## 3. Admin Panel Changes

The stock admin page (`/admin/stock`) already has the image grid. These changes are needed:

**Upload form** — replace the current single-file hardcoded upload with:
- `label` text input (required) — display name
- `category` select dropdown (required) — the 5 enum values
- `tags` text input — comma-separated keywords
- `kind` hardcoded to `"icon"` (remove the field from the UI)
- `multiple` file input to support batch uploads — all files in the batch share the same category and tags; label auto-fills from filename (e.g. `gluten-free.png` → "Gluten Free"); admin corrects individual labels afterward via the edit-in-place panel

**List view**
- Category filter tabs: All / Food Dietary / Food Safety / Cosmetics / Manufacturing / Wellness
- Search input filters by `label` and `tags` client-side
- Image cards show `label` prominently (currently missing)
- Delete button on each card (calls `DELETE /api/admin/stock/:id`)

**Edit in place** — clicking a card opens an inline edit panel for `label`, `category`, and `tags`. No separate edit page needed at this scale. This is in scope for the admin panel work.

---

## 4. Generation UI — Stock Picker

**Placement:** Optional collapsible panel in `QuickCreate`, positioned after the Mood selector. Default: collapsed. Label when collapsed: *"Add certification mark"* with a `+` affordance.

**Picker anatomy when expanded:**
1. Search input — filters by label and tags client-side
2. Category tabs — All + the 5 categories
3. Icon grid — 5 columns, each tile shows the icon image + label beneath
4. Selected state — violet ring + checkmark overlay on selected tile
5. "Clear" text link appears next to the section title when a selection is active

**Selection rules:**
- Maximum one selection per generation
- Selecting a new tile deselects the previous
- Deselecting is done via the "Clear" link or clicking the active tile again

**State change to `GenerateState`:**
```ts
// Add to existing GenerateState type
stockAssetId: string | null;
```

**Props change to `QuickCreate`:**
```ts
// Add to existing props
stockAssets: StockAssetLite[];

// New type
type StockAssetLite = {
  id: string;
  label: string;
  category: string;
  tags: string[];
  url: string;  // signed S3 URL, 1-hour TTL
};
```

---

## 5. Data Flow — Generation API

**`generate/page.tsx`** (server component)
- Fetch all stock assets with signed URLs (same pattern as moods page)
- Pass as `stockAssets` prop to `QuickCreate`

**Generation API route** (`POST /api/generate` or equivalent)
- Accept `stockAssetId: string | null` in request body
- If present: the server resolves the S3 key from the DB using `stockAssetId` and generates a fresh signed URL server-side — the client never supplies a URL directly
- The resolved image is attached as a reference image in the model prompt payload alongside the brief, not replacing it

**Generation engine**
- Existing image reference mechanism is used (the `output_target` / model settings already support reference images based on the generation schema)
- Stock reference is treated the same as any other reference image input

---

## 6. Out of Scope

- Auto-injection of stock assets based on brief content — explicitly not wanted
- Multiple stock selections per generation (one max)
- User-uploaded stock (admin-only curation)
- Photography in the stock library
- Trademarked or official certification logos
- Semantic embedding search at this stage (tags are sufficient for 40 icons; embedding column retained for future use)
