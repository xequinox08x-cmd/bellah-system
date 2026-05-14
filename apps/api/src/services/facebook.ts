import type { PoolClient } from "pg";
import { ensureAiAnalyticsSchema } from "../db/aiAnalyticsSchema";
import { pool } from "../db/pool";
import { supabaseRest } from "./supabaseAdmin";

const FACEBOOK_PLATFORM = "facebook";
const DEFAULT_GRAPH_API_VERSION = "v25.0";
const TRACKED_ANALYTICS_STATUS = "published";
const PUBLISHABLE_CONTENT_STATUSES = new Set(["approved", "scheduled", TRACKED_ANALYTICS_STATUS]);
const FACEBOOK_OPTIONAL_TIMEOUT_MS = 2_500;
const FACEBOOK_GRAPH_TIMEOUT_MS = Number(process.env.FACEBOOK_GRAPH_TIMEOUT_MS ?? 8000);
const FACEBOOK_POST_FIELDS =
    "id,message,created_time,permalink_url,full_picture,attachments{media_type,media,subattachments},reactions.summary(total_count),comments.summary(total_count),shares";
const FACEBOOK_PHOTO_FIELDS =
    "id,name,created_time,permalink_url,images,reactions.summary(total_count),comments.summary(total_count)";
const PUBLISH_CONTENT_COLUMNS = [
    "id",
    "title",
    "content",
    "hashtags",
    "generated_image_url",
    "platform",
    "status",
    "approved_at",
    "published_at",
    "facebook_post_id",
    "facebook_page_id",
    "facebook_permalink_url",
].join(",");
const PUBLISHED_SNAPSHOT_COLUMNS = [
    "id",
    "title",
    "status",
    "approved_at",
    "published_at",
    "facebook_post_id",
    "facebook_page_id",
    "facebook_permalink_url",
].join(",");

// Analytics scope is intentionally limited to records stored in `ai_contents`.
// The `ai_contents.id` row is the source of truth for tracking, and any record
// with a real `facebook_post_id` is eligible for metrics sync and analytics.

type GraphApiErrorPayload = {
    error?: {
        message?: string;
        code?: number;
        error_subcode?: number;
        type?: string;
    };
};

type FacebookPostResponse = {
    id: string;
    message?: string;
    created_time?: string;
    permalink_url?: string;
    full_picture?: string;
    attachments?: {
        data?: Array<{
            media_type?: string;
            media?: {
                image?: {
                    src?: string;
                };
                source?: string;
            };
            subattachments?: {
                data?: Array<{
                    media?: {
                        image?: {
                            src?: string;
                        };
                        source?: string;
                    };
                }>;
            };
        }>;
    };
    reactions?: { summary?: { total_count?: number } };
    likes?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    shares?: { count?: number };
};

type FacebookPhotoResponse = {
    id: string;
    name?: string;
    created_time?: string;
    permalink_url?: string;
    images?: Array<{ source?: string }>;
    reactions?: { summary?: { total_count?: number } };
    likes?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
};

type ContentRow = {
    id: number;
    platform: string | null;
    facebook_post_id: string | null;
};

type PublishContentRow = {
    id: number;
    title: string | null;
    content: string;
    hashtags: string | null;
    generated_image_url: string | null;
    platform: string | null;
    status: string;
    approved_at: string | null;
    published_at: string | null;
    facebook_post_id: string | null;
    facebook_page_id: string | null;
    facebook_permalink_url: string | null;
};

type TrackedContentRow = {
    id: number;
    facebook_post_id: string;
};

type InsertMetricsSnapshotInput = {
    aiContentId: number;
    facebookPostId: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    reachCount?: number;
};

type FacebookPublishResponse = {
    id?: string;
    post_id?: string;
};

type ParsedDataUrl = {
    mimeType: string;
    data: string;
};

type PublishedContentSnapshotRow = {
    id: number;
    title: string | null;
    status: string;
    approved_at: string | null;
    published_at: string | null;
    facebook_post_id: string | null;
    facebook_page_id: string | null;
    facebook_permalink_url: string | null;
};

export type NormalizedFacebookPost = {
    id: string;
    platform: "facebook";
    message: string;
    likes: number;
    comments: number;
    shares: number;
    createdAt: string | null;
    permalinkUrl: string | null;
    imageUrl: string | null;
};

export type FacebookPostMetrics = {
    postId: string;
    facebookPageId: string | null;
    facebookPermalinkUrl: string | null;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    reachCount: number;
};

type SyncMetricsOptions = {
    forceLive?: boolean;
};

type MetricsSnapshotUpsertResult = {
    id: number | null;
    snapshotAt: string | null;
    action: "inserted" | "updated";
    rowCount: number | null;
};

export type SyncContentMetricsResult = {
    contentId: number;
    facebookPostId: string;
    facebookPageId: string | null;
    facebookPermalinkUrl: string | null;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    reachCount: number;
};

export type PublishSystemContentResult = {
    contentId: number;
    title: string | null;
    status: "published";
    publishMode: "text" | "image";
    approvedAt: string | null;
    publishedAt: string | null;
    facebookPostId: string;
    facebookPageId: string | null;
    facebookPermalinkUrl: string | null;
    initialMetricsSynced: boolean;
};

export type SyncAllContentMetricsResult = {
    totalTracked: number;
    totalSynced: number;
    totalFailed: number;
    failedIds: number[];
    results: SyncContentMetricsResult[];
    errors: Array<{
        contentId: number;
        facebookPostId: string;
        message: string;
    }>;
};

export type FacebookConnectionState = "connected" | "expired" | "invalid" | "missing_config";

export type FacebookStatusResult = {
    valid: boolean;
    state: FacebookConnectionState;
    pageId: string | null;
    pageName: string | null;
    error: string | null;
    expiresAt: string | null;
    tokenUpdatedAt: string | null;
    tokenExpiresAt: string | null;
    lastKnownSync: {
        contentId: number | null;
        facebookPostId: string | null;
        syncedAt: string | null;
    };
};

class FacebookServiceError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 500) {
        super(message);
        this.name = "FacebookServiceError";
        this.statusCode = statusCode;
    }
}

export class FacebookConfigurationError extends FacebookServiceError {
    constructor(message: string) {
        super(message, 503);
        this.name = "FacebookConfigurationError";
    }
}

export class FacebookAuthError extends FacebookServiceError {
    state: Exclude<FacebookConnectionState, "connected" | "missing_config">;

    constructor(message: string, state: Exclude<FacebookConnectionState, "connected" | "missing_config">) {
        super(message, 401);
        this.name = "FacebookAuthError";
        this.state = state;
    }
}

class FacebookNotFoundError extends FacebookServiceError {
    constructor(message: string) {
        super(message, 404);
        this.name = "FacebookNotFoundError";
    }
}

function toNumber(value: unknown) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function toTimestamp(value: unknown) {
    return typeof value === "string" && value.trim() ? value : null;
}

function normalizeOptionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function deriveFacebookPageId(postId: string, fallbackPageId: string | null) {
    const [candidatePageId] = postId.split("_");
    if (candidatePageId && candidatePageId !== postId) {
        return candidatePageId;
    }

    return normalizeOptionalString(fallbackPageId);
}

function logFacebookPublish(message: string, details: Record<string, unknown>) {
    console.info(`[facebook.publish] ${message}`, details);
}

function redactGraphUrl(url: URL) {
    const redacted = new URL(url.toString());
    if (redacted.searchParams.has("access_token")) {
        redacted.searchParams.set("access_token", "[redacted]");
    }
    return redacted.toString();
}

function contentPath(params: Record<string, string | number>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
    return `/ai_contents?${search.toString()}`;
}

function shouldFallbackToSupabaseRest(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    return /password authentication failed|connect|connection|timeout|timed out|database|ECONN|ENOTFOUND|ETIMEDOUT/i.test(message);
}

function withOptionalTimeout<T>(operation: Promise<T>, label = "Optional Facebook store request timed out") {
    return Promise.race([
        operation,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(label)), FACEBOOK_OPTIONAL_TIMEOUT_MS);
        }),
    ]);
}

function getFacebookConfig() {
    return {
        pageId: process.env.FACEBOOK_PAGE_ID?.trim() ?? "",
        accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ?? "",
        graphApiVersion: process.env.FACEBOOK_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION,
        tokenUpdatedAt: process.env.FACEBOOK_TOKEN_UPDATED_AT?.trim() ?? "",
        tokenExpiresAt: process.env.FACEBOOK_TOKEN_EXPIRES_AT?.trim() ?? "",
    };
}

function requireFacebookConfig() {
    const config = getFacebookConfig();
    const missing = [
        !config.pageId ? "FACEBOOK_PAGE_ID" : null,
        !config.accessToken ? "FACEBOOK_PAGE_ACCESS_TOKEN" : null,
    ].filter(Boolean);

    if (missing.length) {
        throw new FacebookConfigurationError(
            `Facebook integration is not configured. Missing: ${missing.join(", ")}. Complete the manual Meta app and page setup, then add those values to the API environment.`
        );
    }

    return config;
}

function getFriendlyAuthError(payload: GraphApiErrorPayload["error"]) {
    const message = payload?.message?.trim() || "Facebook access token is invalid.";
    const normalized = message.toLowerCase();

    if (payload?.code === 190 || normalized.includes("access token")) {
        if (normalized.includes("expired")) {
            return new FacebookAuthError(
                "Facebook access token has expired. Refresh the page access token in the backend env.",
                "expired"
            );
        }

        return new FacebookAuthError(
            "Facebook access token is invalid. Reconnect Facebook or refresh the token in the backend env.",
            "invalid"
        );
    }

    return null;
}

async function parseGraphResponse<T>(response: Response) {
    const text = await response.text();
    let payload: (T & GraphApiErrorPayload) | null = null;

    if (text) {
        try {
            payload = JSON.parse(text) as T & GraphApiErrorPayload;
        } catch {
            throw new FacebookServiceError(
                `Facebook Graph API returned a non-JSON response: ${text.slice(0, 200)}`,
                response.status || 502
            );
        }
    }

    if (!response.ok || payload?.error) {
        const friendlyAuthError = getFriendlyAuthError(payload?.error);
        if (friendlyAuthError) {
            console.warn("[facebook.graph] token/auth error detected", {
                status: response.status,
                code: payload?.error?.code ?? null,
                type: payload?.error?.type ?? null,
                state: friendlyAuthError.state,
                message: friendlyAuthError.message,
            });
            throw friendlyAuthError;
        }

        const message = payload?.error?.message || response.statusText || "Facebook Graph API request failed";
        console.warn("[facebook.graph] API error response", {
            status: response.status,
            code: payload?.error?.code ?? null,
            type: payload?.error?.type ?? null,
            message,
        });
        throw new FacebookServiceError(message, response.status || 502);
    }

    return (payload ?? ({} as T)) as T;
}

async function graphGet<T>(path: string, params: Record<string, string | undefined> = {}) {
    const config = requireFacebookConfig();
    const normalizedPath = path.replace(/^\/+/, "");
    const url = new URL(`https://graph.facebook.com/${config.graphApiVersion}/${normalizedPath}`);
    const startedAt = Date.now();

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, value);
        }
    });

    url.searchParams.set("access_token", config.accessToken);
    console.info("[facebook.graph] GET request", {
        ...graphLogDetails(normalizedPath, params),
        requestUrl: redactGraphUrl(url),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FACEBOOK_GRAPH_TIMEOUT_MS);
    let response: Response;

    try {
        response = await fetch(url.toString(), {
            signal: controller.signal,
            cache: "no-store",
            headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
            },
        });
    } catch (error) {
        console.warn("[facebook.graph] GET failed before response", {
            ...graphLogDetails(normalizedPath, params),
            durationMs: Date.now() - startedAt,
            message: error instanceof Error ? error.message : "Facebook Graph API GET failed",
        });
        const message = error instanceof Error && error.name === "AbortError"
            ? `Facebook Graph API GET timed out after ${FACEBOOK_GRAPH_TIMEOUT_MS}ms`
            : error instanceof Error ? error.message : "Facebook Graph API GET failed";
        throw new FacebookServiceError(message, 504);
    } finally {
        clearTimeout(timeout);
    }

    console.info("[facebook.graph] GET response", {
        ...graphLogDetails(normalizedPath, params),
        status: response.status,
        ok: response.ok,
        durationMs: Date.now() - startedAt,
    });

    return parseGraphResponse<T>(response);
}

async function graphPost<T>(path: string, params: Record<string, string | undefined> = {}) {
    const config = requireFacebookConfig();
    const normalizedPath = path.replace(/^\/+/, "");
    const url = new URL(`https://graph.facebook.com/${config.graphApiVersion}/${normalizedPath}`);
    const body = new URLSearchParams();
    const startedAt = Date.now();

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            body.set(key, value);
        }
    });

    body.set("access_token", config.accessToken);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FACEBOOK_GRAPH_TIMEOUT_MS);
    let response: Response;

    try {
        response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
            signal: controller.signal,
        });
    } catch (error) {
        console.warn("[facebook.graph] POST failed before response", {
            endpoint: `/${normalizedPath}`,
            durationMs: Date.now() - startedAt,
            message: error instanceof Error ? error.message : "Facebook Graph API POST failed",
        });
        const message = error instanceof Error && error.name === "AbortError"
            ? `Facebook Graph API POST timed out after ${FACEBOOK_GRAPH_TIMEOUT_MS}ms`
            : error instanceof Error ? error.message : "Facebook Graph API POST failed";
        throw new FacebookServiceError(message, 504);
    } finally {
        clearTimeout(timeout);
    }

    console.info("[facebook.graph] POST response", {
        endpoint: `/${normalizedPath}`,
        status: response.status,
        ok: response.ok,
        durationMs: Date.now() - startedAt,
    });

    return parseGraphResponse<T>(response);
}

async function graphPostMultipart<T>(path: string, form: FormData) {
    const config = requireFacebookConfig();
    const normalizedPath = path.replace(/^\/+/, "");
    const url = new URL(`https://graph.facebook.com/${config.graphApiVersion}/${normalizedPath}`);
    const startedAt = Date.now();

    form.set("access_token", config.accessToken);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FACEBOOK_GRAPH_TIMEOUT_MS);
    let response: Response;

    try {
        response = await fetch(url.toString(), {
            method: "POST",
            body: form,
            signal: controller.signal,
        });
    } catch (error) {
        console.warn("[facebook.graph] multipart POST failed before response", {
            endpoint: `/${normalizedPath}`,
            durationMs: Date.now() - startedAt,
            message: error instanceof Error ? error.message : "Facebook Graph API multipart POST failed",
        });
        const message = error instanceof Error && error.name === "AbortError"
            ? `Facebook Graph API multipart POST timed out after ${FACEBOOK_GRAPH_TIMEOUT_MS}ms`
            : error instanceof Error ? error.message : "Facebook Graph API multipart POST failed";
        throw new FacebookServiceError(message, 504);
    } finally {
        clearTimeout(timeout);
    }

    console.info("[facebook.graph] multipart POST response", {
        endpoint: `/${normalizedPath}`,
        status: response.status,
        ok: response.ok,
        durationMs: Date.now() - startedAt,
    });

    return parseGraphResponse<T>(response);
}

function calculateEngagementRate(likesCount: number, commentsCount: number, sharesCount: number, reachCount: number) {
    if (reachCount <= 0) return 0;
    return Number((((likesCount + commentsCount + sharesCount) / reachCount) * 100).toFixed(2));
}

function graphLogDetails(path: string, params: Record<string, string | undefined>) {
    return {
        endpoint: `/${path.replace(/^\/+/, "")}`,
        fields: params.fields ?? null,
        metric: params.metric ?? null,
    };
}

function isRetryableSyncError(error: unknown) {
    const statusCode = (error as { statusCode?: unknown })?.statusCode;
    const message = error instanceof Error ? error.message : String(error || "");

    return (
        statusCode === 408 ||
        statusCode === 429 ||
        statusCode === 500 ||
        statusCode === 502 ||
        statusCode === 503 ||
        statusCode === 504 ||
        /timeout|timed out|network|ECONN|ENOTFOUND|ETIMEDOUT|fetch failed/i.test(message)
    );
}

function mergeFacebookCaptionAndHashtags(content: string, hashtags: string | null) {
    const baseContent = content.trim();
    const hashtagText = typeof hashtags === "string" ? hashtags.trim() : "";

    if (!hashtagText) {
        return baseContent;
    }

    const existingTokens = new Set(baseContent.split(/\s+/).map((token) => token.toLowerCase()));
    const missingTags = hashtagText
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => !existingTokens.has(token.toLowerCase()));

    if (!baseContent) {
        return missingTags.join(" ");
    }

    return missingTags.length ? `${baseContent}\n\n${missingTags.join(" ")}` : baseContent;
}

function buildFacebookFeedMessage(content: string, hashtags: string | null) {
    const message = mergeFacebookCaptionAndHashtags(content, hashtags).trim();

    if (!message) {
        throw new FacebookServiceError("Content is empty and cannot be published to Facebook.", 400);
    }

    return message;
}

function buildFacebookPhotoCaption(content: string, hashtags: string | null) {
    return mergeFacebookCaptionAndHashtags(content, hashtags).trim();
}

function parseDataUrl(value: string): ParsedDataUrl | null {
    const match = value.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;

    return {
        mimeType: match[1],
        data: match[2],
    };
}

function toFacebookImagePayload(imageUrl: string) {
    const trimmed = imageUrl.trim();
    if (!trimmed) {
        throw new FacebookServiceError("Generated image URL is empty.", 400);
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return {
            kind: "remote" as const,
            url: trimmed,
        };
    }

    const parsedDataUrl = parseDataUrl(trimmed);
    if (!parsedDataUrl) {
        throw new FacebookServiceError("Generated image format is not supported for Facebook publishing.", 400);
    }

    return {
        kind: "inline" as const,
        mimeType: parsedDataUrl.mimeType,
        data: parsedDataUrl.data,
    };
}

function normalizePhoto(post: FacebookPhotoResponse): NormalizedFacebookPost {
    return {
        id: post.id,
        platform: FACEBOOK_PLATFORM,
        message: post.name ?? "",
        likes: toNumber(post.reactions?.summary?.total_count ?? post.likes?.summary?.total_count),
        comments: toNumber(post.comments?.summary?.total_count),
        shares: 0,
        createdAt: toTimestamp(post.created_time),
        permalinkUrl: post.permalink_url ?? null,
        imageUrl: post.images?.[0]?.source ?? null,
    };
}

function extractAttachmentImageUrl(post: FacebookPostResponse) {
    const attachments = Array.isArray(post.attachments?.data) ? post.attachments?.data : [];

    for (const attachment of attachments) {
        const directImage =
            attachment.media?.image?.src ||
            attachment.media?.source;
        if (typeof directImage === "string" && directImage.trim()) {
            return directImage.trim();
        }

        const subattachments = Array.isArray(attachment.subattachments?.data)
            ? attachment.subattachments?.data
            : [];

        for (const subattachment of subattachments) {
            const nestedImage =
                subattachment.media?.image?.src ||
                subattachment.media?.source;
            if (typeof nestedImage === "string" && nestedImage.trim()) {
                return nestedImage.trim();
            }
        }
    }

    return null;
}

async function insertMetricsSnapshot(client: PoolClient, input: InsertMetricsSnapshotInput) {
    const likesCount = toNumber(input.likesCount);
    const commentsCount = toNumber(input.commentsCount);
    const sharesCount = toNumber(input.sharesCount);
    const reachCount = toNumber(input.reachCount);
    const engagementRate = calculateEngagementRate(likesCount, commentsCount, sharesCount, reachCount);

    const updateResult = await client.query<{ id: number; snapshot_at: string }>(
        `
    WITH latest_today AS (
      SELECT id
      FROM ai_content_metrics
      WHERE ai_content_id = $1
        AND snapshot_at >= CURRENT_DATE
        AND snapshot_at < CURRENT_DATE + INTERVAL '1 day'
      ORDER BY snapshot_at DESC, fetched_at DESC, id DESC
      LIMIT 1
    )
    UPDATE ai_content_metrics m
    SET
      facebook_post_id = $2,
      likes_count = $3,
      comments_count = $4,
      shares_count = $5,
      reach_count = $6,
      likes = $3,
      comments = $4,
      shares = $5,
      reach = $6,
      engagement_rate = $7,
      fetched_at = NOW(),
      snapshot_at = NOW()
    FROM latest_today
    WHERE m.id = latest_today.id
    RETURNING m.id, m.snapshot_at
    `,
        [
            input.aiContentId,
            input.facebookPostId,
            likesCount,
            commentsCount,
            sharesCount,
            reachCount,
            engagementRate,
        ]
    );

    let upsertResult: MetricsSnapshotUpsertResult = {
        id: updateResult.rows[0]?.id ?? null,
        snapshotAt: updateResult.rows[0]?.snapshot_at ?? null,
        action: "updated",
        rowCount: updateResult.rowCount,
    };

    if (!updateResult.rowCount) {
        const insertResult = await client.query<{ id: number; snapshot_at: string }>(
            `
      INSERT INTO ai_content_metrics (
        ai_content_id,
        facebook_post_id,
        likes_count,
        comments_count,
        shares_count,
        reach_count,
        likes,
        comments,
        shares,
        reach,
        engagement_rate,
        fetched_at,
        snapshot_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, snapshot_at
      `,
            [
                input.aiContentId,
                input.facebookPostId,
                likesCount,
                commentsCount,
                sharesCount,
                reachCount,
                engagementRate,
            ]
        );
        upsertResult = {
            id: insertResult.rows[0]?.id ?? null,
            snapshotAt: insertResult.rows[0]?.snapshot_at ?? null,
            action: "inserted",
            rowCount: insertResult.rowCount,
        };
    }

    console.info("[facebook.sync] metrics snapshot upserted via pool", {
        contentId: input.aiContentId,
        facebookPostId: input.facebookPostId,
        likesCount,
        commentsCount,
        sharesCount,
        reachCount,
        snapshotId: upsertResult.id,
        snapshotAt: upsertResult.snapshotAt,
        action: upsertResult.action,
        rowCount: upsertResult.rowCount,
    });
}

async function insertMetricsSnapshotRest(input: InsertMetricsSnapshotInput) {
    const likesCount = toNumber(input.likesCount);
    const commentsCount = toNumber(input.commentsCount);
    const sharesCount = toNumber(input.sharesCount);
    const reachCount = toNumber(input.reachCount);
    const engagementRate = calculateEngagementRate(likesCount, commentsCount, sharesCount, reachCount);
    const now = new Date().toISOString();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const existingRows = await supabaseRest<Array<{ id?: number; snapshot_at?: string }>>(
        `/ai_content_metrics?${new URLSearchParams({
            select: "id,snapshot_at",
            ai_content_id: `eq.${input.aiContentId}`,
            snapshot_at: `gte.${todayStart.toISOString()}`,
            order: "snapshot_at.desc",
            limit: "1",
        }).toString()}`
    );

    const body = {
        facebook_post_id: input.facebookPostId,
        likes_count: likesCount,
        comments_count: commentsCount,
        shares_count: sharesCount,
        reach_count: reachCount,
        likes: likesCount,
        comments: commentsCount,
        shares: sharesCount,
        reach: reachCount,
        engagement_rate: engagementRate,
        fetched_at: now,
        snapshot_at: now,
    };

    const existingId = existingRows[0]?.id;
    let upsertResult: MetricsSnapshotUpsertResult;

    if (existingId) {
        const result = await supabaseRest<unknown[]>(
            `/ai_content_metrics?id=eq.${existingId}`,
            {
                method: "PATCH",
                headers: {
                    Prefer: "return=representation",
                },
                body: JSON.stringify(body),
            }
        );

        upsertResult = {
            id: existingId,
            snapshotAt: Array.isArray(result) ? (result[0] as { snapshot_at?: string } | undefined)?.snapshot_at ?? null : null,
            action: "updated",
            rowCount: Array.isArray(result) ? result.length : null,
        };
    } else {
        const result = await supabaseRest<unknown[]>(
            "/ai_content_metrics",
            {
                method: "POST",
                headers: {
                    Prefer: "return=representation",
                },
                body: JSON.stringify({
                    ai_content_id: input.aiContentId,
                    ...body,
                }),
            }
        );

        upsertResult = {
            id: Array.isArray(result) ? (result[0] as { id?: number } | undefined)?.id ?? null : null,
            snapshotAt: Array.isArray(result) ? (result[0] as { snapshot_at?: string } | undefined)?.snapshot_at ?? null : null,
            action: "inserted",
            rowCount: Array.isArray(result) ? result.length : null,
        };
    }

    console.info("[facebook.sync] metrics snapshot upserted via REST", {
        contentId: input.aiContentId,
        facebookPostId: input.facebookPostId,
        likesCount,
        commentsCount,
        sharesCount,
        reachCount,
        snapshotId: upsertResult.id,
        snapshotAt: upsertResult.snapshotAt,
        action: upsertResult.action,
        rowCount: upsertResult.rowCount,
    });
}

function normalizePost(post: FacebookPostResponse): NormalizedFacebookPost {
    return {
        id: post.id,
        platform: FACEBOOK_PLATFORM,
        message: post.message ?? "",
        likes: toNumber(post.reactions?.summary?.total_count ?? post.likes?.summary?.total_count),
        comments: toNumber(post.comments?.summary?.total_count),
        shares: toNumber(post.shares?.count),
        createdAt: toTimestamp(post.created_time),
        permalinkUrl: post.permalink_url ?? null,
        imageUrl: normalizeOptionalString(post.full_picture) || extractAttachmentImageUrl(post),
    };
}

function toPublishResult(
    row: PublishedContentSnapshotRow,
    publishMode: "text" | "image",
    initialMetricsSynced: boolean
): PublishSystemContentResult {
    if (!row.facebook_post_id) {
        throw new FacebookServiceError("facebook_post_id was not saved for the published content.", 500);
    }

    return {
        contentId: Number(row.id),
        title: row.title,
        status: "published",
        publishMode,
        approvedAt: row.approved_at,
        publishedAt: row.published_at,
        facebookPostId: String(row.facebook_post_id),
        facebookPageId: row.facebook_page_id ?? null,
        facebookPermalinkUrl: row.facebook_permalink_url ?? null,
        initialMetricsSynced,
    };
}

async function getPublishedContentSnapshot(aiContentId: number) {
    const result = await pool.query<PublishedContentSnapshotRow>(
        `
    SELECT
      id,
      title,
      status,
      approved_at,
      published_at,
      facebook_post_id,
      facebook_page_id,
      facebook_permalink_url
    FROM ai_contents
    WHERE id = $1
    `,
        [aiContentId]
    );

    if (!result.rows.length) {
        throw new FacebookNotFoundError("Content not found");
    }

    return result.rows[0];
}

async function getPublishedContentSnapshotRest(aiContentId: number) {
    const rows = await supabaseRest<PublishedContentSnapshotRow[]>(
        contentPath({ select: PUBLISHED_SNAPSHOT_COLUMNS, id: `eq.${aiContentId}`, limit: 1 })
    );

    if (!rows.length) {
        throw new FacebookNotFoundError("Content not found");
    }

    return rows[0];
}

async function markContentPublished(
    client: PoolClient,
    input: {
        contentId: number;
        facebookPostId: string;
        facebookPageId: string | null;
    }
) {
    const result = await client.query<PublishedContentSnapshotRow>(
        `
    UPDATE ai_contents
    SET
      facebook_post_id = $2,
      facebook_page_id = $3,
      status = $4,
      published_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      title,
      status,
      approved_at,
      published_at,
      facebook_post_id,
      facebook_page_id,
      facebook_permalink_url
    `,
        [input.contentId, input.facebookPostId, input.facebookPageId, TRACKED_ANALYTICS_STATUS]
    );

    if (!result.rows.length) {
        throw new FacebookNotFoundError("Content not found");
    }

    return result.rows[0];
}

async function markContentPublishedRest(input: {
    contentId: number;
    facebookPostId: string;
    facebookPageId: string | null;
    facebookPermalinkUrl?: string | null;
}) {
    const rows = await supabaseRest<PublishedContentSnapshotRow[]>(
        contentPath({ select: PUBLISHED_SNAPSHOT_COLUMNS, id: `eq.${input.contentId}` }),
        {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
                facebook_post_id: input.facebookPostId,
                facebook_page_id: input.facebookPageId,
                ...(input.facebookPermalinkUrl ? { facebook_permalink_url: input.facebookPermalinkUrl } : {}),
                status: TRACKED_ANALYTICS_STATUS,
                published_at: new Date().toISOString(),
            }),
        }
    );

    if (!rows.length) {
        throw new FacebookNotFoundError("Content not found");
    }

    return rows[0];
}

async function getContentForPublish(client: PoolClient, aiContentId: number) {
    const result = await client.query<PublishContentRow>(
        `
    SELECT
      id,
      title,
      content,
      hashtags,
      generated_image_url,
      platform,
      status,
      approved_at,
      published_at,
      facebook_post_id,
      facebook_page_id,
      facebook_permalink_url
    FROM ai_contents
    WHERE id = $1
    FOR UPDATE
    `,
        [aiContentId]
    );

    if (!result.rows.length) {
        throw new FacebookNotFoundError("Content not found");
    }

    const row = result.rows[0];

    if ((row.platform ?? FACEBOOK_PLATFORM) !== FACEBOOK_PLATFORM) {
        throw new FacebookServiceError("Only Facebook content can be published", 400);
    }

    if (!PUBLISHABLE_CONTENT_STATUSES.has(row.status)) {
        throw new FacebookServiceError(
            "Content must be approved or scheduled before it can be published to Facebook.",
            400
        );
    }

    return row;
}

async function getContentForPublishRest(aiContentId: number) {
    const rows = await supabaseRest<PublishContentRow[]>(
        contentPath({ select: PUBLISH_CONTENT_COLUMNS, id: `eq.${aiContentId}`, limit: 1 })
    );

    if (!rows.length) {
        throw new FacebookNotFoundError("Content not found");
    }

    const row = rows[0];

    if ((row.platform ?? FACEBOOK_PLATFORM) !== FACEBOOK_PLATFORM) {
        throw new FacebookServiceError("Only Facebook content can be published", 400);
    }

    if (!PUBLISHABLE_CONTENT_STATUSES.has(row.status)) {
        throw new FacebookServiceError(
            "Content must be approved or scheduled before it can be published to Facebook.",
            400
        );
    }

    return row;
}

async function getContentForSync(client: PoolClient, aiContentId: number) {
    const result = await client.query<ContentRow>(
        `
    SELECT id, platform, facebook_post_id
    FROM ai_contents
    WHERE id = $1
    `,
        [aiContentId]
    );

    if (!result.rows.length) {
        throw new FacebookNotFoundError("Content not found");
    }

    const row = result.rows[0];
    if ((row.platform ?? FACEBOOK_PLATFORM) !== FACEBOOK_PLATFORM) {
        throw new FacebookServiceError("Only Facebook content can be synced", 400);
    }

    if (!row.facebook_post_id) {
        throw new FacebookServiceError(
            "This content does not have a facebook_post_id yet. Publish the post in Facebook and save the post ID before syncing metrics.",
            400
        );
    }

    return row;
}

async function getContentForSyncRest(aiContentId: number) {
    const rows = await supabaseRest<ContentRow[]>(
        contentPath({ select: "id,platform,facebook_post_id", id: `eq.${aiContentId}`, limit: 1 })
    );

    if (!rows.length) {
        throw new FacebookNotFoundError("Content not found");
    }

    const row = rows[0];
    if ((row.platform ?? FACEBOOK_PLATFORM) !== FACEBOOK_PLATFORM) {
        throw new FacebookServiceError("Only Facebook content can be synced", 400);
    }

    if (!row.facebook_post_id) {
        throw new FacebookServiceError(
            "This content does not have a facebook_post_id yet. Publish the post in Facebook and save the post ID before syncing metrics.",
            400
        );
    }

    return row;
}

async function getTrackedContentRows() {
    // Sync-all only touches Facebook posts that are registered in `ai_contents`.
    // This excludes arbitrary page posts while keeping older test rows and newer
    // system-published rows in the same analytics scope.
    const result = await pool.query<TrackedContentRow>(
        `
    SELECT id, facebook_post_id
    FROM ai_contents
    WHERE COALESCE(platform, $1) = $1
      AND facebook_post_id IS NOT NULL
    ORDER BY COALESCE(published_at, last_metrics_sync_at, created_at) DESC, id DESC
    `,
        [FACEBOOK_PLATFORM]
    );

    return result.rows.map((row) => ({
        id: Number(row.id),
        facebook_post_id: String(row.facebook_post_id),
    }));
}

async function getTrackedContentRowsRest() {
    const rows = await supabaseRest<TrackedContentRow[]>(
        contentPath({
            select: "id,facebook_post_id",
            or: `(platform.is.null,platform.eq.${FACEBOOK_PLATFORM})`,
            facebook_post_id: "not.is.null",
            order: "published_at.desc",
            limit: 500,
        })
    );

    return rows
        .filter((row) => row.facebook_post_id)
        .map((row) => ({
            id: Number(row.id),
            facebook_post_id: String(row.facebook_post_id),
        }));
}

export async function getPagePosts() {
    const config = requireFacebookConfig();
    const response = await graphGet<{ data?: FacebookPostResponse[] }>(`${config.pageId}/posts`, {
        fields: FACEBOOK_POST_FIELDS,
    });

    return (response.data ?? []).map(normalizePost);
}

async function resolvePublishedStoryIdFromMedia(mediaId: string) {
    const trimmedMediaId = mediaId.trim();
    if (!trimmedMediaId) return null;

    try {
        const response = await graphGet<{ id?: string; post_id?: string; page_story_id?: string }>(trimmedMediaId, {
            fields: "id,post_id,page_story_id",
        });

        return (
            normalizeOptionalString(response.post_id) ||
            normalizeOptionalString(response.page_story_id) ||
            normalizeOptionalString(response.id)
        );
    } catch (error) {
        console.warn("[facebook.publish] failed to resolve story id from media", {
            mediaId: trimmedMediaId,
            message: error instanceof Error ? error.message : "Failed to resolve story id from media",
        });
        return normalizeOptionalString(trimmedMediaId);
    }
}

async function publishFacebookPost(
    pageId: string,
    content: string,
    hashtags: string | null,
    generatedImageUrl: string | null
) {
    if (!generatedImageUrl) {
        const message = buildFacebookFeedMessage(content, hashtags);
        const publishResponse = await graphPost<FacebookPublishResponse>(`${pageId}/feed`, { message });
        const facebookPostId = normalizeOptionalString(publishResponse.post_id) || normalizeOptionalString(publishResponse.id);

        if (!facebookPostId) {
            throw new FacebookServiceError("Facebook did not return a post id for the published content.", 502);
        }

        return {
            facebookPostId,
            usedImage: false,
        };
    }

    const imagePayload = toFacebookImagePayload(generatedImageUrl);
    const caption = buildFacebookPhotoCaption(content, hashtags);

    if (imagePayload.kind === "remote") {
        const publishResponse = await graphPost<FacebookPublishResponse>(`${pageId}/photos`, {
            url: imagePayload.url,
            caption,
            published: "true",
        });

        const facebookPostId =
            normalizeOptionalString(publishResponse.post_id) ||
            (publishResponse.id ? await resolvePublishedStoryIdFromMedia(publishResponse.id) : null);

        if (!facebookPostId) {
            throw new FacebookServiceError("Facebook did not return a post id for the published image content.", 502);
        }

        return {
            facebookPostId,
            usedImage: true,
        };
    }

    const form = new FormData();
    if (caption) {
        form.set("caption", caption);
    }
    form.set("published", "true");

    const imageBuffer = Buffer.from(imagePayload.data, "base64");
    const extension = imagePayload.mimeType.split("/")[1] || "png";
    const blob = new Blob([imageBuffer], { type: imagePayload.mimeType });
    form.set("source", blob, `generated-post.${extension}`);

    const publishResponse = await graphPostMultipart<FacebookPublishResponse>(`${pageId}/photos`, form);
    const facebookPostId =
        normalizeOptionalString(publishResponse.post_id) ||
        (publishResponse.id ? await resolvePublishedStoryIdFromMedia(publishResponse.id) : null);

    if (!facebookPostId) {
        throw new FacebookServiceError("Facebook did not return a post id for the published image content.", 502);
    }

    return {
        facebookPostId,
        usedImage: true,
    };
}

async function getPostSnapshot(postId: string): Promise<FacebookPostMetrics> {
    const trimmedPostId = postId.trim();
    if (!trimmedPostId) {
        throw new FacebookServiceError("postId is required", 400);
    }

    const config = requireFacebookConfig();
    console.info("[facebook.sync] fetching post snapshot", {
        postId: trimmedPostId,
        pageId: config.pageId || null,
        postEndpoint: `/${trimmedPostId}`,
        insightsEndpoint: `/${trimmedPostId}/insights`,
        liveFields: "reactions.summary(total_count),comments.summary(total_count),shares",
    });

    try {
        const post = await graphGet<FacebookPostResponse>(trimmedPostId, {
            fields: FACEBOOK_POST_FIELDS,
        });
        const normalized = normalizePost({
            ...post,
            id: post.id || trimmedPostId,
        });
        const reachCount = await getOptionalPostReach(normalized.id);

        console.info("[facebook.sync] live engagement counts returned", {
            postId: normalized.id,
            reactionsCount: normalized.likes,
            commentsCount: normalized.comments,
            sharesCount: normalized.shares,
            reachCount,
            liveFetch: true,
            engagementEndpoint: `/${trimmedPostId}`,
            reachSource: "insights",
        });

        return {
            postId: normalized.id,
            facebookPageId: deriveFacebookPageId(normalized.id, config.pageId || null),
            facebookPermalinkUrl: normalized.permalinkUrl,
            likesCount: normalized.likes,
            commentsCount: normalized.comments,
            sharesCount: normalized.shares,
            reachCount,
        };
    } catch (error) {
        console.warn("[facebook.sync] post endpoint failed, trying photo endpoint", {
            postId: trimmedPostId,
            message: error instanceof Error ? error.message : "Post snapshot failed",
        });
        const photo = await graphGet<FacebookPhotoResponse>(trimmedPostId, {
            fields: FACEBOOK_PHOTO_FIELDS,
        });
        const normalized = normalizePhoto({
            ...photo,
            id: photo.id || trimmedPostId,
        });
        const reachCount = await getOptionalPostReach(normalized.id);

        console.info("[facebook.sync] live engagement counts returned from photo fallback", {
            postId: normalized.id,
            reactionsCount: normalized.likes,
            commentsCount: normalized.comments,
            sharesCount: normalized.shares,
            reachCount,
            liveFetch: true,
            engagementEndpoint: `/${trimmedPostId}`,
            reachSource: "insights",
        });

        return {
            postId: normalized.id,
            facebookPageId: deriveFacebookPageId(normalized.id, config.pageId || null),
            facebookPermalinkUrl: normalized.permalinkUrl,
            likesCount: normalized.likes,
            commentsCount: normalized.comments,
            sharesCount: normalized.shares,
            reachCount,
        };
    }
}

export async function getPostMetrics(postId: string): Promise<FacebookPostMetrics> {
    return getPostSnapshot(postId);
}

type FacebookPageProbe = {
    id?: string;
    name?: string;
};

type FacebookInsightsResponse = {
    data?: Array<{
        name?: string;
        values?: Array<{ value?: number | string | Record<string, number> }>;
    }>;
};

async function getOptionalPostReach(postId: string) {
    try {
        const insights = await graphGet<FacebookInsightsResponse>(`${postId}/insights`, {
            metric: "post_impressions",
        });
        const values = insights.data?.[0]?.values ?? [];
        const value = values.length ? values[values.length - 1]?.value : undefined;
        const reach = typeof value === "number" || typeof value === "string" ? toNumber(value) : 0;

        if (reach <= 0) {
            console.info("[facebook.sync] reach insight unavailable or zero", {
                postId,
                metric: "post_impressions",
                returnedMetrics: insights.data?.map((item) => item.name) ?? [],
            });
        }

        return reach;
    } catch (error) {
        console.warn("[facebook.sync] reach insight fetch failed; trying unique impressions fallback", {
            postId,
            metric: "post_impressions",
            message: error instanceof Error ? error.message : "Failed to fetch reach insight",
        });

        try {
            const insights = await graphGet<FacebookInsightsResponse>(`${postId}/insights`, {
                metric: "post_impressions_unique",
            });
            const values = insights.data?.[0]?.values ?? [];
            const value = values.length ? values[values.length - 1]?.value : undefined;
            return typeof value === "number" || typeof value === "string" ? toNumber(value) : 0;
        } catch (fallbackError) {
            console.warn("[facebook.sync] reach insight fallback failed; continuing with engagement counts", {
                postId,
                metric: "post_impressions_unique",
                message: fallbackError instanceof Error ? fallbackError.message : "Failed to fetch reach insight",
            });
            return 0;
        }
    }
}

function redactGraphPayload(value: unknown): unknown {
    if (typeof value === "string") {
        return value.replace(/access_token=[^&\s"]+/gi, "access_token=[redacted]");
    }

    if (Array.isArray(value)) {
        return value.map(redactGraphPayload);
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, item]) => [
                key,
                /token/i.test(key) ? "[redacted]" : redactGraphPayload(item),
            ])
        );
    }

    return value;
}

async function debugGraphRequest(path: string, params: Record<string, string | undefined> = {}) {
    const startedAt = Date.now();

    try {
        const data = await graphGet<unknown>(path, params);
        return {
            ok: true,
            endpoint: `/${path.replace(/^\/+/, "")}`,
            params,
            durationMs: Date.now() - startedAt,
            data: redactGraphPayload(data),
        };
    } catch (error) {
        return {
            ok: false,
            endpoint: `/${path.replace(/^\/+/, "")}`,
            params,
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : "Facebook Graph request failed",
            statusCode: (error as { statusCode?: unknown })?.statusCode ?? null,
        };
    }
}

export async function getFacebookAnalyticsDebug() {
    const config = getFacebookConfig();
    const startedAt = Date.now();

    console.info("[facebook.debug] live analytics debug requested", {
        pageId: config.pageId || null,
        graphApiVersion: config.graphApiVersion,
        hasAccessToken: Boolean(config.accessToken),
        tokenLength: config.accessToken.length,
    });

    const status = await getFacebookStatus();
    const page = config.pageId
        ? await debugGraphRequest(config.pageId, { fields: "id,name" })
        : { ok: false, endpoint: null, error: "FACEBOOK_PAGE_ID is not configured" };
    const posts = config.pageId
        ? await debugGraphRequest(`${config.pageId}/posts`, {
            fields: "id,created_time,permalink_url,reactions.summary(total_count),comments.summary(total_count),shares",
            limit: "5",
        })
        : { ok: false, endpoint: null, error: "FACEBOOK_PAGE_ID is not configured" };
    const firstPostId = Array.isArray((posts as { data?: { data?: unknown[] } }).data?.data)
        ? ((posts as { data: { data: Array<{ id?: string }> } }).data.data[0]?.id ?? null)
        : null;
    const firstPost = firstPostId
        ? await debugGraphRequest(firstPostId, {
            fields: "id,created_time,permalink_url,reactions.summary(total_count),comments.summary(total_count),shares",
        })
        : { ok: false, endpoint: null, error: "No page posts returned for first-post probe" };
    const firstPostInsights = firstPostId
        ? await debugGraphRequest(`${firstPostId}/insights`, { metric: "post_impressions_unique" })
        : { ok: false, endpoint: null, error: "No page posts returned for insights probe" };

    return {
        checkedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        config: {
            pageId: config.pageId || null,
            graphApiVersion: config.graphApiVersion,
            hasAccessToken: Boolean(config.accessToken),
            tokenLength: config.accessToken.length,
            tokenUpdatedAt: config.tokenUpdatedAt || null,
            tokenExpiresAt: config.tokenExpiresAt || null,
        },
        status,
        page,
        posts,
        firstPost,
        firstPostInsights,
    };
}

type LastKnownSyncRow = {
    id: number;
    facebook_post_id: string | null;
    last_metrics_sync_at: string | null;
};

async function getLastKnownSync() {
    try {
        const rows = await withOptionalTimeout(
            supabaseRest<LastKnownSyncRow[]>(
                contentPath({
                    select: "id,facebook_post_id,last_metrics_sync_at",
                    last_metrics_sync_at: "not.is.null",
                    order: "last_metrics_sync_at.desc",
                    limit: 1,
                })
            )
        );
        const row = rows[0];

        return {
            contentId: row ? Number(row.id) : null,
            facebookPostId: row?.facebook_post_id ?? null,
            syncedAt: row?.last_metrics_sync_at ?? null,
        };
    } catch (error) {
        console.warn("[facebook.status] failed to load last sync; continuing without sync history", {
            message: error instanceof Error ? error.message : "Failed to load last sync",
        });
        return {
            contentId: null,
            facebookPostId: null,
            syncedAt: null,
        };
    }
}

export async function getFacebookStatus(): Promise<FacebookStatusResult> {
    const config = getFacebookConfig();
    const lastKnownSync = await getLastKnownSync();

    console.info("[facebook.status] validating Facebook token", {
        pageId: config.pageId || null,
        graphApiVersion: config.graphApiVersion,
        hasAccessToken: Boolean(config.accessToken),
        tokenLength: config.accessToken.length,
        tokenExpiresAt: config.tokenExpiresAt || null,
    });

    if (!config.pageId || !config.accessToken) {
        console.warn("[facebook.status] missing Facebook configuration", {
            hasPageId: Boolean(config.pageId),
            hasAccessToken: Boolean(config.accessToken),
        });
        return {
            valid: false,
            state: "missing_config",
            pageId: config.pageId || null,
            pageName: null,
            error: "Facebook integration is missing required backend env values.",
            expiresAt: config.tokenExpiresAt || null,
            tokenUpdatedAt: config.tokenUpdatedAt || null,
            tokenExpiresAt: config.tokenExpiresAt || null,
            lastKnownSync,
        };
    }

    try {
        const probe = await graphGet<FacebookPageProbe>(config.pageId, {
            fields: "id,name",
        });

        console.info("[facebook.status] token validation succeeded", {
            pageId: probe.id ?? config.pageId,
            pageName: probe.name ?? null,
        });

        return {
            valid: true,
            state: "connected",
            pageId: probe.id ?? config.pageId,
            pageName: probe.name ?? null,
            error: null,
            expiresAt: config.tokenExpiresAt || null,
            tokenUpdatedAt: config.tokenUpdatedAt || null,
            tokenExpiresAt: config.tokenExpiresAt || null,
            lastKnownSync,
        };
    } catch (error) {
        if (error instanceof FacebookAuthError) {
            console.warn("[facebook.status] token validation failed", {
                pageId: config.pageId,
                state: error.state,
                message: error.message,
            });
            return {
                valid: false,
                state: error.state,
                pageId: config.pageId,
                pageName: null,
                error: error.message,
                expiresAt: config.tokenExpiresAt || null,
                tokenUpdatedAt: config.tokenUpdatedAt || null,
                tokenExpiresAt: config.tokenExpiresAt || null,
                lastKnownSync,
            };
        }

        if (error instanceof FacebookConfigurationError) {
            return {
                valid: false,
                state: "missing_config",
                pageId: config.pageId || null,
                pageName: null,
                error: error.message,
                expiresAt: config.tokenExpiresAt || null,
                tokenUpdatedAt: config.tokenUpdatedAt || null,
                tokenExpiresAt: config.tokenExpiresAt || null,
                lastKnownSync,
            };
        }

        throw error;
    }
}

async function publishSystemContentWithPool(aiContentId: number): Promise<PublishSystemContentResult> {
    if (!Number.isInteger(aiContentId) || aiContentId <= 0) {
        throw new FacebookServiceError("Invalid content id", 400);
    }

    await ensureAiAnalyticsSchema();

    const client = await pool.connect();
    let contentId = aiContentId;
    let facebookPostId: string | null = null;
    let publishMode: "text" | "image" = "text";

    try {
        await client.query("BEGIN");

        const content = await getContentForPublish(client, aiContentId);
        contentId = content.id;

        if (content.facebook_post_id) {
            const savedOrConfiguredPageId =
                normalizeOptionalString(content.facebook_page_id) || normalizeOptionalString(getFacebookConfig().pageId);

            facebookPostId = content.facebook_post_id;
            await markContentPublished(client, {
                contentId: content.id,
                facebookPostId,
                facebookPageId: savedOrConfiguredPageId,
            });
            await client.query("COMMIT");

            logFacebookPublish("existing facebook_post_id reused", {
                contentId: content.id,
                facebookPostId,
                pageId: savedOrConfiguredPageId,
                status: content.status,
            });
        } else {
            const config = requireFacebookConfig();
            logFacebookPublish("publish started", {
                contentId: content.id,
                status: content.status,
                pageId: config.pageId,
                hasImage: Boolean(normalizeOptionalString(content.generated_image_url)),
            });

            const publishResult = await publishFacebookPost(
                config.pageId,
                content.content,
                content.hashtags,
                normalizeOptionalString(content.generated_image_url)
            );
            facebookPostId = publishResult.facebookPostId;
            publishMode = publishResult.usedImage ? "image" : "text";

            logFacebookPublish("publish success", {
                contentId: content.id,
                facebookPostId,
                pageId: config.pageId,
                usedImage: publishResult.usedImage,
            });

            await markContentPublished(client, {
                contentId: content.id,
                facebookPostId,
                facebookPageId: normalizeOptionalString(config.pageId),
            });

            await client.query("COMMIT");

            logFacebookPublish("facebook_post_id saved", {
                contentId: content.id,
                facebookPostId,
                pageId: config.pageId,
            });
        }
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("[facebook.publish] publish transaction failed", {
            contentId,
            facebookPostId,
            message: error instanceof Error ? error.message : "Failed to publish content",
        });
        throw error;
    } finally {
        client.release();
    }

    let initialMetricsSynced = false;

    try {
        const synced = await syncContentMetrics(contentId);
        initialMetricsSynced = true;

        logFacebookPublish("initial sync completed", {
            contentId: synced.contentId,
            facebookPostId: synced.facebookPostId,
            pageId: synced.facebookPageId,
        });
    } catch (error) {
        console.warn("[facebook.publish] initial sync failed", {
            contentId,
            facebookPostId,
            message: error instanceof Error ? error.message : "Failed to sync initial Facebook metrics",
        });
    }

    const updated = await getPublishedContentSnapshot(contentId);
    return toPublishResult(updated, publishMode, initialMetricsSynced);
}

async function syncContentMetricsWithPool(aiContentId: number, options: SyncMetricsOptions = {}): Promise<SyncContentMetricsResult> {
    if (!Number.isInteger(aiContentId) || aiContentId <= 0) {
        throw new FacebookServiceError("Invalid content id", 400);
    }

    await ensureAiAnalyticsSchema();

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const content = await getContentForSync(client, aiContentId);
        console.info("[facebook.sync] live metrics fetch started via pool", {
            contentId: content.id,
            facebookPostId: content.facebook_post_id,
            forceLive: Boolean(options.forceLive),
        });
        const metrics = await getPostSnapshot(content.facebook_post_id as string);

        await insertMetricsSnapshot(client, {
            aiContentId: content.id,
            facebookPostId: metrics.postId,
            likesCount: metrics.likesCount,
            commentsCount: metrics.commentsCount,
            sharesCount: metrics.sharesCount,
            reachCount: metrics.reachCount,
        });

        const updateResult = await client.query(
            `
      UPDATE ai_contents
      SET
        facebook_post_id = $2,
        facebook_page_id = COALESCE($3, facebook_page_id),
        facebook_permalink_url = COALESCE($4, facebook_permalink_url),
        last_metrics_sync_at = NOW()
      WHERE id = $1
      `,
            [content.id, metrics.postId, metrics.facebookPageId, metrics.facebookPermalinkUrl]
        );
        console.info("[facebook.sync] content sync timestamp updated via pool", {
            contentId: content.id,
            facebookPostId: metrics.postId,
            likesCount: metrics.likesCount,
            commentsCount: metrics.commentsCount,
            sharesCount: metrics.sharesCount,
            reachCount: metrics.reachCount,
            rowCount: updateResult.rowCount,
        });

        await client.query("COMMIT");

        return {
            contentId: content.id,
            facebookPostId: metrics.postId,
            facebookPageId: metrics.facebookPageId,
            facebookPermalinkUrl: metrics.facebookPermalinkUrl,
            likesCount: metrics.likesCount,
            commentsCount: metrics.commentsCount,
            sharesCount: metrics.sharesCount,
            reachCount: metrics.reachCount,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function syncAllContentMetricsWithPool(options: SyncMetricsOptions = {}): Promise<SyncAllContentMetricsResult> {
    await ensureAiAnalyticsSchema();

    const trackedRows = await getTrackedContentRows();
    console.info("[facebook.sync] pool sync-all tracked rows loaded", {
        totalTracked: trackedRows.length,
    });
    const results: SyncContentMetricsResult[] = [];
    const errors: SyncAllContentMetricsResult["errors"] = [];

    for (const row of trackedRows) {
        try {
            const synced = await syncContentMetricsWithPool(row.id, options);
            results.push(synced);
        } catch (error) {
            if (isRetryableSyncError(error)) {
                try {
                    console.warn("[facebook.sync] retrying pool sync after transient failure", {
                        contentId: row.id,
                        facebookPostId: row.facebook_post_id,
                        message: error instanceof Error ? error.message : "Transient sync failure",
                    });
                    const synced = await syncContentMetricsWithPool(row.id, options);
                    results.push(synced);
                    continue;
                } catch (retryError) {
                    error = retryError;
                }
            }
            console.warn("[facebook.sync] pool sync failed for content", {
                contentId: row.id,
                facebookPostId: row.facebook_post_id,
                message: error instanceof Error ? error.message : "Failed to sync Facebook metrics",
            });
            errors.push({
                contentId: row.id,
                facebookPostId: row.facebook_post_id,
                message: error instanceof Error ? error.message : "Failed to sync Facebook metrics",
            });
        }
    }

    return {
        totalTracked: trackedRows.length,
        totalSynced: results.length,
        totalFailed: errors.length,
        failedIds: errors.map((error) => error.contentId),
        results,
        errors,
    };
}

async function publishSystemContentWithRest(aiContentId: number): Promise<PublishSystemContentResult> {
    if (!Number.isInteger(aiContentId) || aiContentId <= 0) {
        throw new FacebookServiceError("Invalid content id", 400);
    }

    let contentId = aiContentId;
    let facebookPostId: string | null = null;
    let publishMode: "text" | "image" = "text";

    const content = await getContentForPublishRest(aiContentId);
    contentId = content.id;

    if (content.facebook_post_id) {
        const savedOrConfiguredPageId =
            normalizeOptionalString(content.facebook_page_id) || normalizeOptionalString(getFacebookConfig().pageId);

        facebookPostId = content.facebook_post_id;
        await markContentPublishedRest({
            contentId,
            facebookPostId,
            facebookPageId: savedOrConfiguredPageId,
            facebookPermalinkUrl: normalizeOptionalString(content.facebook_permalink_url),
        });

        logFacebookPublish("existing facebook_post_id reused via REST fallback", {
            contentId,
            facebookPostId,
            pageId: savedOrConfiguredPageId,
            status: content.status,
        });
    } else {
        const config = requireFacebookConfig();
        logFacebookPublish("publish started via REST fallback", {
            contentId,
            status: content.status,
            pageId: config.pageId,
            hasImage: Boolean(normalizeOptionalString(content.generated_image_url)),
        });

        const publishResult = await publishFacebookPost(
            config.pageId,
            content.content,
            content.hashtags,
            normalizeOptionalString(content.generated_image_url)
        );
        facebookPostId = publishResult.facebookPostId;
        publishMode = publishResult.usedImage ? "image" : "text";

        await markContentPublishedRest({
            contentId,
            facebookPostId,
            facebookPageId: normalizeOptionalString(config.pageId),
        });

        logFacebookPublish("facebook_post_id saved via REST fallback", {
            contentId,
            facebookPostId,
            pageId: config.pageId,
        });
    }

    let initialMetricsSynced = false;

    try {
        const synced = await syncContentMetricsWithRest(contentId);
        initialMetricsSynced = true;
        logFacebookPublish("initial sync completed via REST fallback", {
            contentId: synced.contentId,
            facebookPostId: synced.facebookPostId,
            pageId: synced.facebookPageId,
        });
    } catch (error) {
        console.warn("[facebook.publish] initial REST sync failed", {
            contentId,
            facebookPostId,
            message: error instanceof Error ? error.message : "Failed to sync initial Facebook metrics",
        });
    }

    const updated = await getPublishedContentSnapshotRest(contentId);
    return toPublishResult(updated, publishMode, initialMetricsSynced);
}

async function syncContentMetricsWithRest(aiContentId: number, options: SyncMetricsOptions = {}): Promise<SyncContentMetricsResult> {
    if (!Number.isInteger(aiContentId) || aiContentId <= 0) {
        throw new FacebookServiceError("Invalid content id", 400);
    }

    const content = await getContentForSyncRest(aiContentId);
    console.info("[facebook.sync] live metrics fetch started via REST", {
        contentId: content.id,
        facebookPostId: content.facebook_post_id,
        forceLive: Boolean(options.forceLive),
    });
    const metrics = await getPostSnapshot(content.facebook_post_id as string);

    await insertMetricsSnapshotRest({
        aiContentId: content.id,
        facebookPostId: metrics.postId,
        likesCount: metrics.likesCount,
        commentsCount: metrics.commentsCount,
        sharesCount: metrics.sharesCount,
        reachCount: metrics.reachCount,
    });

    const updateResult = await supabaseRest<unknown[]>(
        contentPath({ id: `eq.${content.id}` }),
        {
            method: "PATCH",
            headers: {
                Prefer: "return=representation",
            },
            body: JSON.stringify({
                facebook_post_id: metrics.postId,
                ...(metrics.facebookPageId ? { facebook_page_id: metrics.facebookPageId } : {}),
                ...(metrics.facebookPermalinkUrl ? { facebook_permalink_url: metrics.facebookPermalinkUrl } : {}),
                last_metrics_sync_at: new Date().toISOString(),
            }),
        }
    );
    console.info("[facebook.sync] content sync timestamp updated via REST", {
        contentId: content.id,
        facebookPostId: metrics.postId,
        likesCount: metrics.likesCount,
        commentsCount: metrics.commentsCount,
        sharesCount: metrics.sharesCount,
        reachCount: metrics.reachCount,
        updatedRows: Array.isArray(updateResult) ? updateResult.length : null,
    });

    return {
        contentId: content.id,
        facebookPostId: metrics.postId,
        facebookPageId: metrics.facebookPageId,
        facebookPermalinkUrl: metrics.facebookPermalinkUrl,
        likesCount: metrics.likesCount,
        commentsCount: metrics.commentsCount,
        sharesCount: metrics.sharesCount,
        reachCount: metrics.reachCount,
    };
}

async function syncAllContentMetricsWithRest(options: SyncMetricsOptions = {}): Promise<SyncAllContentMetricsResult> {
    const trackedRows = await getTrackedContentRowsRest();
    console.info("[facebook.sync] REST sync-all tracked rows loaded", {
        totalTracked: trackedRows.length,
    });
    const results: SyncContentMetricsResult[] = [];
    const errors: SyncAllContentMetricsResult["errors"] = [];

    for (const row of trackedRows) {
        try {
            const synced = await syncContentMetricsWithRest(row.id, options);
            results.push(synced);
        } catch (error) {
            if (isRetryableSyncError(error)) {
                try {
                    console.warn("[facebook.sync] retrying REST sync after transient failure", {
                        contentId: row.id,
                        facebookPostId: row.facebook_post_id,
                        message: error instanceof Error ? error.message : "Transient sync failure",
                    });
                    const synced = await syncContentMetricsWithRest(row.id, options);
                    results.push(synced);
                    continue;
                } catch (retryError) {
                    error = retryError;
                }
            }
            console.warn("[facebook.sync] REST sync failed for content", {
                contentId: row.id,
                facebookPostId: row.facebook_post_id,
                message: error instanceof Error ? error.message : "Failed to sync Facebook metrics",
            });
            errors.push({
                contentId: row.id,
                facebookPostId: row.facebook_post_id,
                message: error instanceof Error ? error.message : "Failed to sync Facebook metrics",
            });
        }
    }

    return {
        totalTracked: trackedRows.length,
        totalSynced: results.length,
        totalFailed: errors.length,
        failedIds: errors.map((error) => error.contentId),
        results,
        errors,
    };
}

export async function publishSystemContent(aiContentId: number): Promise<PublishSystemContentResult> {
    try {
        return await publishSystemContentWithRest(aiContentId);
    } catch (error) {
        if (shouldFallbackToSupabaseRest(error)) throw error;
        console.warn("[facebook.publish] REST publish failed, trying pool path", {
            contentId: aiContentId,
            message: error instanceof Error ? error.message : "REST publish failed",
        });
        return publishSystemContentWithPool(aiContentId);
    }
}

export async function syncContentMetrics(aiContentId: number, options: SyncMetricsOptions = {}): Promise<SyncContentMetricsResult> {
    try {
        return await syncContentMetricsWithRest(aiContentId, options);
    } catch (error) {
        if (shouldFallbackToSupabaseRest(error)) throw error;
        console.warn("[facebook.sync] REST sync failed, trying pool path", {
            contentId: aiContentId,
            message: error instanceof Error ? error.message : "REST sync failed",
        });
        return syncContentMetricsWithPool(aiContentId, options);
    }
}

export async function syncAllContentMetrics(options: SyncMetricsOptions = {}): Promise<SyncAllContentMetricsResult> {
    try {
        return await syncAllContentMetricsWithRest(options);
    } catch (error) {
        if (shouldFallbackToSupabaseRest(error)) throw error;
        console.warn("[facebook.sync] REST sync-all failed, trying pool path", {
            message: error instanceof Error ? error.message : "REST sync-all failed",
        });
        return syncAllContentMetricsWithPool(options);
    }
}
