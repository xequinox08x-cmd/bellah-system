import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

// GET /api/scheduled-posts — list all with content info
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        sp.id,
        sp.content_id,
        sp.campaign_id,
        sp.scheduled_at,
        sp.platform,
        sp.status,
        sp.facebook_post_id,
        sp.published_at,
        sp.error_message,
        sp.created_at,
        ac.title        AS content_title,
        ac.output       AS content_output,
        ac.hashtags     AS content_hashtags,
        c.name          AS campaign_name
      FROM scheduled_posts sp
      JOIN ai_content ac ON ac.id = sp.content_id
      LEFT JOIN campaigns c ON c.id = sp.campaign_id
      ORDER BY sp.scheduled_at DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /api/scheduled-posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/scheduled-posts/pending — n8n polls this
router.get('/pending', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        sp.id,
        sp.content_id,
        sp.scheduled_at,
        sp.platform,
        ac.title   AS content_title,
        ac.output  AS content_output,
        ac.hashtags AS content_hashtags
      FROM scheduled_posts sp
      JOIN ai_content ac ON ac.id = sp.content_id
      WHERE sp.status = 'pending'
        AND sp.scheduled_at <= NOW()
      ORDER BY sp.scheduled_at ASC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /api/scheduled-posts/pending error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/scheduled-posts — schedule a post
router.post('/', async (req: Request, res: Response) => {
  const { content_id, campaign_id, scheduled_at, platform } = req.body;

  if (!content_id || !scheduled_at) {
    return res.status(400).json({ error: 'content_id and scheduled_at are required' });
  }

  try {
    // Only allow approved content to be scheduled
    const contentCheck = await pool.query(
      `SELECT id FROM ai_content WHERE id = $1 AND status = 'approved'`,
      [content_id]
    );
    if (contentCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Content must be approved before scheduling' });
    }

    const result = await pool.query(
      `INSERT INTO scheduled_posts (content_id, campaign_id, scheduled_at, platform)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [content_id, campaign_id ?? null, scheduled_at, platform ?? 'facebook']
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('POST /api/scheduled-posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/scheduled-posts/:id/status — update status (used by n8n + manual)
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, facebook_post_id, error_message } = req.body;

  const allowed = ['pending', 'published', 'failed', 'cancelled'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE scheduled_posts
       SET status = $1,
           facebook_post_id = COALESCE($2, facebook_post_id),
           error_message    = COALESCE($3, error_message),
           published_at     = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END
       WHERE id = $4
       RETURNING *`,
      [status, facebook_post_id ?? null, error_message ?? null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('PATCH /api/scheduled-posts/:id/status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/scheduled-posts/:id — cancel a pending post
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM scheduled_posts WHERE id = $1 AND status = 'pending' RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post not found or already published' });
    }
    res.json({ message: 'Post cancelled' });
  } catch (err) {
    console.error('DELETE /api/scheduled-posts/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;