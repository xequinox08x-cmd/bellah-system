import { ensureAiAnalyticsSchema } from "../db/aiAnalyticsSchema";
import { pool } from "../db/pool";
import { publishSystemContent } from "./facebook";
import { supabaseRest } from "./supabaseAdmin";
import { jobQueue, JOB_TYPES } from "../lib/jobQueue";

const FACEBOOK_PLATFORM = "facebook";
const DEFAULT_PUBLISH_INTERVAL_MS = 30_000; // Increased from 5s to 30s - reduce load
const STARTUP_DELAY_MS = 2_000;
const DEFAULT_BATCH_SIZE = 5; // Reduced from 10 - process fewer at once

function contentPath(params: Record<string, string | number>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
    return `/ai_contents?${search.toString()}`;
}

function shouldFallbackToSupabaseRest(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    return /password authentication failed|connect|connection|timeout|timed out|database|ECONN|ENOTFOUND|ETIMEDOUT/i.test(message);
}

let schedulerStarted = false;
let schedulerTimer: NodeJS.Timeout | null = null;
let schedulerRun: Promise<void> | null = null;

function isSchedulerEnabled() {
    return (process.env.ENABLE_SCHEDULED_PUBLISHER?.trim() || "true").toLowerCase() !== "false";
}

function getPublishIntervalMs() {
    const value = Number(process.env.SCHEDULED_PUBLISHER_INTERVAL_MS ?? DEFAULT_PUBLISH_INTERVAL_MS);
    return Number.isFinite(value) && value >= 5_000 ? value : DEFAULT_PUBLISH_INTERVAL_MS;
}

function getBatchSize() {
    const value = Number(process.env.SCHEDULED_PUBLISHER_BATCH_SIZE ?? DEFAULT_BATCH_SIZE);
    return Number.isInteger(value) && value > 0 ? value : DEFAULT_BATCH_SIZE;
}

async function getDueScheduledContentIds(limit: number) {
    try {
        const rows = await supabaseRest<Array<{ id: number; scheduled_at: string | null }>>(
            contentPath({
                select: "id,scheduled_at",
                status: "eq.scheduled",
                or: `(platform.is.null,platform.eq.${FACEBOOK_PLATFORM})`,
                order: "scheduled_at.asc",
                limit,
            })
        );
        const now = Date.now();
        return rows
            .filter((row) => row.scheduled_at && new Date(row.scheduled_at).getTime() <= now)
            .map((row) => Number(row.id));
    } catch (error) {
        if (shouldFallbackToSupabaseRest(error)) {
            console.warn("[scheduler.publish] scheduled content store unavailable", {
                message: error instanceof Error ? error.message : "Scheduled content store unavailable",
            });
            return [];
        }

        console.warn("[scheduler.publish] REST unavailable, loading due content via pool fallback", {
            message: error instanceof Error ? error.message : "REST unavailable",
        });

        await ensureAiAnalyticsSchema();

        const result = await pool.query<{ id: number }>(
            `
        SELECT id
        FROM ai_contents
        WHERE COALESCE(platform, $1) = $1
          AND status = 'scheduled'
          AND scheduled_at IS NOT NULL
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC, id ASC
        LIMIT $2
        `,
            [FACEBOOK_PLATFORM, limit]
        );

        return result.rows.map((row) => Number(row.id));
    }
}

async function markScheduledContentFailed(contentId: number, errorMessage: string) {
    try {
        await supabaseRest<null>(
            contentPath({ id: `eq.${contentId}` }),
            {
                method: "PATCH",
                body: JSON.stringify({
                    status: "failed",
                    last_publish_error: errorMessage,
                }),
            }
        );
    } catch (error) {
        if (shouldFallbackToSupabaseRest(error)) {
            console.warn("[scheduler.publish] failed to mark content failed because content store is unavailable", {
                contentId,
                message: error instanceof Error ? error.message : "Content store unavailable",
            });
            return;
        }

        await ensureAiAnalyticsSchema();

        await pool.query(
            `
            UPDATE ai_contents
            SET
              status = 'failed',
              last_publish_error = $2
            WHERE id = $1
            `,
            [contentId, errorMessage]
        );
    }
}

export async function processDueScheduledContent() {
    if (schedulerRun) {
        return schedulerRun;
    }

    schedulerRun = (async () => {
        let dueIds: number[];
        try {
            dueIds = await getDueScheduledContentIds(getBatchSize());
        } catch (error) {
            console.error("[scheduler.publish] failed to load due scheduled content", {
                message: error instanceof Error ? error.message : "Failed to load due scheduled content",
            });
            return;
        }

        if (!dueIds.length) {
            return;
        }

        console.info("[scheduler.publish] processing due scheduled content", {
            count: dueIds.length,
            ids: dueIds,
        });

        // Queue jobs instead of processing synchronously
        const jobPromises = dueIds.map(id =>
            jobQueue.add(JOB_TYPES.PUBLISH_CONTENT, { contentId: id }, 1)
        );

        await Promise.all(jobPromises);

        console.info(`[scheduler.publish] queued ${dueIds.length} publishing jobs`);
    })().finally(() => {
        schedulerRun = null;
    });

    return schedulerRun;
}

export function stopScheduledPublisher() {
    if (schedulerTimer) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
    }

    schedulerStarted = false;
}

export function startScheduledPublisher() {
    if (schedulerStarted || !isSchedulerEnabled()) {
        return stopScheduledPublisher;
    }

    schedulerStarted = true;

    const intervalMs = getPublishIntervalMs();
    const runCycle = () => {
        void processDueScheduledContent();
    };

    schedulerTimer = setInterval(runCycle, intervalMs);
    schedulerTimer.unref?.();

    const startupRun = setTimeout(runCycle, STARTUP_DELAY_MS);
    startupRun.unref?.();

    console.info("[scheduler.publish] started", {
        intervalMs,
        batchSize: getBatchSize(),
    });

    return stopScheduledPublisher;
}
