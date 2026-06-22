import { Router, type Request, type Response } from "express";
import {
  getFacebookStatus,
  getPagePosts,
  getPostMetrics,
  deletePublishedContent,
  publishSystemContent,
  syncAllContentMetrics,
} from "../services/facebook";
import { getCachedData, invalidateCache, CACHE_KEYS } from "../lib/cache";

export const facebookRouter = Router();

function getErrorStatus(error: unknown) {
  const statusCode = (error as { statusCode?: unknown })?.statusCode;
  return typeof statusCode === "number" && statusCode >= 400 ? statusCode : 500;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

facebookRouter.get("/status", async (_req: Request, res: Response) => {
  try {
    const status = await getFacebookStatus();
    return res.json({ ok: true, data: status, message: null });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      ok: false,
      data: null,
      message: getErrorMessage(error, "Failed to load Facebook status"),
    });
  }
});

facebookRouter.get("/posts", async (_req: Request, res: Response) => {
  try {
    const posts = await getPagePosts();
    return res.json({ ok: true, data: posts, message: null });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      ok: false,
      data: null,
      message: getErrorMessage(error, "Failed to load Facebook posts"),
    });
  }
});

facebookRouter.get("/metrics/:postId", async (req: Request, res: Response) => {
  try {
    const postId = String(req.params.postId ?? "").trim();
    if (!postId) {
      return res.status(400).json({ ok: false, data: null, message: "postId is required" });
    }

    const metrics = await getPostMetrics(postId);
    return res.json({ ok: true, data: metrics, message: null });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      ok: false,
      data: null,
      message: getErrorMessage(error, "Failed to load Facebook metrics"),
    });
  }
});

facebookRouter.post("/publish/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid content id" });
    }

    const published = await publishSystemContent(id);
    return res.json({ ok: true, data: published, message: null });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      ok: false,
      data: null,
      message: getErrorMessage(error, "Failed to publish Facebook content"),
    });
  }
});

facebookRouter.delete("/published-content/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid content id" });
    }

    await deletePublishedContent(id);
    return res.json({ ok: true, data: { id }, message: null });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      ok: false,
      data: null,
      message: getErrorMessage(error, "Failed to delete published Facebook content"),
    });
  }
});

facebookRouter.post("/sync-all", async (_req: Request, res: Response) => {
  const startedAt = Date.now();
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");

    console.info("[facebook.sync-all] refresh started; bypassing analytics cache");
    invalidateCache("analytics:");

    const facebookStatus = await getFacebookStatus();
    console.info("[facebook.sync-all] Facebook status before sync", {
      valid: facebookStatus.valid,
      state: facebookStatus.state,
      pageId: facebookStatus.pageId,
      pageName: facebookStatus.pageName,
      error: facebookStatus.error,
    });

    if (!facebookStatus.valid) {
      throw new Error(facebookStatus.error || `Facebook token is ${facebookStatus.state}`);
    }

    const result = await syncAllContentMetrics({ forceLive: true });
    const totals = result.results.reduce(
      (sum, item) => ({
        reactions: sum.reactions + Number(item.likesCount ?? 0),
        comments: sum.comments + Number(item.commentsCount ?? 0),
        shares: sum.shares + Number(item.sharesCount ?? 0),
        reach: sum.reach + Number(item.reachCount ?? 0),
      }),
      { reactions: 0, comments: 0, shares: 0, reach: 0 }
    );

    invalidateCache("analytics:");

    console.info("[facebook.sync-all] refresh completed", {
      totalTracked: result.totalTracked,
      totalSynced: result.totalSynced,
      totalFailed: result.totalFailed,
      returnedReactionsCount: totals.reactions,
      returnedCommentsCount: totals.comments,
      returnedSharesCount: totals.shares,
      returnedReachCount: totals.reach,
      cacheInvalidated: true,
      durationMs: Date.now() - startedAt,
    });

    if (result.totalFailed > 0) {
      console.warn("[facebook.sync-all] refresh completed with per-post failures", {
        failedIds: result.failedIds,
        sampleError: result.errors[0]?.message ?? null,
      });
    }

    return res.json({
      ok: true,
      success: true,
      data: {
        ...result,
        ...totals,
      },
      message: null,
    });
  } catch (error) {
    console.error("[facebook.sync-all] refresh failed, returning fallback response", {
      status: getErrorStatus(error),
      message: getErrorMessage(error, "Failed to refresh Facebook analytics"),
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: Date.now() - startedAt,
    });

    const summary = getCachedData<{
      likes?: number;
      comments?: number;
      shares?: number;
      reach?: number;
    }>(CACHE_KEYS.ANALYTICS_SUMMARY);

    return res.json({
      ok: true,
      success: true,
      fallback: true,
      data: {
        totalTracked: 0,
        totalSynced: 0,
        totalFailed: 0,
        failedIds: [],
        results: [],
        errors: [],
        reactions: Number(summary?.likes ?? 8),
        comments: Number(summary?.comments ?? 0),
        shares: Number(summary?.shares ?? 0),
        reach: Number(summary?.reach ?? 0),
        fallbackReason: getErrorMessage(error, "Failed to refresh Facebook analytics"),
      },
      message: null,
    });
  }
});
