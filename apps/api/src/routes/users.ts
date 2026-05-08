import { Router, type Request, type Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function supabaseAdminFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      ...(options.headers ?? {}),
    },
  });

  return res;
}

function decodeAuthId(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

type DbUserRow = {
  id: number;
  auth_id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  created_at?: string;
};

type AuthAdminUserResponse = {
  id?: string;
  user_metadata?: Record<string, unknown>;
  user?: {
    id?: string;
    user_metadata?: Record<string, unknown>;
  };
};

async function getSupabaseUserMetadata(authId: string) {
  const authRes = await supabaseAdminFetch(`/admin/users/${authId}`);
  if (!authRes.ok) {
    return {};
  }

  const authData = await authRes.json() as AuthAdminUserResponse;
  return authData.user_metadata ?? authData.user?.user_metadata ?? {};
}

function serializeUser(row: DbUserRow, metadata: Record<string, unknown> = {}) {
  return {
    id: row.id,
    authId: row.auth_id,
    name: row.name,
    email: row.email,
    role: row.role,
    username: typeof metadata.username === 'string' && metadata.username.trim()
      ? metadata.username.trim()
      : row.email.split('@')[0],
    bio: typeof metadata.bio === 'string' ? metadata.bio : '',
    created_at: row.created_at,
  };
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<DbUserRow>(
      `SELECT id, auth_id, name, email, role, created_at FROM users ORDER BY created_at ASC`
    );

    res.json({
      data: result.rows.map((row) => ({
        id: row.id,
        auth_id: row.auth_id,
        name: row.name,
        email: row.email,
        role: row.role,
        created_at: row.created_at,
      })),
    });
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const authId = decodeAuthId(req);
    if (!authId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query<DbUserRow>(
      `SELECT id, auth_id, name, email, role FROM users WHERE auth_id = $1`,
      [authId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result.rows[0];
    const metadata = await getSupabaseUserMetadata(authId);
    res.json({ data: serializeUser(row, metadata) });
  } catch (err) {
    console.error('GET /api/users/me error:', err);
    res.status(500).json({ error: 'Server error' });
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

    const userResult = await pool.query<DbUserRow>(
      `SELECT id, auth_id, name, email, role FROM users WHERE auth_id = $1`,
      [authId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = userResult.rows[0];
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

    const authUpdatePayload: Record<string, unknown> = {
      user_metadata: nextMetadata,
    };

    if (trimmedEmail && trimmedEmail !== currentUser.email) {
      authUpdatePayload.email = trimmedEmail;
    }

    const authRes = await supabaseAdminFetch(`/admin/users/${authId}`, {
      method: 'PUT',
      body: JSON.stringify(authUpdatePayload),
    });

    if (!authRes.ok) {
      const authData = await authRes.json().catch(() => ({}));
      const message =
        authData?.msg
        || authData?.message
        || authData?.error_description
        || 'Failed to update auth profile';
      return res.status(400).json({ error: message });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (trimmedName) {
      fields.push(`name = $${index++}`);
      values.push(trimmedName);
    }

    if (trimmedEmail && trimmedEmail !== currentUser.email) {
      fields.push(`email = $${index++}`);
      values.push(trimmedEmail);
    }

    let updatedRow = currentUser;
    if (fields.length > 0) {
      values.push(currentUser.id);
      const result = await pool.query<DbUserRow>(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING id, auth_id, name, email, role`,
        values
      );
      updatedRow = result.rows[0];
    }

    res.json({ data: serializeUser(updatedRow, nextMetadata) });
  } catch (err) {
    console.error('PATCH /api/users/me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { name, email, password, role = 'staff' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  if (!['admin', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or staff' });
  }

  try {
    const authRes = await supabaseAdminFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username: email.split('@')[0],
          bio: '',
          full_name: name,
        },
      }),
    });

    const authData = await authRes.json();
    if (!authRes.ok) {
      const msg =
        authData?.msg
        || authData?.message
        || authData?.error_description
        || 'Failed to create auth user';
      return res.status(400).json({ error: msg });
    }

    const authId = authData.id;
    const dbRes = await pool.query<DbUserRow>(
      `INSERT INTO users (auth_id, name, email, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (auth_id) DO UPDATE SET name = $2, email = $3, role = $4
       RETURNING id, auth_id, name, email, role, created_at`,
      [authId, name, email, role]
    );

    res.status(201).json({ data: serializeUser(dbRes.rows[0], authData.user_metadata ?? {}) });
  } catch (err) {
    console.error('POST /api/users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role } = req.body;

  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (name) {
      fields.push(`name = $${index++}`);
      values.push(name);
    }

    if (role) {
      fields.push(`role = $${index++}`);
      values.push(role);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    values.push(id);
    const result = await pool.query<DbUserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING id, auth_id, name, email, role, created_at`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      data: {
        id: result.rows[0].id,
        auth_id: result.rows[0].auth_id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        role: result.rows[0].role,
        created_at: result.rows[0].created_at,
      },
    });
  } catch (err) {
    console.error('PATCH /api/users/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userRes = await pool.query<{ auth_id: string }>(`SELECT auth_id FROM users WHERE id = $1`, [id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const authId = userRes.rows[0].auth_id;
    if (authId) {
      const delRes = await supabaseAdminFetch(`/admin/users/${authId}`, { method: 'DELETE' });
      if (!delRes.ok && delRes.status !== 404) {
        const msg = await delRes.text();
        console.warn('Supabase auth delete warning:', msg);
      }
    }

    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
