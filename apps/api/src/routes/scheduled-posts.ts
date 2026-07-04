import { Router, type Request, type Response } from 'express';
import { pool } from '../db/pool';

const router = Router();
const FACEBOOK_PLATFORM = 'facebook';

type AiContentRow = {
  id: number;
  title: string | null;
  content: string | null;
  hashtags: string | null;
  platform: string | null;
  status: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
};

type ScheduledStatus = 'pending' | 'published' | 'failed' | 'cancelled';

const CONTENT_SELECT = `
  SELECT
    id,
    title,
    content,
    hashtags,
    platform,
    status,
    scheduled_at,
    published_at,
    created_at
  FROM ai_contents
`;

function toScheduledStatus(status: string | null): ScheduledStatus {
  if (status === 'published' || status === 'failed' || status === 'cancelled') return status;
  return 'pending';
}

function serializeScheduledPost(row: AiContentRow) {
  return {
    id: Number(row.id),
    content_id: Number(row.id),
    campaign_id: null,
    scheduled_at: row.scheduled_at,
    platform: row.platform || FACEBOOK_PLATFORM,
    status: toScheduledStatus(row.status),
    facebook_post_id: null,
    published_at: row.published_at,
    error_message: null,
    created_at: row.created_at,
    content_title: row.title || 'Untitled Content',
    content_output: row.content || '',
    content_hashtags: row.hashtags || '',
    campaign_name: null,
  };
}

function getSortDate(row: AiContentRow) {
  return row.scheduled_at || row.published_at || row.created_at || '';
}

async function getContentById(id: number) {
  const result = await pool.query<AiContentRow>(
    `${CONTENT_SELECT} WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

// GET /api/scheduled-posts
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<AiContentRow>(
      `${CONTENT_SELECT} ORDER BY created_at DESC LIMIT 500`
    );

    const scheduledStatuses = new Set(['scheduled', 'published', 'failed', 'cancelled']);
    const data = result.rows
      .filter((row) => Boolean(row.scheduled_at) || scheduledStatuses.has(String(row.status || '')))
      .sort((a, b) => getSortDate(b).localeCompare(getSortDate(a)) || Number(b.id) - Number(a.id))
      .map(serializeScheduledPost);

    res.json({ data });
  } catch (err) {
    console.error('GET /api/scheduled-posts error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

// GET /api/scheduled-posts/pending
router.get('/pending', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<AiContentRow>(
      `
      ${CONTENT_SELECT}
      WHERE status = 'scheduled'
      ORDER BY scheduled_at ASC
      LIMIT 100
      `
    );

    const now = Date.now();
    const data = result.rows
      .filter((row) => row.scheduled_at && new Date(row.scheduled_at).getTime() <= now)
      .map(serializeScheduledPost);

    res.json({ data });
  } catch (err) {
    console.error('GET /api/scheduled-posts/pending error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
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
    const content = await getContentById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.status !== 'approved') {
      return res.status(400).json({ error: 'Content must be approved before scheduling' });
    }

    const result = await pool.query<AiContentRow>(
      `
      UPDATE ai_contents
      SET status = 'scheduled',
          scheduled_at = $2,
          platform = $3,
          published_at = NULL
      WHERE id = $1
      RETURNING id, title, content, hashtags, platform, status, scheduled_at, published_at, created_at
      `,
      [contentId, scheduledAt.toISOString(), platform || content.platform || FACEBOOK_PLATFORM]
    );

    const updated = result.rows[0];
    if (!updated) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.status(201).json({ data: serializeScheduledPost(updated) });
  } catch (err) {
    console.error('POST /api/scheduled-posts error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
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
    const mappedStatus = status === 'pending' ? 'scheduled' : status;
    const result = await pool.query<AiContentRow>(
      `
      UPDATE ai_contents
      SET status = $2,
          published_at = CASE WHEN $3 = 'published' THEN NOW() ELSE published_at END
      WHERE id = $1
      RETURNING id, title, content, hashtags, platform, status, scheduled_at, published_at, created_at
      `,
      [id, mappedStatus, status]
    );

    const updated = result.rows[0];
    if (!updated) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ data: serializeScheduledPost(updated) });
  } catch (err) {
    console.error('PATCH /api/scheduled-posts/:id/status error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

// DELETE /api/scheduled-posts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const result = await pool.query<AiContentRow>(
      `
      UPDATE ai_contents
      SET status = 'cancelled'
      WHERE id = $1
        AND status = 'scheduled'
      RETURNING id, title, content, hashtags, platform, status, scheduled_at, published_at, created_at
      `,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Post not found or already published' });
    }

    res.json({ message: 'Post cancelled', data: serializeScheduledPost(result.rows[0]) });
  } catch (err) {
    console.error('DELETE /api/scheduled-posts/:id error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

export default router;
