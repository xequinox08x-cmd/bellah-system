ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

UPDATE products
SET is_active = TRUE
WHERE is_active IS NULL;

ALTER TABLE products
  ALTER COLUMN is_active SET DEFAULT TRUE;

ALTER TABLE products
  ALTER COLUMN is_active SET NOT NULL;
