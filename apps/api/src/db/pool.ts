import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in apps/api/.env');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,                  // keep pool small — Supabase free tier has limited slots
  idleTimeoutMillis: 10_000,  // release idle connections after 10s
  connectionTimeoutMillis: 5_000, // fail fast if can't connect in 5s
});

// CRITICAL: without this handler, a terminated connection emits an unhandled
// 'error' event that crashes the entire Node process.
pool.on('error', (err) => {
  console.warn('[pool] idle client error — connection will be replaced:', err.message);
});