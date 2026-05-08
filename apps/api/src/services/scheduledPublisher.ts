import { ensureAiAnalyticsSchema } from "../db/aiAnalyticsSchema";
import { pool } from "../db/pool";
import { publishSystemContent } from "./facebook";

const FACEBOOK_PLATFORM = "facebook";
const DEFAULT_PUBLISH_INTERVAL_MS = 5_000;
const STARTUP_DELAY_MS = 1_000;
const DEFAULT_BATCH_SIZE = 10;

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

async function markScheduledContentFailed(contentId: number, errorMessage: string) {
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

export async function processDueScheduledContent() {
    if (schedulerRun) {
        return schedulerRun;
    }

    schedulerRun = (async () => {
        const dueIds = await getDueScheduledContentIds(getBatchSize());
        if (!dueIds.length) {
            return;
        }

        console.info("[scheduler.publish] processing due scheduled content", {
            count: dueIds.length,
            ids: dueIds,
        });

        for (const id of dueIds) {
            try {
                const result = await publishSystemContent(id);
                console.info("[scheduler.publish] content published", {
                    contentId: result.contentId,
                    facebookPostId: result.facebookPostId,
                    publishedAt: result.publishedAt,
                });
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Failed to publish scheduled content";

                try {
                    await markScheduledContentFailed(id, errorMessage);
                } catch (updateError) {
                    console.error("[scheduler.publish] failed to persist publish error", {
                        contentId: id,
                        message: updateError instanceof Error ? updateError.message : "Failed to persist publish error",
                    });
                }

                console.error("[scheduler.publish] failed to publish scheduled content", {
                    contentId: id,
                    message: errorMessage,
                });
            }
        }
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
