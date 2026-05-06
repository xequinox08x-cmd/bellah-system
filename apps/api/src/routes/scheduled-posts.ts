import { Router, Request, Response } from 'express';
import { ensureAiAnalyticsSchema } from '../db/aiAnalyticsSchema';
import { pool } from '../db/pool';
import { publishSystemContent } from '../services/facebook';

const router = Router();
const FACEBOOK_PLATFORM = 'facebook';

// GET /api/scheduled-posts
router.get('/', async (_req: Request, res: Response) => {
  try {
    await ensureAiAnalyticsSchema();

    const result = await pool.query(`
      SELECT
        ac.id,
        ac.id AS content_id,
        NULL::integer AS campaign_id,
        ac.scheduled_at,
        COALESCE(ac.platform, 'facebook') AS platform,
        CASE
          WHEN ac.status = 'scheduled' THEN 'pending'
          WHEN ac.status IN ('published', 'failed', 'cancelled') THEN ac.status
          ELSE 'pending'
        END AS status,
        ac.facebook_post_id,
        ac.published_at,
        ac.last_publish_error AS error_message,
        ac.created_at,
        COALESCE(ac.title, 'Untitled Content') AS content_title,
        ac.content AS content_output,
        COALESCE(ac.hashtags, '') AS content_hashtags,
        NULL::text AS campaign_name
      FROM ai_contents ac
      WHERE ac.scheduled_at IS NOT NULL
         OR ac.status IN ('scheduled', 'published', 'failed', 'cancelled')
      ORDER BY COALESCE(ac.scheduled_at, ac.published_at, ac.created_at) DESC, ac.id DESC
    `);

    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /api/scheduled-posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/scheduled-posts/pending
router.get('/pending', async (_req: Request, res: Response) => {
  try {
    await ensureAiAnalyticsSchema();

    const result = await pool.query(`
      SELECT
        ac.id,
        ac.id AS content_id,
        ac.scheduled_at,
        COALESCE(ac.platform, 'facebook') AS platform,
        COALESCE(ac.title, 'Untitled Content') AS content_title,
        ac.content AS content_output,
        COALESCE(ac.hashtags, '') AS content_hashtags
      FROM ai_contents ac
      WHERE ac.status = 'scheduled'
        AND ac.scheduled_at IS NOT NULL
        AND ac.scheduled_at <= NOW()
      ORDER BY ac.scheduled_at ASC, ac.id ASC
    `);

    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /api/scheduled-posts/pending error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/scheduled-posts
router.post('/', async (req: Request, res: Response) => {
  const { content_id, scheduled_at, platform } = req.body;

  if (!content_id || !scheduled_at) {
    return res.status(400).json({ error: 'content_id and scheduled_at are required' });
  }

  const contentId = Number(content_id);
  const scheduledAt = new Date(scheduled_at);

  if (!Number.isInteger(contentId) || contentId <= 0) {
    return res.status(400).json({ error: 'Invalid content_id' });
  }

  if (Number.isNaN(scheduledAt.getTime())) {
    return res.status(400).json({ error: 'Invalid scheduled_at' });
  }

  try {
    await ensureAiAnalyticsSchema();

    const contentCheck = await pool.query(
      `SELECT id FROM ai_contents WHERE id = $1 AND status = 'approved'`,
      [contentId]
    );
    if (contentCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Content must be approved before scheduling' });
    }

    const result = await pool.query(
      `
      UPDATE ai_contents
      SET
        status = 'scheduled',
        scheduled_at = $2,
        platform = COALESCE($3, platform, 'facebook'),
        published_at = NULL,
        facebook_post_id = NULL,
        facebook_page_id = NULL,
        facebook_permalink_url = NULL,
        last_publish_error = NULL
      WHERE id = $1
      RETURNING
        id,
        id AS content_id,
        NULL::integer AS campaign_id,
        scheduled_at,
        COALESCE(platform, 'facebook') AS platform,
        'pending'::text AS status,
        facebook_post_id,
        published_at,
        NULL::text AS error_message,
        created_at
      `,
      [contentId, scheduledAt.toISOString(), platform ?? FACEBOOK_PLATFORM]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('POST /api/scheduled-posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/scheduled-posts/:id/status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  const allowed = ['pending', 'published', 'failed', 'cancelled'];
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  try {
    await ensureAiAnalyticsSchema();

    if (status === 'published') {
      const published = await publishSystemContent(id);
      return res.json({
        data: {
          id,
          content_id: id,
          status: 'published',
          facebook_post_id: published.facebookPostId,
          published_at: published.publishedAt,
        },
      });
    }

    const mappedStatus = status === 'pending' ? 'scheduled' : status;
    const result = await pool.query(
      `
      UPDATE ai_contents
      SET
        status = $1,
        last_publish_error = CASE WHEN $1 = 'scheduled' THEN NULL ELSE last_publish_error END,
        published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END
      WHERE id = $2
      RETURNING id, id AS content_id, status, facebook_post_id, published_at
      `,
      [mappedStatus, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('PATCH /api/scheduled-posts/:id/status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/scheduled-posts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    await ensureAiAnalyticsSchema();

    const result = await pool.query(
      `
      UPDATE ai_contents
      SET
        status = 'cancelled'
      WHERE id = $1
        AND status = 'scheduled'
      RETURNING id
      `,
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
