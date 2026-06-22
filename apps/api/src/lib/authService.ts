import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/sqlite';

export type UserRole = 'admin';
export type UserStatus = 'active' | 'inactive';

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  username: string;
  bio: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

const JWT_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

function rowToUser(row: Record<string, unknown>): UserRecord {
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    role: row.role as UserRole,
    username: String(row.username ?? ''),
    bio: String(row.bio ?? ''),
    status: row.status as UserStatus,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(user: UserRecord): string {
  const payload: JwtPayload = {
    sub: String(user.id),
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export function getUserById(id: number): UserRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return row ? rowToUser(row as Record<string, unknown>) : null;
}

export function getUserByEmail(email: string): (UserRecord & { password_hash: string }) | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!row) return null;
  const user = rowToUser(row as Record<string, unknown>);
  return { ...user, password_hash: String((row as Record<string, unknown>).password_hash) };
}

export function login(email: string, password: string): { user: UserRecord; token: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const row = getUserByEmail(normalizedEmail);

  if (!row || row.role !== 'admin' || row.status !== 'active' || !verifyPassword(password, row.password_hash)) {
    console.warn('[auth] failed login attempt for email:', normalizedEmail);
    throw new Error('Invalid email or password');
  }

  const { password_hash: _, ...user } = row;
  const token = signToken(user);
  return { user, token };
}

export function listUsers(): UserRecord[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM users ORDER BY id ASC').all();
  return rows.map((row) => rowToUser(row as Record<string, unknown>));
}

export function createUser(input: {
  email: string;
  name: string;
  role: UserRole;
  password: string;
  username?: string;
  bio?: string;
  status?: UserStatus;
}): UserRecord {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const password_hash = hashPassword(input.password);
  const username = input.username?.trim() || email.split('@')[0];
  const bio = input.bio?.trim() || '';
  const status = input.status ?? 'active';

  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, username, bio, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(input.name.trim(), email, password_hash, input.role, username, bio, status);

  const user = getUserById(Number(result.lastInsertRowid));
  if (!user) throw new Error('Failed to create user');
  return user;
}

export function updateUser(id: number, updates: Partial<{
  email: string;
  name: string;
  role: UserRole;
  password: string;
  username: string;
  bio: string;
  status: UserStatus;
}>): UserRecord {
  const db = getDb();
  const existing = getUserById(id);
  if (!existing) throw new Error('User not found');

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name.trim());
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email.trim().toLowerCase());
  }
  if (updates.role !== undefined) {
    fields.push('role = ?');
    values.push(updates.role);
  }
  if (updates.username !== undefined) {
    fields.push('username = ?');
    values.push(updates.username.trim());
  }
  if (updates.bio !== undefined) {
    fields.push('bio = ?');
    values.push(updates.bio.trim());
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.password !== undefined) {
    fields.push('password_hash = ?');
    values.push(hashPassword(updates.password));
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const user = getUserById(id);
  if (!user) throw new Error('User not found');
  return user;
}

export function deleteUser(id: number): void {
  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) throw new Error('User not found');
}

export function changePassword(userId: number, currentPassword: string, newPassword: string): void {
  const db = getDb();
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined;
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    throw new Error('Current password is incorrect');
  }
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(hashPassword(newPassword), userId);
}
