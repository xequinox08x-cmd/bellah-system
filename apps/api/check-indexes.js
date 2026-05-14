const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('=== CURRENT DATABASE INDEXES ===');
    const result = await pool.query(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    result.rows.forEach(row => {
      console.log(`${row.tablename}.${row.indexname}: ${row.indexdef}`);
    });

    console.log('\n=== MISSING INDEXES ANALYSIS ===');

    // Check for common missing indexes based on query patterns
    const missingIndexes = await pool.query(`
      SELECT
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats
      WHERE schemaname = 'public'
      AND attname NOT IN (
        SELECT split_part(split_part(indexdef, '(', 2), ')', 1)
        FROM pg_indexes
        WHERE schemaname = 'public'
      )
      ORDER BY n_distinct DESC
      LIMIT 20;
    `);

    console.log('Columns that might benefit from indexes:');
    missingIndexes.rows.forEach(row => {
      console.log(`${row.tablename}.${row.attname} (distinct: ${row.n_distinct}, correlation: ${row.correlation})`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
})();