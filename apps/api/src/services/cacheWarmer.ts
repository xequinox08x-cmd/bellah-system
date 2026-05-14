/**
 * DEFENSE MODE: Backend Cache Warmer Service
 * 
 * Populate cache with hot queries on server startup
 * Called from main app initialization
 */

import { pool } from '../db/pool';
import {
  setCachedWithType,
  CACHE_KEYS,
} from '../lib/defenseCache';

export async function runCacheWarmup() {
  console.info('[CacheWarmer] 🔥 Starting cache warmup on server startup...');

  const startTime = Date.now();
  let warmed = 0;
  let failed = 0;

  try {
    // 1. Dashboard Summary
    try {
      const dashResult = await pool.query(`
        SELECT
          COUNT(DISTINCT p.id) as total_products,
          COUNT(DISTINCT CASE WHEN p.stock < p.low_stock_threshold THEN p.id END) as low_stock_count,
          SUM(s.total) as total_sales,
          COUNT(DISTINCT s.id) as total_sales_count
        FROM products p
        LEFT JOIN sales s ON true
      `);

      setCachedWithType(
        CACHE_KEYS.DASHBOARD_SUMMARY,
        dashResult.rows[0],
        'DASHBOARD_SUMMARY'
      );
      console.info('[CacheWarmer] ✅ Dashboard summary cached');
      warmed++;
    } catch (error) {
      console.warn('[CacheWarmer] ⚠️ Dashboard summary failed:', error);
      failed++;
    }

    // 2. Products List
    try {
      const productsResult = await pool.query(`
        SELECT
          id, sku, name, price, cost, stock,
          low_stock_threshold,
          created_at, updated_at
        FROM products
        WHERE is_active = true OR is_active IS NULL
        ORDER BY id DESC
        LIMIT 100
      `);

      setCachedWithType(
        CACHE_KEYS.PRODUCTS_LIST,
        productsResult.rows,
        'PRODUCTS_LIST'
      );
      console.info('[CacheWarmer] ✅ Products list cached');
      warmed++;
    } catch (error) {
      console.warn('[CacheWarmer] ⚠️ Products list failed:', error);
      failed++;
    }

    // 3. Low Stock Products
    try {
      const lowStockResult = await pool.query(`
        SELECT
          id, sku, name, stock, low_stock_threshold,
          (low_stock_threshold - stock) as shortage
        FROM products
        WHERE stock < low_stock_threshold
        AND (is_active = true OR is_active IS NULL)
        ORDER BY shortage DESC
        LIMIT 50
      `);

      setCachedWithType(
        CACHE_KEYS.PRODUCTS_LOW_STOCK,
        lowStockResult.rows,
        'INVENTORY'
      );
      console.info('[CacheWarmer] ✅ Low stock products cached');
      warmed++;
    } catch (error) {
      console.warn('[CacheWarmer] ⚠️ Low stock products failed:', error);
      failed++;
    }

    // 4. Recent Sales
    try {
      const salesResult = await pool.query(`
        SELECT
          s.id, s.total, s.created_at,
          COUNT(si.id) as item_count
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT 50
      `);

      setCachedWithType(
        CACHE_KEYS.SALES_SUMMARY,
        {
          total_sales: salesResult.rows.length,
          recent: salesResult.rows,
        },
        'SALES'
      );
      console.info('[CacheWarmer] ✅ Sales summary cached');
      warmed++;
    } catch (error) {
      console.warn('[CacheWarmer] ⚠️ Sales summary failed:', error);
      failed++;
    }

    // 5. AI Content
    try {
      const aiResult = await pool.query(`
        SELECT
          id, title, status, platform, hashtags,
          created_at
        FROM ai_contents
        ORDER BY created_at DESC
        LIMIT 100
      `);

      setCachedWithType(
        CACHE_KEYS.AI_CONTENT_APPROVED,
        aiResult.rows.filter((r: any) => r.status === 'approved'),
        'AI_CONTENT'
      );

      setCachedWithType(
        CACHE_KEYS.AI_CONTENT_DRAFTS,
        aiResult.rows.filter((r: any) => r.status === 'draft'),
        'AI_CONTENT'
      );
      console.info('[CacheWarmer] ✅ AI content cached');
      warmed += 2;
    } catch (error) {
      console.warn('[CacheWarmer] ⚠️ AI content failed:', error);
      failed++;
    }

    // 6. Campaigns
    try {
      const campaignsResult = await pool.query(`
        SELECT
          id, name, status, start_date, end_date,
          created_at
        FROM campaigns
        ORDER BY created_at DESC
        LIMIT 50
      `);

      setCachedWithType(
        CACHE_KEYS.CAMPAIGNS_LIST,
        campaignsResult.rows,
        'CAMPAIGNS'
      );

      setCachedWithType(
        CACHE_KEYS.CAMPAIGNS_ACTIVE,
        campaignsResult.rows.filter((c: any) => c.status === 'active'),
        'CAMPAIGNS'
      );
      console.info('[CacheWarmer] ✅ Campaigns cached');
      warmed += 2;
    } catch (error) {
      console.warn('[CacheWarmer] ⚠️ Campaigns failed:', error);
      failed++;
    }

    const duration = Date.now() - startTime;

    console.info('[CacheWarmer] ✅ Cache warmup complete', {
      warmed,
      failed,
      duration: `${duration}ms`,
    });

    return { warmed, failed, duration };
  } catch (error) {
    console.error('[CacheWarmer] ❌ Warmup failed:', error);
    throw error;
  }
}

/**
 * Periodically refresh cache for hot data
 * Call this every 30 minutes
 */
export async function refreshHotCache() {
  try {
    // Refresh most frequently accessed data
    const productsResult = await pool.query(`
      SELECT COUNT(*) as count FROM products WHERE stock < low_stock_threshold
    `);

    setCachedWithType(
      'cache:low_stock_count',
      productsResult.rows[0],
      'INVENTORY'
    );
  } catch (error) {
    console.warn('[CacheWarmer] Failed to refresh hot cache:', error);
  }
}
