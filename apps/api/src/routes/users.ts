import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

// ── Supabase Admin helpers ────────────────────────────────────────────────────
const SUPABASE_URL          = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function supabaseAdminFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      ...(options.headers ?? {}),
    },
  });
  return res;
}

// ── GET /api/users — list all users ──────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, auth_id, name, email, role, created_at FROM users ORDER BY created_at ASC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/users/me — current user from JWT ─────────────────────────────────
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token   = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const authId  = payload.sub;

    const result = await pool.query(
      `SELECT id, name, email, role FROM users WHERE auth_id = $1`,
      [authId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('GET /api/users/me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/users — create Supabase auth user + users row ──────────────────
router.post('/', async (req: Request, res: Response) => {
  const { name, email, password, role = 'staff' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (!['admin', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or staff' });
  }

  try {
    // 1. Create Supabase Auth user via Admin API
    const authRes = await supabaseAdminFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,   // auto-confirm so they can log in immediately
      }),
    });

    const authData = await authRes.json();

    if (!authRes.ok) {
      const msg = authData?.msg || authData?.message || authData?.error_description || 'Failed to create auth user';
      return res.status(400).json({ error: msg });
    }

    const authId = authData.id;

    // 2. Insert into users table
    const dbRes = await pool.query(
      `INSERT INTO users (auth_id, name, email, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (auth_id) DO UPDATE SET name = $2, email = $3, role = $4
       RETURNING id, auth_id, name, email, role, created_at`,
      [authId, name, email, role]
    );

    res.status(201).json({ data: dbRes.rows[0] });
  } catch (err) {
    console.error('POST /api/users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/users/:id — update name / role ────────────────────────────────
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role } = req.body;

  try {
    const fields: string[] = [];
    const vals: unknown[]  = [];
    let idx = 1;

    if (name) { fields.push(`name = $${idx++}`); vals.push(name); }
    if (role) { fields.push(`role = $${idx++}`); vals.push(role); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, auth_id, name, email, role, created_at`,
      vals
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('PATCH /api/users/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/users/:id — delete Supabase auth user + users row ─────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Get the auth_id first
    const userRes = await pool.query(`SELECT auth_id FROM users WHERE id = $1`, [id]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    const authId = userRes.rows[0].auth_id;

    // Delete from Supabase Auth (if auth_id exists)
    if (authId) {
      const delRes = await supabaseAdminFetch(`/admin/users/${authId}`, { method: 'DELETE' });
      if (!delRes.ok && delRes.status !== 404) {
        const msg = await delRes.text();
        console.warn('Supabase auth delete warning:', msg);
        // Continue anyway — remove from DB
      }
    }

    // Delete from users table
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;