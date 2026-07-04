-- Speeds up dashboard, analytics, scheduled publishing, and active product reads.
-- Run this once against the live Postgres database.

CREATE INDEX IF NOT EXISTS idx_sales_created_at
  ON sales (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id
  ON sale_items (sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_product_id
  ON sale_items (product_id);

CREATE INDEX IF NOT EXISTS idx_products_active_id
  ON products (is_active, id DESC);

CREATE INDEX IF NOT EXISTS idx_products_low_stock_active
  ON products (stock, low_stock_threshold)
  WHERE is_active = TRUE AND low_stock_threshold IS NOT NULL AND low_stock_threshold > 0;

CREATE INDEX IF NOT EXISTS idx_ai_contents_status_created_at
  ON ai_contents (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_contents_scheduled_due
  ON ai_contents (scheduled_at ASC, id ASC)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_contents_facebook_sync
  ON ai_contents (last_metrics_sync_at DESC)
  WHERE last_metrics_sync_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_contents_facebook_posts
  ON ai_contents (published_at DESC, id DESC)
  WHERE facebook_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_content_metrics_content_snapshot
  ON ai_content_metrics (ai_content_id, snapshot_at DESC, id DESC);
