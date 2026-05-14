const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('🚀 Applying performance indexes...');

    // Read and execute the migration file
    const migrationSQL = fs.readFileSync('./db/migrations/008_performance_indexes.sql', 'utf8');

    await pool.query(migrationSQL);

    console.log('✅ Performance indexes applied successfully!');

    // Verify indexes were created
    const result = await pool.query(`
      SELECT count(*) as index_count
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
    `);

    console.log(`📊 Created ${result.rows[0].index_count} performance indexes`);

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
})();