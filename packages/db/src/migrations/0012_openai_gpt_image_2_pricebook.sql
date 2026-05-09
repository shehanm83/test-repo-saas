INSERT INTO price_book_entries
  (model_code, size_bucket, premium_flag, has_inspiration_flag, credits, version)
SELECT model_code, size_bucket, premium_flag, has_inspiration_flag, credits, version
FROM (VALUES
  ('gpt-image-2', 'standard', false, false, 15, 1),
  ('gpt-image-2', 'standard', false, true, 17, 1),
  ('gpt-image-2', 'large', false, false, 22, 1),
  ('gpt-image-2', 'large', false, true, 24, 1),
  ('gpt-image-2', 'standard', true, false, 15, 1),
  ('gpt-image-2', 'standard', true, true, 17, 1),
  ('gpt-image-2', 'large', true, false, 22, 1),
  ('gpt-image-2', 'large', true, true, 24, 1)
) AS defaults(model_code, size_bucket, premium_flag, has_inspiration_flag, credits, version)
WHERE NOT EXISTS (
  SELECT 1
  FROM price_book_entries existing
  WHERE existing.model_code = defaults.model_code
    AND existing.size_bucket = defaults.size_bucket
    AND existing.premium_flag = defaults.premium_flag
    AND existing.has_inspiration_flag = defaults.has_inspiration_flag
    AND existing.version = defaults.version
);
