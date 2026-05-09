-- Sub-project B (image providers): seeds the new model rows the BFL and
-- Google image providers can serve, plus their strength tags and supported
-- sizes. Routing (which model is the *default* for a tier/strength bucket) is
-- explicitly NOT touched here — admins promote new models via the routing
-- admin UI so it's a runtime decision, not a migration one.
--
-- Validated post-research (see specs/2026-05-09-image-providers-research...
-- §8 Validated matrix): nano-banana → gemini-2.5-flash-image,
-- nano-banana-pro → gemini-3-pro-image-preview (Gemini 3 Pro replaces the
-- "Nano Banana Pro" 2.5 codename which never went GA).

INSERT INTO "models" ("code", "display_name", "description", "vendor", "llm_model_id", "status", "allow_custom_size") VALUES
  ('text-master-pro',  'Text Master Pro', 'Premium OpenAI gpt-image-2 — higher-fidelity text rendering.',         'openai',  'gpt-image-2',                'active', false),
  ('nano-banana',      'Nano Banana',     'Fast Gemini image model — speed + decent text.',                       'google',  'gemini-2.5-flash-image',     'active', false),
  ('nano-banana-pro',  'Nano Banana Pro', 'Gemini 3 Pro image — photoreal + text combo at higher fidelity.',      'google',  'gemini-3-pro-image-preview', 'active', false),
  ('photoreal-ultra',  'Photoreal Ultra', 'BFL Flux 1.1 Pro Ultra — up to 4MP photoreal, custom resolution.',     'bfl',     'flux-pro-1.1-ultra',         'active', true),
  ('nova-canvas',      'Nova Canvas',     'AWS Bedrock Nova Canvas — photoreal alternative on AWS infra.',        'bedrock', 'amazon.nova-canvas-v1:0',    'active', false);

INSERT INTO "model_strengths" ("model_code", "strength_code") VALUES
  ('text-master-pro', 'text'),
  ('nano-banana',     'speed'),
  ('nano-banana-pro', 'photoreal'),
  ('photoreal-ultra', 'photoreal'),
  ('nova-canvas',     'photoreal');

-- Sizes are seeded per the validated matrix. Internal-code-driven mappings
-- inside each provider (see bfl.ts / google-image.ts) translate these
-- pixel pairs to vendor-shaped requests (e.g. Gemini's imageSize keyword).
INSERT INTO "model_supported_sizes" ("model_code", "width", "height", "label", "sort_order") VALUES
  ('text-master-pro', 1024, 1024, 'Square',    0),
  ('text-master-pro', 1024, 1536, 'Portrait',  1),
  ('text-master-pro', 1536, 1024, 'Landscape', 2),
  ('nano-banana',     1024, 1024, 'Square',    0),
  ('nano-banana',      768, 1344, 'Portrait',  1),
  ('nano-banana',     1344,  768, 'Landscape', 2),
  ('nano-banana-pro', 1024, 1024, 'Square',     0),
  ('nano-banana-pro', 1408, 1408, '2K Square',  1),
  ('nano-banana-pro', 1408,  768, 'Landscape',  2),
  ('photoreal-ultra', 2048, 2048, 'Square',    0),
  ('photoreal-ultra', 1440, 2048, 'Portrait',  1),
  ('photoreal-ultra', 2048, 1440, 'Landscape', 2),
  ('nova-canvas',     1024, 1024, 'Square',    0),
  ('nova-canvas',      768, 1280, 'Portrait',  1),
  ('nova-canvas',     1280,  768, 'Landscape', 2);
