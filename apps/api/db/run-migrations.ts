import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import 'dotenv/config';

const migrationsDir = path.resolve(process.cwd(), 'db', 'migrations');

async function ensureMigrationsTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      run_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getMigrationFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await ensureMigrationsTable(client);

    const files = await getMigrationFiles();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    for (const filename of files) {
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1',
        [filename]
      );

      if (existing.rows.length > 0) {
        console.log(`Skipping already applied migration: ${filename}`);
        continue;
      }

      const filePath = path.join(migrationsDir, filename);
      const sql = await fs.readFile(filePath, 'utf8');

      console.log(`Running migration: ${filename}`);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`Migration complete: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Migration failed: ${filename}`);
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('Migration runner failed.');
  console.error(error);
  process.exit(1);
});
