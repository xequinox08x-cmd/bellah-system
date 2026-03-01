import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in apps/api/.env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const sqlPath = path.join(process.cwd(), 'db', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await pool.query(sql);
  console.log('✅ Schema applied successfully');
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});
