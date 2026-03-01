import { Router } from 'express';
import { pool } from '../db/pool';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({ ok: true, db: true, time: result.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, db: false, error: String(e) });
  }
});