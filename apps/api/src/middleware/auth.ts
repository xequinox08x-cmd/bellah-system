import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    auth_id: string;
    role: 'admin';
    email: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Basic JWT decoding (Supabase tokens are JWTs)
    // In production, you should use supabase.auth.getUser(token) for full verification
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const authId = payload.sub;

    const result = await pool.query(
      'SELECT id, auth_id, role, email FROM users WHERE auth_id = $1',
      [authId]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Forbidden: User profile not found' });
    }

    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

export function authorize(roles: 'admin'[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}
