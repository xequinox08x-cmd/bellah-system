import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { seedUsersIfEmpty } from './seed';

let db: Database.Database | null = null;

function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), '.data', 'bellah.db');
}

function ensureJwtSecret(): void {
  if (!process.env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET is required. Set it in apps/api/.env');
  }
}

function runMigrations(database: Database.Database): void {
  const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  database.exec(sql);
}

export function getDb(): Database.Database {
  if (db) return db;

  ensureJwtSecret();

  const dbPath = resolveDatabasePath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  seedUsersIfEmpty(db);

  console.info(`[sqlite] database ready at ${dbPath}`);
  return db;
}

export function checkDbHealth(): boolean {
  try {
    const database = getDb();
    const row = database.prepare("SELECT datetime('now') as now").get() as { now: string };
    return Boolean(row?.now);
  } catch (err) {
    console.error('[sqlite] health check failed:', err);
    return false;
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    console.info('[sqlite] database closed');
  }
}
