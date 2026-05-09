INSERT INTO templates (
  slug,
  name,
  description,
  jsx_source,
  slots,
  text_safe_zones,
  preferred_model,
  supported_aspect_ratios,
  status,
  requires_browser_render
)
VALUES (
  'quick-create-image-only',
  'Quick Create image only',
  'Fallback image-only renderer for Quick Create generations without campaign or product overlays.',
  $template$
function template({ background, output }) {
  return h("div", {
    style: {
      display: "flex",
      width: output.width,
      height: output.height,
      position: "relative",
      overflow: "hidden",
      backgroundColor: "#f7f7f7",
    },
  },
    h("img", {
      src: background.dataUrl,
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        width: output.width,
        height: output.height,
        objectFit: "cover",
        opacity: 0.35,
      },
    }),
    h("img", {
      src: background.dataUrl,
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        width: output.width,
        height: output.height,
        objectFit: "contain",
      },
    })
  );
}
$template$,
  '{}'::jsonb,
  '[]'::jsonb,
  'flux-1.1-pro',
  ARRAY['1:1', '4:5', '9:16', '16:9', '1.91:1', '2:3'],
  'published',
  false
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  jsx_source = EXCLUDED.jsx_source,
  slots = EXCLUDED.slots,
  text_safe_zones = EXCLUDED.text_safe_zones,
  preferred_model = EXCLUDED.preferred_model,
  supported_aspect_ratios = EXCLUDED.supported_aspect_ratios,
  status = EXCLUDED.status,
  requires_browser_render = EXCLUDED.requires_browser_render,
  updated_at = now();

INSERT INTO price_book_entries (model_code, size_bucket, premium_flag, has_inspiration_flag, credits, version)
SELECT model_code, size_bucket, premium_flag, has_inspiration_flag, credits, version
FROM (VALUES
  ('flux-1.1-pro', 'standard', false, false, 5, 1),
  ('flux-1.1-pro', 'standard', false, true, 7, 1),
  ('flux-1.1-pro', 'large', false, false, 8, 1),
  ('flux-1.1-pro', 'large', false, true, 10, 1),
  ('gpt-image-1', 'standard', true, false, 15, 1),
  ('gpt-image-1', 'standard', true, true, 17, 1),
  ('gpt-image-1', 'large', true, false, 22, 1),
  ('gpt-image-1', 'large', true, true, 24, 1)
) AS defaults(model_code, size_bucket, premium_flag, has_inspiration_flag, credits, version)
WHERE NOT EXISTS (
  SELECT 1
  FROM price_book_entries existing
  WHERE existing.model_code = defaults.model_code
    AND existing.size_bucket = defaults.size_bucket
    AND existing.premium_flag = defaults.premium_flag
    AND existing.has_inspiration_flag = defaults.has_inspiration_flag
    AND existing.version = defaults.version
    AND existing.effective_to IS NULL
);
