"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
require("dotenv/config");
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in apps/api/.env');
}
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
async function main() {
    const sqlPath = path_1.default.join(process.cwd(), 'db', 'schema.sql');
    const sql = fs_1.default.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Schema applied successfully');
    await pool.end();
}
main().catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
});
