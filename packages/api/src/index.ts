// Audit fix #6: the root barrel intentionally re-exports only the *light*
// surfaces. Anything that statically imports a native binary (sharp,
// file-type) or a large NPM tree (node-vibrant, cheerio, svgo) is reachable
// only through its dedicated sub-export.
//
// Migration: `import { GenerationApi } from "@vyora/api"` is fine.
// `import { RecomposeService } from "@vyora/api"` is NOT — use
// `import { RecomposeService } from "@vyora/api/recompose"` instead.
//
// This stops `apps/web` from dragging Sharp + file-type into every page
// that touches a class on this barrel, which previously cost minutes of
// Turbopack first-compile time on /admin/* routes.
export { BillingApi } from "./billing";
export { CaptionApi } from "./caption";
export { GenerationApi } from "./generation";
export { GenerationEstimateApi } from "./generation-estimate";
export { GenerationPreflightApi } from "./generation-preflight";
export { MoodApi } from "./mood";
export { PricebookApi } from "./pricebook";
export { StockApi } from "./stock";
export { TemplateApi } from "./template";
export { WorkspaceApi } from "./workspace";
export { rateLimit } from "./rate-limit";
export { assertGenerationCapacity } from "./concurrency";
export { assertWorkspaceCanGenerate } from "./workspace-status";
export { scanBriefForAup, assertBriefAllowed } from "./aup";
export type { AupScanResult } from "./aup";

// NOT re-exported here on purpose (heavy native deps):
//   - BrandApi              → "@vyora/api/brand"     (lazy node-vibrant + cheerio)
//   - InspirationUploadApi  → "@vyora/api/inspiration" (file-type)
//   - LandingHeroApi        → "@vyora/api/landing-hero" (file-type)
//   - ProductApi            → "@vyora/api/product"   (file-type)
//   - RecomposeService      → "@vyora/api/recompose" (sharp)
