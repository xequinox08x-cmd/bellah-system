-- =====================================================
-- DATABASE PERFORMANCE OPTIMIZATION - PHASE 1
-- Add critical missing indexes for immediate performance gains
-- =====================================================

-- AI Contents Table - Most Critical Indexes
CREATE INDEX IF NOT EXISTS idx_ai_contents_status ON ai_contents(status);
CREATE INDEX IF NOT EXISTS idx_ai_contents_scheduled_at ON ai_contents(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_contents_platform ON ai_contents(platform);
CREATE INDEX IF NOT EXISTS idx_ai_contents_created_at ON ai_contents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_contents_status_platform ON ai_contents(status, platform);
CREATE INDEX IF NOT EXISTS idx_ai_contents_status_scheduled ON ai_contents(status, scheduled_at) WHERE scheduled_at IS NOT NULL;

-- AI Content Metrics Table - Analytics Performance
CREATE INDEX IF NOT EXISTS idx_ai_content_metrics_content_id ON ai_content_metrics(ai_content_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_metrics_snapshot_at ON ai_content_metrics(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_content_metrics_content_snapshot ON ai_content_metrics(ai_content_id, snapshot_at DESC);

-- Products Table - Inventory Performance
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(is_active, stock, low_stock_threshold) WHERE is_active = true;

-- Sales and Sale Items - Transaction Performance
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

-- Users Table - Auth Performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Scheduled Posts - Scheduler Performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_scheduled ON scheduled_posts(status, scheduled_at);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_ai_contents_facebook_metrics ON ai_contents(platform, facebook_post_id, last_metrics_sync_at)
WHERE platform = 'facebook' AND facebook_post_id IS NOT NULL;