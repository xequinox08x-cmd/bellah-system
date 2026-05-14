import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in apps/api/.env');
}

// Optimized pool configuration for Supabase
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // Connection pool settings - optimized for Supabase
  max: 3,                    // Reduced from 5 - Supabase has connection limits
  min: 1,                    // Keep 1 connection alive
  idleTimeoutMillis: 30_000, // Reduced from 10s - release idle connections faster
  connectionTimeoutMillis: 10_000, // Increased from 5s - allow more time for connections
  allowExitOnIdle: true,     // Allow pool to exit when idle

  // Query timeout settings
  query_timeout: 30_000,     // 30s query timeout
  statement_timeout: 30_000, // 30s statement timeout

  // Connection validation
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
});

// Enhanced error handling
pool.on('connect', (client) => {
  // Set session-specific settings for better performance
  client.query('SET timezone="UTC"');
  client.query('SET work_mem = "64MB"'); // Increase working memory for complex queries
  client.query('SET maintenance_work_mem = "128MB"'); // Increase maintenance memory
});

pool.on('error', (err) => {
  const pgError = err as Error & { code?: string; severity?: string };
  console.warn('[pool] connection error — connection will be replaced:', {
    message: pgError.message,
    code: pgError.code,
    severity: pgError.severity,
  });
});

pool.on('remove', (client) => {
  console.info('[pool] connection removed from pool');
});

// Health check function
export async function checkPoolHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('[pool] health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  console.info('[pool] closing connection pool...');
  await pool.end();
  console.info('[pool] connection pool closed');
}
