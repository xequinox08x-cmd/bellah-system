import { Router, type Request, type Response } from "express";
import { ensureAiAnalyticsSchema } from "../db/aiAnalyticsSchema";
import { pool } from "../db/pool";
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_TTL } from "../lib/cache";

export const analyticsRouter = Router();
// Optimized analytics queries with better performance
const TRACKED_FACEBOOK_CONTENT_WHERE = `
  ac.platform = '${FACEBOOK_PLATFORM}'
  AND ac.facebook_post_id IS NOT NULL
  AND ac.status IN ('published', 'scheduled')
`;

// Simplified metrics normalization - avoid complex CTE when possible
const NORMALIZED_METRICS_CTE = `
  normalized_metrics AS (
    SELECT
      m.ai_content_id,
      m.likes_count,
      m.comments_count,
      m.shares_count,
      m.reach_count,
      m.engagement_rate,
      m.snapshot_at
    FROM ai_content_metrics m
    WHERE m.snapshot_at = (
      SELECT MAX(m2.snapshot_at)
      FROM ai_content_metrics m2
      WHERE m2.ai_content_id = m.ai_content_id
    )
  )
`;

type SummaryRow = {
    post_count: string | number | null;
    total_likes: string | number | null;
    total_comments: string | number | null;
    total_shares: string | number | null;
    total_reach: string | number | null;
    average_engagement_rate: string | number | null;
    last_synced_at: string | null;
};

type TrendRow = {
    date: string;
    label: string;
    likes: string | number | null;
    comments: string | number | null;
    shares: string | number | null;
    reach: string | number | null;
    engagement_rate: string | number | null;
};

type PostRow = {
    id: number;
    title: string | null;
    content: string | null;
    platform: string | null;
    facebook_post_id: string | null;
    published_at: string | null;
    created_at: string;
    last_metrics_sync_at: string | null;
    likes: string | number | null;
    comments: string | number | null;
    shares: string | number | null;
    reach: string | number | null;
    engagement_rate: string | number | null;
};

function toNumber(value: string | number | null | undefined) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

analyticsRouter.get("/summary", async (_req: Request, res: Response) => {
    try {
        // Check cache first
        const cached = getCachedData(CACHE_KEYS.ANALYTICS_SUMMARY);
        if (cached) {
            return res.json({
                ok: true,
                data: cached,
                message: null,
                cached: true,
            });
        }

        await ensureAiAnalyticsSchema();

        const result = await pool.query<SummaryRow>(
            `
      WITH
      ${NORMALIZED_METRICS_CTE},
      summary_stats AS (
        SELECT
          COUNT(ac.id) AS post_count,
          COALESCE(SUM(nm.likes_count), 0) AS total_likes,
          COALESCE(SUM(nm.comments_count), 0) AS total_comments,
          COALESCE(SUM(nm.shares_count), 0) AS total_shares,
          COALESCE(SUM(nm.reach_count), 0) AS total_reach,
          COALESCE(AVG(nm.engagement_rate), 0) AS average_engagement_rate,
          MAX(GREATEST(ac.last_metrics_sync_at, nm.snapshot_at)) AS last_synced_at
        FROM ai_contents ac
        LEFT JOIN normalized_metrics nm ON nm.ai_content_id = ac.id
        WHERE ${TRACKED_FACEBOOK_CONTENT_WHERE}
      )
      SELECT * FROM summary_stats
      `
        );
        );

        const data = {
            likes: toNumber(row?.total_likes),
            comments: toNumber(row?.total_comments),
            shares: toNumber(row?.total_shares),
            reach: toNumber(row?.total_reach),
            engagementRate: Number(toNumber(row?.average_engagement_rate).toFixed(2)),
            postCount: toNumber(row?.post_count),
            lastSyncedAt: row?.last_synced_at ?? null,
        };

        // Cache the result
        setCachedData(CACHE_KEYS.ANALYTICS_SUMMARY, data, CACHE_TTL.ANALYTICS);

        return res.json({
            ok: true,
            data,
            message: null,
        });
    } catch (error: any) {
        return res.status(500).json({
            ok: false,
            data: null,
            message: error?.message || "Failed to load analytics summary",
        });
    }
});

analyticsRouter.get("/trend", async (req: Request, res: Response) => {
    try {
        await ensureAiAnalyticsSchema();

        const days = Math.min(90, Math.max(7, Number(req.query.days) || 7));
        const result = await pool.query<TrendRow>(
            `
      WITH
      ${NORMALIZED_METRICS_CTE},
      date_series AS (
        SELECT generate_series(
          CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day'),
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS snapshot_date
      ),
      latest_daily_metrics AS (
        SELECT DISTINCT ON (nm.ai_content_id, DATE_TRUNC('day', nm.snapshot_at)::date)
          nm.ai_content_id,
          DATE_TRUNC('day', nm.snapshot_at)::date AS snapshot_date,
          nm.likes_count,
          nm.comments_count,
          nm.shares_count,
          nm.reach_count
        FROM normalized_metrics nm
        JOIN ai_contents ac ON ac.id = nm.ai_content_id
        WHERE ${TRACKED_FACEBOOK_CONTENT_WHERE}
          AND nm.snapshot_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
        ORDER BY
          nm.ai_content_id,
          DATE_TRUNC('day', nm.snapshot_at)::date,
          nm.snapshot_at DESC,
          nm.id DESC
      ),
      facebook_metrics AS (
        SELECT
          ldm.snapshot_date,
          COALESCE(SUM(ldm.likes_count), 0) AS likes,
          COALESCE(SUM(ldm.comments_count), 0) AS comments,
          COALESCE(SUM(ldm.shares_count), 0) AS shares,
          COALESCE(SUM(ldm.reach_count), 0) AS reach,
          CASE
            WHEN COALESCE(SUM(ldm.reach_count), 0) > 0 THEN
              (
                (
                  COALESCE(SUM(ldm.likes_count), 0)
                  + COALESCE(SUM(ldm.comments_count), 0)
                  + COALESCE(SUM(ldm.shares_count), 0)
                )::numeric
                / NULLIF(COALESCE(SUM(ldm.reach_count), 0), 0)
              ) * 100
            ELSE 0
          END AS engagement_rate
        FROM latest_daily_metrics ldm
        GROUP BY ldm.snapshot_date
      )
      SELECT
        ds.snapshot_date::text AS date,
        TO_CHAR(ds.snapshot_date, 'Mon DD') AS label,
        COALESCE(fm.likes, 0) AS likes,
        COALESCE(fm.comments, 0) AS comments,
        COALESCE(fm.shares, 0) AS shares,
        COALESCE(fm.reach, 0) AS reach,
        COALESCE(fm.engagement_rate, 0) AS engagement_rate
      FROM date_series ds
      LEFT JOIN facebook_metrics fm ON fm.snapshot_date = ds.snapshot_date
      ORDER BY ds.snapshot_date ASC
      `,
            [days]
        );

        return res.json({
            ok: true,
            data: result.rows.map((row) => ({
                date: row.date,
                label: row.label,
                likes: toNumber(row.likes),
                comments: toNumber(row.comments),
                shares: toNumber(row.shares),
                reach: toNumber(row.reach),
                engagementRate: Number(toNumber(row.engagement_rate).toFixed(2)),
            })),
            message: null,
        });
    } catch (error: any) {
        return res.status(500).json({
            ok: false,
            data: null,
            message: error?.message || "Failed to load analytics trend",
        });
    }
});

analyticsRouter.get("/posts", async (_req: Request, res: Response) => {
    try {
        await ensureAiAnalyticsSchema();

        const result = await pool.query<PostRow>(
            `
      WITH
      ${NORMALIZED_METRICS_CTE},
      latest_metrics AS (
        SELECT DISTINCT ON (nm.ai_content_id)
          nm.ai_content_id,
          nm.likes_count,
          nm.comments_count,
          nm.shares_count,
          nm.reach_count,
          nm.engagement_rate,
          nm.snapshot_at
        FROM normalized_metrics nm
        ORDER BY nm.ai_content_id, nm.snapshot_at DESC, nm.id DESC
      )
      SELECT
        ac.id,
        ac.title,
        ac.content,
        ac.platform,
        ac.facebook_post_id,
        COALESCE(ac.published_at, ac.last_metrics_sync_at, lm.snapshot_at) AS published_at,
        ac.created_at,
        ac.last_metrics_sync_at,
        COALESCE(lm.likes_count, 0) AS likes,
        COALESCE(lm.comments_count, 0) AS comments,
        COALESCE(lm.shares_count, 0) AS shares,
        COALESCE(lm.reach_count, 0) AS reach,
        COALESCE(lm.engagement_rate, 0) AS engagement_rate
      FROM ai_contents ac
      LEFT JOIN latest_metrics lm ON lm.ai_content_id = ac.id
      WHERE ${TRACKED_FACEBOOK_CONTENT_WHERE}
      ORDER BY COALESCE(ac.published_at, ac.last_metrics_sync_at, lm.snapshot_at, ac.created_at) DESC, ac.id DESC
      `
        );

        return res.json({
            ok: true,
            data: result.rows.map((row) => ({
                id: Number(row.id),
                title: row.title ?? "Untitled Content",
                content: row.content ?? "",
                platform: row.platform ?? "facebook",
                facebookPostId: row.facebook_post_id,
                publishedAt: row.published_at,
                createdAt: row.created_at,
                lastMetricsSyncAt: row.last_metrics_sync_at,
                likes: toNumber(row.likes),
                comments: toNumber(row.comments),
                shares: toNumber(row.shares),
                reach: toNumber(row.reach),
                engagementRate: Number(toNumber(row.engagement_rate).toFixed(2)),
            })),
            message: null,
        });
    } catch (error: any) {
        return res.status(500).json({
            ok: false,
            data: null,
            message: error?.message || "Failed to load analytics posts",
        });
    }
});
