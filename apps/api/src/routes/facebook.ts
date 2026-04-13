import { Router, type Request, type Response } from "express";
import { ensureAiAnalyticsSchema } from "../db/aiAnalyticsSchema";
import {
  getFacebookStatus,
  FacebookConfigurationError,
  getPagePosts,
  getPostMetrics,
  publishSystemContent,
  syncAllContentMetrics,
  syncContentMetrics,
} from "../services/facebook";

export const facebookRouter = Router();

function getStatusCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  ) {
    return Number((error as { statusCode: number }).statusCode);
  }

  if (error instanceof FacebookConfigurationError) {
    return 503;
  }

  return 500;
}

facebookRouter.get("/status", async (_req: Request, res: Response) => {
  try {
    const status = await getFacebookStatus();
    return res.json({ ok: true, data: status, message: null });
  } catch (error) {
    return res.status(getStatusCode(error)).json({
      ok: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to load Facebook status",
    });
  }
});

facebookRouter.get("/posts", async (_req: Request, res: Response) => {
  try {
    const posts = await getPagePosts();
    return res.json({ ok: true, data: posts, message: null });
  } catch (error) {
    return res.status(getStatusCode(error)).json({
      ok: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to load Facebook posts",
    });
  }
});

facebookRouter.get("/metrics/:postId", async (req: Request, res: Response) => {
  try {
    const postId = typeof req.params.postId === "string" ? req.params.postId.trim() : "";
    if (!postId) {
      return res.status(400).json({ ok: false, data: null, message: "postId is required" });
    }

    const metrics = await getPostMetrics(postId);
    return res.json({ ok: true, data: metrics, message: null });
  } catch (error) {
    return res.status(getStatusCode(error)).json({
      ok: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to load Facebook metrics",
    });
  }
});

facebookRouter.post("/publish/:id", async (req: Request, res: Response) => {
  const contentId = Number(req.params.id);

  try {
    await ensureAiAnalyticsSchema();

    if (!Number.isInteger(contentId) || contentId <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid content id" });
    }

    console.info("[facebook.route.publish] request received", { contentId });

    const result = await publishSystemContent(contentId);
    console.info("[facebook.route.publish] request succeeded", {
      contentId: result.contentId,
      facebookPostId: result.facebookPostId,
      initialMetricsSynced: result.initialMetricsSynced,
    });

    return res.json({ ok: true, data: result, message: null });
  } catch (error) {
    console.error("[facebook.route.publish] request failed", {
      contentId: Number.isInteger(contentId) && contentId > 0 ? contentId : null,
      message: error instanceof Error ? error.message : "Failed to publish Facebook content",
    });

    return res.status(getStatusCode(error)).json({
      ok: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to publish Facebook content",
    });
  }
});

facebookRouter.post("/sync/:contentId", async (req: Request, res: Response) => {
  try {
    await ensureAiAnalyticsSchema();

    const contentId = Number(req.params.contentId);
    if (!Number.isInteger(contentId) || contentId <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid content id" });
    }

    const result = await syncContentMetrics(contentId);
    return res.json({ ok: true, data: result, message: null });
  } catch (error) {
    return res.status(getStatusCode(error)).json({
      ok: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to sync Facebook metrics",
    });
  }
});

facebookRouter.post("/sync-all", async (_req: Request, res: Response) => {
  try {
    await ensureAiAnalyticsSchema();

    const result = await syncAllContentMetrics();
    return res.json({ ok: true, data: result, message: null });
  } catch (error) {
    return res.status(getStatusCode(error)).json({
      ok: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to sync all Facebook metrics",
    });
  }
});
