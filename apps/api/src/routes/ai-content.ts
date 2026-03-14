import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

// POST /api/ai-content — save a new draft
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, prompt, output, platform, hashtags, createdBy } = req.body;

    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!output) return res.status(400).json({ error: 'Output is required' });

    const result = await pool.query(
      `INSERT INTO ai_content (title, prompt, output, platform, hashtags, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6)
       RETURNING
         id, title, prompt, output, platform, hashtags, status,
         created_at AS "createdAt"`,
      [title || null, prompt, output, platform || 'instagram', hashtags || '', createdBy || null]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/ai-content]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ai-content?status=draft&page=1&limit=20
router.get('/', async (req: Request, res: Response) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const params: unknown[] = [];
    let where = '';

    if (status) {
      params.push(status);
      where = `WHERE status = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ai_content ${where}`,
      params
    );

    params.push(limit, offset);

    const dataResult = await pool.query(
      `SELECT
         id, title, prompt, output, platform, hashtags, status,
         created_at AS "createdAt"
       FROM ai_content
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data:  dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error('[GET /api/ai-content]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/ai-content/:id/status — approve or reject (admin only)
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approvedBy } = req.body;

    const allowed = ['approved', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const result = await pool.query(
      `UPDATE ai_content
       SET
         status      = $1,
         approved_by = $2,
         approved_at = NOW()
       WHERE id = $3
       RETURNING id, title, status, approved_at AS "approvedAt"`,
      [status, approvedBy || null, id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Content not found' });

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[PATCH /api/ai-content/:id/status]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ai/generate — STUB
// STUB: replace with real AI API call (Claude, OpenAI, etc.) when ready
router.post('/generate', async (req: Request, res: Response) => {
  res.status(501).json({ error: 'AI generation not implemented yet' });
});

export default router;