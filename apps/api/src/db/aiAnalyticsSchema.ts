import { pool } from "./pool";

let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

export function ensureAiAnalyticsSchema() {
  if (schemaReady) return Promise.resolve();
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_contents (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        content_type TEXT NOT NULL,
        tone TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_at TIMESTAMPTZ,
        scheduled_at TIMESTAMPTZ
      )
    `);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS title TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS prompt_text TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS output_mode TEXT NOT NULL DEFAULT 'text'`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS reference_image_url TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS generated_image_url TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS image_prompt TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS hashtags TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS facebook_post_id TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS facebook_page_id TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS facebook_permalink_url TEXT`);
    await pool.query(`ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS last_metrics_sync_at TIMESTAMPTZ`);
    await pool.query(`
      ALTER TABLE ai_contents
      ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'
    `);
    await pool.query(`
      ALTER TABLE ai_contents
      ALTER COLUMN approved_at TYPE TIMESTAMPTZ USING approved_at AT TIME ZONE 'UTC'
    `);
    await pool.query(`
      ALTER TABLE ai_contents
      ALTER COLUMN scheduled_at TYPE TIMESTAMPTZ USING scheduled_at AT TIME ZONE 'UTC'
    `);
    await pool.query(`
      ALTER TABLE ai_contents
      ALTER COLUMN published_at TYPE TIMESTAMPTZ USING published_at AT TIME ZONE 'UTC'
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_content_metrics (
        id SERIAL PRIMARY KEY,
        ai_content_id INTEGER NOT NULL REFERENCES ai_contents(id) ON DELETE CASCADE,
        facebook_post_id TEXT,
        likes_count INTEGER NOT NULL DEFAULT 0,
        comments_count INTEGER NOT NULL DEFAULT 0,
        shares_count INTEGER NOT NULL DEFAULT 0,
        reach_count INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0,
        comments INTEGER NOT NULL DEFAULT 0,
        shares INTEGER NOT NULL DEFAULT 0,
        reach INTEGER NOT NULL DEFAULT 0,
        engagement_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
        fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
        snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS facebook_post_id TEXT`);
    // Legacy installs may still have `*_count` columns alongside the newer
    // `likes/comments/shares/reach` columns, so keep both available for reads.
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS shares_count INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS reach_count INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS comments INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS shares INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS reach INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(10,2) NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMP NOT NULL DEFAULT NOW()`);
    await pool.query(`ALTER TABLE ai_content_metrics ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

    schemaReady = true;
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });

  return schemaPromise;
}
