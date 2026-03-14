import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

// GET /api/campaigns — list all campaigns
router.get('/', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT
         id,
         name,
         description,
         status,
         start_date AS "startDate",
         end_date   AS "endDate",
         created_at AS "createdAt"
       FROM campaigns
       ORDER BY created_at DESC`
        );
        res.json({ data: result.rows });
    } catch (err) {
        console.error('[GET /api/campaigns]', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/campaigns/:id — single campaign with its attached content
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get the campaign
        const campaignResult = await pool.query(
            `SELECT
         id, name, description, status,
         start_date AS "startDate",
         end_date   AS "endDate",
         created_at AS "createdAt"
       FROM campaigns
       WHERE id = $1`,
            [id]
        );

        if (!campaignResult.rows[0]) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Get the content attached to this campaign
        const contentResult = await pool.query(
            `SELECT
         ac.id,
         ac.title,
         ac.output,
         ac.platform,
         ac.status,
         ac.created_at AS "createdAt"
       FROM campaign_content cc
       JOIN ai_content ac ON ac.id = cc.content_id
       WHERE cc.campaign_id = $1
       ORDER BY cc.created_at DESC`,
            [id]
        );

        res.json({
            data: {
                ...campaignResult.rows[0],
                content: contentResult.rows,
            },
        });
    } catch (err) {
        console.error('[GET /api/campaigns/:id]', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/campaigns — create a campaign
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description, startDate, endDate } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = await pool.query(
            `INSERT INTO campaigns (name, description, start_date, end_date)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id, name, description, status,
         start_date AS "startDate",
         end_date   AS "endDate",
         created_at AS "createdAt"`,
            [name, description || null, startDate || null, endDate || null]
        );

        res.status(201).json({ data: result.rows[0] });
    } catch (err) {
        console.error('[POST /api/campaigns]', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/campaigns/:id — update a campaign
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, status, startDate, endDate } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = await pool.query(
            `UPDATE campaigns
       SET
         name        = $1,
         description = $2,
         status      = COALESCE($3, status),
         start_date  = $4,
         end_date    = $5
       WHERE id = $6
       RETURNING
         id, name, description, status,
         start_date AS "startDate",
         end_date   AS "endDate",
         created_at AS "createdAt"`,
            [name, description || null, status || null, startDate || null, endDate || null, id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('[PUT /api/campaigns/:id]', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/campaigns/:id — delete a campaign
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM campaigns WHERE id = $1 RETURNING id',
            [id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[DELETE /api/campaigns/:id]', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/campaigns/:id/content — attach approved content to a campaign
router.post('/:id/content', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { contentId } = req.body;

        if (!contentId) {
            return res.status(400).json({ error: 'contentId is required' });
        }

        // Check content exists and is approved
        // Only approved content can be attached — this is enforced here on the backend
        const contentCheck = await pool.query(
            'SELECT id, status FROM ai_content WHERE id = $1',
            [contentId]
        );

        if (!contentCheck.rows[0]) {
            return res.status(404).json({ error: 'Content not found' });
        }

        if (contentCheck.rows[0].status !== 'approved') {
            return res.status(400).json({ error: 'Only approved content can be attached to a campaign' });
        }

        // ON CONFLICT DO NOTHING means if it is already attached, just skip silently
        await pool.query(
            `INSERT INTO campaign_content (campaign_id, content_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
            [id, contentId]
        );

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('[POST /api/campaigns/:id/content]', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/campaigns/:id/content/:contentId — detach content from campaign
router.delete('/:id/content/:contentId', async (req: Request, res: Response) => {
    try {
        const { id, contentId } = req.params;

        await pool.query(
            'DELETE FROM campaign_content WHERE campaign_id = $1 AND content_id = $2',
            [id, contentId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('[DELETE /api/campaigns/:id/content/:contentId]', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;