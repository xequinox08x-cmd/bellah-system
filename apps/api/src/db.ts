import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in environment variables");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL. With sslmode=require in the URL, this is usually enough,
  // but keeping ssl config helps avoid local TLS issues.
  ssl: { rejectUnauthorized: false },
});