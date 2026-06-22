import { Router, type Request, type Response } from 'express';
import { supabaseRest } from '../services/supabaseAdmin';

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

const CONTENT_COLUMNS = [
  'id',
  'title',
  'content',
  'hashtags',
  'platform',
  'status',
  'scheduled_at',
  'published_at',
  'created_at',
].join(',');

function contentPath(params: Record<string, string | number>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  return `/ai_contents?${search.toString()}`;
}

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
  const rows = await supabaseRest<AiContentRow[]>(
    contentPath({ select: `${CONTENT_COLUMNS}`, id: `eq.${id}`, limit: 1 })
  );
  return rows[0] ?? null;
}

// GET /api/scheduled-posts
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await supabaseRest<AiContentRow[]>(
      contentPath({ select: CONTENT_COLUMNS, order: 'created_at.desc', limit: 500 })
    );

    const scheduledStatuses = new Set(['scheduled', 'published', 'failed']);
    const data = rows
      .filter((row) => {
        const status = String(row.status || '');
        if (status === 'published') return Boolean(row.scheduled_at || row.published_at);
        return Boolean(row.scheduled_at) || scheduledStatuses.has(status);
      })
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
    const rows = await supabaseRest<AiContentRow[]>(
      contentPath({ select: CONTENT_COLUMNS, status: 'eq.scheduled', order: 'scheduled_at.asc', limit: 100 })
    );

    const now = Date.now();
    const data = rows
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

    const rows = await supabaseRest<AiContentRow[]>(
      contentPath({ select: CONTENT_COLUMNS, id: `eq.${contentId}` }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'scheduled',
          scheduled_at: scheduledAt.toISOString(),
          platform: platform || content.platform || FACEBOOK_PLATFORM,
          published_at: null,
        }),
      }
    );

    const updated = rows[0];
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
    const rows = await supabaseRest<AiContentRow[]>(
      contentPath({ select: CONTENT_COLUMNS, id: `eq.${id}` }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: mappedStatus,
          ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
        }),
      }
    );

    const updated = rows[0];
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
    const existing = await getContentById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const status = String(existing.status || '');
    if (!['scheduled', 'published', 'failed', 'cancelled'].includes(status) && !existing.scheduled_at) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    const patchBody =
      status === 'published'
        ? { scheduled_at: null, published_at: null }
        : { status: 'cancelled', scheduled_at: null, published_at: null };

    const rows = await supabaseRest<AiContentRow[]>(
      contentPath({ select: CONTENT_COLUMNS, id: `eq.${id}` }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patchBody),
      }
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    res.json({ ok: true, message: 'Queue item removed', data: serializeScheduledPost(rows[0]) });
  } catch (err) {
    console.error('DELETE /api/scheduled-posts/:id error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

export default router;
