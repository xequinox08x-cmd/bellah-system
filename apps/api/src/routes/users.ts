import { Router, type Request, type Response } from 'express';
import { supabaseAuthAdmin, supabaseRest } from '../services/supabaseAdmin';
import { pool } from '../db/pool';

const router = Router();

type UserRole = 'admin';

type DbUserRow = {
  id: number;
  auth_id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
};

type AuthAdminUserResponse = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
};

const USER_COLUMNS = 'id,auth_id,name,email,role,created_at';
// Longer than the 5 s supabaseAdmin fetch timeout so we see the real error first.
const USER_BACKEND_TIMEOUT_MS = 6_000;

function usersPath(params: Record<string, string | number>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  return `/users?${search.toString()}`;
}

function shouldFallbackToSupabaseRest(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /password authentication failed|connect|connection|timeout|timed out|database|ECONN|ENOTFOUND|ETIMEDOUT/i.test(message);
}

function withUserBackendTimeout<T>(operation: Promise<T>, label = 'User backend request timed out') {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(label)), USER_BACKEND_TIMEOUT_MS);
    }),
  ]);
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function decodeAuthId(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.slice('Bearer '.length);
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;

    const payload = JSON.parse(decodeBase64Url(payloadSegment));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Decode the full JWT payload — used as fallback when DB is unreachable. */
function decodeJwtPayload(req: Request): Record<string, unknown> | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice('Bearer '.length);
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    return JSON.parse(decodeBase64Url(payloadSegment));
  } catch {
    return null;
  }
}

function normalizeRole(value: unknown): UserRole | null {
  return value === 'admin' ? value : null;
}

function getAuthUserId(data: AuthAdminUserResponse) {
  return typeof data.id === 'string' && data.id
    ? data.id
    : typeof data.user?.id === 'string' && data.user.id
      ? data.user.id
      : null;
}

function getAuthUserMetadata(data: AuthAdminUserResponse) {
  return data.user_metadata ?? data.user?.user_metadata ?? {};
}

async function getSupabaseUserMetadata(authId: string) {
  try {
    const authData = await supabaseAuthAdmin<AuthAdminUserResponse>(`/admin/users/${authId}`);
    return getAuthUserMetadata(authData);
  } catch {
    return {};
  }
}

async function listDbUsers() {
  try {
    return await withUserBackendTimeout(
      supabaseRest<DbUserRow[]>(usersPath({ select: USER_COLUMNS, role: 'eq.admin', order: 'created_at.asc' }))
    );
  } catch (error) {
    if (shouldFallbackToSupabaseRest(error)) throw error;
    console.warn('[users] Supabase REST unavailable, listing users via pool fallback', error);
    const result = await withUserBackendTimeout(pool.query<DbUserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE role = 'admin' ORDER BY created_at ASC`
    ));
    return result.rows;
  }
}

async function getDbUserByAuthId(authId: string) {
  try {
    const rows = await withUserBackendTimeout(
      supabaseRest<DbUserRow[]>(
        usersPath({ select: USER_COLUMNS, auth_id: `eq.${authId}`, limit: 1 })
      )
    );
    return rows[0] ?? null;
  } catch (error) {
    if (shouldFallbackToSupabaseRest(error)) throw error;
    console.warn('[users] Supabase REST unavailable, loading user by auth_id via pool fallback', error);
    const result = await withUserBackendTimeout(pool.query<DbUserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE auth_id = $1 LIMIT 1`,
      [authId]
    ));
    return result.rows[0] ?? null;
  }
}

async function getDbUserById(id: number) {
  try {
    const rows = await withUserBackendTimeout(
      supabaseRest<DbUserRow[]>(
        usersPath({ select: USER_COLUMNS, id: `eq.${id}`, limit: 1 })
      )
    );
    return rows[0] ?? null;
  } catch (error) {
    if (shouldFallbackToSupabaseRest(error)) throw error;
    console.warn('[users] Supabase REST unavailable, loading user by id via pool fallback', error);
    const result = await withUserBackendTimeout(pool.query<DbUserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
      [id]
    ));
    return result.rows[0] ?? null;
  }
}

async function upsertDbUser(input: Pick<DbUserRow, 'auth_id' | 'name' | 'email' | 'role'>) {
  try {
    const rows = await withUserBackendTimeout(supabaseRest<DbUserRow[]>(
      usersPath({ select: USER_COLUMNS, on_conflict: 'auth_id' }),
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(input),
      }
    ));
    return rows[0] ?? null;
  } catch (error) {
    if (shouldFallbackToSupabaseRest(error)) throw error;
    console.warn('[users] Supabase REST unavailable, upserting user via pool fallback', error);
    const result = await withUserBackendTimeout(pool.query<DbUserRow>(
      `INSERT INTO users (auth_id, name, email, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (auth_id)
       DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role
       RETURNING ${USER_COLUMNS}`,
      [input.auth_id, input.name, input.email, input.role]
    ));
    return result.rows[0] ?? null;
  }
}

async function updateDbUser(id: number, input: Partial<Pick<DbUserRow, 'name' | 'email' | 'role'>>) {
  const updates: string[] = [];
  const values: unknown[] = [id];

  if (typeof input.name === 'string') {
    values.push(input.name);
    updates.push(`name = $${values.length}`);
  }
  if (typeof input.email === 'string') {
    values.push(input.email);
    updates.push(`email = $${values.length}`);
  }
  if (typeof input.role === 'string') {
    values.push(input.role);
    updates.push(`role = $${values.length}`);
  }

  if (updates.length === 0) return null;

  const body = Object.fromEntries(
    Object.entries(input).filter(([, value]) => typeof value === 'string')
  );

  try {
    const rows = await withUserBackendTimeout(supabaseRest<DbUserRow[]>(
      usersPath({ select: USER_COLUMNS, id: `eq.${id}` }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(body),
      }
    ));
    return rows[0] ?? null;
  } catch (error) {
    if (shouldFallbackToSupabaseRest(error)) throw error;
    console.warn('[users] Supabase REST unavailable, updating user via pool fallback', error);
    const result = await withUserBackendTimeout(pool.query<DbUserRow>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      values
    ));
    return result.rows[0] ?? null;
  }
}

async function deleteDbUser(id: number) {
  try {
    await withUserBackendTimeout(
      supabaseRest<null>(usersPath({ id: `eq.${id}` }), { method: 'DELETE' })
    );
  } catch (error) {
    if (shouldFallbackToSupabaseRest(error)) throw error;
    console.warn('[users] Supabase REST unavailable, deleting user via pool fallback', error);
    await withUserBackendTimeout(pool.query('DELETE FROM users WHERE id = $1', [id]));
  }
}

function serializeUser(row: DbUserRow, metadata: Record<string, unknown> = {}) {
  const username = typeof metadata.username === 'string' && metadata.username.trim()
    ? metadata.username.trim()
    : row.email.split('@')[0];

  return {
    id: row.id,
    auth_id: row.auth_id,
    authId: row.auth_id,
    name: row.name,
    email: row.email,
    role: row.role,
    username,
    bio: typeof metadata.bio === 'string' ? metadata.bio : '',
    created_at: row.created_at,
  };
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await listDbUsers();
    res.json({ data: rows.map((row) => serializeUser(row)) });
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const authId = decodeAuthId(req);
    if (!authId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let row: DbUserRow | null = null;
    try {
      row = await getDbUserByAuthId(authId);
    } catch (dbErr) {
      // DB / Supabase REST unreachable — synthesise from JWT so the app keeps working.
      console.warn('[users] /me DB lookup failed, falling back to JWT payload:', dbErr);
      const payload = decodeJwtPayload(req);
      if (!payload) return res.status(503).json({ error: 'User service temporarily unavailable' });

      const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
      const email = String(payload.email ?? meta.email ?? '');
      const appRole = payload.app_metadata ? (payload.app_metadata as any).role : undefined;
      const role = normalizeRole(meta.role ?? appRole);
      if (!role) return res.status(403).json({ error: 'Admin access required' });
      return res.json({
        data: {
          id: 0,
          auth_id: authId,
          authId,
          name: String(meta.full_name ?? meta.name ?? email.split('@')[0] ?? 'User'),
          email,
          role,
          username: String(meta.username ?? email.split('@')[0] ?? 'user'),
          bio: String(meta.bio ?? ''),
          created_at: new Date().toISOString(),
        },
      });
    }

    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (row.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    let metadata: Record<string, unknown> = {};
    try {
      metadata = await getSupabaseUserMetadata(authId);
    } catch {
      // Non-critical — metadata is just display info (username, bio).
    }

    res.json({ data: serializeUser(row, metadata) });
  } catch (err) {
    console.error('GET /api/users/me error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

router.patch('/me', async (req: Request, res: Response) => {
  const { name, email, username, bio } = req.body as {
    name?: string;
    email?: string;
    username?: string;
    bio?: string;
  };

  try {
    const authId = decodeAuthId(req);
    if (!authId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentUser = await getDbUserByAuthId(authId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const trimmedName = typeof name === 'string' ? name.trim() : undefined;
    const trimmedEmail = typeof email === 'string' ? email.trim() : undefined;
    const trimmedUsername = typeof username === 'string' ? username.trim() : undefined;
    const normalizedBio = typeof bio === 'string' ? bio : undefined;

    if (!trimmedName && !trimmedEmail && trimmedUsername === undefined && normalizedBio === undefined) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    if (trimmedEmail && !trimmedEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const currentMetadata = await getSupabaseUserMetadata(authId);
    const nextMetadata = {
      ...currentMetadata,
      ...(trimmedUsername !== undefined ? { username: trimmedUsername } : {}),
      ...(normalizedBio !== undefined ? { bio: normalizedBio } : {}),
      ...(trimmedName ? { full_name: trimmedName } : {}),
    };

    await supabaseAuthAdmin<AuthAdminUserResponse>(`/admin/users/${authId}`, {
      method: 'PUT',
      body: JSON.stringify({
        user_metadata: nextMetadata,
        ...(trimmedEmail && trimmedEmail !== currentUser.email ? { email: trimmedEmail } : {}),
      }),
    });

    const updates: Partial<Pick<DbUserRow, 'name' | 'email'>> = {};
    if (trimmedName) updates.name = trimmedName;
    if (trimmedEmail && trimmedEmail !== currentUser.email) updates.email = trimmedEmail;

    const updatedRow = Object.keys(updates).length
      ? await updateDbUser(currentUser.id, updates)
      : currentUser;

    if (!updatedRow) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: serializeUser(updatedRow, nextMetadata) });
  } catch (err) {
    console.error('PATCH /api/users/me error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const role = normalizeRole(req.body?.role ?? 'admin');

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  if (!role) {
    return res.status(400).json({ error: 'role must be admin' });
  }

  try {
    let authData: AuthAdminUserResponse;
    try {
      authData = await supabaseAuthAdmin<AuthAdminUserResponse>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            username: email.split('@')[0],
            bio: '',
            full_name: name,
            role,
          },
          app_metadata: { role },
        }),
      });
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create auth user' });
    }

    const authId = getAuthUserId(authData);
    if (!authId) {
      return res.status(502).json({ error: 'Supabase did not return a user id' });
    }

    const dbRow = await upsertDbUser({ auth_id: authId, name, email, role });
    if (!dbRow) {
      return res.status(500).json({ error: 'User account was created but profile was not saved' });
    }

    res.status(201).json({ data: serializeUser(dbRow, getAuthUserMetadata(authData)) });
  } catch (err) {
    console.error('POST /api/users error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : undefined;
  const role = req.body?.role === undefined ? undefined : normalizeRole(req.body.role);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  if (req.body?.role !== undefined && !role) {
    return res.status(400).json({ error: 'role must be admin' });
  }

  try {
    const currentUser = await getDbUserById(id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates: Partial<Pick<DbUserRow, 'name' | 'role'>> = {};
    if (name) updates.name = name;
    if (role) updates.role = role;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const updatedRow = await updateDbUser(id, updates);
    if (!updatedRow) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      const metadata = await getSupabaseUserMetadata(currentUser.auth_id);
      await supabaseAuthAdmin<AuthAdminUserResponse>(`/admin/users/${currentUser.auth_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          user_metadata: {
            ...metadata,
            ...(name ? { full_name: name } : {}),
            ...(role ? { role } : {}),
          },
          ...(role ? { app_metadata: { role } } : {}),
        }),
      });
    } catch (err) {
      console.warn('Supabase auth metadata update warning:', err);
    }

    res.json({ data: serializeUser(updatedRow) });
  } catch (err) {
    console.error('PATCH /api/users/:id error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const user = await getDbUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.auth_id) {
      try {
        await supabaseAuthAdmin<unknown>(`/admin/users/${user.auth_id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Supabase auth delete warning:', err);
      }
    }

    await deleteDbUser(id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

export default router;
