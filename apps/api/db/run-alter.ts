import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const sqlPath = path.join(process.cwd(), 'db', 'alter-products.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('✅ Products table updated');
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});